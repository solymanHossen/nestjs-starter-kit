import type { PrismaClient } from '@prisma/client';

/** Minimal interface for any Prisma model delegate that supports bulk-insert. */
export interface BulkCreateDelegate<T> {
  createMany(args: { data: T[]; skipDuplicates?: boolean }): Promise<{ count: number }>;
}

/**
 * Splits an array into non-overlapping chunks of the given size.
 * The final chunk may be smaller than `size`.
 */
export function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

/**
 * High-performance table truncation.
 * RESTART IDENTITY resets auto-increment sequences so IDs start from 1 on the next seed run.
 * CASCADE silently truncates tables that have foreign-key references to this one.
 */
export async function truncateTable(prisma: PrismaClient, tableName: string): Promise<void> {
  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE "${tableName}" RESTART IDENTITY CASCADE;`,
  );
}

/**
 * Bulk-inserts `data` into `delegate` using chunked `createMany` calls.
 * Chunking prevents hitting PostgreSQL's 65,535-parameter hard limit and keeps
 * memory usage bounded during large seed runs.
 *
 * @param delegate  A Prisma model delegate (e.g. `prisma.user`)
 * @param data      Array of records to insert
 * @param chunkSize Rows per INSERT batch (default: 5 000)
 * @returns         Total number of rows inserted
 */
export async function seedInChunks<T>(
  delegate: BulkCreateDelegate<T>,
  data: T[],
  chunkSize: number = 5_000,
): Promise<number> {
  const chunks = chunkArray(data, chunkSize);
  let totalInserted = 0;

  for (const chunk of chunks) {
    const result = await delegate.createMany({ data: chunk, skipDuplicates: true });
    totalInserted += result.count;
  }

  return totalInserted;
}
