import { Module, Global, Logger, OnModuleInit, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './schema';

@Global()
@Module({
  providers: [
    {
      provide: 'DATABASE_POOL',
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        return new Pool({
          connectionString: configService.get<string>('DATABASE_URL'),
          max: 20,
          ssl: configService.get('NODE_ENV') === 'production'
            ? { rejectUnauthorized: false }
            : false,
        });
      },
    },
    {
      provide: 'DRIZZLE_DB',
      inject: ['DATABASE_POOL'],
      useFactory: (pool: Pool) => {
        return drizzle(pool, { schema });
      },
    },
  ],
  exports: ['DATABASE_POOL', 'DRIZZLE_DB'],
})
export class DatabaseModule implements OnModuleInit {
  private readonly logger = new Logger('DatabaseConnection');
  constructor(@Inject('DATABASE_POOL') private readonly pool: Pool) { }

  async onModuleInit() {
    try {
      const client = await this.pool.connect();
      const { host, port, database } = (this.pool as any).options;
      this.logger.log(`✅ DB Connected to [${database}] on ${host}:${port} with Drizzle ORM`);
      client.release();
    } catch (err) {
      this.logger.error(`❌ DB Connection Failed: ${(err as Error).message}`);
      process.exit(1);
    }
  }
}