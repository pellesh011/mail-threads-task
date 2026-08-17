import { UUID } from 'crypto';
import type { Message } from '../entities/Message.js';

export interface MessageRepository {
  findByExternalId(
    providerId: string,
    externalId: string,
  ): Promise<Message | null>;

  save(params: {
    id?: UUID;
    threadId: string;
    sender?: string;
    recipients?: string[];
    sentAt: Date;
    parentId?: string;
  }): Promise<Message>;

  updateThreadAndParent(
    messageId: string,
    threadId: string,
    parentId: string | null,
  ): Promise<void>;
}
