import type { UUID } from 'node:crypto';
import type { Message } from '../entities/Message.js';

export interface MessageRepository {
  save(params: {
    id?: UUID;
    threadId: string;
    sender?: string;
    recipients?: string[];
    sentAt: Date;
    parentId?: string;
  }): Promise<Message>;
}
