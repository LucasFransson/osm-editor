import { Component, OnInit } from '@angular/core';
// import 'leaflet-path-drag';
import * as L from 'leaflet';
// import { map, tileLayer, marker } from 'leaflet'; // TODO: Refactor and change to this

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

enum EditorMode {
  POLYGON,
  SINGLE_NODE,
  SQUARE,
  CHAINED_NODES,
}

@Component({
  selector: 'app-osm-editor',
  templa+
  teUrl: './osm-editor.component.html',
  //styleUrls: ['./osm-editor.component.css'],
})
export class OsmEditorComponent implements OnInit {
  private readonly SCALE_FACTOR = 0.0001; // TODO: Conside refactoring, this is for user-friendly numbers

  map?: L.Map;
  nodes: L.Marker[] = [];
  currentPolygon?: L.Polygon;
  savedPolygons: L.Polygon[] = [];
  public EditorMode = EditorMode;
  currentMode: EditorMode = EditorMode.POLYGON;

  squareWidth = 1; // This represents 0.001 internally due to the SCALE_FACTOR
  squareHeight = 1;
  // squareWidth = 0.001; // Default width for the square
  // squareHeight = 0.001; // Default height for the square

  ngOnInit() {}

  // Current Edit Tool Togglers

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

  onMapReady(map: L.Map) {
    this.map = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.map);

    this.map.on('click', this.onMapClick.bind(this));
  }

  onMapClick(e: L.LeafletMouseEvent) {
    if (!this.map) return; // Exit if map is not initialized

    switch (this.currentMode) {
      // Square Editor Mode
      case EditorMode.SQUARE:
        this.createSquare(e.latlng);
        break;
      case EditorMode.SINGLE_NODE:
        const singleMarker = L.marker(e.latlng, { draggable: true }).addTo(
          this.map
        );
        singleMarker.on('dragend', this.onMarkerDragEnd.bind(this));
        this.nodes.push(singleMarker);
        break;

      // Chained Nodes Editor Mode
      case EditorMode.CHAINED_NODES:
        // Check if the clicked point is within 10 meters of the first node
        if (
          this.nodes.length > 0 &&
          e.latlng.distanceTo(this.nodes[0].getLatLng()) <= 10
        ) {
          // Close the chain by connecting the last node to the first node
          const latlngs = [
            ...this.nodes.map((node) => node.getLatLng()),
            this.nodes[0].getLatLng(),
          ];
          this.currentPolygon = L.polygon(latlngs).addTo(this.map); // Create a polygon
          this.nodes = []; // Clear the nodes if you want to start a new chain
        } else {
          const chainedMarker = L.marker(e.latlng, { draggable: true }).addTo(
            this.map
          );
          chainedMarker.on('dragend', this.onMarkerDragEnd.bind(this));
          this.nodes.push(chainedMarker);

          if (this.nodes.length > 1) {
            const latlngs = [
              this.nodes[this.nodes.length - 2].getLatLng(),
              chainedMarker.getLatLng(),
            ];
            L.polyline(latlngs).addTo(this.map); // Continue adding lines between nodes
          }
        }
        break;
      // Polygon Editor Mode
      case EditorMode.POLYGON:
      default:
        const marker = L.marker(e.latlng, { draggable: true }).addTo(this.map);
        marker.on('dragend', this.onMarkerDragEnd.bind(this));
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
  onMarkerDragEnd() {
    if (this.currentPolygon && this.map) {
      const latlngs = this.nodes.map((node) => node.getLatLng());
      this.currentPolygon.setLatLngs(latlngs);
    }
  }
  createSquare(center: L.LatLng) {
    // Calculate half width and height for positioning
    // const halfWidth = this.squareWidth / 2;
    // const halfHeight = this.squareHeight / 2;

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
      marker.addTo(this.map!);
      this.nodes.push(marker);
    });

    // Create the square polygon
    const latlngs = [topLeft, topRight, bottomRight, bottomLeft, topLeft];
    this.currentPolygon = L.polygon(latlngs).addTo(this.map!);
  }

  saveCurrentArea() {
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





// WORKING SAVE BUT NOT SAVING CHAINED NDOES
//   saveCurrentArea() {
//     if (this.currentPolygon) {
//       // Save the current polygon to the savedPolygons array
//       this.savedPolygons.push(this.currentPolygon);

//       // Clear the current markers and polygon for the next area
//       this.nodes.forEach((marker) => marker.remove());
//       this.nodes = [];
//       this.currentPolygon = undefined;
//     }
//   }
// }

// onMapReady(map: L.Map) {
//   this.map = map;
//   this.map.on('click', this.onMapClick.bind(this));
// }

//const size = 0.001; // Adjust this value for the size of the square
// Calculate the 4 corners of the square
// const topLeft = new L.LatLng(center.lat + size, center.lng - size);
// const topRight = new L.LatLng(center.lat + size, center.lng + size);
// const bottomRight = new L.LatLng(center.lat - size, center.lng + size);
// const bottomLeft = new L.LatLng(center.lat - size, center.lng - size);

//   if (this.isSquareMode) {
//     this.createSquare(e.latlng);
//     this.isSquareMode = false; // Reset the mode after creating the square
//   } else if (this.isSingleNodeMode) {
//     const marker = L.marker(e.latlng, { draggable: true }).addTo(this.map);
//     marker.on('dragend', this.onMarkerDragEnd.bind(this));
//     this.nodes.push(marker);
//   } else {
//     const marker = L.marker(e.latlng, { draggable: true }).addTo(this.map);
//     marker.on('dragend', this.onMarkerDragEnd.bind(this));
//     this.nodes.push(marker);

//     if (this.nodes.length > 1) {
//       if (this.currentPolygon) {
//         this.currentPolygon.remove();
//       }

//       const latlngs = this.nodes.map((node) => node.getLatLng());
//       this.currentPolygon = L.polygon(latlngs).addTo(this.map);
//     }
//   }
// }

//   completeChain() {
//     if (this.currentMode === EditorMode.CHAINED_NODES && this.nodes.length > 1) {
//         const latlngs = [this.nodes[this.nodes.length - 1].getLatLng(), this.nodes[0].getLatLng()];
//         L.polyline(latlngs).addTo(this.map);
//         this.setModeToDefault();
//     }
// }

// WORKING BUT DOESNT CREATE AN AREA
// case EditorMode.CHAINED_NODES:
//   // Check if the clicked location is near the first node
//   if (
//     this.nodes.length > 0 &&
//     this.map.distance(e.latlng, this.nodes[0].getLatLng()) < 10
//     // SOME_THRESHOLD
//   ) {
//     // Close the chain by connecting the last node to the first node
//     const latlngs = [
//       this.nodes[this.nodes.length - 1].getLatLng(),
//       this.nodes[0].getLatLng(),
//     ];
//     L.polyline(latlngs).addTo(this.map);
//     // Place the last node at the position of the first node
//     this.nodes[this.nodes.length - 1].setLatLng(
//       this.nodes[0].getLatLng()
//     );
//     // Optionally, you can change the mode after closing the chain
//     this.setModeToDefault();
//   } else {
//     const chainedMarker = L.marker(e.latlng, { draggable: true }).addTo(
//       this.map
//     );
//     chainedMarker.on('dragend', this.onMarkerDragEnd.bind(this));
//     this.nodes.push(chainedMarker);

//     // If there's a previous node, link the new node to it
//     if (this.nodes.length > 1) {
//       const previousNode = this.nodes[this.nodes.length - 2];
//       const latlngs = [
//         previousNode.getLatLng(),
//         chainedMarker.getLatLng(),
//       ];
//       L.polyline(latlngs).addTo(this.map);
//     }
//   }
//   break;

// case EditorMode.CHAINED_NODES:
//   // Check if the clicked location is near the first node
//   if (
//     this.nodes.length > 0 &&
//     this.map.distance(e.latlng, this.nodes[0].getLatLng()) <
//       SOME_THRESHOLD
//   ) {
//     // Close the chain by connecting the last node to the first node
//     const latlngs = [
//       this.nodes[this.nodes.length - 1].getLatLng(),
//       this.nodes[0].getLatLng(),
//     ];
//     L.polyline(latlngs).addTo(this.map);
//     // Optionally, you can change the mode after closing the chain
//     this.setModeToDefault();
//   } else {
//     const chainedMarker = L.marker(e.latlng, { draggable: true }).addTo(
//       this.map
//     );
//     chainedMarker.on('dragend', this.onMarkerDragEnd.bind(this));
//     this.nodes.push(chainedMarker);

//     // If there's a previous node, link the new node to it
//     if (this.nodes.length > 1) {
//       const previousNode = this.nodes[this.nodes.length - 2];
//       const latlngs = [
//         previousNode.getLatLng(),
//         chainedMarker.getLatLng(),
//       ];
//       L.polyline(latlngs).addTo(this.map);
//     }
//   }
//   break;

// WORKING BUT NO CONNECTIONS
// case EditorMode.CHAINED_NODES:
//   const chainedMarker = L.marker(e.latlng, { draggable: true }).addTo(
//     this.map
//   );
//   chainedMarker.on('dragend', this.onMarkerDragEnd.bind(this));
//   this.nodes.push(chainedMarker);

//   // If there's a previous node, link the new node to it
//   if (this.nodes.length > 1) {
//     const previousNode = this.nodes[this.nodes.length - 2];
//     const latlngs = [previousNode.getLatLng(), chainedMarker.getLatLng()];
//     L.polyline(latlngs).addTo(this.map);
//   }
//   break;
