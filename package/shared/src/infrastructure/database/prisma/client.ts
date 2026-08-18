import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

export type DbClient = Pick<
  PrismaClient,
  | 'provider'
  | 'message'
  | 'messageReference'
  | 'messageToMessageReference'
  | 'rawMessage'
  | 'task'
  | 'thread'
  | 'threadReference'
  | '$queryRaw'
  | '$executeRaw'
>;

const connectionString =
  process.env.DATABASE_URL ??
  'postgres://worker:worker@localhost:5432/mailthreads';

const adapter = new PrismaPg({ connectionString });

export const prisma = new PrismaClient({ adapter });
