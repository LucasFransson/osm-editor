import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OsmEditorComponent } from './osm-editor.component';

describe('OsmEditorComponent', () => {
  let component: OsmEditorComponent;
  let fixture: ComponentFixture<OsmEditorComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [OsmEditorComponent]
    });
    fixture = TestBed.createComponent(OsmEditorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
