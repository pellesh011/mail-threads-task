import { randomUUID } from 'node:crypto';

export type RawMessageId = string;

export interface CreateRawMessageParams {
  id?: string;

  providerId: string;

  externalId?: string | null;

  payload: Record<string, unknown>;

  receivedAt?: Date;

  processedAt?: Date | null;

  messageId?: string | null;
}

export class RawMessage {
  public readonly id: RawMessageId;

  public readonly providerId: string;

  public readonly externalId: string | null;

  public readonly payload: Record<string, unknown>;

  public readonly receivedAt: Date;

  public processedAt: Date | null;

  public messageId: string | null;

  constructor(params: CreateRawMessageParams) {
    this.id = params.id ?? randomUUID();

    this.providerId = params.providerId;

    this.externalId = params.externalId ?? null;

    this.payload = params.payload;

    this.receivedAt = params.receivedAt ?? new Date();

    this.processedAt = params.processedAt ?? null;

    this.messageId = params.messageId ?? null;
  }

  markProcessed(messageId: string): void {
    this.processedAt = new Date();
    this.messageId = messageId;
  }
}
