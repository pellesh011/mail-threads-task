export interface IncomingMessage {
  externalId: string;

  payload: Record<string, unknown>;
}
