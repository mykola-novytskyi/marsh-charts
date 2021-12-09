import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BarChartComponent } from './bar-chart.component';
import { BarTooltipComponent } from './components/bar-tooltip/bar-tooltip.component';

@NgModule({
  declarations: [BarChartComponent, BarTooltipComponent],
  imports: [CommonModule],
  exports: [BarChartComponent ],
})
export class BarChartModule {}
