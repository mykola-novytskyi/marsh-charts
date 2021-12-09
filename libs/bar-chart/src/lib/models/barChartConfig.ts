import { Margin } from '../interfaces/margin.interface';
import { Series } from '../interfaces/series.interface';

export interface BarLabel {
  title: string;
  opacity?: number;
}

export interface GroupedBarChartConfig {
  series: Array<Series>;
  labels: Array<BarLabel>;
  margin?: Margin;
  barHeight?: number;
  gapBetweenBars?: number;
  gapBetweenGroups?: number;
  alignForLabels?: string;
  spaceForLabels?: number;
  displayLegend?: boolean;
}
