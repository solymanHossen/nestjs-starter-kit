import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { UserSeeder } from './seeders/user.seeder';
import { AppSettingSeeder } from './seeders/app-setting.seeder';

// Initialize connection pool and Pg adapter as required by Prisma 7
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10, // Max concurrent database connections during seed
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Starting Database Seeding...');
  const startTime = performance.now();

  // Register all seeders in desired execution order (dependency order)
  const seeders = [
    new UserSeeder(),
    new AppSettingSeeder(),
  ];

  for (const seeder of seeders) {
    console.log(`\n▶️ Running seeder: ${seeder.name}`);
    const seederStart = performance.now();
    await seeder.seed(prisma);
    const seederEnd = performance.now();
    console.log(`⏹️ Finished ${seeder.name} in ${((seederEnd - seederStart) / 1000).toFixed(2)}s`);
  }

  const endTime = performance.now();
  const timeElapsed = ((endTime - startTime) / 1000).toFixed(2);
  console.log(`\n🎉 Database Seeding completed successfully in ${timeElapsed}s!`);
}

main()
  .catch((error) => {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    // Release resources gracefully to prevent connection hangs
    await prisma.$disconnect();
    await pool.end();
  });