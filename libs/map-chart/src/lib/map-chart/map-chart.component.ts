import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ContentChild,
  ElementRef, Inject,
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
import { MapCountry } from '../interfaces/map-country.interface';
import { GeoData } from '../interfaces/geo-data.interface';
import { GeoProjection } from 'd3-geo';
import { Selection } from 'd3-selection';
import { GeoJsonProperties } from 'geojson';
import { mapIdName } from '../map-id-name.const'
import { DOCUMENT } from '@angular/common';

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
  @ViewChild('svg') private svgRef!: ElementRef;
  @ContentChild('customTooltip') customTooltip: TemplateRef<unknown> | null = null;

  hoveredCountry$ = new BehaviorSubject<MapTooltip | null>(null);
  private defaultOptions: MapConfig = {
    width: 900,
    height: 600
  };

  private options!: MapConfig;
  private tooltip: any; // Todo
  private countryDictionary: {[key: string] : MapCountry} = {};
  private initMap = false;
  private mapGroup!: Selection<SVGGElement, unknown, null, undefined>;
  private bubbleGroup!: Selection<SVGGElement, unknown, null, undefined>;
  private svg!: Selection<Element, unknown, any, any>;
  private projection!: GeoProjection;
  private totalValue = 0;
  private window: Window;
  private zoom!: d3.ZoomBehavior<Element, unknown>;

  constructor(@Inject(DOCUMENT) private document: Document) {
    this.window = this.document.defaultView!;
  }

  get svgGroups(): Selection<SVGGElement, unknown, null, undefined>[] {
    return [this.bubbleGroup, this.mapGroup];
  }

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
    this.zoom = d3.zoom()
      .scaleExtent([1, 15])
      .translateExtent([[0, 0], [this.options.width, this.options.height]])
      .on('zoom', this.handleZoom);

    this.svg = d3.select(this.svgRef.nativeElement)
      .attr('width', this.options.width)
      .attr('height', this.options.height)
      .call(this.zoom);

    this.projection = d3.geoMercator()
      .center([0, 40])                // GPS of location to zoom on
      .scale(135)                       // This is like the zoom
      .translate([this.options.width * 0.5, this.options.height * 0.5]);

    this.tooltip = d3.select(this.tooltipRef.nativeElement);
    this.mapGroup = this.svg.append('g');
    this.bubbleGroup = this.svg.append('g');

    this.mapGroup.selectAll('path')
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

    this.drawCountries();
  }

  onHome(): void {
    this.svg.transition().call(this.zoom.transform, d3.zoomIdentity.scale(1));
  }

  onZoomIn(): void {
    this.svg.transition().call(this.zoom.scaleBy, 2);
  }

  onZoomOut(): void {
    this.svg.transition().call(this.zoom.scaleBy, 0.5);
  }

  private drawCountries() {
    const svg = d3.select(this.svgRef.nativeElement);
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
    this.tooltip
      .style('left', event.x + 10 + this.window.scrollX + 'px')
      .style('top', event.y + this.window.scrollY + 20 + 'px');
  }

  private handleZoom = (event: any): void => {
    this.svgGroups.forEach(selection => selection.attr('transform', event.transform));
  }
}
