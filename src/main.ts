import { NestFactory } from '@nestjs/core';
import { Logger, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT') ?? 3000;
  const env = configService.get<string>('NODE_ENV') ?? 'development';
  const appName = configService.get<string>('APP_NAME') ?? 'Application API';
  const appDesc = configService.get<string>('APP_DESCRIPTION') ?? 'API Documentation';
  const appVersion = configService.get<string>('APP_VERSION') ?? '1.0.0';

  // Graceful shutdown: NestJS calls onModuleDestroy/onApplicationShutdown on SIGTERM/SIGINT.
  // Required for zero-downtime deploys in Docker / Kubernetes.
  app.enableShutdownHooks();

  // Helmet: relax CSP in non-production so Swagger UI (inline scripts + styles) renders.
  // Production retains the default strict policy.
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

  const allowedOrigins = configService.get<string>('ALLOWED_ORIGINS');
  app.enableCors({
    origin:
      env === 'development'
        ? true
        : allowedOrigins
          ? allowedOrigins.split(',')
          : false,
    credentials: true,
  });

  app.setGlobalPrefix('api');
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });

  // ── Swagger ────────────────────────────────────────────────────────────────
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
      persistAuthorization: true,    // bearer token survives page refresh
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
    customSiteTitle: `${appName} – API Docs`,
  });
  // ──────────────────────────────────────────────────────────────────────────

  await app.listen(port);

  logger.log(`🚀 App running in [${env}] mode on: http://localhost:${port}/api/v1`);
  logger.log(`📚 Swagger Docs:  http://localhost:${port}/api/docs`);
  logger.log(`🏥 Health Check:  http://localhost:${port}/api/v1/health`);
}

bootstrap().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  new Logger('Bootstrap').fatal(`💥 Fatal startup error: ${message}`);
  process.exit(1);
});
