import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  computeGraph,
  decideThreads,
  type FeedNode,
} from './threadAlgorithms.js';

function node(
  messageId: string,
  refs: string[] = [],
  inReplyTo: string | null = null,
): FeedNode {
  return { messageId, refs, inReplyTo };
}

function extToId(ids: string[]): Map<string, string> {
  return new Map(ids.map((id) => [id, id]));
}

function stateOf(
  assignments: Record<
    string,
    { threadId?: string | null; subject?: string | null }
  >,
): Map<
  string,
  { threadId: string | null; subject: string | null; parentId: string | null }
> {
  return new Map(
    Object.entries(assignments).map(([id, a]) => [
      id,
      {
        threadId: a.threadId ?? null,
        subject: a.subject ?? null,
        parentId: null,
      },
    ]),
  );
}

await test('parent_id: last existing reference from references + in_reply_to, right to left', () => {
  // references=[A,B,X], in_reply_to=[Y]; A and B exist, X and Y do not.
  const nodes = [node('A'), node('B'), node('M3', ['A', 'B', 'X'], 'Y')];

  const { parentUpdates } = computeGraph(nodes, extToId(['A', 'B']));

  assert.equal(parentUpdates.find((p) => p.id === 'M3')!.parentId, 'B');
});

await test('parent_id: null when no reference is present in the feed', () => {
  const nodes = [
    node('M1', [], 'Y'),
    node('M2', ['X', 'Z']),
    node('M3'), // no references, no in_reply_to
  ];

  const { parentUpdates } = computeGraph(nodes, new Map());

  for (const p of parentUpdates) {
    assert.equal(p.parentId, null);
  }
});

await test('parent_id: with no in_reply_to, picks the last existing reference', () => {
  const nodes = [node('M', ['X', 'A', 'B', 'Y'])];
  const { parentUpdates } = computeGraph(nodes, extToId(['A', 'B']));
  assert.equal(parentUpdates[0]!.parentId, 'B');
});

await test('parent_id: in_reply_to alone is a valid parent', () => {
  const nodes = [node('M', [], 'A')];
  const { parentUpdates } = computeGraph(nodes, extToId(['A']));
  assert.equal(parentUpdates[0]!.parentId, 'A');
});

await test('parent_id: self reference is never a parent', () => {
  const nodes = [node('M', ['M', 'A'], 'M')];
  const { parentUpdates } = computeGraph(nodes, extToId(['M', 'A']));
  assert.equal(parentUpdates[0]!.parentId, 'A');
});

await test('links: built from references only (in_reply_to excluded), deduped, missing and self skipped, order preserved', () => {
  const nodes = [node('M', ['B', 'B', 'X'], 'B')];
  const { links } = computeGraph(nodes, extToId(['M', 'B']));

  // In-reply-to ('B') must NOT appear as a link; the duplicate and the missing
  // reference are dropped; self reference 'M'... none here.
  assert.deepEqual(links, [
    { messageId: 'M', referencedMessageId: 'B', order: 0 },
  ]);
});

await test('graph: undirected connectivity through references and in_reply_to merges two threads into one component', () => {
  const nodes = [
    node('A'),
    node('B', [], 'A'), // A -- B
    node('C'),
    node('D', [], 'C'), // C -- D
    node('E', ['B', 'D']), // E -- B, E -- D
  ];

  const decisions = decideThreads(
    nodes,
    extToId(['A', 'B', 'C', 'D', 'E']),
    stateOf({
      A: {},
      B: {},
      C: {},
      D: {},
      E: {},
    }),
  );

  assert.equal(decisions.length, 1);
  assert.deepEqual(decisions[0]!.members.sort(), ['A', 'B', 'C', 'D', 'E']);
});

await test('threads: each component maps to one deterministic thread, subject is ignored', () => {
  const nodes = [
    node('A1', ['B1']),
    node('B1'),
    node('A2', ['B2']),
    node('B2'),
  ];

  // Same subject across two independent conversations -> two threads.
  const decisions = decideThreads(
    nodes,
    extToId(['A1', 'B1', 'A2', 'B2']),
    stateOf({
      A1: { subject: 'random' },
      B1: { subject: 'random' },
      A2: { subject: 'random' },
      B2: { subject: 'random' },
    }),
  );

  assert.equal(decisions.length, 2);
  assert.deepEqual(decisions[0]!.members.sort(), ['A1', 'B1']);
  assert.deepEqual(decisions[1]!.members.sort(), ['A2', 'B2']);
});

await test('threads: different subjects inside one conversation stay a single thread', () => {
  const nodes = [node('A', ['B']), node('B')];

  const decisions = decideThreads(
    nodes,
    extToId(['A', 'B']),
    stateOf({
      A: { subject: 'start' },
      B: { subject: 'Re: start' },
    }),
  );

  assert.equal(decisions.length, 1);
  assert.deepEqual(decisions[0]!.members.sort(), ['A', 'B']);
});

await test('threads: merging picks the survivor with most members, losers listed', () => {
  const nodes = [
    node('A'),
    node('B', [], 'A'),
    node('C'),
    node('D', [], 'C'),
    node('E', ['B', 'D']),
  ];

  const decisions = decideThreads(
    nodes,
    extToId(['A', 'B', 'C', 'D', 'E']),
    stateOf({
      A: { threadId: 't1' },
      B: { threadId: 't1' },
      C: { threadId: 't2' },
      D: { threadId: 't2' },
      E: { threadId: 't2' },
    }),
  );

  assert.equal(decisions.length, 1);
  assert.equal(decisions[0]!.id, 't2'); // 3 members vs 2
  assert.deepEqual(decisions[0]!.losers, ['t1']);
  assert.equal(decisions[0]!.existing, true);
});

await test('threads: survivor tie breaks by lexicographically smaller thread id', () => {
  const nodes = [node('A', ['B']), node('B')];

  const decisions = decideThreads(
    nodes,
    extToId(['A', 'B']),
    stateOf({ A: { threadId: 'th2' }, B: { threadId: 'th1' } }),
  );

  assert.equal(decisions.length, 1);
  assert.equal(decisions[0]!.id, 'th1');
  assert.deepEqual(decisions[0]!.losers, ['th2']);
});

await test('threads: idempotent when every member already belongs to a thread (no new thread id generated)', () => {
  const nodes = [
    node('A'),
    node('B', [], 'A'),
    node('C'),
    node('D', [], 'C'),
    node('E', ['B', 'D']),
  ];

  const state = stateOf({
    A: { threadId: 't9' },
    B: { threadId: 't9' },
    C: { threadId: 't9' },
    D: { threadId: 't9' },
    E: { threadId: 't9' },
  });

  let generated = 0;
  const generator = () => {
    generated++;
    return 'brand-new';
  };

  const first = decideThreads(
    nodes,
    extToId(['A', 'B', 'C', 'D', 'E']),
    state,
    generator,
  );
  const second = decideThreads(
    nodes,
    extToId(['A', 'B', 'C', 'D', 'E']),
    state,
    generator,
  );

  assert.equal(generated, 0);
  assert.equal(first[0]!.id, 't9');
  assert.equal(second[0]!.id, first[0]!.id);
});
