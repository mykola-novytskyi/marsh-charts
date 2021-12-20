import { DonutSection } from './donut-section.interface';

export interface CustomPathElement extends SVGPathElement {
  _current: DonutSection;
}
