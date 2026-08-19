import type { IncomingMessage } from '../../application/dto/IncomingMessage.js';
import type { RateLimiter } from '../rateLimit/RateLimiter.js';

export class RateLimitError extends Error {
  constructor(public readonly retryAfterSeconds: number) {
    super(`rate limited (retry after ${retryAfterSeconds}s)`);
    this.name = 'RateLimitError';
  }
}

export class TransientProviderError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = 'TransientProviderError';
  }
}

export class ProviderError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = 'ProviderError';
  }
}

export interface ProviderPage {
  items: IncomingMessage[];
  nextCursor: string | null;
}

interface ProviderMessage {
  message_id?: string;
  in_reply_to?: string | null;
  references?: string[];
  subject?: string;
  from?: string;
  to?: string[];
  sent_at?: string;
}

interface ProviderResponse {
  items?: ProviderMessage[];
  next_cursor?: string | null;
}

const MAX_TIMEOUT_MS = 100;

const MAX_INVALID_BODY_RETRIES = 5;

export class ProviderClient {
  constructor(
    private readonly baseUrl: string,
    private readonly limiter: RateLimiter,
  ) {}

  buildUrl(cursor: string | null, limit: number): string {
    const url = new URL('/v1/messages', this.baseUrl);

    url.searchParams.set('limit', String(limit));

    if (cursor !== null) {
      url.searchParams.set('cursor', cursor);
    }

    return url.toString();
  }

  async fetchPage(cursor: string | null, limit = 200): Promise<ProviderPage> {
    return this.request(cursor, limit);
  }

  private async request(
    cursor: string | null,
    limit: number,
  ): Promise<ProviderPage> {
    await this.limiter.acquire();

    const url = this.buildUrl(cursor, limit);

    const controller = new AbortController();

    const timer = setTimeout(() => controller.abort(), MAX_TIMEOUT_MS);

    try {
      let response = await this.doFetch(url, controller.signal);

      let invalidBodyRetries = 0;

      for (;;) {
        let body: ProviderResponse;

        try {
          body = (await response.json()) as ProviderResponse;
        } catch (error) {
          invalidBodyRetries++;

          if (invalidBodyRetries > MAX_INVALID_BODY_RETRIES) {
            throw new ProviderError(
              'invalid provider response body',
              undefined,
              {
                cause: error,
              },
            );
          }

          response = await this.doFetch(url, controller.signal);

          continue;
        }

        return {
          items: (body.items ?? []).map((item) => this.mapItem(item)),
          nextCursor: body.next_cursor ?? null,
        };
      }
    } finally {
      clearTimeout(timer);
    }
  }

  private async doFetch(url: string, signal: AbortSignal): Promise<Response> {
    let response: Response;

    try {
      response = await fetch(url, { signal });
    } catch (error) {
      throw new TransientProviderError('provider request failed', undefined, {
        cause: error,
      });
    }

    if (response.status === 429) {
      const raw = response.headers.get('retry-after');
      const seconds = raw === null ? 1 : Number(raw);

      throw new RateLimitError(Number.isNaN(seconds) ? 1 : seconds);
    }

    if (!response.ok) {
      if (response.status >= 500) {
        throw new TransientProviderError(
          `HTTP ${response.status}`,
          response.status,
        );
      }

      throw new ProviderError(`HTTP ${response.status}`, response.status);
    }

    return response;
  }

  private mapItem(item: ProviderMessage): IncomingMessage {
    return {
      externalId: item.message_id ?? '',
      payload: {
        message_id: item.message_id,
        in_reply_to: item.in_reply_to,
        references: item.references,
        subject: item.subject,
        from: item.from,
        to: item.to,
        sent_at: item.sent_at,
      },
    };
  }
}
