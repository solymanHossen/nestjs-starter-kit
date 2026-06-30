import { NestFactory } from '@nestjs/core';
import { Logger, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import morgan from 'morgan';
import { json, urlencoded } from 'express';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const logger = new Logger('Bootstrap');

  // Disable built-in body parser so we can configure limits explicitly.
  const app = await NestFactory.create(AppModule, { bodyParser: false });

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT') ?? 3000;
  const env = configService.get<string>('NODE_ENV') ?? 'development';
  const appName = configService.get<string>('APP_NAME') ?? 'Application API';
  const appDesc = configService.get<string>('APP_DESCRIPTION') ?? 'API Documentation';
  const appVersion = configService.get<string>('APP_VERSION') ?? '1.0.0';
  const bodyLimit = configService.get<string>('BODY_SIZE_LIMIT') ?? '10mb';

  // Graceful shutdown: NestJS calls onModuleDestroy/onApplicationShutdown on SIGTERM/SIGINT.
  app.enableShutdownHooks();

  // ── Body parsing with explicit size limits ─────────────────────────────────
  app.use(json({ limit: bodyLimit }));
  app.use(urlencoded({ extended: true, limit: bodyLimit }));

  // ── Gzip/Brotli response compression ───────────────────────────────────────
  app.use(compression());

  // ── Security headers ────────────────────────────────────────────────────────
  // CSP is relaxed in non-production so Swagger UI (inline scripts/styles) renders.
  app.use(
    helmet({
      contentSecurityPolicy: env === 'production' ? undefined : false,
      crossOriginEmbedderPolicy: env === 'production',
    }),
  );

  app.use(cookieParser());

  app.use(
    morgan(env === 'development' ? 'dev' : 'combined', {
      stream: { write: (message: string) => logger.log(message.trim()) },
    }),
  );

  // ── CORS ───────────────────────────────────────────────────────────────────
  const allowedOrigins = configService.get<string>('ALLOWED_ORIGINS');
  app.enableCors({
    origin:
      env === 'development'
        ? true
        : allowedOrigins
          ? allowedOrigins.split(',').map((o) => o.trim())
          : false,
    credentials: true,
  });

  app.setGlobalPrefix('api');
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });

  // ── Swagger (non-production only) ──────────────────────────────────────────
  if (env !== 'production') {
    const swaggerDescription =
      `${appDesc}\n\n` +
      `## How to authenticate\n\n` +
      `1. Call **POST /api/v1/auth/register** or **POST /api/v1/auth/login**.\n` +
      `2. Copy the \`accessToken\` value from the \`data\` object in the response.\n` +
      `3. Click the **Authorize 🔓** button (top-right of this page).\n` +
      `4. Paste the token into the **Value** field — no \`Bearer \` prefix needed — then click **Authorize**.\n` +
      `5. Close the dialog. All 🔒 padlocked endpoints now include \`Authorization: Bearer <token>\` automatically.`;

    const swaggerConfig = new DocumentBuilder()
      .setTitle(appName)
      .setDescription(swaggerDescription)
      .setVersion(appVersion)
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT access token — obtain it from POST /auth/login.',
        },
        'bearer',
      )
      .addCookieAuth('refresh_token', {
        type: 'apiKey',
        in: 'cookie',
        name: 'refresh_token',
        description: 'HTTP-only refresh token — set automatically by POST /auth/login.',
      })
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
        tagsSorter: 'alpha',
        operationsSorter: 'alpha',
      },
      customSiteTitle: `${appName} – API Docs`,
    });

    logger.log(`📚 Swagger Docs:  http://localhost:${port}/api/docs`);
  }
  // ──────────────────────────────────────────────────────────────────────────

  await app.listen(port);

  logger.log(`🚀 App running in [${env}] mode on: http://localhost:${port}/api/v1`);
  logger.log(`🏥 Health Check:  http://localhost:${port}/api/v1/health/ready`);
}

bootstrap().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  new Logger('Bootstrap').fatal(`💥 Fatal startup error: ${message}`);
  process.exit(1);
});
