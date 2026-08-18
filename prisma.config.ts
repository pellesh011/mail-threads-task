import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

export default defineConfig({
  schema: './package/shared/src/infrastructure/database/prisma',

  migrations: {
    path: './package/shared/src/infrastructure/database/migrations',
  },

  datasource: {
    url: env('DATABASE_URL'),
  },
});
