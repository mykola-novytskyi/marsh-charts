import {
  AfterViewInit,
  ChangeDetectionStrategy,
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
  TemplateRef,
  ViewChild
} from '@angular/core';
import { BehaviorSubject, fromEvent, Subject, takeUntil } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import * as d3 from 'd3';
import { ScaleBand, ScaleLinear } from 'd3';
import { Bar } from './interfaces/bar.interface';
import { BarTooltip } from './interfaces/bar-tooltip.interface';
import { DOCUMENT } from '@angular/common';
import { Selection } from 'd3-selection';
import { BarConfig } from './interfaces/bar-config.interface';

@Component({
  selector: 'bar-chart',
  template: `
    <div class="bar-tooltip" #tooltip>
      <ng-container *ngTemplateOutlet="customTooltip; context: {bar$: hoveredBar$}"></ng-container>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }

    .bar-tooltip {
      position: absolute;
      white-space: nowrap;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BarChartComponent implements OnInit, OnDestroy, OnChanges, AfterViewInit {
  @Input() chartConfig!: Partial<BarConfig>;
  @Input() bars: Bar[] = [];

  @Output() barClick = new EventEmitter<number | string>();
  @ContentChild('customTooltip') customTooltip: TemplateRef<unknown> | null = null;
  @ViewChild('tooltip') tooltipRef!: ElementRef<HTMLElement>;

  hoveredBar$ = new BehaviorSubject<BarTooltip | null>(null);

  defaultOptions: BarConfig = {
    yAxisName: '',
    width: 1800,
    height: 400,
    labelTopPadding: 15,
    countRectHeight: 20,
    gapBetweenColumnAndCount: 5,
    tickYPercentage: 10
  };
  private options!: BarConfig;
  private svg!: Selection<SVGSVGElement, unknown, null, undefined>;
  private chartContainer!: HTMLElement;
  private columnLayer!: Selection<SVGGElement, unknown, null, undefined>;
  private axisXLayer!: Selection<SVGGElement, unknown, null, undefined>;
  private axisYLayer!: Selection<SVGGElement, unknown, null, undefined>;
  private countLayer!: Selection<SVGGElement, unknown, null, undefined>;
  private tooltip!: Selection<HTMLElement, unknown, null, undefined>;
  private xScale!: ScaleBand<string>;
  private xInScale!: ScaleBand<string>;
  private yScale!: ScaleLinear<number, number, never>;
  private columnLayerHeight!: number;
  private maxPercentage!: number;
  private totalLabelHeight!: number;
  private unsubscribe = new Subject<void>();
  private marginLeft = 50;
  private window: Window;
  private totalValue = 0;
  private hasSelectedBar = false;
  private transitionDuration = 500;
  private transitionWithDelay: any;
  private transition: any;

  constructor(private elementRef: ElementRef, @Inject(DOCUMENT) private document: Document) {
    this.window = this.document.defaultView!;
  }

  ngOnInit() {
    fromEvent(window, 'resize').pipe(debounceTime(100), takeUntil(this.unsubscribe)).subscribe(() => this.populate());
  }

  /**
   * We request angular for the element reference
   * and then we create a D3 Wrapper for our host element
   * also create chart
   **/
  ngAfterViewInit() {
    this.chartContainer = this.elementRef.nativeElement;
    this.populate();
    this.tooltip = d3.select(this.tooltipRef.nativeElement);
  }

  /**
   * Everythime the @Input is updated, we rebuild the chart
   **/
  ngOnChanges(): void {
    if (this.chartContainer) {
      this.populate();
    }
  }

  /**
   * Unsubscribe event
   */
  ngOnDestroy() {
    this.unsubscribe.next();
    this.unsubscribe.complete();
  }

  /**
   * Will call all necessary method to draw/redraw d3 chart
   */
  populate() {
    this.setup();
    this.buildSVG();
    this.drawAxisX();
    this.drawYAxis();
    this.drawCount();
    this.drawColumns();
  }

  /**
   * Creates a flattened array includin bar data from all series
   */
  buildDataSet() {
    let maxValue = 0;
    this.totalValue = 0;
    this.hasSelectedBar = false;
    this.bars.forEach((bar: Bar) => {
      if (bar.selected) {
        this.hasSelectedBar = true;
      }
      this.totalValue += bar.value;
      maxValue = maxValue < bar.value ? bar.value : maxValue;
    });
    this.maxPercentage = (maxValue / this.totalValue) * 100;
  }

  /**
   * Basically we get the dom element size and build the container configs
   * also we create the xScale and yScale ranges depending on calculations
   **/
  private setup(): void {
    this.transition = d3.transition('transition').duration(500).ease(d3.easeLinear);
    this.transitionWithDelay = d3.transition().delay(this.transitionDuration).ease(d3.easeLinear);
    this.options = { ...this.defaultOptions, ...this.chartConfig };
    this.buildDataSet();

    const parentContainerRect = d3.select(this.elementRef.nativeElement).node().getBoundingClientRect();
    this.options.width = d3.min([this.options.width, parentContainerRect.width]);
    if (this.options.width > this.chartContainer.clientWidth) {
      this.options.width = this.chartContainer.clientWidth;
    }

    this.xScale = d3
      .scaleBand()
      .domain(this.bars.map((bar: Bar) => bar.label))
      .range([0, this.options.width - this.marginLeft])
      .paddingInner(0.5)
      .paddingOuter(0.3);

    this.xInScale = d3.scaleBand().range([0, this.xScale.bandwidth()]).paddingInner(0.2);
  }

  /**
   * We can now build our SVG element using the configurations we created
   **/
  private buildSVG(): void {
    if (!this.svg) {
      this.svg = d3
        .select(this.chartContainer)
        .append('svg')
        .attr('width', this.options.width)
        .attr('height', this.options.height);
      const wrapper = this.svg.append('g').classed('wrapper', true)
        .attr('transform', () => `translate(${this.marginLeft}, 0)`);
      this.columnLayer = wrapper.append('g').classed('columns', true);
      this.axisXLayer = wrapper.append('g').classed('x-axis', true);
      this.axisYLayer = wrapper.append('g').classed('y-axis', true);
      this.countLayer = wrapper.append('g').classed('counts', true);

      this.svg.append('text')
        .attr('class', 'y label')
        .attr('text-anchor', 'end')
        .attr('y', 6)
        .attr('dy', '.75em')
        .attr('transform', `rotate(-90) translate(-150, 0)`)
        .text(`${this.options.yAxisName}`);
    }
    this.svg.attr('width', this.options.width);
  }

  private drawAxisX() {
    const isEnter = !this.axisXLayer.selectAll('g').size();
    const xAxis = d3.axisBottom(this.xScale).tickSize(0).tickPadding(this.options.labelTopPadding);

    if (isEnter) {
      this.axisXLayer.call(xAxis).attr('font-size', '12px').selectAll('line, path').style('stroke', '#bbbcbc');
    } else {
      this.axisXLayer.transition(this.transition).attr('transform', () => `translate(-${this.xScale.bandwidth() * 0.1}, ${this.columnLayerHeight})`).call(xAxis);
    }
    this.totalLabelHeight = (this.axisXLayer.node() as any).getBBox().height;
    this.columnLayerHeight = this.options.height - this.totalLabelHeight;

    if (isEnter) {
      this.axisXLayer.attr('transform', () => `translate(-${this.xScale.bandwidth() * 0.1}, ${this.columnLayerHeight})`);
    }
  }

  private drawYAxis() {
    this.yScale = d3
      .scaleLinear()
      .domain([0, this.maxPercentage + this.options.tickYPercentage / 2])
      .range([this.columnLayerHeight, this.options.gapBetweenColumnAndCount + this.options.countRectHeight])
    ;

    this.axisYLayer.call(
      d3.axisLeft(this.yScale)
        .ticks(Math.floor(this.maxPercentage / this.options.tickYPercentage))
        .tickFormat((d) => `${d}%`)
        .tickSize(0)
    ).selectAll('line, path').style('stroke', '#bbbcbc');
  }

  private drawCount() {
    const self: BarChartComponent = this;
    const transform = function(this: SVGTextElement, bar: Bar): string {
      const textRect = (d3.select(this).node() as any).getBBox();
      return `translate(${self.xScale(bar.label)! + self.xInScale.bandwidth() * 0.5 - textRect.width * 0.5},
             ${self.yScale(self.getPercentage(bar)) - self.options.gapBetweenColumnAndCount})`;
    };

    this.countLayer.selectAll<SVGTextElement, Bar>('text').data(this.bars, (bar: Bar) => bar.id)
      .join((enter) =>
          enter.append('text')
            .style('opacity', 0)
            .text(bar => bar.value)
            .attr('transform', transform)
            .call(enter => enter.transition(this.transitionWithDelay)
              .style('opacity', 1)),

        (update) =>
          update
            .call(update => update.transition(this.transition)
              .attr('transform', transform)
              .tween('text', function(bar: Bar) {
                const textSelection = d3.select(this);
                const start = +textSelection.text();
                const interpolator = d3.interpolateNumber(start, bar.value);

                return (t) => textSelection.text(Math.round(interpolator(t)));
              })
            )
      );
  }

  private drawColumns() {
    const self = this;

    this.columnLayer.selectAll<SVGRectElement, Bar>('rect')
      .data(this.bars, (bar: Bar) => bar.id)
      .interrupt('remove')
      .join(enter => enter
          .append('rect')
          .attr('height', 0)
          .attr('cursor', 'pointer')
          .classed('column', true)
          .attr('x', (bar: Bar) => this.xScale(bar.label)!)
          .attr('width', this.xInScale.bandwidth())
          .attr('height', () => this.columnLayerHeight - this.yScale(0))
          .attr('y', () => this.yScale(0))
        ,
        update => update
          .call(update => update.transition(this.transition)
            .attr('x', (bar: Bar) => this.xScale(bar.label)!)
            .attr('width', this.xInScale.bandwidth())
          ),
        exit =>
          exit.call(exit => exit.transition('remove')
            .duration(this.transitionDuration * 0.75)
            .attr('height', () => this.columnLayerHeight - this.yScale(0))
            .attr('y', () => this.yScale(0))
            .on('end', function(this: SVGRectElement) {
              d3.select(this).remove();
            })
          )
      )
      .style('opacity', (bar: Bar) => bar.opacity || 1)
      .style('stroke', (bar: Bar) => bar.border || '')
      .style('stroke-width', (bar: Bar) => bar.border ? 2 : 0)
      .style('fill', (d: Bar) => d.color)
      .on('mouseover', function(this: SVGRectElement, event: MouseEvent, bar: Bar) {
        const thisRect = d3.select(this);
        if (!self.hasSelectedBar) {
          thisRect.style('fill', () => d3.rgb(thisRect.style('fill')).darker(0.3) as any);
        }
        self.hoveredBar$.next({
          id: bar.id,
          value: bar.value,
          total: self.totalValue,
          percentage: +self.getPercentage(bar).toFixed(1)
        });
      })
      .on('mouseout', function(this: SVGRectElement, event: MouseEvent, bar: Bar) {
        d3.select(this).style('fill', bar.color);
        self.hoveredBar$.next(null);
      })
      .on('mousemove', (event: MouseEvent) =>
        this.tooltip
          .style('left', () => {
            const tooltipWidth = this.tooltip.node()!.getBoundingClientRect().width;
            if (event.x + this.window.scrollX + 20 + tooltipWidth >
              this.window.innerWidth) {
              return event.x - tooltipWidth - 20 + this.window.scrollX + 'px'
            }
            return event.x + this.window.scrollX + 20 + 'px';
          })
          .style('top', event.y + this.window.scrollY + 25 + 'px'))
      .on('click', (event: MouseEvent, bar: Bar) => this.barClick.emit(bar.id))
      .transition(this.transition)
        .attr('y', (bar: Bar) => this.yScale(this.getPercentage(bar)))
        .attr('height', (bar: Bar) => this.columnLayerHeight - this.yScale(this.getPercentage(bar)))
  }

  private getPercentage(bar: Bar): number {
    return +(bar.value * 100 / this.totalValue);
  }
}
