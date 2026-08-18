import type { MessageReference as Row } from '@prisma/client';
import { MessageReference } from '../../../domain/entities/MessageReference.js';
import type { MessageReferenceRepository } from '../../../domain/repositories/MessageReferenceRepository.js';
import type { DbClient } from '../prisma/client.js';

export class PrismaMessageReferenceRepository implements MessageReferenceRepository {
  constructor(private readonly db: DbClient) {}

  async upsert(params: {
    messageId: string;
    providerId: string;
    externalId: string;
  }): Promise<MessageReference> {
    const { messageId, providerId, externalId } = params;

    const row = await this.db.messageReference.upsert({
      where: {
        providerId_externalId: { providerId, externalId },
      },
      create: { messageId, providerId, externalId },
      update: {},
    });

    return this.toDomain(row);
  }

  async findByExternalId(
    providerId: string,
    externalId: string,
  ): Promise<MessageReference | null> {
    const row = await this.db.messageReference.findUnique({
      where: { providerId_externalId: { providerId, externalId } },
    });

    return row === null ? null : this.toDomain(row);
  }

  async findByExternalIds(
    providerId: string,
    externalIds: string[],
  ): Promise<MessageReference[]> {
    const rows = await this.db.messageReference.findMany({
      where: { providerId, externalId: { in: externalIds } },
    });

    return rows.map((row) => this.toDomain(row));
  }

  private toDomain(row: Row): MessageReference {
    return new MessageReference({
      messageId: row.messageId,
      providerId: row.providerId,
      externalId: row.externalId,
    });
  }
}
