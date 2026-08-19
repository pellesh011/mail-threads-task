import type { PrismaTaskRepository } from '@mail-threads/shared';
import { BuildThreadsUseCase } from './buildThreadsUseCase.js';

/**
 * Runs the BUILD_THREADS use case for a single provider. Claims the one
 * PENDING task, executes the idempotent use case and marks the task completed.
 *
 * If the process dies mid-run the task stays PENDING (only the claim lease is
 * stamped), so a restart claims and resumes it. The use case is safe to re-run
 * because it only materialises unprocessed raw messages and reuses existing
 * threads.
 */
export class BuildThreadsConsumer {
  constructor(
    private readonly providerId: string,
    private readonly taskRepository: PrismaTaskRepository,
  ) {}

  async run(): Promise<void> {
    const task = await this.taskRepository.claimBuildThreadsTask(
      this.providerId,
      new Date(),
    );

    if (task === null) {
      console.log('build-threads: no pending task to claim');

      return;
    }

    await new BuildThreadsUseCase(this.providerId).run();

    await this.taskRepository.completeBuildThreadsTask(task.id);

    console.log('build-threads: task completed');
  }
}
