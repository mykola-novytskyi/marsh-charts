import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { MapTooltip } from '@marsh-charts/map-chart';

@Component({
  selector: 'map-tooltip',
  templateUrl: './map-tooltip.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MapTooltipComponent {
  @Input() country: MapTooltip | null = null;
}
