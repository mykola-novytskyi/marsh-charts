import { ChangeDetectionStrategy, Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CLIENT_STATUS_CONFIG } from '../../constants/client-status.config';
import { BarTooltip } from '../../../../../../libs/bar-chart/src/lib/interfaces/bar-tooltip.interface';
import { ClientStatus } from '../../enums/client-status.enum';

@Component({
  selector: 'bar-tooltip',
  templateUrl: './bar-tooltip.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BarTooltipComponent implements OnChanges{
  @Input() bar: BarTooltip | null = null;

  status = '';

  ngOnChanges(changes: SimpleChanges) {
    if (changes.bar && changes.bar.currentValue) {
      this.status = CLIENT_STATUS_CONFIG[changes.bar.currentValue.id as ClientStatus].name
    }
  }
}
