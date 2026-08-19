import { prisma } from '@mail-threads/shared';

/**
 * Clears everything the build-threads recompute produced so it can be run again
 * from scratch: unmarks raw messages and wipes the derived Message /
 * MessageReference / MessageToMessageReference / Thread tables plus the
 * BUILD_THREADS task. The raw feed (RawMessage) is preserved, so the import
 * phase does not need to run again.
 */
async function resetRecompute(): Promise<void> {
  console.log('recompute-reset: unmarking raw messages...');

  await prisma.rawMessage.updateMany({
    data: { messageId: null, processedAt: null },
  });

  console.log('recompute-reset: clearing derived tables...');

  await prisma.messageToMessageReference.deleteMany({});
  await prisma.messageReference.deleteMany({});
  await prisma.message.deleteMany({});
  await prisma.threadReference.deleteMany({});
  await prisma.thread.deleteMany({});

  await prisma.task.deleteMany({ where: { type: 'BUILD_THREADS' } });

  await prisma.$disconnect();

  console.log(
    'recompute-reset: done. Start the worker to rebuild messages and threads.',
  );
}

resetRecompute().catch((error) => {
  console.error('recompute-reset: failed', error);

  process.exitCode = 1;
});
