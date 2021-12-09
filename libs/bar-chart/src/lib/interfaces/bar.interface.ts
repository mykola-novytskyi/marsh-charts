import { ClientStatus } from '../enums/client-status.enum';

export interface Bar {
  value: number;
  color: string;
  id: ClientStatus;
  opacity?: number;
  border?: string;
  ser?: number;
}

