import { ChangeDetectionStrategy, Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CLIENT_STATUS_CONFIG } from '../../constants/client-status.config';
import { DonutTooltip } from '../../../../../../libs/donut-chart/src/lib/interfaces/donut-tooltip.interface';
import { ClientStatus } from '../../enums/client-status.enum';

@Component({
  selector: 'donut-tooltip',
  templateUrl: './donut-tooltip.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DonutTooltipComponent implements OnChanges {
  @Input() donut: DonutTooltip | null = null;

  status = '';

  ngOnChanges(changes: SimpleChanges) {
    if (changes.donut && changes.donut.currentValue) {
      this.status = CLIENT_STATUS_CONFIG[changes.donut.currentValue.id as ClientStatus].name
    }
  }
}
