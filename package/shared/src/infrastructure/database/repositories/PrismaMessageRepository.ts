import type { Message as MessageRow } from '@prisma/client';
import { Message } from '../../../domain/entities/Message.js';
import type { MessageRepository } from '../../../domain/repositories/MessageRepository.js';
import type { DbClient } from '../prisma/client.js';

export class PrismaMessageRepository implements MessageRepository {
  constructor(private readonly db: DbClient) {}

  async save(params: {
    threadId?: string | null;
    sender: string;
    subject?: string | null;
    sentAt: Date;
    parentId?: string | null;
  }): Promise<Message> {
    const row = await this.db.message.create({
      data: {
        threadId: params.threadId ?? null,
        sender: params.sender,
        subject: params.subject ?? null,
        sentAt: params.sentAt,
        parentId: params.parentId ?? null,
      },
    });

    return this.toDomain(row);
  }

  async findById(id: string): Promise<Message | null> {
    const row = await this.db.message.findUnique({ where: { id } });

    return row === null ? null : this.toDomain(row);
  }

  async updateThreadId(id: string, threadId: string): Promise<void> {
    await this.db.message.update({ where: { id }, data: { threadId } });
  }

  async updateParentId(id: string, parentId: string | null): Promise<void> {
    await this.db.message.update({ where: { id }, data: { parentId } });
  }

  private toDomain(row: MessageRow): Message {
    return new Message({
      id: row.id,
      threadId: row.threadId,
      sender: row.sender,
      subject: row.subject,
      sentAt: row.sentAt,
      parentId: row.parentId,
    });
  }
}
