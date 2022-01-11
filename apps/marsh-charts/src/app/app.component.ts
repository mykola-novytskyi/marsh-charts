import { Component, OnInit } from '@angular/core';
import { CLIENT_STATUS_KEYS, ClientStatus, ClientStatusTempData } from './enums/client-status.enum';
import { CLIENT_STATUS_CONFIG } from './constants/client-status.config';
import { BehaviorSubject } from 'rxjs';
import { MapCountry } from '@marsh-charts/map-chart';
import { fakeLoginCountries } from './fake-data/login-contries.const';
import { Bar, BarConfig } from '@marsh-charts/bar-chart';
import { Donut, DonutConfig } from '@marsh-charts/donut-chart';

@Component({
  selector: 'marsh-charts-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  barChartConfig$ = new BehaviorSubject<Partial<BarConfig>>({
    yAxisName: '% of Clients',
    width: Infinity,
  });
  bars$ = new BehaviorSubject<Bar[]>([])
  donutChartConfig$ = new BehaviorSubject<Partial<DonutConfig>>({ totalTitle: 'Total Clients' });
  donuts$ = new BehaviorSubject<Donut[]>([]);
  countries$ = new BehaviorSubject<MapCountry[]>(fakeLoginCountries);
  CLIENT_STATUS_CONFIG = CLIENT_STATUS_CONFIG;
  CLIENT_STATUS_KEYS = CLIENT_STATUS_KEYS;

  localStatuses = new Set([...CLIENT_STATUS_KEYS]);
  localStatusData = { ...ClientStatusTempData };
  private selectedClientStatus: ClientStatus | null = null;

  ngOnInit(): void {
    this.setData();
  }

  onChooseStatus(clientStatus: string | number): void {
    const status = this.selectedClientStatus === clientStatus ? null : clientStatus;
    this.selectedClientStatus = status as unknown as ClientStatus;
    this.setData();
  }

  onCheckboxChange(checked: boolean, status: ClientStatus) {
    checked ? this.localStatuses.add(status) : this.localStatuses.delete(status);
    this.setData();
  }

  onRandomData() {
    this.localStatusData = {
      [ClientStatus.Live]: this.getRandomInt(),
      [ClientStatus.Ready]: this.getRandomInt(),
      [ClientStatus.InProgress]: this.getRandomInt(),
      [ClientStatus.Provisioned]: this.getRandomInt(),
      [ClientStatus.Submitted]: this.getRandomInt(),
      [ClientStatus.Expected]: this.getRandomInt(),
      [ClientStatus.Deferred]: this.getRandomInt(),
    }
    this.setData();
  }

  private setData() {
    this.makeBarData();
    this.makeDonutChartConfig();
  }

  private makeBarData(): void {
    this.bars$.next(Array.from(this.localStatuses).sort().map(((id: ClientStatus) => ({
      value: this.localStatusData[id],
      label: CLIENT_STATUS_CONFIG[id].name,
      color: CLIENT_STATUS_CONFIG[id].color,
      selected: id === this.selectedClientStatus,
      opacity: !this.selectedClientStatus ? 1 : this.selectedClientStatus === id ? 1 : .3,
      border: !this.selectedClientStatus ? '' : this.selectedClientStatus === id ? '#333' : '',
      id
    }))));
  }

  private makeDonutChartConfig(): void {
    this.donuts$.next(
      Array.from(this.localStatuses).sort().map(((id: ClientStatus) => ({
        value: this.localStatusData[id],
        color: CLIENT_STATUS_CONFIG[id].color,
        id,
        opacity: !this.selectedClientStatus ? 1 : this.selectedClientStatus === id ? 1 : .3,
        border: !this.selectedClientStatus ? '' : this.selectedClientStatus === id ? '#333' : '',
        selected: id === this.selectedClientStatus
      })))
    );
  }

  private getRandomInt(max: number = 100) {
    return Math.floor(Math.random() * max);
  }
}
