import { Controller, Get } from '@nestjs/common';
import { HealthCheckService, HealthCheck } from '@nestjs/terminus';
import { DatabaseHealthIndicator } from '../database/db.health';

@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private dbIndicator: DatabaseHealthIndicator,
  ) { }

  @Get()
  @HealthCheck()
  async check() {
    return this.health.check([
      () => this.dbIndicator.isHealthy('postgres'),
    ]);
  }
}