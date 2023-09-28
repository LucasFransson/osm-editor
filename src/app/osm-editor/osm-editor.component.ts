// import { Component } from '@angular/core';

// @Component({
//   selector: 'app-osm-editor',
//   templateUrl: './osm-editor.component.html',
//   styleUrls: ['./osm-editor.component.scss']
// })
// export class OsmEditorComponent {

// }

import { Component, OnInit } from '@angular/core';
import * as L from 'leaflet';

@Component({
  selector: 'app-osm-editor',
  templateUrl: './osm-editor.component.html',
  //styleUrls: ['./osm-editor.component.css'],
})
export class OsmEditorComponent implements OnInit {
  map?: L.Map;
  nodes: L.Marker[] = [];
  currentPolygon?: L.Polygon;
  savedPolygons: L.Polygon[] = [];

  isSquareMode = false; // TODO: Change name and refactor
  squareWidth = 0.001; // Default width for the square
  squareHeight = 0.001; // Default height for the square

  ngOnInit() {}

  toggleSquareMode() {
    this.isSquareMode = !this.isSquareMode;
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

    if (this.isSquareMode) {
      this.createSquare(e.latlng);
      this.isSquareMode = false; // Reset the mode after creating the square
    } else {
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
    const halfWidth = this.squareWidth / 2;
    const halfHeight = this.squareHeight / 2;

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

    //const size = 0.001; // Adjust this value for the size of the square
    // Calculate the 4 corners of the square
    // const topLeft = new L.LatLng(center.lat + size, center.lng - size);
    // const topRight = new L.LatLng(center.lat + size, center.lng + size);
    // const bottomRight = new L.LatLng(center.lat - size, center.lng + size);
    // const bottomLeft = new L.LatLng(center.lat - size, center.lng - size);

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

// onMapReady(map: L.Map) {
//   this.map = map;
//   this.map.on('click', this.onMapClick.bind(this));
// }
