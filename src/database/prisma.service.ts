import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger('PrismaService');
  private readonly pool: Pool;
  constructor(configService: ConfigService) {
    const databaseUrl = configService.get<string>('DATABASE_URL');
    const poolInstance = new Pool({
      connectionString: databaseUrl,
      max: 20,
    });

    const adapter = new PrismaPg(poolInstance);
    super({ adapter });
    this.pool = poolInstance;
  }

  async onModuleInit() {
    try {
      await this.$queryRaw`SELECT 1`;
      this.logger.log('✅ DB Connected successfully via Prisma Pg-Adapter!');
    } catch (error) {
      this.logger.error(`❌ DB Connection Failed: ${error.message}`);
      process.exit(1);
    }
  }

  async onModuleDestroy() {
    try {
      await this.$disconnect();
      await this.pool.end();
      this.logger.log('📉 Prisma client and Pg Pool closed gracefully.');
    } catch (error) {
      this.logger.error(`❌ Error during DB disconnect: ${error.message}`);
    }
  }
}