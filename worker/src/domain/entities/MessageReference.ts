import type { MessageId } from './Message.js';
import type { ProviderId } from './Provider.js';

export interface MessageReferenceParams {
  messageId: MessageId;
  providerId: ProviderId;
  externalId: string;
}

export class MessageReference {
  public readonly messageId: MessageId;

  public readonly providerId: ProviderId;

  public readonly externalId: string;

  constructor(params: MessageReferenceParams) {
    this.messageId = params.messageId;

    this.providerId = params.providerId;

    this.externalId = params.externalId;
  }
}
