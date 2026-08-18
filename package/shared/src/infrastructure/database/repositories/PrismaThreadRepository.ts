import type { Thread as ThreadRow } from '@prisma/client';
import { Thread } from '../../../domain/entities/Thread.js';
import type { ThreadRepository } from '../../../domain/repositories/ThreadRepository.js';
import type { DbClient } from '../prisma/client.js';

export class PrismaThreadRepository implements ThreadRepository {
  constructor(private readonly db: DbClient) {}

  async findById(threadId: string): Promise<Thread | null> {
    const row = await this.db.thread.findUnique({ where: { id: threadId } });

    return row === null ? null : this.toDomain(row);
  }

  async create(subject?: string): Promise<Thread> {
    const row = await this.db.thread.create({
      data: { subject: subject ?? null },
    });

    return this.toDomain(row);
  }

  async updateSubject(threadId: string, subject: string | null): Promise<void> {
    await this.db.thread.update({
      where: { id: threadId },
      data: { subject },
    });
  }

  async assignMessages(threadId: string, messageIds: string[]): Promise<void> {
    await this.db.message.updateMany({
      where: { id: { in: messageIds } },
      data: { threadId },
    });
  }

  private toDomain(row: ThreadRow): Thread {
    return new Thread({
      id: row.id,
      subject: row.subject ?? undefined,
    });
  }
}
