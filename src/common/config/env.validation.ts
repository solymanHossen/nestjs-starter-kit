import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z
    .union([z.string(), z.number()])
    .transform((val) => (typeof val === 'string' ? parseInt(val, 10) : val))
    .default(3000),
  APP_NAME: z.string().default('Application API'),
  APP_DESCRIPTION: z.string().default('API Documentation'),
  APP_VERSION: z.string().default('1.0.0'),
  DATABASE_URL: z.string().url(),
  ALLOWED_ORIGINS: z.string().optional(),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRES_IN: z.string().regex(/^\d+[smhd]$/).default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().regex(/^\d+[smhd]$/).default('7d'),
  BCRYPT_ROUNDS: z.coerce.number().int().min(10).max(15).default(12),
  MAX_FAILED_ATTEMPTS: z.coerce.number().int().min(3).max(20).default(5),
  LOCK_DURATION_MINUTES: z.coerce.number().int().min(1).default(15),
  GOOGLE_CLIENT_ID: z.preprocess((v) => (v === '' ? undefined : v), z.string().optional()),
  GOOGLE_CLIENT_SECRET: z.preprocess((v) => (v === '' ? undefined : v), z.string().optional()),
  GOOGLE_CALLBACK_URL: z.preprocess((v) => (v === '' ? undefined : v), z.string().url().optional()),
});

export type EnvConfig = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): EnvConfig {
  const result = envSchema.safeParse(config);

  if (!result.success) {
    console.error('❌ Invalid environment variables:', JSON.stringify(result.error.format(), null, 2));
    throw new Error('Environment validation failed');
  }
  return result.data as EnvConfig;
}