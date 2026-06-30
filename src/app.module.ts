import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
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

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validate: validateEnv,
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 600,   // 600 seconds = 10-minute sliding window
        limit: 100, // max 100 requests per window per IP
      },
    ]),
    DatabaseModule,
    HealthModule,
    AuthModule,
  ],
  providers: [
    // ── Response transformer (outermost — wraps every successful handler return) ─
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
    // PrismaClientExceptionFilter: registered last → runs first, handles DB-specific errors
    { provide: APP_FILTER, useClass: PrismaClientExceptionFilter },
  ],
})
export class AppModule {}
