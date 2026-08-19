import { randomUUID } from 'node:crypto';
import type { Prisma } from '@prisma/client';
import { prisma, withTransaction } from '@mail-threads/shared';
import {
  computeGraph,
  decideThreads,
  type FeedNode,
  type MessageState,
  type MessageToMessageLink,
  type ThreadDecision,
} from './threadAlgorithms.js';

const MATERIALIZE_BATCH = 1000;

const WRITE_CHUNK = 1000;

const LINK_BATCH = 1_000;

type Stopwatch = () => number;

function stopwatch(): Stopwatch {
  const started = performance.now();

  return () => performance.now() - started;
}

function fmt(ms: number): string {
  return `${ms.toFixed(0)}ms`;
}

interface ParsedPayload {
  messageId: string | null;
  inReplyTo: string | null;
  references: string[];
  subject: string | null;
  sender: string | null;
  sentAt: string | null;
}

/**
 * Builds Message / MessageReference / MessageToMessageReference / Thread rows
 * from the raw messages already imported by the import phase, and computes
 * parent_id and thread membership.
 *
 * Every phase is idempotent and resumable:
 *  - Materialisation only touches raw messages whose `processedAt` is null, and
 *    uniqueness (MessageReference, RawMessage, RawMessage.messageId) prevents
 *    duplicate rows across restarts.
 *  - The link/parent/thread pass recomputes from the full local feed every run
 *    and only creates a Thread when a component has none yet, reusing the
 *    existing threadId otherwise, so repeated runs never duplicate threads.
 *
 * Writes are committed in small chunks so no single transaction runs long
 * enough to hit Prisma's interactive transaction timeout.
 */
export class BuildThreadsUseCase {
  constructor(private readonly providerId: string) {}

  async run(): Promise<void> {
    const total = stopwatch();

    console.log(`build-threads: start (provider=${this.providerId})`);

    let materialized = 0;

    for (;;) {
      const inserted = await withTransaction((tx) => this.materializeBatch(tx));

      if (inserted === 0) {
        break;
      }

      materialized += inserted;

      console.log(
        `build-threads: materialized +${inserted} (total ${materialized})`,
      );

      if (inserted < MATERIALIZE_BATCH) {
        break;
      }
    }

    console.log(
      `build-threads: materialization done (+${materialized}) in ${fmt(total())}`,
    );

    const rebuild = stopwatch();

    await this.rebuildFeed();

    console.log(`build-threads: rebuild done in ${fmt(rebuild())}`);
  }

  private async materializeBatch(
    tx: Prisma.TransactionClient,
  ): Promise<number> {
    const raws = await tx.rawMessage.findMany({
      where: { providerId: this.providerId, processedAt: null },
      orderBy: { receivedAt: 'asc' },
      take: MATERIALIZE_BATCH,
    });

    if (raws.length === 0) {
      return 0;
    }

    const now = new Date();

    for (const raw of raws) {
      const payload = parsePayload(raw.payload as Record<string, unknown>);

      const messageId = randomUUID();

      await tx.message.create({
        data: {
          id: messageId,
          sender: payload.sender ?? '',
          subject: payload.subject ?? null,
          sentAt: toStrictDate(payload.sentAt, raw.receivedAt),
          threadId: null,
          parentId: null,
        },
      });

      const externalId = raw.externalId ?? payload.messageId;

      if (externalId !== null && externalId !== '') {
        await tx.messageReference.create({
          data: {
            messageId,
            providerId: this.providerId,
            externalId,
          },
        });
      }

      await tx.rawMessage.update({
        where: { id: raw.id },
        data: { processedAt: now, messageId },
      });
    }

    return raws.length;
  }

  private async rebuildFeed(): Promise<void> {
    const load = stopwatch();

    const { nodes, extToId, messageState } = await this.loadFeed();

    console.log(
      `build-threads: loaded ${nodes.length} feed messages, ` +
        `${extToId.size} refs in ${fmt(load())}`,
    );

    if (nodes.length === 0) {
      return;
    }

    const computed = computeGraph(nodes, extToId);

    await this.writeLinks(computed.links, [...extToId.values()]);

    const decisions = decideThreads(nodes, extToId, messageState);

    await this.writeThreads(decisions);

    await this.writeParentUpdates(computed.parentUpdates, messageState);

    await this.writeThreadAssignments(decisions, messageState);

    await this.writeThreadCleanup(decisions);
  }

  private async loadFeed(): Promise<{
    nodes: FeedNode[];
    extToId: Map<string, string>;
    messageState: Map<string, MessageState>;
  }> {
    const raws = await prisma.rawMessage.findMany({
      where: { providerId: this.providerId },
      orderBy: { receivedAt: 'asc' },
    });

    const nodes: FeedNode[] = [];

    for (const raw of raws) {
      if (raw.messageId === null) {
        continue;
      }

      const payload = parsePayload(raw.payload as Record<string, unknown>);

      nodes.push({
        messageId: raw.messageId,
        refs: payload.references,
        inReplyTo: payload.inReplyTo,
      });
    }

    const refs = await prisma.messageReference.findMany({
      where: { providerId: this.providerId },
    });

    const extToId = new Map<string, string>();

    for (const ref of refs) {
      extToId.set(ref.externalId, ref.messageId);
    }

    const rows = await prisma.message.findMany({
      where: { id: { in: nodes.map((node) => node.messageId) } },
      select: { id: true, threadId: true, subject: true, parentId: true },
    });

    const messageState = new Map<string, MessageState>();

    for (const row of rows) {
      messageState.set(row.id, {
        threadId: row.threadId,
        subject: row.subject,
        parentId: row.parentId,
      });
    }

    return { nodes, extToId, messageState };
  }

  private async writeLinks(
    links: MessageToMessageLink[],
    providerMessageIds: string[],
  ): Promise<void> {
    const timer = stopwatch();

    await this.forEachChunk(providerMessageIds, LINK_BATCH, (tx, chunk) =>
      tx.messageToMessageReference.deleteMany({
        where: {
          OR: [
            { messageId: { in: chunk } },
            { referencedMessageId: { in: chunk } },
          ],
        },
      }),
    );

    const deletedAt = timer();

    await this.forEachChunk(links, LINK_BATCH, (tx, chunk) =>
      tx.messageToMessageReference.createMany({
        data: chunk,
        skipDuplicates: true,
      }),
    );

    console.log(
      `build-threads: links replaced (deleted in ${fmt(deletedAt)}, ` +
        `+${links.length} inserted in ${fmt(timer() - deletedAt)})`,
    );
  }

  private async writeThreads(decisions: ThreadDecision[]): Promise<void> {
    const newThreads = decisions.filter((decision) => !decision.existing);

    if (newThreads.length === 0) {
      return;
    }

    const timer = stopwatch();

    await this.forEachChunk(newThreads, WRITE_CHUNK, (tx, chunk) =>
      this.createThreads(tx, chunk),
    );

    console.log(
      `build-threads: created ${newThreads.length} threads in ${fmt(timer())}`,
    );
  }

  private async createThreads(
    tx: Prisma.TransactionClient,
    threads: ThreadDecision[],
  ): Promise<void> {
    for (const thread of threads) {
      await tx.thread.create({
        data: { id: thread.id, subject: thread.subject },
      });
    }
  }

  private async writeParentUpdates(
    updates: { id: string; parentId: string | null }[],
    messageState: Map<string, MessageState>,
  ): Promise<void> {
    const changed = updates.filter(
      (update) => messageState.get(update.id)!.parentId !== update.parentId,
    );

    if (changed.length === 0) {
      return;
    }

    const timer = stopwatch();

    await this.forEachChunk(changed, WRITE_CHUNK, (tx, chunk) =>
      this.updateParents(tx, chunk),
    );

    console.log(
      `build-threads: updated parent_id for ${changed.length} messages in ` +
        `${fmt(timer())}`,
    );
  }

  private async updateParents(
    tx: Prisma.TransactionClient,
    updates: { id: string; parentId: string | null }[],
  ): Promise<void> {
    for (const update of updates) {
      await tx.message.update({
        where: { id: update.id },
        data: { parentId: update.parentId },
      });
    }
  }

  private async writeThreadAssignments(
    decisions: ThreadDecision[],
    messageState: Map<string, MessageState>,
  ): Promise<void> {
    const updates: { id: string; threadId: string }[] = [];

    for (const decision of decisions) {
      for (const id of decision.members) {
        if (messageState.get(id)!.threadId !== decision.id) {
          updates.push({ id, threadId: decision.id });
        }
      }
    }

    if (updates.length === 0) {
      return;
    }

    const timer = stopwatch();

    await this.forEachChunk(updates, WRITE_CHUNK, (tx, chunk) =>
      this.assignThreads(tx, chunk),
    );

    console.log(
      `build-threads: assigned threadId to ${updates.length} messages in ` +
        `${fmt(timer())}`,
    );
  }

  private async assignThreads(
    tx: Prisma.TransactionClient,
    updates: { id: string; threadId: string }[],
  ): Promise<void> {
    for (const update of updates) {
      await tx.message.update({
        where: { id: update.id },
        data: { threadId: update.threadId },
      });
    }
  }

  private async writeThreadCleanup(decisions: ThreadDecision[]): Promise<void> {
    const losers = decisions.flatMap((decision) => decision.losers);

    if (losers.length === 0) {
      return;
    }

    // Runs after all members have been reassigned to their survivor thread, so
    // every loser thread is empty here. Deleting it cascades any attached
    // ThreadReference (not populated for this provider).
    const timer = stopwatch();

    await this.forEachChunk(losers, WRITE_CHUNK, (tx, chunk) =>
      this.deleteThreads(tx, chunk),
    );

    console.log(
      `build-threads: deleted ${losers.length} orphan threads in ${fmt(timer())}`,
    );
  }

  private async deleteThreads(
    tx: Prisma.TransactionClient,
    loserIds: string[],
  ): Promise<void> {
    for (const loserId of loserIds) {
      await tx.thread.delete({ where: { id: loserId } });
    }
  }

  private async forEachChunk<T>(
    items: T[],
    size: number,
    fn: (tx: Prisma.TransactionClient, chunk: T[]) => Promise<unknown>,
  ): Promise<void> {
    for (let i = 0; i < items.length; i += size) {
      const chunk = items.slice(i, i + size);

      await withTransaction((tx) => fn(tx, chunk));
    }
  }
}

function parsePayload(payload: Record<string, unknown>): ParsedPayload {
  return {
    messageId: asString(payload.message_id),
    inReplyTo: asString(payload.in_reply_to),
    references: Array.isArray(payload.references)
      ? payload.references.filter(
          (value): value is string => typeof value === 'string',
        )
      : [],
    subject: asString(payload.subject),
    sender: asString(payload.from),
    sentAt: asString(payload.sent_at),
  };
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value !== '' ? value : null;
}

function toStrictDate(value: string | null, fallback: Date): Date {
  if (value === null) {
    return fallback;
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? fallback : date;
}
