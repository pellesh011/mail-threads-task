import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: './package/shared/src/infrastructure/database/prisma',

  migrations: {
    path: './package/shared/src/infrastructure/database/migrations',
  },

  datasource: {
    url:
      process.env.DATABASE_URL ??
      'postgres://worker:worker@localhost:5432/mailthreads',
  },
});
