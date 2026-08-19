import { resolve } from 'node:path';
import { prisma } from '@mail-threads/shared';
import { ExportMessages } from './application/ExportMessages.js';
import { JsonLinesFileWriter } from './infrastructure/JsonLinesFileWriter.js';
import { PrismaMessageExportRepository } from './infrastructure/PrismaMessageExportRepository.js';

const PROJECT_ROOT = resolve(import.meta.dirname, '..', '..');

const OUT =
  process.env.OUT_PATH ?? resolve(PROJECT_ROOT, 'out', 'result.jsonl');

const startedAt = Date.now();

console.log(`exporter: start -> ${OUT}`);

const writer = new JsonLinesFileWriter(OUT);

const useCase = new ExportMessages(new PrismaMessageExportRepository(), writer);

try {
  const exported = await useCase.run();

  console.log(
    `exporter: wrote ${exported} messages in ${Date.now() - startedAt} ms`,
  );
} finally {
  await prisma.$disconnect();
}

process.exit(0);
