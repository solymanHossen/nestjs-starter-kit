import { Controller, Get } from '@nestjs/common';
import {
  HealthCheckService,
  HealthCheck,
  HealthCheckResult,
  MemoryHealthIndicator,
} from '@nestjs/terminus';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { DatabaseHealthIndicator } from '../database/db.health';
import { Public } from '../auth/decorators/public.decorator';

/** Memory heap threshold above which the readiness probe reports degraded. */
const MEMORY_HEAP_THRESHOLD_BYTES = 300 * 1024 * 1024; // 300 MB

@ApiTags('System')
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly dbIndicator: DatabaseHealthIndicator,
    private readonly memoryIndicator: MemoryHealthIndicator,
  ) {}

  /**
   * Liveness probe — GET /api/v1/health/live
   *
   * Always returns 200 as long as the Node.js process is running.
   * Configure k8s livenessProbe to hit this endpoint.
   * Never includes database checks — a DB outage must not restart the pod.
   */
  @Get('live')
  @Public()
  @ApiOperation({
    summary: 'Liveness probe',
    description:
      'Returns 200 if the process is alive. Use for Kubernetes livenessProbe. ' +
      'Never checks downstream dependencies.',
  })
  @ApiResponse({ status: 200, description: 'Process is alive.' })
  liveness(): { status: string; timestamp: string } {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  /**
   * Readiness probe — GET /api/v1/health/ready
   *
   * Returns 200 only when all indicators (DB + memory) are healthy.
   * Configure k8s readinessProbe to hit this endpoint.
   * A 503 here removes the pod from the load-balancer rotation.
   */
  @Get('ready')
  @Public()
  @HealthCheck()
  @ApiOperation({
    summary: 'Readiness probe',
    description:
      'Returns 200 when all indicators are healthy. Use for Kubernetes readinessProbe. ' +
      'Returns 503 when any indicator is degraded.',
  })
  @ApiResponse({ status: 200, description: 'All indicators healthy.' })
  @ApiResponse({ status: 503, description: 'One or more indicators degraded.' })
  async readiness(): Promise<HealthCheckResult> {
    return this.health.check([
      () => this.dbIndicator.isHealthy('postgres'),
      () =>
        this.memoryIndicator.checkHeap('memory_heap', MEMORY_HEAP_THRESHOLD_BYTES),
    ]);
  }

  /**
   * Legacy combined endpoint — GET /api/v1/health
   *
   * Preserved for backward compatibility with existing monitoring integrations.
   * Identical to /health/ready — delegates to the same full indicator set.
   * New integrations should prefer the explicit /health/live and /health/ready endpoints.
   */
  @Get()
  @Public()
  @HealthCheck()
  @ApiOperation({
    summary: 'System health check (legacy)',
    description:
      'Combined liveness and readiness check. ' +
      'Prefer /health/live and /health/ready for new integrations.',
  })
  @ApiResponse({ status: 200, description: 'All indicators healthy.' })
  @ApiResponse({ status: 503, description: 'One or more indicators degraded.' })
  async check(): Promise<HealthCheckResult> {
    return this.health.check([
      () => this.dbIndicator.isHealthy('postgres'),
      () =>
        this.memoryIndicator.checkHeap('memory_heap', MEMORY_HEAP_THRESHOLD_BYTES),
    ]);
  }
}
