import { randomUUID } from 'node:crypto';
import type { MessageId } from './Message.js';

export interface MessageToMessageReferenceParams {
  id?: string;

  messageId: MessageId;

  referencedMessageId: MessageId;

  order?: number;
}

export class MessageToMessageReference {
  public readonly id: string;

  public readonly messageId: MessageId;

  public readonly referencedMessageId: MessageId;

  public readonly order: number;

  constructor(params: MessageToMessageReferenceParams) {
    this.id = params.id ?? randomUUID();

    this.messageId = params.messageId;

    this.referencedMessageId = params.referencedMessageId;

    this.order = params.order ?? 0;
  }
}
