import type { Provider as ProviderRow } from '@prisma/client';
import { Provider } from '../../../domain/entities/Provider.js';
import type { ProviderRepository } from '../../../domain/repositories/ProviderRepository.js';
import type { DbClient } from '../prisma/client.js';

export class PrismaProviderRepository implements ProviderRepository {
  constructor(private readonly db: DbClient) {}

  async findByName(name: string): Promise<Provider | null> {
    const row = await this.db.provider.findUnique({ where: { name } });

    return row === null ? null : this.toDomain(row);
  }

  async findById(id: string): Promise<Provider | null> {
    const row = await this.db.provider.findUnique({ where: { id } });

    return row === null ? null : this.toDomain(row);
  }

  async ensure(name: string): Promise<Provider> {
    const row = await this.db.provider.upsert({
      where: { name },
      create: { name },
      update: {},
    });

    return this.toDomain(row);
  }

  private toDomain(row: ProviderRow): Provider {
    return new Provider({ id: row.id, name: row.name });
  }
}
