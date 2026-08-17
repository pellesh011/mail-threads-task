import { randomUUID } from 'node:crypto';

export type MessageId = string;

export interface CreateMessageParams {
  threadId: string;
  sender: string;
  body: string;
  sentAt: Date;
  parentId?: MessageId;
}

export class Message {
  public readonly id: MessageId;

  public readonly threadId: string;

  public readonly sender: string;

  public readonly body: string;

  public readonly sentAt: Date;

  public readonly parentId: MessageId | null;

  constructor(params: CreateMessageParams) {
    this.id = params.parentId ?? randomUUID();

    this.threadId = params.threadId;

    this.sender = params.sender;

    this.body = params.body;

    this.sentAt = params.sentAt;

    this.parentId = params.parentId ?? null;
  }
}
