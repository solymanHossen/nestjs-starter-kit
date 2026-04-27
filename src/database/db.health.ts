import { Injectable, Inject } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult, HealthCheckError } from '@nestjs/terminus';
import { Pool } from 'pg';

@Injectable()
export class DatabaseHealthIndicator extends HealthIndicator {
  constructor(@Inject('DATABASE_POOL') private readonly pool: Pool) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      await this.pool.query('SELECT 1');
      return this.getStatus(key, true);
    } catch (e) {
      throw new HealthCheckError('Database check failed', this.getStatus(key, false, { message: e.message }));
    }
  }
}