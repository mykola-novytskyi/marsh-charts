import { PieArcDatum } from 'd3';
import { Donut } from './donut.interface';

export interface CustomPathElement extends SVGPathElement {
  _current: PieArcDatum<Donut>;
}
