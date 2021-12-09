import { Component, OnInit } from '@angular/core';
import {
  CLIENT_STATUS_KEYS,
  ClientStatus,
  ClientStatusTempData
} from '../../../../libs/bar-chart/src/lib/enums/client-status.enum';
import { CLIENT_STATUS_CONFIG } from '../../../../libs/bar-chart/src/lib/constants/client-status.config';
import { BehaviorSubject } from 'rxjs';

@Component({
  selector: 'client-onboarding-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  barChartConfig$ = new BehaviorSubject<any>({});
  private selectedClientStatus: ClientStatus | null = null;

  ngOnInit() {
    this.makeBarConfig();
  }

  onBarClick(clientStatus: string | number) {
    this.selectedClientStatus = clientStatus as unknown as ClientStatus;
    this.makeBarConfig();
  }

  private makeBarConfig(): void {
    this.barChartConfig$.next({
      labels: CLIENT_STATUS_KEYS.map(key => CLIENT_STATUS_CONFIG[key].name),
      yAxisName: '% of Clients',
      width: Infinity,
      margin: { top: 24, right: 0, bottom: 24, left: 0 },
      series: [
        {
          data: CLIENT_STATUS_KEYS.map(((id: ClientStatus, index) => ({
            value: ClientStatusTempData[index],
            color: CLIENT_STATUS_CONFIG[id].color,
            opacity: !this.selectedClientStatus ? 1 : this.selectedClientStatus === id ? 1 : .3,
            border: !this.selectedClientStatus ? '' : this.selectedClientStatus === id ? '#333' : '',
            id
          })))
        }
      ]
    });
  }
}
