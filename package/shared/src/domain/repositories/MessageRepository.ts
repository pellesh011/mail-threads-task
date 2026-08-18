import type { Message } from '../entities/Message.js';

export interface MessageRepository {
  save(params: {
    threadId?: string | null;
    sender: string;
    subject?: string | null;
    sentAt: Date;
    parentId?: string | null;
  }): Promise<Message>;

  findById(id: string): Promise<Message | null>;

  updateThreadId(id: string, threadId: string): Promise<void>;

  updateParentId(id: string, parentId: string | null): Promise<void>;
}
