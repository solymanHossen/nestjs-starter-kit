import { PrismaClient, Role, type Prisma } from '@prisma/client';
import { faker } from '@faker-js/faker';
import type { Seeder } from './seeder.interface';
import { truncateTable, seedInChunks } from './seeder.utils';

export class UserSeeder implements Seeder {
  readonly name = 'UserSeeder';
  readonly description = 'Seeds one SUPER_ADMIN, five ADMINs, and the remaining regular USERs';
  readonly order = 1;

  // Pre-hashed bcrypt value for 'password123' at cost 10.
  // Avoids CPU-bound hashing during seed runs.
  // WARNING: This is a development-only seed password — never derive real
  // user passwords from this hash, and never run seeders in production.
  private static readonly PRE_HASHED_PASSWORD =
    '$2b$10$EPf9XpBPHTv.P9Yt5FzDSez5N1N/4YwK27p7Z1L.oRpxZ1W.Y2p2q';

  private static readonly TOTAL_USERS = 10;

  async seed(prisma: PrismaClient): Promise<void> {
    console.info('🧹 Cleaning "users" table...');
    await truncateTable(prisma, 'users');

    const users: Prisma.UserCreateManyInput[] = [];

    users.push({
      email: 'superadmin@example.com',
      name: 'Super Admin',
      password: UserSeeder.PRE_HASHED_PASSWORD,
      role: Role.SUPER_ADMIN,
      isActive: true,
    });

    for (let i = 1; i <= 5; i++) {
      users.push({
        email: `admin${i}@example.com`,
        name: `Admin User ${i}`,
        password: UserSeeder.PRE_HASHED_PASSWORD,
        role: Role.ADMIN,
        isActive: true,
      });
    }

    const remaining = UserSeeder.TOTAL_USERS - users.length;
    for (let i = 0; i < remaining; i++) {
      users.push({
        email: `user_${i}_${faker.string.alphanumeric(4).toLowerCase()}@example.com`,
        name: faker.person.fullName(),
        password: UserSeeder.PRE_HASHED_PASSWORD,
        role: Role.USER,
        isActive: faker.datatype.boolean({ probability: 0.95 }),
      });
    }

    console.info(`📦 Inserting ${users.length} users in chunks...`);
    const count = await seedInChunks(prisma.user, users, 5_000);
    console.info(`✅ Successfully seeded ${count} users.`);
  }

  async rollback(prisma: PrismaClient): Promise<void> {
    await truncateTable(prisma, 'users');
    console.info('↩️  UserSeeder rolled back — "users" table truncated.');
  }
}
