import { eq } from 'drizzle-orm';
import { db } from '../resources/db';
import { admins } from '../schemas/admin';
import { hashPassword } from '../resources/password';

const seed = async () => {
  console.log('Seeding database...');

  // Check if root admin already exists
  const existing = await db.query.admins.findFirst({
    where: eq(admins.email, 'admin@localhost.com'),
  });

  if (existing) {
    console.log('Root admin already exists, skipping seed');
    process.exit(0);
  }

  // Create root admin
  const passwordHash = await hashPassword('admin123');

  const [admin] = await db
    .insert(admins)
    .values({
      email: 'admin@localhost.com',
      passwordHash,
      root: true,
    })
    .returning();

  console.log('Root admin created:', admin.id);
  console.log('Email: admin@localhost.com');
  console.log('Password: admin123');
  console.log('');
  console.log('IMPORTANT: Change this password in production!');

  process.exit(0);
};

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
