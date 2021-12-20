import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppComponent } from './app.component';
import { HttpClientModule } from '@angular/common/http';
import { BarChartModule } from '@client-onboarding/bar-chart';
import { DonutChartModule } from '@client-onboarding/donut-chart';
import { BarTooltipComponent } from './components/bar-tooltip/bar-tooltip.component';
import { DonutTooltipComponent } from './components/donut-tooltip/donut-tooltip.component';

@NgModule({
  declarations: [AppComponent, BarTooltipComponent, DonutTooltipComponent],
  imports: [BrowserModule, HttpClientModule, BarChartModule, DonutChartModule],
  providers: [],
  bootstrap: [AppComponent],
})
export class AppModule {}
