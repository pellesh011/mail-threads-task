import type { ThreadId } from './Thread.js';
import type { ProviderId } from './Provider.js';

export interface ThreadReferenceParams {
  threadId: ThreadId;
  providerId: ProviderId;
  externalId: string;
}

export class ThreadReference {
  public readonly threadId: ThreadId;

  public readonly providerId: ProviderId;

  public readonly externalId: string;

  constructor(params: ThreadReferenceParams) {
    this.threadId = params.threadId;

    this.providerId = params.providerId;

    this.externalId = params.externalId;
  }
}
