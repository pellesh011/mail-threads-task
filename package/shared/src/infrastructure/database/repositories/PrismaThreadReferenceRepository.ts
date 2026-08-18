import type { ThreadReference as Row } from '@prisma/client';
import { ThreadReference } from '../../../domain/entities/ThreadReference.js';
import type { ThreadReferenceRepository } from '../../../domain/repositories/ThreadReferenceRepository.js';
import type { DbClient } from '../prisma/client.js';

export class PrismaThreadReferenceRepository implements ThreadReferenceRepository {
  constructor(private readonly db: DbClient) {}

  async upsert(params: {
    threadId: string;
    providerId: string;
    externalId: string;
  }): Promise<ThreadReference> {
    const { threadId, providerId, externalId } = params;

    const row = await this.db.threadReference.upsert({
      where: {
        providerId_externalId: { providerId, externalId },
      },
      create: { threadId, providerId, externalId },
      update: {},
    });

    return this.toDomain(row);
  }

  async findByExternalId(
    providerId: string,
    externalId: string,
  ): Promise<ThreadReference | null> {
    const row = await this.db.threadReference.findUnique({
      where: { providerId_externalId: { providerId, externalId } },
    });

    return row === null ? null : this.toDomain(row);
  }

  private toDomain(row: Row): ThreadReference {
    return new ThreadReference({
      threadId: row.threadId,
      providerId: row.providerId,
      externalId: row.externalId,
    });
  }
}
