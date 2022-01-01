import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppComponent } from './app.component';
import { HttpClientModule } from '@angular/common/http';
import { BarChartModule } from '@marsh-charts/bar-chart';
import { DonutChartModule } from '@marsh-charts/donut-chart';
import { BarTooltipComponent } from './components/bar-tooltip/bar-tooltip.component';
import { DonutTooltipComponent } from './components/donut-tooltip/donut-tooltip.component';
import { MapTooltipComponent } from './components/map-tooltip/map-tooltip.component';
import { MapChartModule } from '@marsh-charts/map-chart';

@NgModule({
  declarations: [AppComponent, BarTooltipComponent, DonutTooltipComponent, MapTooltipComponent],
  imports: [BrowserModule, HttpClientModule, BarChartModule, DonutChartModule, MapChartModule],
  bootstrap: [AppComponent],
})
export class AppModule {}
