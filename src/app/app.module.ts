import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';

import { AppComponent } from './app.component';
import { OsmEditorComponent } from './osm-editor/osm-editor.component';
import { LeafletModule } from '@asymmetrik/ngx-leaflet';

@NgModule({
  declarations: [AppComponent, OsmEditorComponent],
  imports: [BrowserModule, LeafletModule, FormsModule],
  providers: [],
  bootstrap: [AppComponent],
})
export class AppModule {}
