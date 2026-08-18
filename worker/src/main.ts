import {
  PrismaProviderRepository,
  PrismaTaskRepository,
  prisma,
} from '@mail-threads/shared';
import { ImportTaskConsumer } from './application/importTaskConsumer.js';
import { bootstrapDatabase } from './infrastructure/bootstrap.js';
import { ProviderClient } from './infrastructure/provider/ProviderClient.js';

bootstrapDatabase();

const PROVIDER_NAME = process.env.PROVIDER_NAME ?? 'mail-provider';

const PROVIDER_URL = process.env.PROVIDER_URL ?? 'http://provider:8080';

const WORKER_CONCURRENCY = parseConcurrency(
  process.env.WORKER_CONCURRENCY ?? '4',
);

const providerRepository = new PrismaProviderRepository(prisma);

const taskRepository = new PrismaTaskRepository(prisma);

const providerClient = new ProviderClient(PROVIDER_URL);

const startedAt = Date.now();

console.log(`worker: start import (concurrency=${WORKER_CONCURRENCY})`);

const provider = await providerRepository.ensure(PROVIDER_NAME);

const done = { value: false };

const consumers = Array.from(
  { length: WORKER_CONCURRENCY },
  () =>
    new ImportTaskConsumer(provider.id, taskRepository, providerClient, done),
);

await Promise.all(consumers.map((consumer) => consumer.run()));

await prisma.$disconnect();

console.log(`worker: import done in ${Date.now() - startedAt} ms`);

process.exit(0);

function parseConcurrency(raw: string): number {
  const value = Number(raw);

  if (Number.isInteger(value) && value >= 1) {
    return value;
  }

  throw new Error(`invalid WORKER_CONCURRENCY: ${raw}`);
}
