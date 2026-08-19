import type { Prisma } from '@prisma/client';
import type { Task } from '../entities/Task.js';

export interface ImportTaskView {
  id: string;
  cursor: string | null;
  retries: number;
}

export interface TaskRepository {
  /**
   * Atomically claims a single ready PENDING import task for the provider.
   * Runs under FOR UPDATE SKIP LOCKED so each task is handed to exactly one
   * worker, and stamps a short claim lease via startAt so a crashed worker's
   * task is reclaimed after the lease expires. Duplicate work is further
   * neutralised by the idempotent persistence and the unique (providerId,
   * cursor) on the follow-up task.
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
   * Creates the BUILD_THREADS task for this provider if it does not exist yet.
   * Returns true when the task was created, false when it already exists.
   */
  ensureBuildThreadsTask(providerId: string): Promise<boolean>;

  /**
   * Atomically claims the single PENDING BUILD_THREADS task for the provider
   * (FOR UPDATE SKIP LOCKED + short claim lease). Returns null when there is
   * nothing ready to claim.
   */
  claimBuildThreadsTask(
    providerId: string,
    now: Date,
  ): Promise<{ id: string } | null>;

  /** Marks the BUILD_THREADS task as COMPLETED. */
  completeBuildThreadsTask(id: string): Promise<void>;

  /**
   * Counts all PENDING import tasks (including deferred ones). Used to detect
   * that the feed has fully settled before termination.
   */
  countPendingImportTasks(providerId: string): Promise<number>;
}
