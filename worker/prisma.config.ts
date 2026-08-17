import { defineConfig, env } from 'prisma/config';

export default defineConfig({
  schema: './src/infrastructure/database/prisma/config',

  migrations: {
    path: './src/infrastructure/database/migrations',
  },

  datasource: {
    url: env('DATABASE_URL'),
  },
});
