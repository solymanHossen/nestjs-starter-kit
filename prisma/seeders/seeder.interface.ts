import { PrismaClient } from '@prisma/client';

export interface Seeder {
  name: string;
  seed(prisma: PrismaClient): Promise<void>;
}
