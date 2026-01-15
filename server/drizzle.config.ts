import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/schemas/index.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5433/server_db',
  },
});
