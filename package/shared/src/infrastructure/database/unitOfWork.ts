import type { Prisma } from '@prisma/client';
import { prisma } from './prisma/client.js';

export const withTransaction = <T>(
  fn: (db: Prisma.TransactionClient) => Promise<T>,
): Promise<T> => prisma.$transaction(fn);
