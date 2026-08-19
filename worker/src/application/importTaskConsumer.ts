import {
  PrismaTaskRepository,
  PrismaRawMessageRepository,
  withTransaction,
} from '@mail-threads/shared';
import type {
  ProviderClient,
  ProviderPage,
} from '../infrastructure/provider/ProviderClient.js';
import {
  ProviderError,
  RateLimitError,
  TransientProviderError,
} from '../infrastructure/provider/ProviderClient.js';

const ADVISORY_LOCK_KEY = 0x4d4c5453;

const POLL_INTERVAL_MS = 100;

export class ImportTaskConsumer {
  constructor(
    private readonly providerId: string,
    private readonly taskRepository: PrismaTaskRepository,
    private readonly providerClient: ProviderClient,
    private readonly done: { value: boolean },
  ) {}

  async run(): Promise<void> {
    for (;;) {
      if (this.done.value) {
        return;
      }

      const task = await this.taskRepository.claimImportTask(
        this.providerId,
        new Date(),
      );

      if (task !== null) {
        await this.processImportTask(task, performance.now());
        continue;
      }

      const outcome = await this.settleProvider();

      if (outcome === 'done') {
        return;
      }

      await sleep(POLL_INTERVAL_MS);
    }
  }

  /**
   * Coordinates bootstrap and termination under a single advisory lock so only
   * one worker acts and decisions are made from a consistent snapshot.
   */
  private async settleProvider(): Promise<'bootstrap' | 'wait' | 'done'> {
    return withTransaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(${ADVISORY_LOCK_KEY})`;

      const exists = await tx.task.findFirst({
        where: {
          providerId: this.providerId,
          type: 'IMPORT_MESSAGES',
        },
      });

      if (exists === null) {
        await tx.task.create({
          data: {
            providerId: this.providerId,
            type: 'IMPORT_MESSAGES',
            status: 'PENDING',
            cursor: null,
            data: {},
          },
        });

        console.log('import: initial task created');

        return 'bootstrap';
      }

      const pending = await tx.task.count({
        where: {
          providerId: this.providerId,
          type: 'IMPORT_MESSAGES',
          status: 'PENDING',
        },
      });

      // A task stays PENDING until it is fully persisted and completed, so a
      // zero count means no task is being fetched, deferred or queued: the feed
      // has genuinely settled.
      if (pending === 0) {
        this.done.value = true;

        console.log('import: feed exhausted');

        return 'done';
      }

      return 'wait';
    });
  }

  private async processImportTask(
    task: {
      id: string;
      cursor: string | null;
      retries: number;
    },
    startedAtMs: number,
  ): Promise<void> {
    let page: ProviderPage | undefined;

    try {
      page = await this.providerClient.fetchPage(task.cursor);
    } catch (error) {
      if (error instanceof RateLimitError) {
        await this.defer(task.id, task.cursor, task.retries, {
          retryAfterSeconds: error.retryAfterSeconds,
        });
        return;
      }

      if (error instanceof TransientProviderError) {
        await this.deferTransient(task.id, task.cursor, task.retries, error);
        return;
      }

      if (error instanceof ProviderError) {
        await this.fail(task.id, error.message);
        return;
      }

      throw error;
    }

    if (page === undefined) {
      throw new Error('unreachable: fetchPage returned no page');
    }

    // Queue the next page as soon as the response arrives, so an idle worker can
    // pick it up while this worker persists the current batch.
    if (page.nextCursor !== null) {
      await this.enqueueNext(page.nextCursor);
    }

    // Persist the batch and finalize only if this worker still owns the task.
    // The unique (providerId, cursor) on the follow-up task doubles as the
    // dedup point, so a duplicate worker silently loses the race here.
    await withTransaction(async (tx) => {
      const locked = await this.taskRepository.lockPendingImportTask(
        tx,
        task.id,
      );

      if (locked === null) {
        return;
      }

      const rawRepository = new PrismaRawMessageRepository(tx);

      if (page.items.length > 0) {
        const inserted = await rawRepository.upsertMany(
          page.items.map((item) => ({
            providerId: this.providerId,
            externalId: item.externalId,
            payload: item.payload,
          })),
        );

        if (inserted > 0) {
          console.log(
            `import: task ${task.id} received at ` +
              `${new Date(startedAtMs).toISOString()}, messages persisted at ` +
              `${new Date().toISOString()} ` +
              `(elapsed ${(performance.now() - startedAtMs).toFixed(3)} ms, ` +
              `+${inserted} raw messages)`,
          );
        }
      }

      await this.taskRepository.completeImportTask(tx, task.id);

      if (page.nextCursor === null) {
        console.log('import: feed end reached');
      }
    });
  }

  private async enqueueNext(cursor: string): Promise<void> {
    await withTransaction(async (tx) => {
      const created = await this.taskRepository.enqueueNextImportTask(
        tx,
        this.providerId,
        cursor,
      );

      if (created) {
        console.log(`import: next task queued at cursor ${cursor}`);
      }
    });
  }

  private async defer(
    taskId: string,
    cursor: string | null,
    retries: number,
    params: { retryAfterSeconds: number },
  ): Promise<void> {
    const startAt = new Date(Date.now() + params.retryAfterSeconds * 1_000);

    await this.taskRepository.deferImportTask(taskId, startAt, {
      cursor: cursor ?? null,
      retries,
    });

    console.warn(
      `import: rate limited, task ${taskId} deferred to ${startAt.toISOString()} ` +
        `(blocked for ${params.retryAfterSeconds}s)`,
    );
  }

  private async deferTransient(
    taskId: string,
    cursor: string | null,
    retries: number,
    error: TransientProviderError,
  ): Promise<void> {
    const backoff = this.backoffMs(retries);
    const startAt = new Date(Date.now() + backoff);

    await this.taskRepository.deferImportTask(taskId, startAt, {
      cursor: cursor ?? null,
      retries: retries + 1,
    });

    console.warn(
      `import: transient provider error (${error.message}), task ${taskId} ` +
        `re-queued to ${startAt.toISOString()}, retries=${retries + 1}`,
    );
  }

  private async fail(taskId: string, error: string): Promise<void> {
    await this.taskRepository.failImportTask(taskId, error);

    console.error(`import: task ${taskId} failed: ${error}`);
  }

  private backoffMs(retries: number): number {
    const base = Math.min(2 ** retries, 30) * 500;

    return Math.floor(base * (1 + Math.random() * 0.5));
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
