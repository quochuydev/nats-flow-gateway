import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { config } from './config.js';
import * as schema from '../schemas/index.js';

const pool = new pg.Pool({ connectionString: config.database.url });

export const db = drizzle(pool, { schema });
