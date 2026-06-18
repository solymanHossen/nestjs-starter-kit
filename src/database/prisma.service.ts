import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger('PrismaService');

  constructor(configService: ConfigService) {
    const databaseUrl = configService.get<string>('DATABASE_URL');
    const pool = new Pool({ connectionString: databaseUrl });
    const adapter = new PrismaPg(pool);
    super({ adapter });
  }

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('✅ DB Connected successfully via Prisma Link!');
    } catch (error) {
      this.logger.error(`❌ DB Connection Failed: ${error.message}`);
      process.exit(1);
    }
  }

  async onModuleDestroy() {
    try {
      await this.$disconnect();
      this.logger.log('📉 Prisma database connection closed gracefully.');
    } catch (error) {
      this.logger.error(`❌ Error during DB disconnect: ${error.message}`);
    }
  }
}