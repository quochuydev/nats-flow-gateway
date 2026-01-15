import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import pg from 'pg';
import { config } from '../resources/config';

const runMigrations = async () => {
  console.log('Running migrations...');

  const pool = new pg.Pool({ connectionString: config.database.url });
  const db = drizzle(pool);

  await migrate(db, { migrationsFolder: './drizzle' });

  console.log('Migrations completed successfully');
  await pool.end();
};

runMigrations().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
