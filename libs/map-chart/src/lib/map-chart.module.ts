import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MapChartComponent } from './map-chart/map-chart.component';

@NgModule({
  imports: [CommonModule],
  declarations: [
    MapChartComponent
  ],
  exports: [MapChartComponent]
})
export class MapChartModule {}
