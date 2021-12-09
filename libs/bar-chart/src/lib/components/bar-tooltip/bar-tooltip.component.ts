import { Component, Input } from '@angular/core';
import { CLIENT_STATUS_CONFIG } from '../../constants/client-status.config';
import { BarTooltip } from '../../interfaces/bar-tooltip.interface';
//TODO fix templates
@Component({
  selector: 'bar-tooltip',
  templateUrl: './bar-tooltip.component.html',
  styleUrls: ['./bar-tooltip.component.scss']
})
export class BarTooltipComponent {
  @Input() bar: BarTooltip | null = null;

  CLIENT_STATUS_CONFIG = CLIENT_STATUS_CONFIG;
}
