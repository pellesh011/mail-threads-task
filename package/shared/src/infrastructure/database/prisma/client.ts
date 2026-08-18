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
>;

export const prisma = new PrismaClient();
