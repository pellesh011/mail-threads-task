import type { MessageReference } from '../entities/MessageReference.js';

export interface MessageReferenceRepository {
  upsert(params: {
    messageId: string;
    providerId: string;
    externalId: string;
  }): Promise<MessageReference>;

  findByExternalId(
    providerId: string,
    externalId: string,
  ): Promise<MessageReference | null>;

  findByExternalIds(
    providerId: string,
    externalIds: string[],
  ): Promise<MessageReference[]>;
}
