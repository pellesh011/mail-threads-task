import type { Prisma, Task as TaskRow } from '@prisma/client';
import { TaskType as PrismaTaskType } from '@prisma/client';
import { Task } from '../../../domain/entities/Task.js';
import type { TaskStatus } from '../../../domain/enums/TaskStatus.js';
import type { TaskType } from '../../../domain/enums/TaskType.js';
import type { TaskRepository } from '../../../domain/repositories/TaskRepository.js';
import type { DbClient } from '../prisma/client.js';

export class PrismaTaskRepository implements TaskRepository {
  constructor(private readonly db: DbClient) {}

  async findById(id: string): Promise<Task | null> {
    const row = await this.db.task.findUnique({ where: { id } });

    return row === null ? null : this.toDomain(row);
  }

  async findByProviderAndType(
    providerId: string,
    type: TaskType,
  ): Promise<Task | null> {
    const row = await this.db.task.findFirst({
      where: { providerId, type: PrismaTaskType[type] },
    });

    return row === null ? null : this.toDomain(row);
  }

  async save(params: {
    id: string;
    providerId: string;
    type: TaskType;
    status: TaskStatus;
    data?: Record<string, unknown>;
  }): Promise<Task> {
    const { id, providerId, type, status, data } = params;

    const row = await this.db.task.upsert({
      where: { id },
      create: {
        id,
        providerId,
        type,
        status,
        data: (data ?? {}) as Prisma.InputJsonValue,
      },
      update: {
        providerId,
        type,
        status,
        data: (data ?? {}) as Prisma.InputJsonValue,
      },
    });

    return this.toDomain(row);
  }

  async updateStatus(
    id: string,
    status: TaskStatus,
    error?: string,
  ): Promise<void> {
    await this.db.task.update({
      where: { id },
      data: { status, error: error ?? null },
    });
  }

  private toDomain(row: TaskRow): Task {
    return new Task({
      id: row.id,
      providerId: row.providerId,
      type: row.type as TaskType,
      data: row.data as Record<string, unknown>,
      status: row.status as TaskStatus,
      error: row.error ?? undefined,
    });
  }
}
