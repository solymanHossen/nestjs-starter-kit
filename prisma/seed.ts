import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { UserSeeder } from './seeders/user.seeder';
import { AppSettingSeeder } from './seeders/app-setting.seeder';
import type { Seeder } from './seeders/seeder.interface';

// ── Production guard ───────────────────────────────────────────────────────────
// TRUNCATE + CASCADE inside each seeder will wipe all seeded tables.
// This guard prevents accidental execution against a production database.
if (process.env.NODE_ENV === 'production') {
  console.error(
    '❌ Seeding is blocked in production environments.\n' +
      '   Set NODE_ENV to "development" or "test" to run seeds.',
  );
  process.exit(1);
}

// ── DATABASE_URL validation ────────────────────────────────────────────────────
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error(
    '❌ DATABASE_URL is not defined.\n' +
      '   Ensure your .env file exists and contains a valid DATABASE_URL.',
  );
  process.exit(1);
}

const pool = new Pool({
  connectionString: databaseUrl,
  // Seed pool is intentionally smaller than the app pool — seeding is a
  // single-process, sequential workload that does not need high concurrency.
  max: 5,
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main(): Promise<void> {
  console.info('🌱 Starting Database Seeding...');
  const startTime = performance.now();

  // Register seeders, then sort by their declared `order` so that dependency
  // order is respected regardless of array registration sequence.
  // Seeders without an `order` value are sorted to the end.
  const seeders: Seeder[] = [new UserSeeder(), new AppSettingSeeder()];
  seeders.sort(
    (a, b) => (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER),
  );

  for (const seeder of seeders) {
    console.info(`\n▶️  Running seeder: ${seeder.name}`);
    if (seeder.description) {
      console.info(`    ${seeder.description}`);
    }

    const seederStart = performance.now();
    await seeder.seed(prisma);
    const seederMs = performance.now() - seederStart;

    console.info(`⏹️  Finished ${seeder.name} in ${(seederMs / 1000).toFixed(2)}s`);
  }

  const totalMs = performance.now() - startTime;
  console.info(`\n🎉 Database seeding completed in ${(totalMs / 1000).toFixed(2)}s`);
}

main()
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`❌ Seeding failed: ${message}`);
    if (error instanceof Error && error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
