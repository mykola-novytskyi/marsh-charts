import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppComponent } from './app.component';
import { HttpClientModule } from '@angular/common/http';
import { BarChartModule } from '@client-onboarding/bar-chart';

@NgModule({
  declarations: [AppComponent],
  imports: [BrowserModule, HttpClientModule, BarChartModule],
  providers: [],
  bootstrap: [AppComponent],
})
export class AppModule {}
