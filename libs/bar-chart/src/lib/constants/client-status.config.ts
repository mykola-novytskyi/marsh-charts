import { ClientStatus, ClientStatusConfig } from '../enums/client-status.enum';

export const CLIENT_STATUS_CONFIG: ClientStatusConfig = {
  [ClientStatus.Live]: {
    name: 'Client Live',
    color: '#1CA137'
  },
  [ClientStatus.Ready]: {
    name: 'Client Ready',
    color: '#11638D'
  },
  [ClientStatus.InProgress]: {
    name: 'In Progress',
    color: '#FCB423'
  },
  [ClientStatus.Provisioned]: {
    name: 'Provisioned',
    color: '#E53B3C'
  },
  [ClientStatus.Submitted]: {
    name: 'Submitted',
    color: '#6D84A2'
  },
  [ClientStatus.Expected]: {
    name: 'Expected',
    color: '#178AD5'
  },
  [ClientStatus.Deferred]: {
    name: 'Deferred',
    color: '#838383'
  },
}
