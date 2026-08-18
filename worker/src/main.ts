import {
  PrismaProviderRepository,
  PrismaTaskRepository,
  prisma,
} from '@mail-threads/shared';
import { createClient } from 'redis';
import { ImportTaskConsumer } from './application/importTaskConsumer.js';
import { bootstrapDatabase } from './infrastructure/bootstrap.js';
import { ProviderClient } from './infrastructure/provider/ProviderClient.js';
import {
  NoopRateLimiter,
  type RateLimiter,
} from './infrastructure/rateLimit/RateLimiter.js';
import {
  RedisRateLimiter,
  type RateLimitStore,
} from './infrastructure/rateLimit/RedisRateLimiter.js';

bootstrapDatabase();

const PROVIDER_NAME = process.env.PROVIDER_NAME ?? 'mail-provider';

const PROVIDER_URL = process.env.PROVIDER_URL ?? 'http://provider:8080';

const REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379';

const WORKER_CONCURRENCY = parseConcurrency(
  process.env.WORKER_CONCURRENCY ?? '1',
);

const RATE_LIMIT_PER_SECOND = parseLimit(
  process.env.RATE_LIMIT_PER_SECOND ?? '9',
);

const providerRepository = new PrismaProviderRepository(prisma);

const taskRepository = new PrismaTaskRepository(prisma);

const startedAt = Date.now();

console.log(
  `worker: start import (concurrency=${WORKER_CONCURRENCY}, ` +
    `rate=${RATE_LIMIT_PER_SECOND}/s)`,
);

const provider = await providerRepository.ensure(PROVIDER_NAME);

const rateLimiter = await createRateLimiter(provider.id);

const providerClient = new ProviderClient(PROVIDER_URL, rateLimiter);

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

async function createRateLimiter(providerId: string): Promise<RateLimiter> {
  const redis = createClient({ url: REDIS_URL });

  redis.on('error', (error) => {
    console.warn(`worker: redis error: ${(error as Error).message}`);
  });

  try {
    await redis.connect();
  } catch (error) {
    console.warn(
      `worker: redis unavailable (${(error as Error).message}), ` +
        'rate limiting disabled',
    );

    return new NoopRateLimiter();
  }

  return new RedisRateLimiter(
    redis as unknown as RateLimitStore,
    `rl:${providerId}`,
    RATE_LIMIT_PER_SECOND,
  );
}

function parseConcurrency(raw: string): number {
  const value = Number(raw);

  if (Number.isInteger(value) && value >= 1) {
    return value;
  }

  throw new Error(`invalid WORKER_CONCURRENCY: ${raw}`);
}

function parseLimit(raw: string): number {
  const value = Number(raw);

  if (Number.isInteger(value) && value >= 1) {
    return value;
  }

  throw new Error(`invalid RATE_LIMIT_PER_SECOND: ${raw}`);
}
