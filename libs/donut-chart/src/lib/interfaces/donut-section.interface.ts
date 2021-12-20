import { Donut } from './donut.interface';

export interface DonutSection {
  data: Donut;
  endAngle: number;
  index: number;
  padAngle: number;
  startAngle: number;
  value: number;
}
