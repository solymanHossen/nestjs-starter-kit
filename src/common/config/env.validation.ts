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