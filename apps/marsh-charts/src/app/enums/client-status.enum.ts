export type ClientStatusConfig = {
  [key in ClientStatus]: {
    name: string;
    color: string;
  };
};

export enum ClientStatus {
  Live,
  Ready,
  InProgress,
  Provisioned,
  Submitted,
  Expected,
  Deferred,
}

export const CLIENT_STATUS_KEYS: ClientStatus[] = (Object.keys(ClientStatus) as unknown as ClientStatus[]).filter((key: ClientStatus) => (parseInt(key as unknown as string) >= 0));
export const ClientStatusTempData = {
  [ClientStatus.Live]: 89,
  [ClientStatus.Ready]: 166,
  [ClientStatus.InProgress]: 141,
  [ClientStatus.Provisioned]: 125,
  [ClientStatus.Submitted]: 30,
  [ClientStatus.Expected]: 131,
  [ClientStatus.Deferred]: 72,
}
