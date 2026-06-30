import { z } from 'zod';

const originPattern = /^(\*|https?:\/\/[^\s,]+)$/;

export const envSchema = z.object({
  // ── Runtime ──────────────────────────────────────────────────────────────
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  PORT: z.coerce
    .number()
    .int()
    .min(1, 'PORT must be ≥ 1')
    .max(65535, 'PORT must be ≤ 65535')
    .default(3000),

  // ── Application metadata ────────────────────────────────────────────────
  APP_NAME: z.string().default('Application API'),
  APP_DESCRIPTION: z.string().default('API Documentation'),
  APP_VERSION: z.string().default('1.0.0'),

  // ── Database ────────────────────────────────────────────────────────────
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid connection URL'),

  // Max connections in the pg.Pool. Size proportionally to PostgreSQL's
  // max_connections divided by the number of app replicas.
  DB_POOL_MAX: z.coerce.number().int().min(1).max(100).default(10),

  // Milliseconds to wait before giving up acquiring a new connection from the pool.
  DB_CONN_TIMEOUT_MS: z.coerce.number().int().min(0).default(3000),

  // Milliseconds an idle connection is kept open before being released.
  DB_IDLE_TIMEOUT_MS: z.coerce.number().int().min(0).default(30000),

  // Set to 'true' to enforce SSL on all DB connections. Defaults to true
  // in production automatically; override with 'false' for dev/staging DBs
  // that run without SSL (e.g. local Docker Postgres).
  DB_SSL: z
    .preprocess(
      (v) => (v === 'true' ? true : v === 'false' ? false : v),
      z.boolean().optional(),
    ),

  // ── Request limits ──────────────────────────────────────────────────────
  // Express body-parser limit — expressed as a byte string (e.g. '10mb', '512kb').
  BODY_SIZE_LIMIT: z.string().default('10mb'),

  // ── CORS ────────────────────────────────────────────────────────────────
  // Comma-separated list of allowed origins, each must be a valid URL or '*'.
  // Example: https://app.example.com,https://admin.example.com
  ALLOWED_ORIGINS: z
    .string()
    .optional()
    .refine(
      (val) => {
        if (!val) return true;
        return val
          .split(',')
          .map((o) => o.trim())
          .every((origin) => originPattern.test(origin));
      },
      {
        message:
          'ALLOWED_ORIGINS must be a comma-separated list of valid URLs (e.g. https://app.com) or the wildcard "*"',
      },
    ),

  // ── JWT ─────────────────────────────────────────────────────────────────
  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
  JWT_ACCESS_EXPIRES_IN: z
    .string()
    .regex(/^\d+[smhd]$/, 'JWT_ACCESS_EXPIRES_IN must match pattern: <number><s|m|h|d>')
    .default('15m'),
  JWT_REFRESH_EXPIRES_IN: z
    .string()
    .regex(/^\d+[smhd]$/, 'JWT_REFRESH_EXPIRES_IN must match pattern: <number><s|m|h|d>')
    .default('7d'),

  // ── Bcrypt ──────────────────────────────────────────────────────────────
  BCRYPT_ROUNDS: z.coerce.number().int().min(10).max(15).default(12),

  // ── Account security ────────────────────────────────────────────────────
  MAX_FAILED_ATTEMPTS: z.coerce.number().int().min(3).max(20).default(5),
  LOCK_DURATION_MINUTES: z.coerce.number().int().min(1).default(15),

  // ── Google OAuth (optional) ─────────────────────────────────────────────
  GOOGLE_CLIENT_ID: z.preprocess(
    (v) => (v === '' ? undefined : v),
    z.string().optional(),
  ),
  GOOGLE_CLIENT_SECRET: z.preprocess(
    (v) => (v === '' ? undefined : v),
    z.string().optional(),
  ),
  GOOGLE_CALLBACK_URL: z.preprocess(
    (v) => (v === '' ? undefined : v),
    z.string().url().optional(),
  ),
});

export type EnvConfig = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): EnvConfig {
  const result = envSchema.safeParse(config);

  if (!result.success) {
    // Log ONLY the failed variable names — never their values — to prevent
    // secret leakage in startup logs or log aggregation systems.
    const fieldErrors = result.error.flatten().fieldErrors;
    const failed = Object.entries(fieldErrors)
      .map(([key, messages]) => `  ${key}: ${(messages ?? []).join('; ')}`)
      .join('\n');

    console.error(`❌ Environment validation failed:\n${failed}`);
    throw new Error('Environment validation failed — check the variables listed above.');
  }

  return result.data;
}
