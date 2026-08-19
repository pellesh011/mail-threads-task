import { createWriteStream, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import type { Writable } from 'node:stream';
import type { OutputWriter } from '../domain/OutputWriter.js';

/**
 * Writes JSON lines to a file, creating the parent directory on demand and
 * honouring backpressure from the underlying stream.
 */
export class JsonLinesFileWriter implements OutputWriter {
  private readonly stream: ReturnType<typeof createWriteStream>;

  constructor(path: string) {
    mkdirSync(dirname(path), { recursive: true });

    this.stream = createWriteStream(path);
  }

  async writeLine(line: string): Promise<void> {
    if (this.stream.write(`${line}\n`)) {
      return;
    }

    await waitUntil(this.stream, 'drain');
  }

  async close(): Promise<void> {
    this.stream.end();

    await waitUntil(this.stream, 'finish');
  }
}

/**
 * Resolves once the passed event fires, rejecting if the stream errors first.
 * The temporary error listener is always removed, so repeated backpressure in
 * large feeds never leaks listeners.
 */
function waitUntil(stream: Writable, event: 'drain' | 'finish'): Promise<void> {
  return new Promise((resolve, reject) => {
    const onError = (error: Error) => {
      cleanup();
      reject(error);
    };

    const onDone = () => {
      cleanup();
      resolve();
    };

    const cleanup = () => {
      stream.removeListener(event, onDone);
      stream.removeListener('error', onError);
    };

    stream.once(event, onDone);
    stream.once('error', onError);
  });
}
