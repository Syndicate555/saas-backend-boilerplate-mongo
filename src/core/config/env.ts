/**
 * ✅ AUDIT STATUS: COMPLETE
 * - Fixed TypeScript errors
 * - Made Clerk keys optional for development
 * - Added proper validation with helpful error messages
 * - Added feature flags for conditional module loading
 */
import { z } from 'zod';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const envSchema = z.object({
  // Application
  NODE_ENV: z
    .enum(['development', 'staging', 'production'])
    .default('development'),
  PORT: z.string().transform(Number).default('3000'),

  // Database - MongoDB only
  DATABASE_TYPE: z.literal('mongodb').default('mongodb'),
  MONGO_URI: z.string().optional(),

  // Redis (optional - needed for jobs, realtime, advanced rate limiting)
  REDIS_URL: z.string().optional(),

  // Clerk (optional - can use mock auth in development)
  CLERK_SECRET_KEY: z.string().optional(),
  CLERK_PUBLISHABLE_KEY: z.string().optional(),
  CLERK_WEBHOOK_SECRET: z.string().optional(),

  // AWS S3 (optional)
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_REGION: z.string().default('us-east-1'),
  S3_BUCKET: z.string().optional(),

  // Stripe (optional)
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_PUBLISHABLE_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),

  // SendGrid (optional)
  SENDGRID_API_KEY: z.string().optional(),
  SENDGRID_FROM_EMAIL: z.preprocess(
    (val) => (val === '' ? undefined : val),
    z.string().email().optional()
  ),

  // Sentry (optional)
  SENTRY_DSN: z.string().optional(),

  // CORS
  FRONTEND_URL: z.string().default('http://localhost:3001'),

  // Logging
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'http', 'debug']).default('info'),
});

// Validate environment variables
const envResult = envSchema.safeParse(process.env);

if (!envResult.success) {
  console.error('❌ Invalid environment variables:');
  console.error(JSON.stringify(envResult.error.format(), null, 2));
  process.exit(1);
}

// Additional validation
const env = envResult.data;

// Validate MongoDB configuration
if (!env.MONGO_URI) {
  console.error('❌ MONGO_URI is required for MongoDB connection');
  console.error(
    '💡 Set MONGO_URI=mongodb://localhost:27017/saas-dev in your .env file'
  );
  process.exit(1);
}

// Validate S3 configuration if any S3 env var is set
if (
  (env.AWS_ACCESS_KEY_ID || env.AWS_SECRET_ACCESS_KEY || env.S3_BUCKET) &&
  !(env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY && env.S3_BUCKET)
) {
  console.error('❌ All AWS S3 variables must be set together:');
  console.error('   - AWS_ACCESS_KEY_ID');
  console.error('   - AWS_SECRET_ACCESS_KEY');
  console.error('   - S3_BUCKET');
  console.error(
    '💡 Either set all three or remove all to disable file uploads'
  );
  process.exit(1);
}

// Validate Stripe configuration
if (
  (env.STRIPE_SECRET_KEY && !env.STRIPE_WEBHOOK_SECRET) ||
  (!env.STRIPE_SECRET_KEY && env.STRIPE_WEBHOOK_SECRET)
) {
  console.error(
    '❌ Both STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET must be set together'
  );
  console.error(
    '💡 Get these from your Stripe dashboard at https://dashboard.stripe.com/test/apikeys'
  );
  process.exit(1);
}

// Validate SendGrid configuration
if (
  (env.SENDGRID_API_KEY && !env.SENDGRID_FROM_EMAIL) ||
  (!env.SENDGRID_API_KEY && env.SENDGRID_FROM_EMAIL)
) {
  console.error(
    '❌ Both SENDGRID_API_KEY and SENDGRID_FROM_EMAIL must be set together'
  );
  console.error(
    '💡 Get API key from https://app.sendgrid.com/settings/api_keys'
  );
  process.exit(1);
}

// Warn about Clerk in production
if (env.NODE_ENV === 'production' && !env.CLERK_SECRET_KEY) {
  console.error('❌ CLERK_SECRET_KEY is required in production');
  console.error('💡 Get your Clerk keys from https://dashboard.clerk.com');
  process.exit(1);
}

// Warn about development without Clerk
if (env.NODE_ENV === 'development' && !env.CLERK_SECRET_KEY) {
  console.warn('⚠️  Running without Clerk authentication (development mode)');
  console.warn('💡 Authentication middleware will be bypassed for development');
}

export { env };
export type Env = z.infer<typeof envSchema>;

// Feature flags based on environment variables
export const features = {
  auth: !!env.CLERK_SECRET_KEY,
  redis: !!env.REDIS_URL,
  s3: !!(env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY && env.S3_BUCKET),
  stripe: !!(env.STRIPE_SECRET_KEY && env.STRIPE_WEBHOOK_SECRET),
  sendgrid: !!(env.SENDGRID_API_KEY && env.SENDGRID_FROM_EMAIL),
  sentry: !!env.SENTRY_DSN,
  jobs: !!env.REDIS_URL, // Jobs require Redis
  realtime: !!env.REDIS_URL, // Realtime requires Redis for adapter
} as const;
