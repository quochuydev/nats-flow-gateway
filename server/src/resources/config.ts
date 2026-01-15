import { z } from 'zod';

const envSchema = z.object({
  PORT: z.string().default('3001').transform(Number),
  DATABASE_URL: z.string().default('postgres://postgres:postgres@localhost:5433/server_db'),
  NATS_URL: z.string().default('nats://localhost:4222'),
  JWT_SECRET: z.string().default('dev-secret-change-in-production'),
});

const env = envSchema.parse(process.env);

export const config = {
  port: env.PORT,
  database: {
    url: env.DATABASE_URL,
  },
  nats: {
    url: env.NATS_URL,
  },
  jwt: {
    secret: env.JWT_SECRET,
  },
} as const;

export type Config = typeof config;
