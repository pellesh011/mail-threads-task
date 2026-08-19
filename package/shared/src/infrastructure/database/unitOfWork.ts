import type { Prisma } from '@prisma/client';
import { prisma } from './prisma/client.js';

const TRANSACTION_TIMEOUT_MS = 60_000;

export const withTransaction = <T>(
  fn: (db: Prisma.TransactionClient) => Promise<T>,
): Promise<T> => prisma.$transaction(fn, { timeout: TRANSACTION_TIMEOUT_MS });
