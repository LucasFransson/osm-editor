
// Angular Imports
import { Component, OnInit } from '@angular/core';

// Leaflet Imports
import * as L from 'leaflet';


// Set the default marker icon for Leaflet
const DEFAULT_ICON = L.icon({
  iconUrl: 'assets/images/marker-icon.png',
  shadowUrl: 'assets/images/marker-shadow.png',
  iconSize: [25, 41],
  shadowSize: [41, 41],
  iconAnchor: [12, 41],
  shadowAnchor: [4, 62],
  popupAnchor: [1, -34],
});

L.Marker.prototype.options.icon = DEFAULT_ICON;

//  Enums for handling the current selected state of the Editor
enum EditorMode {
  POLYGON,
  SINGLE_NODE,
  SQUARE,
  CHAINED_NODES,
}

@Component({
  selector: 'app-osm-editor',
  templateUrl: './osm-editor.component.html',
})
export class OsmEditorComponent implements OnInit {
  // Class Properties
  // Map Related Variables
  private readonly SCALE_FACTOR = 0.0001; 
  map?: L.Map;
  nodes: L.Marker[] = [];
  currentPolygon?: L.Polygon;
  savedPolygons: L.Polygon[] = [];
  polyLines: L.Polyline[] = [];
  markerData = new Map<L.Marker, { partOfPolygon: boolean }>();
  // Undo/Redo Variables
  undoStack: L.Polygon[][] = [];
  redoStack: L.Polygon[][] = [];
  // Editor Tool State Variables
  public EditorMode = EditorMode;
  currentMode: EditorMode = EditorMode.POLYGON; // set the default editor mode to Polygon
  squareWidth = 1; // This represents 0.001 internally due to the SCALE_FACTOR
  squareHeight = 1;

  // Lifecycle Hooks
  ngOnInit() {}

  /////////////////////////////////
  // EditorMode State/Tool Togglers
  /////////////////////////////////

  setModeToDefault() {
    this.currentMode = EditorMode.POLYGON;
  }

  setModeToSingleNode() {
    this.currentMode = EditorMode.SINGLE_NODE;
  }

  setModeToSquare() {
    this.currentMode = EditorMode.SQUARE;
  }

  setModeToChainedNodes() {
    this.currentMode = EditorMode.CHAINED_NODES;
  }
    ////////////////////////
    // Map Initialization and Event Handlers
    ////////////////////////
  onMapReady(map: L.Map) {
    this.map = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.map);

    this.map.on('click', this.onMapClick.bind(this));
  }

  // Mouse Click Functions
  
  onMapClick(e: L.LeafletMouseEvent) {
    if (!this.map) return; // Exit if map is not initialized

    switch (this.currentMode) {
      // Square Editor Mode
      case EditorMode.SQUARE:
        this.saveState();
        this.createSquare(e.latlng);
        break;

      // Single Node Mode

      case EditorMode.SINGLE_NODE:
        this.saveState();
        const singleMarker = L.marker(e.latlng, { draggable: true }).addTo(this.map);
        // singleMarker.on('click', (e) => this.onMarkerClick(e, marker));
        singleMarker.on('dragend', () => this.onMarkerDragEnd.bind(singleMarker));
        singleMarker.on('contextmenu', () => this.onMarkerRightClick(singleMarker));

        this.nodes.push(singleMarker);
        break;

      // Chained Nodes Editor Mode
      case EditorMode.CHAINED_NODES:
        this.saveState();
        if(this.nodes.length > 0 && e.latlng.distanceTo(this.nodes[0].getLatLng()) <= 10) {
          // Close the chain by connecting the nodes that are <= 10m from eachother
          const latlngs = [...this.nodes.map((node)=>node.getLatLng(),this.nodes[0].getLatLng())];

          // Create a polygon of the chained nodes/markers
          this.currentPolygon = L.polygon(latlngs).addTo(this.map);
          this.nodes.forEach(marker => {this.markerData.set(marker,{partOfPolygon:true})})
          // this.nodes.forEach(marker => {marker.options.partOfPolygon=true;});
          //this.nodes = []; // Clear the nodes ? Do I want to do this?
        }
        else {
          const chainedMarker = L.marker(e.latlng, { draggable: true }).addTo(this.map);
          chainedMarker.on('dragend', () => this.onMarkerDragEnd(chainedMarker));
          // chainedMaker.on('click', (e) => this.onMarkerClick(e, marker));
          chainedMarker.on('contextmenu', () => this.onMarkerRightClick(chainedMarker));
          this.nodes.push(chainedMarker);

          if (this.nodes.length > 1) {
            const previousMarker = this.nodes[this.nodes.length - 2];
            const polyLine = L.polyline([previousMarker.getLatLng(),chainedMarker.getLatLng(),]).addTo(this.map);
            this.polyLines.push(polyLine);
          }
        }
        if (this.currentPolygon) {
          const index = this.savedPolygons.indexOf(this.currentPolygon);
          if (index !== -1) {
              this.savedPolygons[index] = this.currentPolygon;
          } else {
              this.savedPolygons.push(this.currentPolygon);
          }
        }
      
        break;
      // Polygon Editor Mode
      case EditorMode.POLYGON:
      default:
        this.saveState();
        const marker = L.marker(e.latlng, { draggable: true }).addTo(this.map);
        
        // marker.on('dragend', this.onMarkerDragEnd.bind(this));
        marker.on('dragend', () => this.onMarkerDragEnd(marker));
        // marker.on('click', (e) => this.onMarkerClick(e, marker));
        // marker.on('click', () => this.onMarkerClick(marker));
        marker.on('contextmenu', () => this.onMarkerRightClick(marker));
        this.nodes.push(marker);

        if (this.nodes.length > 1) {
          if (this.currentPolygon) {
            this.currentPolygon.remove();
          }

          const latlngs = this.nodes.map((node) => node.getLatLng());
          this.currentPolygon = L.polygon(latlngs).addTo(this.map);
          
        }
        break;
    }
  }

  onMarkerRightClick(marker: L.Marker) {
    this.saveState();
    const isConfirmed = window.confirm("Do you want to remove this node?");

    if(!isConfirmed) return;


    marker.remove();
    

    const index = this.nodes.indexOf(marker);
    if (index !== -1) {
      this.nodes.splice(index, 1);
    }
    
    switch (this.currentMode) {
      case EditorMode.CHAINED_NODES:
          // Remove associated polylines
          if (index !== -1 && index < this.polyLines.length) {
              this.polyLines[index].remove();
              this.polyLines.splice(index, 1);
          }
          if (index > 0) {
              this.polyLines[index - 1].remove();
              this.polyLines.splice(index - 1, 1);
          }
          break;

      case EditorMode.POLYGON:
          // Redraw the polygon
          if (this.currentPolygon) {
              this.currentPolygon.remove();
              const latlngs = this.nodes.map(node => node.getLatLng());
              this.currentPolygon = L.polygon(latlngs).addTo(this.map!);
          }
          break;

      // Handle other modes as necessary
    }
  }

  onMarkerDragEnd(marker: L.Marker) {
    this.saveState();
    switch (this.currentMode) {
      case EditorMode.POLYGON:
        if (this.currentPolygon && this.map) {
          const latlngs = this.nodes.map((node) => node.getLatLng());
          this.currentPolygon.setLatLngs(latlngs);
        }
        break;
      case EditorMode.SINGLE_NODE:
        break;
      case EditorMode.SQUARE:
        if (this.currentPolygon && this.map) {
          const latlngs = this.nodes.map((node) => node.getLatLng());
          this.currentPolygon.setLatLngs(latlngs);
        }
        break;
      case EditorMode.CHAINED_NODES:
        if (this.markerData.get(marker)?.partOfPolygon) { 
          const latlngs = this.nodes.map(node => node.getLatLng());
          this.currentPolygon?.setLatLngs(latlngs);
  
          // DONT REMOVE! BREAK POLYGON AND GO BACK TO CHAIN NOT FULLY WORKING
          // Optional: Convert back to chained nodes
          // if (this.currentPolygon) {
          //   this.currentPolygon.remove();
          //   this.currentPolygon = undefined;
          // }

          // if(this.map) {
          //   const mapInstance = this.map;
          //   this.polyLines.forEach(polyline => polyline.addTo(mapInstance));
          // }
          // if(this.map) {
          //  this.polyLines.forEach(polyline => polyline.addTo(this.map!)); // TODO: UNTESTED AND UNSAFE USE of Non-null Assertion Operator '!' for testing purposes
          // }
        }
        else {
          const markerIndex = this.nodes.indexOf(marker);
          if (markerIndex === -1) {
            return;
          }

          if (markerIndex > 0) {
            const previousPolyLine = this.polyLines[markerIndex - 1];
            const latlngs = [this.nodes[markerIndex - 1].getLatLng(),marker.getLatLng(),];

            previousPolyLine.setLatLngs(latlngs);
          }

          if (markerIndex < this.nodes.length - 1) {
            const nextPolyLine = this.polyLines[markerIndex];
            const latlngs = [marker.getLatLng(),this.nodes[markerIndex + 1].getLatLng(),];

            nextPolyLine.setLatLngs(latlngs);
          }
        break;
      }
    }
  }

  ////////////////////////
  // Square Tool Functions
 ////////////////////////

  createSquare(center: L.LatLng) {
    // Calculate half width and height for positioning
    const halfWidth = (this.squareWidth * this.SCALE_FACTOR) / 2;
    const halfHeight = (this.squareHeight * this.SCALE_FACTOR) / 2;

    // Calculate the 4 corners of the square based on the provided width and height
    const topLeft = new L.LatLng(
      center.lat + halfHeight,
      center.lng - halfWidth
    );

    const topRight = new L.LatLng(
      center.lat + halfHeight,
      center.lng + halfWidth
    );
    
    const bottomRight = new L.LatLng(
      center.lat - halfHeight,
      center.lng + halfWidth
    );

    const bottomLeft = new L.LatLng(
      center.lat - halfHeight,
      center.lng - halfWidth
    );

    // Create markers for each corner
    const markers = [
      L.marker(topLeft, { draggable: true }),
      L.marker(topRight, { draggable: true }),
      L.marker(bottomRight, { draggable: true }),
      L.marker(bottomLeft, { draggable: true }),
    ];

    // Add markers to the map and to the nodes array
    markers.forEach((marker) => {
      // marker.on('click', (e) => this.onMarkerClick(e, marker));
      marker.on('contextmenu', () => this.onMarkerRightClick(marker));
      marker.addTo(this.map!);
      this.nodes.push(marker);
    });

    // Create the square polygon
    const latlngs = [topLeft, topRight, bottomRight, bottomLeft, topLeft];
    this.currentPolygon = L.polygon(latlngs).addTo(this.map!);
  }

  ////////////////////////////////
  // STATE MANAGEMENT
  ///////////////////////////////


  undo() {
    console.log("undo Clicked");
    console.log(this.undoStack);
    if(this.undoStack.length===0){
      console.log("undo returned")
      return;
    }

    // Save the current state to the redo stack
    this.redoStack.push([...this.savedPolygons]);

    // restore the previous state from the undo stack
    this.savedPolygons = this.undoStack.pop() || [];

    this.updateMap();
    console.log(this.undoStack);
  }

  redo() {
    console.log("redo Clicked");
    console.log(this.redoStack);
    if(this.redoStack.length===0) { 
      console.log("redo returned")
      return;
     
    }

     // Save the current state to the undo stack
    this.undoStack.push([...this.savedPolygons]);
    // restore the previous state from the redo stack
    this.savedPolygons = this.redoStack.pop() || [];

    this.updateMap();
    console.log(this.redoStack);
  }


  updateMap() {
    if(!this.map) { return ;}  // If map is not initialized correctly, break the function

    // remove all current Polygons from the map
    this.savedPolygons.forEach(polygon => polygon.remove());

    // Remove all nodes and polylines
    this.nodes.forEach(node => node.remove());
    this.polyLines.forEach(polyline => polyline.remove());

    // Clear the nodes and polylines arrays
    this.nodes = [];
    this.polyLines = [];

    // Add all Polygons from the saved state to the map
    this.savedPolygons.forEach(polygon => {
        polygon.addTo(this.map!);

        // If the current mode is CHAINED_NODES, restore the nodes and polylines
        if (this.currentMode === EditorMode.CHAINED_NODES) {
            const latLngsArray = polygon.getLatLngs()[0] as L.LatLng[];
            latLngsArray.forEach((latLng: L.LatLng, index: number) => {
                const marker = L.marker(latLng, { draggable: true });
                marker.on('contextmenu', () => this.onMarkerRightClick(marker));
                marker.addTo(this.map!);
                this.nodes.push(marker);

                // If it's not the first marker, create a polyline connecting it to the previous marker
                if (index > 0) {
                    const polyLine = L.polyline([this.nodes[index - 1].getLatLng(), latLng]).addTo(this.map!);
                    this.polyLines.push(polyLine);
                }
            });
        }
    });
  }

  saveState() {
    console.log("Saving state...");
    console.log("Current savedPolygons:", this.savedPolygons);
    console.log("Last state in undoStack:", this.undoStack[this.undoStack.length - 1]);
    
    // Capture the current state of the savedPolygons array
    this.undoStack.push([...this.savedPolygons]);
    this.redoStack = [];   // Clear the redo stack

    console.log("Updated undoStack:", this.undoStack);
  }

  saveCurrentArea() {

    this.saveState();

    if (this.currentPolygon) {
      // Save the current polygon to the savedPolygons array
      this.savedPolygons.push(this.currentPolygon);

      // Clear the current markers and polygon for the next area
      this.nodes.forEach((marker) => marker.remove());
      this.nodes = [];
      this.currentPolygon = undefined;
    }
  }
}



  // Auto-save function for redo/undo states called on every change to map
  // saveState() {
  //   console.log("Saving state...");
  //   console.log("Current savedPolygons:", this.savedPolygons);
  //   console.log("Last state in undoStack:", this.undoStack[this.undoStack.length - 1]);
    
  //   this.undoStack.push([...this.savedPolygons]);   // Always push the current state to the undo stack
  //   this.redoStack = [];   // Clear the redo stack

  //   console.log("Updated undoStack:", this.undoStack);

  //   // if (JSON.stringify(this.savedPolygons) !== JSON.stringify(this.undoStack[this.undoStack.length - 1])) {

  //   //   this.undoStack.push([...this.savedPolygons]);   // push the current state to the undo stack
  //   //   this.redoStack = [];   // Clear the redo stack (since a new state is saved)
  //   // }
  // }



  // updateMap() {
  //   if(!this.map) { return ;}  // If map is not initialized correctly, break the function

  //   // // remove all current Polygons from the map
  //   // this.savedPolygons.forEach(polygon => polygon.remove());

  //   // // Add all Polygons from the saved state to the map
  //   // this.savedPolygons.forEach(polygon=>polygon.addTo(this.map!));

  //       // Remove all current Polygons and nodes from the map
  //       this.savedPolygons.forEach(polygon => polygon.remove());
  //       this.nodes.forEach(node => node.remove());
    
  //       // Clear the nodes array
  //       this.nodes = [];
    
  //       // Add all Polygons from the saved state to the map
  //       this.savedPolygons.forEach(polygon => {
  //           polygon.addTo(this.map!);
    
  //           // Update the nodes array with the vertices of the polygon
  //           const latLngsArray = polygon.getLatLngs()[0] as L.LatLng[];
  //           latLngsArray.forEach((latLng: L.LatLng) => {
  //               const marker = L.marker(latLng, { draggable: true });
  //               marker.on('contextmenu', () => this.onMarkerRightClick(marker));
  //               marker.addTo(this.map!);
  //               this.nodes.push(marker);
  //           });
  //           // // Update the nodes array with the vertices of the polygon
  //           // polygon.getLatLngs()[0].forEach((latLng: L.LatLng) => {
  //           //     const marker = L.marker(latLng, { draggable: true });
  //           //     marker.on('contextmenu', () => this.onMarkerRightClick(marker));
  //           //     marker.addTo(this.map!);
  //           //     this.nodes.push(marker);
  //           // });
  //       });
  // }