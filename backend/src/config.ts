
import { z } from 'zod';

// Define the schema for the environment variables
const envSchema = z.object({
  // Secrets
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters long'),
  GAS_HMAC_SECRET: z.string(),
  BACKEND_API_KEY: z.string(),
  YOUTUBE_API_KEY: z.string(),
  SUPABASE_SERVICE_ROLE: z.string(),
  EBAY_CLIENT_ID: z.string(),
  EBAY_CLIENT_SECRET: z.string(),
  RESEND_API_KEY: z.string(),
  GOOGLE_SERVICE_ACCOUNT_KEY: z.string(),
  FCM_SERVER_KEY: z.string(),
  STRIPE_SECRET_KEY: z.string(),
  STRIPE_WEBHOOK_SECRET: z.string(),
  GITHUB_TOKEN: z.string(),
  EXPO_ACCESS_TOKEN: z.string().optional(),
  YT_CLIENT_ID: z.string(),
  YT_CLIENT_SECRET: z.string(),

  // Public Config
  API_VERSION: z.string(),
  JWT_ISSUER: z.string(),
  JWT_AUDIENCE: z.string(),
  APP_VERSION: z.string(),
  TEMPLATE_SPREADSHEET_ID: z.string(),
  FIXTURES_REFRESH_URL: z.string().url(),
  ALLOWED_WEBHOOK_HOSTS: z.string(),
  SETUP_URL: z.string().url(),
  GALLERY_ALLOWED: z.string(),
  GALLERY_MAX_BYTES: z.string(),
  YT_REDIRECT_URL: z.string().url(),
  RL_POSTS_PER_MIN: z.string(),
  RL_UPLOADS_PER_MIN: z.string(),
  APPS_SCRIPT_AUTO_DEPLOY: z.string(),
  BACKEND_URL: z.string().url(),
  ADMIN_CONSOLE_URL: z.string().url(),
  RESEND_FROM_EMAIL: z.string(),
  WORKER_BASE_URL: z.string().url(),
  ENVIRONMENT: z.enum(['production', 'preview', 'development']),
  GAS_WEBAPP_URL: z.string().url(),
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string(),
  SENTRY_DSN: z.string().optional(),
  DRY_RUN: z.string(),
  MAKE_VALIDATE_STRICT: z.string(),
});

/**
 * Parses and validates environment variables.
 * Throws an error if validation fails.
 * @param env - The environment object to parse.
 * @returns The parsed and validated environment variables.
 */
export function

parseEnv(env: unknown) {
  try {
    return envSchema.parse(env);
  } catch (e) {
    if (e instanceof z.ZodError) {
      const { fieldErrors } = e.flatten();
      const errorMessage = Object.entries(fieldErrors)
        .map(([field, errors]) => `- ${field}: ${errors.join(', ')}`)
        .join('\n');
      throw new Error(`Missing or invalid environment variables:\n${errorMessage}`);
    }
    throw e;
  }
}
