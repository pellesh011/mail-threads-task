/**
 * Read model produced by the export repository. One record per persisted
 * message that carries an external id.
 */
export interface MessageExportRecord {
  messageId: string;

  /** message_id in the form it arrived. */
  externalId: string;

  /** external id of the message being replied to, or null for a root. */
  parentExternalId: string | null;

  /** thread this message belongs to, or null if not yet threaded. */
  threadId: string | null;

  sentAt: Date;

  subject: string | null;
}

/**
 * Input boundary for the export use case. Abstracts where messages come from so
 * the application layer does not depend on Prisma or the database layout.
 */
export interface MessageExportRepository {
  /**
   * Streams messages in batches (stable id order), so arbitrarily large feeds
   * never need to be materialised fully in memory.
   */
  iterBatches(batchSize: number): AsyncIterable<MessageExportRecord[]>;
}
