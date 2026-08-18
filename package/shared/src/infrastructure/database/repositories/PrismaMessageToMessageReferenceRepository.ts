import type { MessageToMessageReference as Row } from '@prisma/client';
import { MessageToMessageReference } from '../../../domain/entities/MessageToMessageReference.js';
import type { MessageToMessageReferenceRepository } from '../../../domain/repositories/MessageToMessageReferenceRepository.js';
import type { DbClient } from '../prisma/client.js';

export class PrismaMessageToMessageReferenceRepository implements MessageToMessageReferenceRepository {
  constructor(private readonly db: DbClient) {}

  async addLink(
    messageId: string,
    referencedMessageId: string,
  ): Promise<MessageToMessageReference> {
    const row = await this.db.messageToMessageReference.upsert({
      where: {
        messageId_referencedMessageId: { messageId, referencedMessageId },
      },
      create: { messageId, referencedMessageId },
      update: {},
    });

    return this.toDomain(row);
  }

  async findByMessageId(
    messageId: string,
  ): Promise<MessageToMessageReference[]> {
    const rows = await this.db.messageToMessageReference.findMany({
      where: { messageId },
    });

    return rows.map((row) => this.toDomain(row));
  }

  async findAll(): Promise<MessageToMessageReference[]> {
    const rows = await this.db.messageToMessageReference.findMany();

    return rows.map((row) => this.toDomain(row));
  }

  private toDomain(row: Row): MessageToMessageReference {
    return new MessageToMessageReference({
      id: row.id,
      messageId: row.messageId,
      referencedMessageId: row.referencedMessageId,
    });
  }
}
