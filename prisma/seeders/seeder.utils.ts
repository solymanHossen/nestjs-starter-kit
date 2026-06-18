import { PrismaClient } from '@prisma/client';

/**
 * Splits an array into smaller chunks of a specified size.
 */
export function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

/**
 * High-performance database table truncation.
 * Using TRUNCATE CASCADE with RESTART IDENTITY is much faster than deleteMany()
 * and guarantees auto-incrementing IDs start fresh from 1.
 */
export async function truncateTable(prisma: PrismaClient, tableName: string): Promise<void> {
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${tableName}" RESTART IDENTITY CASCADE;`);
}

/**
 * High-performance batch insertion utility.
 * Inserts records in chunks to prevent database parameter limit exhaustion (65,535 limits in PostgreSQL)
 * and keeps memory usage low during large seed runs.
 */
export async function seedInChunks<T>(
  prisma: PrismaClient,
  modelName: keyof PrismaClient,
  data: T[],
  chunkSize: number = 5000,
): Promise<number> {
  const chunks = chunkArray(data, chunkSize);
  let totalInserted = 0;

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const model = prisma[modelName] as any;
    
    if (typeof model.createMany === 'function') {
      const result = await model.createMany({ data: chunk });
      totalInserted += result.count || chunk.length;
    } else {
      // Fallback for models that do not support createMany
      await prisma.$transaction(
        chunk.map((item) => model.create({ data: item }))
      );
      totalInserted += chunk.length;
    }
  }

  return totalInserted;
}
