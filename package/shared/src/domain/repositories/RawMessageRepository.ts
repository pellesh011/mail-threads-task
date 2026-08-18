import type { RawMessage } from '../entities/RawMessage.js';

export interface RawMessageInput {
  providerId: string;
  externalId: string;
  payload: Record<string, unknown>;
}

export interface RawMessageRepository {
  upsert(params: {
    providerId: string;
    externalId?: string | null;
    payload: Record<string, unknown>;
  }): Promise<RawMessage>;

  /**
   * Bulk-inserts raw messages that are not yet present, ignoring duplicates
   * (unique providerId + externalId). Returns the number of new rows.
   */
  upsertMany(rows: RawMessageInput[]): Promise<number>;

  findById(id: string): Promise<RawMessage | null>;

  findUnprocessed(limit?: number): Promise<RawMessage[]>;

  markProcessed(id: string, messageId: string): Promise<void>;
}
