import { TaskType } from '@mail-threads/shared';

const startedAt = Date.now();
console.log(`worker: start (${TaskType.IMPORT_MESSAGES})`);

console.log(`worker: done in ${Date.now() - startedAt} ms`);
