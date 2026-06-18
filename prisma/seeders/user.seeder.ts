import { PrismaClient, Role, Prisma } from '@prisma/client';
import { faker } from '@faker-js/faker';
import { Seeder } from './seeder.interface';
import { truncateTable, seedInChunks } from './seeder.utils';

export class UserSeeder implements Seeder {
  readonly name = 'UserSeeder';

  // Pre-hashed bcrypt string for 'password123' to avoid CPU hashing bottlenecks
  private static readonly PRE_HASHED_PASSWORD = '$2b$10$EPf9XpBPHTv.P9Yt5FzDSez5N1N/4YwK27p7Z1L.oRpxZ1W.Y2p2q';

  async seed(prisma: PrismaClient): Promise<void> {
    const count = 10; // Define how many users you want to seed
    console.log(`🧹 Cleaning "users" table...`);
    await truncateTable(prisma, 'users');

    console.log(`📦 Generating ${count} users...`);
    const users: Prisma.UserCreateManyInput[] = [];

    // Pre-create some standard roles (e.g. 1 Super Admin, 5 Admins)
    users.push({
      email: 'superadmin@example.com',
      name: 'Super Admin',
      password: UserSeeder.PRE_HASHED_PASSWORD,
      role: Role.SUPER_ADMIN,
      isActive: true,
    });

    for (let i = 0; i < 5; i++) {
      users.push({
        email: `admin${i + 1}@example.com`,
        name: `Admin User ${i + 1}`,
        password: UserSeeder.PRE_HASHED_PASSWORD,
        role: Role.ADMIN,
        isActive: true,
      });
    }

    // Generate remaining users using Faker
    const remainingCount = count - users.length;
    for (let i = 0; i < remainingCount; i++) {
      const email = `user_${i}_${faker.string.alphanumeric(4)}@example.com`.toLowerCase();
      users.push({
        email,
        name: faker.person.fullName(),
        password: UserSeeder.PRE_HASHED_PASSWORD,
        role: Role.USER,
        isActive: faker.datatype.boolean({ probability: 0.95 }),
      });
    }

    console.log(`🚀 Bulk inserting users in chunks...`);
    const insertedCount = await seedInChunks(prisma, 'user', users, 5000);
    console.log(`✅ Successfully seeded ${insertedCount} users.`);
  }
}
