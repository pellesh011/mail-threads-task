import type { RawMessage } from '../entities/RawMessage.js';

export interface RawMessageRepository {
  upsert(params: {
    providerId: string;
    externalId?: string | null;
    payload: Record<string, unknown>;
  }): Promise<RawMessage>;

  findById(id: string): Promise<RawMessage | null>;

  findUnprocessed(limit?: number): Promise<RawMessage[]>;

  markProcessed(id: string, messageId: string): Promise<void>;
}
