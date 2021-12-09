import { Bar } from './bar.interface';

export interface Series {
  label: string;
  color: string;
  data: Array<Bar>;
  total: number;
}
