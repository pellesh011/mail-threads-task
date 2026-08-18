import { TaskType } from '@mail-threads/shared';

const startedAt = Date.now();
console.log(`exporter: start (${TaskType.BUILD_THREADS})`);

console.log(`exporter: done in ${Date.now() - startedAt} ms`);
