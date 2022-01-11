import {
  AfterViewInit,
  Component,
  ContentChild,
  ElementRef,
  EventEmitter,
  Inject,
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
import { BaseType, PieArcDatum } from 'd3';
import { DonutTooltip } from './interfaces/donut-tooltip.interface';
import { Selection } from 'd3-selection';
import { Donut } from './interfaces/donut.interface';
import { CustomPathElement } from './interfaces/custom-path-element.interface';
import { DOCUMENT } from '@angular/common';
import { DonutConfig } from './interfaces/donut-config.interface';

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
  @Input() config: Partial<DonutConfig> = {};
  @Input() donuts: Donut[] = [];

  @Output() sectionClick = new EventEmitter<string | number>();

  @ContentChild('customTooltip') customTooltip!: TemplateRef<unknown> | null;
  @ViewChild('tooltip') tooltipRef!: ElementRef<HTMLElement>;
  @ViewChild('container') element!: ElementRef;

  hoveredDonut$ = new BehaviorSubject<DonutTooltip | null>(null);
  private defaultOptions: DonutConfig = {
    height: 300,
    width: 300,
    totalTitle: 'Total:',
  };

  private options!: DonutConfig;
  private chartContainer!: HTMLElement;
  private svg!: Selection<SVGSVGElement, unknown, null, undefined>;
  private pieGroup!: Selection<SVGGElement, unknown, null, undefined>;
  private totalGroup!: Selection<SVGGElement, unknown, null, undefined>;
  private labelGroup!: Selection<SVGGElement, unknown, null, undefined>;
  private totalTextElement!: Selection<SVGTextElement, unknown, null, undefined>;
  private totalValueElement!: Selection<SVGTextElement, unknown, null, undefined>;
  private totalCount = 0;
  private createAnimationTiming = 1000;
  private transitionDuration = 1000;
  private radius!: number;
  private tooltip!: Selection<HTMLElement, unknown, null, undefined>;
  private createTransition: any;
  private firstInitialize = false;
  private hasSelectedDonut = false;
  private labelLocal = d3.local();
  private totalTitleClass = 'donut-chart-total-title';
  private totalValueClass = 'donut-chart-total-value';
  private pie = d3.pie<DonutChartComponent, Donut>().sort(null).value((item: any): number => item.value);

  private unsubscribe = new Subject<void>();

  private window: Window;

  constructor(@Inject(DOCUMENT) private document: Document) {
    this.window = this.document.defaultView!;
  }

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

  ngOnChanges(): void {
    this.render();
  }

  ngOnDestroy(): void {
    this.unsubscribe.next();
    this.unsubscribe.complete();
  }

  buildSVG() {
    const container = d3.select(this.chartContainer);

    if (!this.svg) {
      this.svg = container.append('svg');
      this.pieGroup = this.svg.append('g')
        .attr('transform', () => `translate(${this.options.width / 2}, ${this.options.height / 2})`);
      this.totalGroup = this.svg.append('g')
        .attr('transform', () => `translate(${this.options.width / 2},  ${(this.options.height / 2 - this.radius / 8)})`);
      this.labelGroup = this.svg.append('g')
        .attr('font-family', 'sans-serif')
        .attr('font-size', 12)
        .attr('transform', () => `translate(${this.options.width / 2}, ${this.options.height / 2})`);

      this.totalTextElement = this.totalGroup
        .classed(this.totalTitleClass, true)
        .append('text')
        .attr('y', this.radius / 12);

      this.totalTextElement
        .style('opacity', 0)
        .transition(this.createTransition)
        .style('opacity', 1);

      this.totalValueElement = this.totalGroup.append('text')
        .attr('y', this.radius / 5)
        .attr('class', this.totalValueClass);

      this.totalValueElement
        .style('opacity', 0)
        .transition(this.createTransition)
        .style('opacity', 1);
    }

    this.svg.attr('class', () => 'donut-chart').attr('width', this.options.width).attr('height', this.options.height);
  }

  private render = (): void => {
    this.options = { ...this.defaultOptions, ...this.config };
    this.radius = d3.min([this.options.width, this.options.height])! / 2;
    this.createTransition = d3.transition('createTransition').delay(this.createAnimationTiming).ease(d3.easeLinear);

    if (!this.donuts || !this.chartContainer) {
      return;
    }

    this.totalCount = 0;
    this.hasSelectedDonut = false;
    this.donuts.forEach((section: Donut) => {
      if (section.selected) {
        this.hasSelectedDonut = true;
      }
      this.totalCount += section.value;
    });

    this.buildSVG();
    this.drawDonut();
    this.drawLabels();
    this.updateTotal();
  };

  private drawDonut() {
    const arc = this.hasSelectedDonut ? d3.arc().innerRadius(0).outerRadius(this.radius * 0.65) :
      d3.arc().innerRadius(this.radius - this.radius * 0.6).outerRadius(this.radius - this.radius * 0.35);
    const animatedArc = d3.arc().innerRadius(this.radius - this.radius * 0.61).outerRadius(this.radius - this.radius * 0.34);
    const self = this;

    this.pieGroup.selectAll<CustomPathElement, PieArcDatum<Donut>>('path')
      .data(this.pie(this.donuts), (d) => d.data.id)
      // @ts-ignore
      .join(enter => enter.each(function(this: CustomPathElement, d: PieArcDatum<Donut>) {
          this._current = d;
        })
          .append('svg:path')
          .style('cursor', 'pointer')
          .call(enter =>
            enter.transition()
              .duration(this.firstInitialize ? this.transitionDuration : this.createAnimationTiming)
              // @ts-ignore
              .attrTween('d', function(this: CustomPathElement, d: PieArcDatum<Donut>) {
                let startCoordinates = { startAngle: 0, endAngle: 0 };
                if (self.firstInitialize) {
                  startCoordinates = this.nextSibling ? (this.nextSibling as CustomPathElement)._current : { startAngle: d.endAngle, endAngle: d.endAngle};
                }
                const interpolate = d3.interpolate( startCoordinates, d);
                this._current = interpolate(1)
                return function(t: number) {
                  // @ts-ignore
                  return arc(interpolate(t));
                };
              })
              .on('end', () => this.firstInitialize = true)),
        update => update.call(update =>
          update
            .transition()
            .duration(this.transitionDuration)
            // @ts-ignore
            .attrTween('d', function(this: CustomPathElement, section: PieArcDatum<Donut>) {
              const interpolate = d3.interpolate(this._current, section);
              this._current = interpolate(1);
              // @ts-ignore
              return function(t) {
                // @ts-ignore
                return arc(interpolate(t));
              };
            })),
        exit => exit.call(exit => exit.transition().duration(this.transitionDuration)
          .attrTween('d', function(this: SVGPathElement, section: PieArcDatum<Donut>) {
            const nextCurrent = this.nextSibling ?
              (this.nextSibling as CustomPathElement)._current
              : { startAngle: (this as CustomPathElement)._current.endAngle, endAngle: (this as CustomPathElement)._current.endAngle};
            const interpolate = d3.interpolate(section, nextCurrent);
            return function(t: number) {
              // @ts-ignore
              return arc(interpolate(t));
            };
          })
          .on('end', function() {
            d3.select(this).remove();
          })
        )
      )
      .on('mouseover', function(this: BaseType | SVGPathElement, event: MouseEvent, d: PieArcDatum<Donut>) {
        self.hoveredDonut$.next({
          id: d.data.id,
          value: d.data.value,
          percentage: self.calculatePercentage(d)
        });

        if (!self.hasSelectedDonut) {
          const thisPath = d3.select(this);
          thisPath.style('fill', () => d3.rgb(thisPath.style('fill')).darker(0.3) as any);
          // @ts-ignore
          thisPath.transition().duration(300).attr('d', animatedArc);
        }
      })
      .on('mouseout', function(event: MouseEvent, d: PieArcDatum<Donut>) {
        self.hoveredDonut$.next(null);
        d3.select(this).style('fill', d.data.color);
        if (!self.hasSelectedDonut) {
          // @ts-ignore
          d3.select(this).transition().duration(300).ease(d3.easeBack).attr('d', arc);
        }
      })
      .on('click', (event: MouseEvent, d: PieArcDatum<Donut>) => this.sectionClick.emit(d.data.id))
      .on('mousemove', (event: MouseEvent) =>
        this.tooltip
          .style('left', event.x + 20 + this.window.scrollX + 'px')
          .style('top', event.y + 25 + this.window.scrollY + 'px'))
      .style('fill', (d: PieArcDatum<Donut>) => d.data.color)
      .style('stroke', (d: PieArcDatum<Donut>) => d.data.border)
      .style('stroke-width', (d: PieArcDatum<Donut>) => this.hasSelectedDonut && d.data.opacity ? '2px' : 0)
      .style('opacity', (d: PieArcDatum<Donut>) => this.hasSelectedDonut ? (d.data.opacity || 1) : 1);
  }

  private updateTotal(): void {
    const self = this;
    this.totalTextElement.text(() => this.hasSelectedDonut ? '' : this.options.totalTitle);
    if (this.hasSelectedDonut) {
      this.totalValueElement.text('');
    } else if (this.totalValueElement.text() === ''){
      this.totalValueElement.text(this.totalCount);
    } else {
      this.totalValueElement.transition()
        .duration(1000)
        .tween('text', function() {
          const textSelection = d3.select(this);
          const start = +textSelection.text();
          const interpolator = d3.interpolateNumber(start, self.totalCount);

          return (t) => textSelection.text(Math.round(interpolator(t)));
        })
    }
  }

  private drawLabels(): void {
    const self = this;
    const data = this.pie(this.donuts);
    const labelArc = d3.arc().innerRadius(this.radius - this.radius * 0.6).outerRadius(this.radius - this.radius * 0.3);

    this.labelGroup
      .selectAll<SVGTextElement, PieArcDatum<Donut>>('text')
      .data(data, (section: PieArcDatum<Donut>) => section.data.id)
      .join(
        enter => enter.append('text')
          .style('opacity', 0)
          .text((d: PieArcDatum<Donut>) => `${this.calculatePercentage(d)}%`)
          .call(enter => enter.transition(this.createTransition).style('opacity', 1)
          ),
        update => update.call(update => update.transition().duration(this.transitionDuration)
          .tween('text', function(d: PieArcDatum<Donut>) {
            const textSelection = d3.select(this);
            const start = parseInt(textSelection.text());
            const interpolator = d3.interpolateNumber(start, self.calculatePercentage(d));

            return (t: number) => textSelection.text(`${Math.round(interpolator(t))}%`);
          })),
        exit => exit.call(exit => exit.transition()
          .duration(this.transitionDuration)
          .attrTween("transform", function(this: any, d, index) {
            const previousElement = data[index - 1] ? data[index - 1] : { endAngle: d.startAngle};
            const interpolate = d3.interpolate(d, { startAngle: previousElement.endAngle, endAngle: previousElement.endAngle});

            return function(t: number) {
              return "translate("+ labelArc.centroid(interpolate(t) as any).map(coordinate => coordinate * 1.3) +")";
            };
          })
          .on('end', function() {
            d3.select(this).remove();
          })
        )
      )
      .each(function(d) { self.labelLocal.set(this, d.value)})
      .attr('text-anchor', (d: PieArcDatum<Donut>) => (d.startAngle + (d.endAngle - d.startAngle) / 2 < Math.PI ? 'start' : 'end'))
      .transition('update')
      .duration(this.transitionDuration)
      .attrTween("transform", function(this: any, d) {
          this._current = this._current || d;
          const interpolate = d3.interpolate(this._current, d);
          this._current = interpolate(0);
          return function(t: number) {
            const d2 = interpolate(t);
            return "translate("+ labelArc.centroid(d2 as any).map(coordinate => coordinate * 1.3) +")";
          };
        })
  }

  private calculatePercentage(d: PieArcDatum<Donut>): number {
    return Math.round((d.data.value / this.totalCount) * 100);
  }
}
