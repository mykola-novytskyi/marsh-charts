import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ContentChild,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  SimpleChanges,
  TemplateRef,
  ViewChild
} from '@angular/core';
import { BehaviorSubject, fromEvent, Subject, takeUntil } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import * as d3 from 'd3';
import { Bar } from './interfaces/bar.interface';
import { BarTooltip } from './interfaces/bar-tooltip.interface';
import { Series } from './interfaces/series.interface';

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
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BarChartComponent implements OnInit, OnDestroy, OnChanges, AfterViewInit {
  @Input() chartConfig: any; // TODO add additional input for data

  @Output() barClick = new EventEmitter<number | string>();
  @ContentChild('customTooltip') customTooltip: TemplateRef<unknown> | null  = null;
  @ViewChild('tooltip') tooltipRef!: ElementRef<HTMLElement>;

  hoveredBar$ = new BehaviorSubject<BarTooltip | null>(null);

  defaultOptions = {
    yAxisName: '',
    width: 1800,
    height: 400,
    barWidth: 60,
    gapBetweenBars: 20,
    gapBetweenGroups: 56,
    gapBetweenLegendAndColumns: 20,
    labelTopPadding: 15,
    legendHeight: 20,
    legendWidth: 20,
    countRectHeight: 20,
    gapBetweenLegend: 20,
    gapBetweenColumnAndCount: 5,
    tickYPercentage: 10,
    isBarSelected: false,
    colorCountRect: '#f2f2f2' //TODO
  };
  options: any;
  private svg: any;
  private chartContainer!: HTMLElement;
  private columnLayer: any;
  private axisXLayer: any;
  private axisYLayer: any;
  private countLayer: any;
  private tooltip: any;
  private columnsData!: Array<any>;
  private xScale: any;
  private xInScale: any;
  private yScale: any;
  private columnLayerHeight!: number;
  private transition: any; // transition
  private maxPercentage!: number;
  private totalLegendHeight = 0; // get group height
  private totalLabelHeight!: number; // get group height
  private unsubscribe = new Subject<void>();
  private marginLeft = 50;

  constructor(private elementRef: ElementRef) {
  }

  get groupsNumber() {
    return this.options.labels.length;
  }

  get seriesNumber() {
    // TODO need to remove series
    return this.options.series.length;
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
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['chartConfig'] && this.chartConfig && this.chartContainer) {
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
    if (!this.chartConfig) {
      return;
    }
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

    // eslint-disable-next-line prefer-spread
    this.columnsData = Array.apply(null, Array(this.groupsNumber)).map(function() {
      return { data: [] };
    });
    for (let i = 0; i < this.groupsNumber; i++) {
      this.chartConfig.series.forEach((s: Series, index: number) => {
        if (!i) {
          this.chartConfig.series[index].total = 0;
        }
        if (this.columnsData[i].data.length < this.chartConfig.series.length) {
          const value = s.data[i].value;
          maxValue = maxValue < value ? value : maxValue;
          // TODO remove all this logic
          this.columnsData[i].data.push({
            ser: index,
            value: value,
            color: s.data[i].color,
            id: s.data[i].id,
            opacity: s.data[i].opacity,
            border: s.data[i].border
          });

          this.chartConfig.series[index].total += value;
        }
      });
    }
    this.maxPercentage = maxValue / Math.max(this.chartConfig.series.map((bar: Series) => bar.total)) * 100;
  }


  /**
   * Basically we get the dom element size and build the container configs
   * also we create the xScale and yScale ranges depending on calculations
   **/
  private setup(): void {
    this.transition = d3.transition('transition').duration(500).ease(d3.easeLinear);
    this.options = Object.assign({}, this.defaultOptions, this.chartConfig);
    this.buildDataSet();

    const parentContainerRect = d3.select(this.elementRef.nativeElement).node().getBoundingClientRect();
    this.options.width = d3.min([this.options.width, parentContainerRect.width]);
    if (this.options.width > this.chartContainer.clientWidth) {
      this.options.width = this.chartContainer.clientWidth;
    }

    this.xScale = d3
      .scaleBand()
      .domain(this.options.labels)
      .range([0, this.options.width])
      .paddingInner(0.5)
      .paddingOuter(0.3);

    this.xInScale = d3
      .scaleBand()
      .domain(d3.range(0, this.seriesNumber).map(d => d + ''))
      .range([0, this.xScale.bandwidth()])
      .paddingInner(0.2);
  }

  /**
   * We can now build our SVG element using the configurations we created
   **/
  private buildSVG(): void {
    if (!this.svg) {
      const svg = (this.svg = d3
        .select(this.chartContainer)
        .append('svg')
        .attr('width', this.options.width)
        .attr('height', this.options.height));
      const wrapper = svg.append('g').classed('wrapper', true)
        .attr('transform', () => `translate(${this.marginLeft}, 0)`); // TODO this is temporary decision
      this.columnLayer = wrapper.append('g').classed('columns', true);
      this.axisXLayer = wrapper.append('g').classed('x-axis', true);
      this.axisYLayer = wrapper.append('g').classed('y-axis', true);
      this.countLayer = wrapper.append('g').classed('counts', true);

      svg.append('text')
        .attr('class', 'y label')
        .attr('text-anchor', 'end')
        .attr('y', 6)
        .attr('dy', '.75em')
        .attr('transform', `rotate(-90) translate(-150, 0)`)   // TODO this is hardcode - need to change to dynamic
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
      this.axisXLayer.attr('transform', () => `translate(0, ${this.columnLayerHeight})`).call(xAxis).transition(this.transition);
    }
    this.totalLabelHeight = (this.axisXLayer.node() as any).getBBox().height;
    this.columnLayerHeight = this.options.height - this.totalLabelHeight - this.totalLegendHeight;

    if (isEnter) {
      this.axisXLayer.attr('transform', () => `translate(0, ${this.columnLayerHeight})`);
    }
  }

  private drawYAxis() {
    this.yScale = d3
      .scaleLinear()
      .domain([0, this.maxPercentage + this.options.tickYPercentage / 2])
      .range([this.columnLayerHeight, this.options.gapBetweenColumnAndCount + this.options.countRectHeight])
    ;

    //TODO change color of yAxis
    this.axisYLayer.call(
      d3.axisLeft(this.yScale)
        .ticks(Math.floor(this.maxPercentage / this.options.tickYPercentage))
        .tickFormat((d) => `${d}%`)
        .tickSize(0)
    );
  }

  private drawCount() {
    const countGroup = this.countLayer.selectAll('.group-count').data(this.columnsData);
    const o = this.options;
    const t = this.transition;
    const xScale = this.xScale;
    const xInScale = this.xInScale;
    const newCountGroup = countGroup.enter().append('g').classed('group-count', true);

    countGroup.merge(newCountGroup).attr('transform', function(d: any, i: number) {
      return 'translate(' + [xScale(o.labels[i]), 0] + ')';
    });


    const groups = countGroup.merge(newCountGroup);
    const text = groups.selectAll('text').data((d: any) => d.data);
    const newText = text.enter().append('text');

    text.merge(newText).text((d: any) => (d.value));

    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const context = this;
    // @ts-ignore
    const translateText = function(selection) {
      selection.attr('transform', function(bar: Bar) {
        // @ts-ignore
        const textRect = (d3.select(this).node() as any).getBBox();
        return `translate(${xInScale(`${bar.ser}`) + xInScale.bandwidth() * 0.5 - textRect.width * 0.5},
             ${context.yScale(context.getPercentage(bar)) - o.gapBetweenColumnAndCount})`;
      });
    };

    newText.call(translateText);
    text.transition(t).call(translateText);
  }

  private drawColumns() {
    const o = this.options;
    const height = this.columnLayerHeight;
    const xScale = this.xScale;
    const xInScale = this.xInScale;
    const groupColumns = this.columnLayer.selectAll('.group-column').data(this.columnsData);
    const t = this.transition;
    const self = this;

    const newGroupColumns = groupColumns.enter().append('g').classed('group-column', true);

    groupColumns.merge(newGroupColumns).attr('transform', function(d: any, i: number) {
      return 'translate(' + [xScale(o.labels[i]), 0] + ')';
    });

    const columns = groupColumns.merge(newGroupColumns).selectAll('.column').data((d: any) => d.data);
    const newColumns = columns
      .enter()
      .append('rect')
      .attr('height', 0)
      .attr('cursor', 'pointer')
      .classed('column', true)
      .attr('transform', (d: Bar) => `translate(${xInScale(`${d.ser}`)}, ${height})`)

    columns
      .merge(newColumns)
      .style('opacity', (bar: Bar) => (bar.opacity))
      .style('stroke', (bar: Bar) => bar.border)
      .style('stroke-width', (bar: Bar) => bar.border ? 2 : 0)
      .style('fill', (d: Bar) => d.color)
      .on('mouseover', function(this: SVGRectElement, event: MouseEvent, bar: Bar) {
        const thisRect = d3.select(this);
        if (!self.options.isBarSelected) {
          thisRect.style('fill', () => d3.rgb(thisRect.style('fill')).darker() as any);
        }
        self.hoveredBar$.next({
          id: bar.id,
          value: bar.value,
          total: self.getTotalBySeries(bar.ser as number),
          percentage: +self.getPercentage(bar).toFixed(1)
        });
      })
      .on('mouseout', function(this: SVGRectElement, event: MouseEvent, bar: Bar) {
        d3.select(this).style('fill', bar.color);
        self.hoveredBar$.next(null)
      })
      .on('mousemove', (event: MouseEvent) => this.tooltip.style('left', event.x + 20 + 'px').style('top', event.y + 25 + 'px'))
      .on('click', (event: MouseEvent, bar: Bar) => this.barClick.emit(bar.id));

    columns
      .merge(newColumns)
      .transition(t)
      .attr('width', xInScale.bandwidth())
      .attr('height', (bar: Bar) => height - this.yScale(this.getPercentage(bar)))
      .attr('transform', (bar: Bar) => `translate(${xInScale(`${bar.ser}`)}, ${this.yScale(this.getPercentage(bar))})`);
  }

  private getTotalBySeries(series: number): number {
    return this.chartConfig.series[series].total;
  }

  private getPercentage(bar: Bar): number {
    return +(bar.value * 100 / this.getTotalBySeries(bar.ser as number));
  }
}
