import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { validateEnv } from './common/config/env.validation';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { RolesGuard } from './auth/guards/roles.guard';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { PrismaClientExceptionFilter } from './common/filters/prisma-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { StrictValidationPipe } from './common/pipes/strict-validation.pipe';

/**
 * Auth-route throttle override — apply with @Throttle({ auth: { limit: 10, ttl: 900 } })
 * on login / register / password-reset endpoints to prevent credential stuffing.
 *
 * Example usage in AuthController:
 *   @Throttle({ auth: { limit: 10, ttl: 900 } })
 *   @Post('login')
 *   login(@Body() dto: LoginDto) { ... }
 */
export const AUTH_THROTTLE_KEY = 'auth' as const;

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validate: validateEnv,
    }),

    // ── Multi-tier rate limiting ──────────────────────────────────────────────
    // Tier 1 "global": 100 requests / 10-minute window — applied to all routes.
    // Tier 2 "auth":   10 requests / 15-minute window — opt-in via @Throttle({ auth: { ... } })
    //                  on sensitive endpoints (login, register, password-reset).
    // Note: ttl values are in SECONDS per @nestjs/throttler v6+.
    ThrottlerModule.forRoot([
      {
        name: 'global',
        ttl: 600,
        limit: 100,
      },
      {
        name: AUTH_THROTTLE_KEY,
        ttl: 900,
        limit: 10,
      },
    ]),

    DatabaseModule,
    HealthModule,
    AuthModule,
  ],
  providers: [
    // ── Global validation pipe ────────────────────────────────────────────────
    // Enforces whitelist stripping + forbidNonWhitelisted + type transformation
    // on every incoming request body. Registered via DI so it participates in the
    // NestJS DI container (unlike app.useGlobalPipes which is DI-unaware).
    {
      provide: APP_PIPE,
      useClass: StrictValidationPipe,
    },

    // ── Response transformer (wraps every successful handler return) ──────────
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformInterceptor,
    },

    // ── Guards — evaluated in registration order ──────────────────────────────
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },

    // ── Exception filters — last-registered = first-executed ─────────────────
    // HttpExceptionFilter: registered first → outermost catch-all fallback
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
    // PrismaClientExceptionFilter: registered last → runs first, handles all Prisma errors
    { provide: APP_FILTER, useClass: PrismaClientExceptionFilter },
  ],
})
export class AppModule {}
