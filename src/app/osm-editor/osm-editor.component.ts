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
  polygon?: L.Polygon;

  ngOnInit() {}

  // onMapReady(map: L.Map) {
  //   this.map = map;
  //   this.map.on('click', this.onMapClick.bind(this));
  // }

  onMapReady(map: L.Map) {
    this.map = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.map);

    this.map.on('click', this.onMapClick.bind(this));
  }
  // onMapReady(map: L.Map) {
  //   this.map = map;

  //   // Add OSM tile layer to the map
  //   L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  //     attribution:
  //       '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  //   }).addTo(this.map);

  //   // Add an event listener for map clicks
  //   this.map.on('click', this.onMapClick.bind(this));
  // }

  // onMapClick(e: L.LeafletMouseEvent) {
  //   const marker = L.marker(e.latlng).addTo(this.map);
  //   this.nodes.push(marker);

  //   if (this.nodes.length > 1) {
  //     if (this.polygon) {
  //       this.polygon.remove();
  //     }

  //     const latlngs = this.nodes.map((node) => node.getLatLng());
  //     this.polygon = L.polygon(latlngs).addTo(this.map);
  //   }
  // }

  onMapClick(e: L.LeafletMouseEvent) {
    if (!this.map) return; // Exit if map is not initialized

    const marker = L.marker(e.latlng).addTo(this.map);
    this.nodes.push(marker);

    if (this.nodes.length > 1) {
      if (this.polygon) {
        this.polygon.remove();
      }

      const latlngs = this.nodes.map((node) => node.getLatLng());
      this.polygon = L.polygon(latlngs).addTo(this.map);
    }
  }
}
