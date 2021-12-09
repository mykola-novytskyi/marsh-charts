import { ClientStatus } from '../enums/client-status.enum';

export interface BarTooltip {
  id: ClientStatus;
  value: number;
  percentage: number;
  total: number;
}
