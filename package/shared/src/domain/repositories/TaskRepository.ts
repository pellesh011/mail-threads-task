import type { Prisma } from '@prisma/client';
import type { Task } from '../entities/Task.js';

export interface ImportTaskView {
  id: string;
  cursor: string | null;
  retries: number;
}

export interface TaskRepository {
  /**
   * Selects a single ready PENDING import task for the provider.
   * The task stays PENDING until it is fully processed, so it can be claimed
   * again after a crash. Reads are optimistic: a concurrent worker may claim the
   * same task, but duplicate work is neutralised by the idempotent persistence
   * and the unique (providerId, cursor) on the follow-up task.
   */
  claimImportTask(
    providerId: string,
    now: Date,
  ): Promise<ImportTaskView | null>;

  /**
   * Creates the follow-up task for the next page. Returns false when a task for
   * that cursor already exists (unique providerId + cursor), i.e. another worker
   * already queued it.
   */
  enqueueNextImportTask(
    tx: Prisma.TransactionClient,
    providerId: string,
    cursor: string,
  ): Promise<boolean>;

  /**
   * Re-selects the task inside the processing transaction and locks it for
   * update. Returns the task only if it is still PENDING, i.e. this worker owns
   * it. Returns null when another worker already finished it.
   */
  lockPendingImportTask(
    tx: Prisma.TransactionClient,
    id: string,
  ): Promise<Task | null>;

  /**
   * Marks a fully processed import task as COMPLETED and resets its payload.
   */
  completeImportTask(tx: Prisma.TransactionClient, id: string): Promise<void>;

  /**
   * Defers a task by setting startAt, keeping it PENDING (rate limiting /
   * transient backoff). data holds the updated payload to persist.
   */
  deferImportTask(
    id: string,
    startAt: Date,
    data?: Record<string, unknown>,
  ): Promise<void>;

  failImportTask(id: string, error: string): Promise<void>;

  /**
   * Counts all PENDING import tasks (including deferred ones). Used to detect
   * that the feed has fully settled before termination.
   */
  countPendingImportTasks(providerId: string): Promise<number>;
}
