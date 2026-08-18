import type { Prisma, Task as TaskRow } from '@prisma/client';
import {
  TaskStatus as PrismaTaskStatus,
  TaskType as PrismaTaskType,
} from '@prisma/client';
import { Task } from '../../../domain/entities/Task.js';
import type { TaskStatus } from '../../../domain/enums/TaskStatus.js';
import type {
  ImportTaskView,
  TaskRepository,
} from '../../../domain/repositories/TaskRepository.js';
import type { DbClient } from '../prisma/client.js';

interface ClaimRow {
  id: string;
  cursor: string | null;
  retries: number;
}

export class PrismaTaskRepository implements TaskRepository {
  constructor(private readonly db: DbClient) {}

  async claimImportTask(
    providerId: string,
    now: Date,
  ): Promise<ImportTaskView | null> {
    const rows = await this.db.$queryRaw<ClaimRow[]>`
      SELECT "id", "cursor",
             COALESCE(NULLIF(data->>'retries', ''), '0')::int AS "retries"
      FROM "Task"
      WHERE "providerId" = ${providerId}
        AND "type" = ${PrismaTaskType.IMPORT_MESSAGES}
        AND "status" = ${PrismaTaskStatus.PENDING}
        AND ("startAt" IS NULL OR "startAt" <= ${now})
      ORDER BY "createdAt" ASC
      LIMIT 1
    `;

    const row = rows[0];

    if (row === undefined) {
      return null;
    }

    return {
      id: row.id,
      cursor: row.cursor ?? null,
      retries: row.retries,
    };
  }

  async enqueueNextImportTask(
    tx: Prisma.TransactionClient,
    providerId: string,
    cursor: string,
  ): Promise<boolean> {
    try {
      await tx.task.create({
        data: {
          providerId,
          type: PrismaTaskType.IMPORT_MESSAGES,
          status: PrismaTaskStatus.PENDING,
          cursor,
          data: { retries: 0 },
        },
      });

      return true;
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        return false;
      }

      throw error;
    }
  }

  async lockPendingImportTask(
    tx: Prisma.TransactionClient,
    id: string,
  ): Promise<Task | null> {
    const rows = await tx.$queryRaw<TaskRow[]>`
      SELECT * FROM "Task"
      WHERE "id" = ${id} AND "status" = ${PrismaTaskStatus.PENDING}
      FOR UPDATE
    `;

    const row = rows[0];

    return row === undefined ? null : this.toDomain(row);
  }

  async completeImportTask(
    tx: Prisma.TransactionClient,
    id: string,
  ): Promise<void> {
    await tx.task.update({
      where: { id },
      data: {
        status: PrismaTaskStatus.COMPLETED,
        data: { cursor: null, retries: 0 },
      },
    });
  }

  async deferImportTask(
    id: string,
    startAt: Date,
    data?: Record<string, unknown>,
  ): Promise<void> {
    await this.db.task.update({
      where: { id },
      data: {
        startAt,
        data: (data ?? {}) as Prisma.InputJsonValue,
      },
    });
  }

  async failImportTask(id: string, error: string): Promise<void> {
    await this.db.task.update({
      where: { id },
      data: { status: PrismaTaskStatus.FAILED, error },
    });
  }

  async countPendingImportTasks(providerId: string): Promise<number> {
    return this.db.task.count({
      where: {
        providerId,
        type: PrismaTaskType.IMPORT_MESSAGES,
        status: PrismaTaskStatus.PENDING,
      },
    });
  }

  private toDomain(row: TaskRow): Task {
    return new Task({
      id: row.id,
      providerId: row.providerId,
      type: row.type as Task['type'],
      data: row.data as Record<string, unknown>,
      startAt: row.startAt,
      status: row.status as TaskStatus,
      error: row.error ?? undefined,
    });
  }
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as { code?: string }).code === 'P2002'
  );
}
