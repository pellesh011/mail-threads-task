import { prisma } from '@mail-threads/shared';
import type {
  MessageExportRecord,
  MessageExportRepository,
} from '../domain/MessageExportRepository.js';

type PageMessage = {
  id: string;
  subject: string | null;
  sentAt: Date;
  threadId: string | null;
  refs: { externalId: string | null }[];
  parent: { refs: { externalId: string | null }[] } | null;
};

function toRecord(message: PageMessage): MessageExportRecord | null {
  const externalId = message.refs[0]?.externalId;

  if (externalId === null || externalId === undefined) {
    return null;
  }

  return {
    messageId: message.id,
    externalId,
    parentExternalId: message.parent?.refs[0]?.externalId ?? null,
    threadId: message.threadId,
    sentAt: message.sentAt,
    subject: message.subject,
  };
}

/**
 * PostgreSQL adapter for {@link MessageExportRepository}. Uses the shared
 * Prisma client and digs the external ids out of the relation graph, so the
 * application layer never touches the schema.
 */
export class PrismaMessageExportRepository implements MessageExportRepository {
  async *iterBatches(batchSize: number): AsyncGenerator<MessageExportRecord[]> {
    let cursor: string | undefined;

    for (;;) {
      const page = (await prisma.message.findMany({
        select: {
          id: true,
          subject: true,
          sentAt: true,
          threadId: true,
          refs: { select: { externalId: true }, take: 1 },
          parent: {
            select: { refs: { select: { externalId: true }, take: 1 } },
          },
        },
        where: cursor === undefined ? undefined : { id: { gt: cursor } },
        orderBy: { id: 'asc' },
        take: batchSize,
      })) as unknown as PageMessage[];

      if (page.length === 0) {
        return;
      }

      const records = page
        .map(toRecord)
        .filter((record): record is MessageExportRecord => record !== null);

      if (records.length > 0) {
        yield records;
      }

      cursor = page[page.length - 1]!.id;
    }
  }
}
