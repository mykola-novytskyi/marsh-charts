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

export const ClientStatusTempData = [89, 166, 141, 125, 30, 131, 72];
