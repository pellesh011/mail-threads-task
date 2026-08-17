import { Thread } from '../entities/Thread.js';

export interface ThreadRepository {
  findById(threadId: string): Promise<Thread | null>;

  create(subject?: string): Promise<Thread>;

  assignMessages(threadId: string, messageIds: string[]): Promise<void>;
}
