import { randomUUID } from 'node:crypto';

/**
 * Pure algorithms behind BuildThreadsUseCase. These operate in-memory on the
 * full local feed and are independent of the database, so the critical rules
 * from the spec can be unit-tested without a DB connection.
 *
 * Three distinct concepts must stay separate:
 *  1. parentId  — last existing reference from [...references, inReplyTo],
 *                 scanned right-to-left.
 *  2. MessageToMessageReference — explicit `references` elements only.
 *  3. Thread graph — references + inReplyTo treated as undirected edges.
 */

export interface FeedNode {
  messageId: string;
  refs: string[];
  inReplyTo: string | null;
}

export interface MessageToMessageLink {
  messageId: string;
  referencedMessageId: string;
  order: number;
}

export interface MessageState {
  threadId: string | null;
  subject: string | null;
  parentId: string | null;
}

export interface ThreadDecision {
  id: string;
  subject: string | null;
  members: string[];
  existing: boolean;
  losers: string[];
}

export interface ComputedFeed {
  links: MessageToMessageLink[];
  parentUpdates: { id: string; parentId: string | null }[];
}

/**
 * Computes, for every message, the explicit `references` edges (MessageToMessageReference)
 * and the parent id. `inReplyTo` never becomes a MessageToMessageReference edge;
 * it only participates in parent resolution.
 */
export function computeGraph(
  nodes: FeedNode[],
  extToId: Map<string, string>,
): ComputedFeed {
  const links: MessageToMessageLink[] = [];

  const parentUpdates: { id: string; parentId: string | null }[] = [];

  for (const node of nodes) {
    const parentCandidates =
      node.inReplyTo === null ? node.refs : [...node.refs, node.inReplyTo];

    const seen = new Set<string>();

    for (let order = 0; order < node.refs.length; order++) {
      const candidate = node.refs[order];

      if (candidate === undefined || candidate === '') {
        continue;
      }

      const target = extToId.get(candidate);

      if (
        target === undefined ||
        target === node.messageId ||
        seen.has(candidate)
      ) {
        continue;
      }

      seen.add(candidate);

      links.push({
        messageId: node.messageId,
        referencedMessageId: target,
        order,
      });
    }

    parentUpdates.push({
      id: node.messageId,
      parentId: resolveParent(parentCandidates, extToId, node.messageId),
    });
  }

  return { links, parentUpdates };
}

/**
 * The first reference from the right whose target is present in the local feed.
 * Self-references are not valid parents.
 */
function resolveParent(
  candidates: string[],
  extToId: Map<string, string>,
  selfMessageId: string,
): string | null {
  for (let i = candidates.length - 1; i >= 0; i--) {
    const candidate = candidates[i];

    if (candidate === undefined || candidate === '') {
      continue;
    }

    const target = extToId.get(candidate);

    if (target !== undefined && target !== selfMessageId) {
      return target;
    }
  }

  return null;
}

/**
 * Groups messages into threads by connected components of the undirected graph
 * built from references + inReplyTo. Each component maps to exactly one Thread.
 * Subject never participates in grouping.
 */
export function decideThreads(
  nodes: FeedNode[],
  extToId: Map<string, string>,
  messageState: Map<string, MessageState>,
  newThreadId: () => string = randomUUID,
): ThreadDecision[] {
  const indexOf = new Map<string, number>();

  nodes.forEach((node, index) => indexOf.set(node.messageId, index));

  const dsu = new DisjointSet(nodes.length);

  for (const node of nodes) {
    const candidates = [...node.refs, node.inReplyTo].filter(
      (value): value is string =>
        value !== null && value !== undefined && value !== '',
    );

    const messageIndex = indexOf.get(node.messageId)!;

    for (const candidate of candidates) {
      const target = extToId.get(candidate);

      if (target === undefined || target === node.messageId) {
        continue;
      }

      const targetIndex = indexOf.get(target);

      if (targetIndex === undefined) {
        continue;
      }

      dsu.union(messageIndex, targetIndex);
    }
  }

  const groups = new Map<number, string[]>();

  for (let i = 0; i < nodes.length; i++) {
    const root = dsu.find(i);
    const members = groups.get(root);

    if (members === undefined) {
      groups.set(root, [nodes[i]!.messageId]);
    } else {
      members.push(nodes[i]!.messageId);
    }
  }

  const decisions: ThreadDecision[] = [];

  for (const members of groups.values()) {
    const subject =
      members
        .map((id) => messageState.get(id)!.subject)
        .find((value): value is string => value !== null) ?? null;

    const memberCountByThread = new Map<string, number>();

    for (const id of members) {
      const threadId = messageState.get(id)!.threadId;

      if (threadId !== null) {
        memberCountByThread.set(
          threadId,
          (memberCountByThread.get(threadId) ?? 0) + 1,
        );
      }
    }

    const existingThreadIds = [...memberCountByThread.keys()];

    // Deterministic survivor: the existing thread with the most members in this
    // component; ties break by the lowest thread id.
    let survivorId: string | null = null;

    if (existingThreadIds.length > 0) {
      survivorId = existingThreadIds[0]!;

      for (const threadId of existingThreadIds) {
        const score = memberCountByThread.get(threadId)!;
        const currentScore = memberCountByThread.get(survivorId)!;

        if (
          score > currentScore ||
          (score === currentScore && threadId < survivorId)
        ) {
          survivorId = threadId;
        }
      }
    }

    decisions.push({
      id: survivorId ?? newThreadId(),
      subject,
      members,
      existing: survivorId !== null,
      losers:
        survivorId === null
          ? []
          : existingThreadIds.filter((threadId) => threadId !== survivorId),
    });
  }

  return decisions;
}

class DisjointSet {
  private readonly parent: number[];

  private readonly rank: number[];

  constructor(size: number) {
    this.parent = Array.from({ length: size }, (_, index) => index);
    this.rank = new Array<number>(size).fill(0);
  }

  find(value: number): number {
    if (this.parent[value] !== value) {
      this.parent[value] = this.find(this.parent[value]!);
    }

    return this.parent[value];
  }

  union(a: number, b: number): void {
    const rootA = this.find(a);
    const rootB = this.find(b);

    if (rootA === rootB) {
      return;
    }

    const rankA = this.rank[rootA]!;
    const rankB = this.rank[rootB]!;

    if (rankA < rankB) {
      this.parent[rootA] = rootB;
    } else if (rankA > rankB) {
      this.parent[rootB] = rootA;
    } else {
      this.parent[rootB] = rootA;
      this.rank[rootA] = rankA + 1;
    }
  }
}
