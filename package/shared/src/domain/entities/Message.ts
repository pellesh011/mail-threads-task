import { randomUUID } from 'node:crypto';

export type MessageId = string;

export interface CreateMessageParams {
  id?: string;

  threadId?: string | null;

  sender: string;

  subject?: string | null;

  sentAt: Date;

  parentId?: string | null;
}

export class Message {
  public readonly id: MessageId;

  public readonly threadId: string | null;

  public readonly sender: string;

  public readonly subject: string | null;

  public readonly sentAt: Date;

  public readonly parentId: MessageId | null;

  constructor(params: CreateMessageParams) {
    this.id = params.id ?? randomUUID();

    this.threadId = params.threadId ?? null;

    this.sender = params.sender;

    this.subject = params.subject ?? null;

    this.sentAt = params.sentAt;

    this.parentId = params.parentId ?? null;
  }
}
