import { Module, Global, Logger, OnModuleInit, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool } from 'pg';

@Global()
@Module({
  providers: [
    {
      provide: 'DATABASE_POOL',
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        return new Pool({
          host: configService.get<string>('DB_HOST'),
          port: configService.get<number>('DB_PORT'),
          user: configService.get<string>('DB_USER'),
          password: configService.get<string>('DB_PASS'),
          database: configService.get<string>('DB_NAME'),
          max: 20,
          ssl: configService.get('NODE_ENV') === 'production'
            ? { rejectUnauthorized: false }
            : false,
        });
      },
    },
  ],
  exports: ['DATABASE_POOL'],
})
export class DatabaseModule implements OnModuleInit {
  private readonly logger = new Logger('DatabaseConnection');
  constructor(@Inject('DATABASE_POOL') private readonly pool: Pool) { }

  async onModuleInit() {
    try {
      const client = await this.pool.connect();
      const { host, port, database } = (this.pool as any).options;
      this.logger.log(`✅ DB Connected to [${database}] on ${host}:${port}`);
      client.release();
    } catch (err) {
      this.logger.error(`❌ DB Connection Failed: ${err.message}`);
      process.exit(1);
    }
  }
}