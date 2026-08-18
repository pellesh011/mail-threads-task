import { randomUUID } from 'node:crypto';
import type { MessageId } from './Message.js';

export interface MessageToMessageReferenceParams {
  id?: string;

  messageId: MessageId;

  referencedMessageId: MessageId;
}

export class MessageToMessageReference {
  public readonly id: string;

  public readonly messageId: MessageId;

  public readonly referencedMessageId: MessageId;

  constructor(params: MessageToMessageReferenceParams) {
    this.id = params.id ?? randomUUID();

    this.messageId = params.messageId;

    this.referencedMessageId = params.referencedMessageId;
  }
}
