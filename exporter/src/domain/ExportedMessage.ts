import type { MessageExportRecord } from './MessageExportRepository.js';

/** One line of the result file, already shaped as the deliverable JSON. */
export interface ExportedMessageRow {
  external_id: string;
  thread_key: string;
  parent_id: string;
  sent_at: string;
  subject: string;
}

/**
 * Domain object for a single exported message. Composes the deliverable row
 * from the repository read model and knows how to serialise itself for the
 * JSON-lines output.
 */
export class ExportedMessage {
  private constructor(private readonly row: ExportedMessageRow) {}

  static fromRecord(record: MessageExportRecord): ExportedMessage {
    return new ExportedMessage({
      external_id: record.externalId,
      thread_key: record.threadId ?? record.messageId,
      parent_id: record.parentExternalId ?? '',
      sent_at: record.sentAt.toISOString(),
      subject: record.subject ?? '',
    });
  }

  toJsonLine(): string {
    return JSON.stringify(this.row);
  }
}
