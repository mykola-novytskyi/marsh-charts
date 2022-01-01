import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ContentChild,
  ElementRef,
  Input,
  OnChanges,
  OnInit,
  SimpleChanges,
  TemplateRef,
  ViewChild
} from '@angular/core';

import * as d3 from 'd3';
import worldMap from '../world-map';
import { MapConfig } from '../interfaces/map-config.interface';
import { BehaviorSubject } from 'rxjs';
import { MapTooltip } from '../interfaces/map-tooltip.interface';
import { MapCountry } from '@marsh-charts/map-chart';
import { GeoData } from '../interfaces/geo-data.interface';
import { GeoProjection } from 'd3-geo';
import { Selection } from 'd3-selection';
import { GeoJsonProperties } from 'geojson';
import { mapIdName } from '../map-id-name.const'

@Component({
  selector: 'map-chart',
  templateUrl: './map-chart.component.html',
  styleUrls: ['./map-chart.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MapChartComponent implements OnInit, OnChanges, AfterViewInit {
  @Input() config!: Partial<MapConfig>;
  @Input() countries: MapCountry[] = [];

  @ViewChild('tooltip') tooltipRef!: ElementRef<HTMLElement>;
  @ViewChild('svg') private svg!: ElementRef;
  @ContentChild('customTooltip') customTooltip: TemplateRef<unknown> | null = null;

  hoveredCountry$ = new BehaviorSubject<MapTooltip | null>(null);
  private defaultOptions: MapConfig = {
    width: 900,
    height: 600
  };

  private options!: MapConfig;
  private MIN_SCALE = 1;
  private MAX_SCALE = 20;
  private viewBox = { x: 0, y: 0, width: 500, height: 500 };
  private startPoint = { x: 0, y: 0 };
  private endPoint = { x: 0, y: 0 };
  private isPanning = false;
  private scale = this.MIN_SCALE;
  private tooltip: any; // Todo
  private countryDictionary: {[key: string] : MapCountry} = {};
  private initMap = false;
  private bubbleGroup!: Selection<SVGGElement, unknown, null, undefined>;
  private projection!: GeoProjection;
  private totalValue = 0;

  ngOnInit() {
    this.options = {
      ...this.defaultOptions,
      ...this.config
    };
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.countries) {
      this.countryDictionary = {};
      this.totalValue = 0;
      changes.countries.currentValue.forEach((country: MapCountry) => {
        this.totalValue += country.value;
        this.countryDictionary[country.id] = country;
      });
      if (this.initMap) {
        this.drawCountries();
      }
    }
  }

  ngAfterViewInit(): void {
    console.log('ngAfterViewInit');
    const svg = d3.select(this.svg.nativeElement)
      .attr('width', this.options.width)
      .attr('height', this.options.height);

    this.projection = d3.geoMercator()
      .center([0, 40])                // GPS of location to zoom on
      .scale(135)                       // This is like the zoom
      .translate([this.options.width * 0.5, this.options.height * 0.5]);

    this.tooltip = d3.select(this.tooltipRef.nativeElement);

    svg.append('g')
      .selectAll('path')
      .data(worldMap.features)
      .join('path')
      // @ts-ignore
      .attr('d', d3.geoPath()
        .projection(this.projection)
      )
      .style('stroke', '#666666')
      .style('stroke-width', 0.6929)
      .style('stroke-opacity', 0.5)
      .style('fill', '#dddddd')
      .on('mouseover', (event: MouseEvent, country: GeoJsonProperties) => {
        if (country && this.countryDictionary[country.properties.id]) {
          this.hoveredCountry$.next({
            value: this.countryDictionary[country.properties.id].value,
            country: country.properties.name,
            total: this.totalValue
          });
        }
      })
      .on('mouseout', () => this.mouseout())
      .on('mousemove', (event: MouseEvent) => this.mousemove(event));

    this.bubbleGroup = svg.append('g');
    this.drawCountries();
    this.setViewBox(0, 0, this.options.width, this.options.height);
  }

  omMousewheel(event: WheelEvent): void {
    event.preventDefault();
    console.log(event.deltaY);
    const mx = event.offsetX;
    const my = event.offsetY;
    const dw = this.viewBox.width * Math.sign(event.deltaY) * 0.05;
    const dh = this.viewBox.height * Math.sign(event.deltaY) * 0.05;
    const dx = dw * mx / this.svg.nativeElement.clientWidth;
    const dy = dh * my / this.svg.nativeElement.clientHeight;

    let scale = this.svg.nativeElement.clientWidth / (this.viewBox.width - dw);

    if (scale < this.MIN_SCALE) {
      scale = this.MIN_SCALE;
    } else if (scale > this.MAX_SCALE) {
      scale = this.MAX_SCALE;
    }
    if (this.scale !== scale) {
      this.setScale(scale);
      this.setViewBox(this.viewBox.x + dx, this.viewBox.y + dy, this.viewBox.width - dw, this.viewBox.height - dh);
    }
  }

  onMouseleave(): void {
    this.changePanning(false);
  }

  onMouseup(event: MouseEvent) {
    if (this.isPanning) {
      this.endPoint = { x: event.x, y: event.y };
      const dx = (this.startPoint.x - this.endPoint.x) / this.scale;
      const dy = (this.startPoint.y - this.endPoint.y) / this.scale;
      this.setViewBox(this.viewBox.x + dx, this.viewBox.y + dy, this.viewBox.width, this.viewBox.height);
      this.changePanning(false);
    }
  }

  omMouseMove(event: MouseEvent): void {
    if (this.isPanning) {
      this.endPoint = { x: event.x, y: event.y };
      const dx = (this.startPoint.x - this.endPoint.x) / this.scale;
      const dy = (this.startPoint.y - this.endPoint.y) / this.scale;

      this.setViewBox(this.viewBox.x + dx, this.viewBox.y + dy, this.viewBox.width, this.viewBox.height, false);
    }
  }

  onMouseDown(event: MouseEvent): void {
    this.changePanning(true);
    this.startPoint = { x: event.x, y: event.y };
  }

  onHome(): void {
    this.setScale(this.MIN_SCALE);
    this.setViewBox(0, 0, this.svg.nativeElement.clientWidth, this.svg.nativeElement.clientHeight);
  }

  onZoomIn(): void {
    const dw = this.viewBox.width * Math.sign(100) * 0.2;
    const dh = this.viewBox.height * Math.sign(100) * 0.2;
    this.setScale(this.svg.nativeElement.clientWidth / (this.viewBox.width - dw));
    this.setViewBox(this.viewBox.x, this.viewBox.y, this.viewBox.width - dw, this.viewBox.height - dh);
    console.log('onZoomIn');
  }

  onZoomOut(): void {
    console.log('onZoomOut');
  }

  private setViewBox(x: number, y: number, width: number, height: number, changeViewBox = true) {
    if (changeViewBox) {
      this.viewBox = { x, y, width, height };
    }

    this.svg.nativeElement.setAttribute('viewBox', `${x} ${y} ${width} ${height}`);
  }

  private changePanning(isPanning: boolean): void {
    this.isPanning = isPanning;
  }

  private setScale(scale: number): void {
    this.scale = scale;
  }

  private drawCountries() {
    console.log('drawCountries', this.countryDictionary);
    const svg = d3.select(this.svg.nativeElement);
    // Add a scale for bubble size
    const bubbleExtent = d3.extent(this.countries, d => d.value);

    const size = d3.scaleSqrt()
      // @ts-ignore
      .domain(bubbleExtent)  // What's in the data
      .range([8, 18]);  // Size in pixel

    svg.selectAll<SVGPathElement, GeoData>('path')
      .filter((country: GeoData) => !!this.countryDictionary[country.properties.id])
      .style('fill', '#a3aaf3');

    const tooltipFunctionality = (selection: Selection<SVGCircleElement , MapCountry, SVGGElement, unknown>) => {
      selection.on('mouseover', (event: MouseEvent, country: MapCountry) => {
        this.hoveredCountry$.next({
          value: country.value,
          country: mapIdName[country.id],
          total: this.totalValue
        });
      })
        .on('mouseout', () => this.mouseout())
        .on('mousemove', (event: MouseEvent) => this.mousemove(event));
    }


    const bubbles = this.bubbleGroup.selectAll<SVGCircleElement, MapCountry>('circle')
      .data(this.countries)
      .join('circle')
      .attr('cx', (country: MapCountry) => this.projection([country.lon, country.lat])![0])
      .attr('cy', d => this.projection([d.lon, d.lat])![1])
      .attr('r', d => size(d.value))
      .style('fill', '#717beb')
      .attr('stroke', '#3c47e6')
      .attr('stroke-width', 1);


    const bubbleText = this.bubbleGroup.selectAll<SVGTextElement, MapCountry>('text')
      .data(this.countries)
      .join('text')
      .attr('x', (country: MapCountry) => this.projection([country.lon, country.lat])![0])
      .attr('y', d => this.projection([d.lon, d.lat])![1] + 5)
      .attr('text-anchor', 'middle')
      .style('font-size', '12px')
      .style('cursor', 'default')
      .text((country) => country.value);

    bubbles.call(tooltipFunctionality);
    // @ts-ignore
    bubbleText.call(tooltipFunctionality);
  }

  private mouseout(): void {
     this.hoveredCountry$.next(null);
  }

  private mousemove(event: MouseEvent): void {
    this.tooltip.style('left', event.x + 5 + 'px').style('top', event.y + 10 + 'px');
  }
}
