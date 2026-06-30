import { Controller, Get } from '@nestjs/common';
import { HealthCheckService, HealthCheck, HealthCheckResult } from '@nestjs/terminus';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { DatabaseHealthIndicator } from '../database/db.health';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('System')
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly dbIndicator: DatabaseHealthIndicator,
  ) {}

  @Get()
  @Public()
  @HealthCheck()
  @ApiOperation({ summary: 'System health check', description: 'Returns liveness and database connectivity status.' })
  @ApiResponse({ status: 200, description: 'All indicators healthy.' })
  @ApiResponse({ status: 503, description: 'One or more indicators degraded.' })
  async check(): Promise<HealthCheckResult> {
    return this.health.check([() => this.dbIndicator.isHealthy('postgres')]);
  }
}
