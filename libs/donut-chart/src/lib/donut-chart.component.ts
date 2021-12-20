import {
  AfterViewInit,
  Component,
  ContentChild,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  SimpleChange,
  TemplateRef,
  ViewChild
} from '@angular/core';
import { BehaviorSubject, fromEvent, Subject, takeUntil } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import * as d3 from 'd3';
import { DonutTooltip } from './interfaces/donut-tooltip.interface';
import { Selection } from 'd3-selection';
import { DonutSection } from './interfaces/donut-section.interface';
import { Donut } from './interfaces/donut.interface';
import { DefaultArcObject } from 'd3';
import { CustomPathElement } from './interfaces/custom-path-element.interface';

@Component({
  selector: 'app-donut-chart',
  template: `
    <div class="donut-tooltip" #tooltip>
      <ng-container *ngTemplateOutlet="customTooltip; context: {donut$: hoveredDonut$}"></ng-container>
    </div>
    <div #container class="d-flex justify-content-center"></div>`,
  styleUrls: ['./donut-chart.component.scss']
})
export class DonutChartComponent implements OnInit, OnChanges, OnDestroy, AfterViewInit {
  @Input() donutChartConfig: any;

  @Output() sectionClick = new EventEmitter<string | number>();

  @ContentChild('customTooltip') customTooltip!: TemplateRef<unknown> | null;
  @ViewChild('tooltip') tooltipRef!: ElementRef<HTMLElement>;
  @ViewChild('container') element!: ElementRef;

  hoveredDonut$ = new BehaviorSubject<DonutTooltip | null>(null);
  private defaultOptions = {
    height: 300,
    width: 300,
    totalTitle: 'Total:',
    isPieChart: false,
    classes: {
      pieGroup: 'donut-chart-group',
      totalGroup: 'donut-total-group',
      legendGroup: 'donut-chart__legend-group',
      totalTitle: 'donut-chart__total-title',
      totalValue: 'donut-chart__total-value',
      currentPercentage: 'donut-chart__current-percentage',
      labelText: 'donut-chart__label-text',
      labelPercentageBackground: 'donut-chart__label-percentage-background',
      labelPercentageText: 'donut-chart__label-percentage-text',
      svg: 'donut-svg',
      pie: 'slice'
    }
  };

  private options: any;
  private chartContainer!: HTMLElement;
  private svg: any;
  private pieGroup: any;
  private totalGroup: any;
  private labelGroup: any;
  private totalCount = 0;
  private createAnimationTiming = 1000;
  private createOpacityTransition = d3.transition().delay(this.createAnimationTiming).ease(d3.easeLinear);
  private radius!: number;
  private tooltip!: Selection<HTMLElement, unknown, null, undefined>;

  private unsubscribe = new Subject<void>();

  /**
   * Redraw chart on window resize
   */
  ngOnInit(): void {
    fromEvent(window, 'resize').pipe(debounceTime(100), takeUntil(this.unsubscribe)).subscribe(() => this.render());
  }

  ngAfterViewInit(): void {
    this.chartContainer = this.element.nativeElement;
    this.tooltip = d3.select(this.tooltipRef.nativeElement);
    this.render();
  }

  ngOnChanges(changes: { [propertyName: string]: SimpleChange }): void {
    if (changes['donutChartConfig'] && this.donutChartConfig) {
      this.render();
    }
  }

  ngOnDestroy(): void {
    this.unsubscribe.next();
    this.unsubscribe.complete();
  }

  render = (): void => {
    this.options = Object.assign({}, this.defaultOptions, this.donutChartConfig);
    this.radius = d3.min([this.options.width, this.options.height]) / 2;

    if (!this.options.data || !this.chartContainer) {
      return;
    }

    this.totalCount = 0;
    this.options.data.forEach((section: Donut) => this.totalCount += section.value);

    this.buildSVG();
    this.drawDonut();
    this.drawTotal();
  };


  buildSVG() {
    const container = d3.select(this.chartContainer);

    if (!this.svg) {
      this.svg = container.append('svg');
      this.pieGroup = this.svg.append('g').classed(this.options.classes.pieGroup, true)
        .attr('transform', () => `translate(${this.options.width / 2}, ${this.options.height / 2})`);
      this.totalGroup = this.svg.append('g').classed(this.options.classes.totalGroup, true)
        .attr('transform', () => `translate(${this.options.width / 2},  ${(this.options.height / 2 - this.radius / 8)})`);
      this.labelGroup = this.svg.append('g')
        .attr('transform', () => `translate(${this.options.width / 2}, ${this.options.height / 2})`);
    }

    this.svg.attr('class', () => 'donut-chart').attr('width', this.options.width).attr('height', this.options.height);
  }

  drawDonut() {
    const radius = this.radius;
    const options = this.options;
    const arc = this.options.isPieChart ? d3.arc().innerRadius(0).outerRadius(radius * 0.65) :
      d3.arc().innerRadius(radius - radius * 0.6).outerRadius(radius - radius * 0.35);
    const bigArc = d3.arc().innerRadius(radius - radius * 0.6).outerRadius(radius - radius * 0.3);
    const pie = d3.pie().sort(null).value((item: any): number => item.value);
    const arcs = this.pieGroup.selectAll('path').data(pie(options.data));
    const newArcs = arcs.enter().append('svg:path').style('cursor', 'pointer');
    const labels = this.labelGroup.attr('font-family', 'sans-serif')
      .attr('font-size', 12)
      .selectAll('text')
      .data(pie(options.data));
    const self = this;

    labels.enter()
      .append('text')
      .style('opacity', 0)
      .transition(this.createOpacityTransition)
      .style('opacity', 1)
      .selection().merge(labels)
      .attr('text-anchor', (d: DonutSection) => (d.startAngle + (d.endAngle - d.startAngle) / 2 < Math.PI ? 'start' : 'end'))
      .attr('transform', (d: DefaultArcObject) => `translate(${bigArc.centroid(d).map(coordinate => coordinate * 1.28)})`)
      .text((d: DonutSection) => `${this.calculatePercentage(d)}%`);

    newArcs
      .attr('fill', (d: DonutSection) => d.data.color)
      .attr('d', arc as any)
      .classed('donut-slice', true)
      .each(function(this: CustomPathElement, d: DonutSection) {
        this._current = d;
      })
      .transition()
      .duration(this.createAnimationTiming)
      .attrTween('d', function(d: DefaultArcObject) {
        const interpolate = d3.interpolate({ startAngle: 0, endAngle: 0 }, d);
        return function(t: any) {
          return arc(interpolate(t));
        };
      });


    newArcs.merge(arcs)
      .on('mouseover', function(this: CustomPathElement, event: MouseEvent, d: DonutSection) {
        self.hoveredDonut$.next({
          id: d.data.id,
          value: d.data.value,
          percentage: self.calculatePercentage(d)
        });

        if (!self.options.isPieChart) {
          // @ts-ignore
          d3.select(this).transition().duration(300).attr('d', bigArc);
        }
      })
      .on('mouseout', function() {
        self.hoveredDonut$.next(null);
        if (!self.options.isPieChart) {
          // @ts-ignore
          d3.select(this).transition().duration(300).ease(d3.easeBack).attr('d', arc);
        }
      })
      .on('click', (event: MouseEvent, d: any) => this.sectionClick.emit(d.data.id))
      .on('mousemove', (event: MouseEvent) => this.tooltip.style('left', event.x + 20 + 'px').style('top', event.y + 25 + 'px'))
      .attr('fill', (d: any) => d.data.color)
      .attr('stroke', (d: DonutSection) => d.data.border)
      .style('stroke-width', (d: DonutSection) => this.options.isPieChart && d.data.opacity ? '2px' : 0)
      .style('opacity', (d: DonutSection) => this.options.isPieChart ? (d.data.opacity || 1) : 1);

    // update
    arcs.transition().duration(500).attrTween('d', function(this: CustomPathElement, a: any) {
      const i = d3.interpolate(this._current, a);
      this._current = i(0);
      // @ts-ignore
      return function(t) {
        return arc(i(t));
      };
    });
  }

  drawTotal() {
    const totalText = this.totalGroup.selectAll(`.${this.options.classes.totalTitle}`).data([this.options.data]);
    const totalValue = this.totalGroup.selectAll(`.${this.options.classes.totalValue}`).data([this.options.data]);

    totalText
      .enter()
      .append('text')
      .attr('y', this.radius / 12)
      .attr('class', this.options.classes.totalTitle)
      .style('opacity', 0)
      .transition(this.createOpacityTransition)
      .style('opacity', 1)
      .selection().merge(totalText)
      .text(() => this.options.isPieChart ? '' : this.options.totalTitle);

    totalValue.enter().append('text').attr('y', this.radius / 5)
      .attr('class', this.options.classes.totalValue)
      .style('opacity', 0)
      .transition(this.createOpacityTransition)
      .style('opacity', 1)
      .selection().merge(totalValue).text(() => this.options.isPieChart ? '' : this.totalCount);
  }

  private calculatePercentage(d: DonutSection): number {
    return Math.round((d.data.value / this.totalCount) * 100);
  }
}
