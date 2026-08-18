import type { ThreadReference } from '../entities/ThreadReference.js';

export interface ThreadReferenceRepository {
  upsert(params: {
    threadId: string;
    providerId: string;
    externalId: string;
  }): Promise<ThreadReference>;

  findByExternalId(
    providerId: string,
    externalId: string,
  ): Promise<ThreadReference | null>;
}
