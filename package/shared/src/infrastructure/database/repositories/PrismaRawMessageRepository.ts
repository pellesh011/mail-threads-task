import type { Prisma } from '@prisma/client';
import type { RawMessage as RawMessageRow } from '@prisma/client';
import { RawMessage } from '../../../domain/entities/RawMessage.js';
import type { RawMessageRepository } from '../../../domain/repositories/RawMessageRepository.js';
import type { DbClient } from '../prisma/client.js';

export class PrismaRawMessageRepository implements RawMessageRepository {
  constructor(private readonly db: DbClient) {}

  async upsert(params: {
    providerId: string;
    externalId?: string | null;
    payload: Record<string, unknown>;
  }): Promise<RawMessage> {
    const { providerId, externalId, payload } = params;

    const data = { providerId, payload: payload as Prisma.InputJsonValue };

    if (externalId === null || externalId === undefined) {
      const row = await this.db.rawMessage.create({ data });

      return this.toDomain(row);
    }

    const row = await this.db.rawMessage.upsert({
      where: {
        providerId_externalId: { providerId, externalId },
      },
      create: { ...data, externalId },
      update: {},
    });

    return this.toDomain(row);
  }

  async findById(id: string): Promise<RawMessage | null> {
    const row = await this.db.rawMessage.findUnique({ where: { id } });

    return row === null ? null : this.toDomain(row);
  }

  async findUnprocessed(limit?: number): Promise<RawMessage[]> {
    const rows = await this.db.rawMessage.findMany({
      where: { processedAt: null },
      orderBy: { receivedAt: 'asc' },
      take: limit,
    });

    return rows.map((row) => this.toDomain(row));
  }

  async markProcessed(id: string, messageId: string): Promise<void> {
    await this.db.rawMessage.update({
      where: { id },
      data: { processedAt: new Date(), messageId },
    });
  }

  private toDomain(row: RawMessageRow): RawMessage {
    return new RawMessage({
      id: row.id,
      providerId: row.providerId,
      externalId: row.externalId,
      payload: row.payload as Record<string, unknown>,
      receivedAt: row.receivedAt,
      processedAt: row.processedAt,
      messageId: row.messageId,
    });
  }
}
