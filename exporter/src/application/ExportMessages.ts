import type {
  MessageExportRecord,
  MessageExportRepository,
} from '../domain/MessageExportRepository.js';
import type { OutputWriter } from '../domain/OutputWriter.js';
import { ExportedMessage } from '../domain/ExportedMessage.js';

/**
 * Export use case: streams every message from the repository, maps it to the
 * deliverable row and pushes it to the output writer.
 */
export class ExportMessages {
  constructor(
    private readonly repository: MessageExportRepository,
    private readonly writer: OutputWriter,
    private readonly batchSize = 1000,
  ) {}

  async run(): Promise<number> {
    let exported = 0;

    for await (const batch of this.repository.iterBatches(this.batchSize)) {
      for (const record of batch) {
        const line = ExportedMessage.fromRecord(record).toJsonLine();

        await this.writer.writeLine(line);

        exported++;
      }
    }

    await this.writer.close();

    return exported;
  }
}

export type { MessageExportRecord };
