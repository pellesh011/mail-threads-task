import type { MessageToMessageReference } from '../entities/MessageToMessageReference.js';

export interface MessageToMessageReferenceRepository {
  addLink(
    messageId: string,
    referencedMessageId: string,
  ): Promise<MessageToMessageReference>;

  findByMessageId(messageId: string): Promise<MessageToMessageReference[]>;

  findAll(): Promise<MessageToMessageReference[]>;
}
