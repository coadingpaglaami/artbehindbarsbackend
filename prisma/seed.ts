import 'dotenv/config';
import { PrismaClient, Role } from '../src/database/prisma-client/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL missing');
if (!process.env.ADMIN_EMAIL) throw new Error('ADMIN_EMAIL missing');
if (!process.env.ADMIN_PASSWORD) throw new Error('ADMIN_PASSWORD missing');

console.log(process.env.DATABASE_URL);
const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL || '',
});

const prisma = new PrismaClient({ adapter });

async function main() {
  const email = process.env.ADMIN_EMAIL || '';
  const password = process.env.ADMIN_PASSWORD || '';

  const existing = await prisma.user.findUnique({
    where: { email },
  });

  if (!existing) {
    const hashed = await bcrypt.hash(password, 10);

    await prisma.user.create({
      data: {
        email,
        password: hashed,
        firstName: 'System',
        lastName: 'Admin',
        dateOfBirth: new Date('2000-01-01T00:00:00.000Z'),
        role: Role.ADMIN,
      },
    });

    console.log(`✅ Admin created: ${email}`);
  } else {
    console.log(`ℹ️ Admin already exists: ${email}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
