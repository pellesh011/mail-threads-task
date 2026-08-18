import { execSync } from 'node:child_process';
import path from 'node:path';

const repoRoot = path.resolve(import.meta.dirname, '../../..');

export function bootstrapDatabase(): void {
  console.log('worker: bootstrap database');

  execSync('npx prisma generate', { stdio: 'inherit', cwd: repoRoot });

  execSync('npx prisma migrate deploy', { stdio: 'inherit', cwd: repoRoot });

  console.log('worker: database ready');
}
