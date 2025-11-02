import * as dotenv from 'dotenv';
import * as mongoose from 'mongoose';
import Redis from 'ioredis';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { S3Client, HeadBucketCommand } from '@aws-sdk/client-s3';
import sgMail from '@sendgrid/mail';

// Load environment variables
dotenv.config();

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
};

const symbols = {
  success: '✓',
  failure: '✗',
  pending: '⟳',
};

// Health check result interface
interface HealthCheckResult {
  name: string;
  required: boolean;
  status: 'healthy' | 'unhealthy' | 'skipped';
  message: string;
  duration: number;
}

// Initialize results array
const results: HealthCheckResult[] = [];

// Utility function to print colored output
function printStatus(
  name: string,
  status: 'healthy' | 'unhealthy' | 'skipped',
  message: string,
  duration: number
): void {
  let symbol: string;
  let color: string;

  if (status === 'healthy') {
    symbol = symbols.success;
    color = colors.green;
  } else if (status === 'unhealthy') {
    symbol = symbols.failure;
    color = colors.red;
  } else {
    symbol = '○';
    color = colors.yellow;
  }

  const durationStr = duration > 0 ? ` (${duration}ms)` : '';
  const statusText = `${color}${symbol}${colors.reset}`;
  console.log(
    `${statusText} ${colors.bright}${name}${colors.reset}: ${message}${colors.dim}${durationStr}${colors.reset}`
  );
}

// Health check functions
async function checkDatabase(): Promise<void> {
  const startTime = Date.now();
  const databaseType = process.env.DATABASE_TYPE || 'mongodb';
  const required = true;

  try {
    if (databaseType === 'mongodb') {
      const mongoUri = process.env.MONGO_URI;
      if (!mongoUri) {
        results.push({
          name: 'Database (MongoDB)',
          required,
          status: 'unhealthy',
          message: 'MONGO_URI not configured',
          duration: Date.now() - startTime,
        });
        printStatus(
          'Database (MongoDB)',
          'unhealthy',
          'MONGO_URI not configured',
          Date.now() - startTime
        );
        return;
      }

      await mongoose.connect(mongoUri, {
        serverSelectionTimeoutMS: 5000,
        connectTimeoutMS: 5000,
        retryWrites: false,
      });

      const admin = mongoose.connection.db?.admin();
      await admin?.ping();
      await mongoose.disconnect();

      const duration = Date.now() - startTime;
      results.push({
        name: 'Database (MongoDB)',
        required,
        status: 'healthy',
        message: 'Connected and healthy',
        duration,
      });
      printStatus(
        'Database (MongoDB)',
        'healthy',
        'Connected and healthy',
        duration
      );
    } else if (databaseType === 'supabase') {
      const supabaseUrl = process.env.SUPABASE_URL;
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

      if (!supabaseUrl || !supabaseKey) {
        results.push({
          name: 'Database (Supabase)',
          required,
          status: 'unhealthy',
          message: 'SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not configured',
          duration: Date.now() - startTime,
        });
        printStatus(
          'Database (Supabase)',
          'unhealthy',
          'SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not configured',
          Date.now() - startTime
        );
        return;
      }

      const supabase = createClient(supabaseUrl, supabaseKey);
      const { error } = await supabase.from('_dummy').select().limit(1);

      // It's okay if the table doesn't exist, we just want to verify connection
      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      const duration = Date.now() - startTime;
      results.push({
        name: 'Database (Supabase)',
        required,
        status: 'healthy',
        message: 'Connected and healthy',
        duration,
      });
      printStatus(
        'Database (Supabase)',
        'healthy',
        'Connected and healthy',
        duration
      );
    } else {
      throw new Error(`Unknown database type: ${databaseType}`);
    }
  } catch (error) {
    const duration = Date.now() - startTime;
    const message =
      error instanceof Error ? error.message : 'Unknown error occurred';
    results.push({
      name: `Database (${databaseType})`,
      required,
      status: 'unhealthy',
      message,
      duration,
    });
    printStatus(`Database (${databaseType})`, 'unhealthy', message, duration);
  }
}

async function checkRedis(): Promise<void> {
  const startTime = Date.now();
  const required = false;

  try {
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
      const duration = Date.now() - startTime;
      results.push({
        name: 'Redis',
        required,
        status: 'skipped',
        message: 'Not configured (optional)',
        duration,
      });
      printStatus('Redis', 'skipped', 'Not configured (optional)', duration);
      return;
    }

    const redis = new Redis(redisUrl, {
      connectTimeout: 5000,
      retryStrategy: () => null,
    });

    await redis.ping();
    await redis.quit();

    const duration = Date.now() - startTime;
    results.push({
      name: 'Redis',
      required,
      status: 'healthy',
      message: 'Connected and healthy',
      duration,
    });
    printStatus('Redis', 'healthy', 'Connected and healthy', duration);
  } catch (error) {
    const duration = Date.now() - startTime;
    const message =
      error instanceof Error ? error.message : 'Unknown error occurred';
    results.push({
      name: 'Redis',
      required,
      status: 'unhealthy',
      message,
      duration,
    });
    printStatus('Redis', 'unhealthy', message, duration);
  }
}

// async function checkClerk(): Promise<void> {
//   const startTime = Date.now();
//   const required = false;

//   try {
//     const clerkSecretKey = process.env.CLERK_SECRET_KEY;
//     if (!clerkSecretKey) {
//       const duration = Date.now() - startTime;
//       results.push({
//         name: 'Clerk',
//         required,
//         status: 'skipped',
//         message: 'Not configured (optional)',
//         duration,
//       });
//       printStatus(
//         'Clerk',
//         'skipped',
//         'Not configured (optional)',
//         duration
//       );
//       return;
//     }

//     const clerk = new Clerk({ secretKey: clerkSecretKey });
//     await clerk.users.getUserList({ limit: 1 });

//     const duration = Date.now() - startTime;
//     results.push({
//       name: 'Clerk',
//       required,
//       status: 'healthy',
//       message: 'API accessible and healthy',
//       duration,
//     });
//     printStatus('Clerk', 'healthy', 'API accessible and healthy', duration);
//   } catch (error) {
//     const duration = Date.now() - startTime;
//     const message =
//       error instanceof Error ? error.message : 'Unknown error occurred';
//     results.push({
//       name: 'Clerk',
//       required,
//       status: 'unhealthy',
//       message,
//       duration,
//     });
//     printStatus('Clerk', 'unhealthy', message, duration);
//   }
// }

async function checkStripe(): Promise<void> {
  const startTime = Date.now();
  const required = false;

  try {
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
      const duration = Date.now() - startTime;
      results.push({
        name: 'Stripe',
        required,
        status: 'skipped',
        message: 'Not configured (optional)',
        duration,
      });
      printStatus('Stripe', 'skipped', 'Not configured (optional)', duration);
      return;
    }

    const stripe = new Stripe(stripeSecretKey);
    await stripe.charges.list({ limit: 1 });

    const duration = Date.now() - startTime;
    results.push({
      name: 'Stripe',
      required,
      status: 'healthy',
      message: 'API accessible and healthy',
      duration,
    });
    printStatus('Stripe', 'healthy', 'API accessible and healthy', duration);
  } catch (error) {
    const duration = Date.now() - startTime;
    const message =
      error instanceof Error ? error.message : 'Unknown error occurred';
    results.push({
      name: 'Stripe',
      required,
      status: 'unhealthy',
      message,
      duration,
    });
    printStatus('Stripe', 'unhealthy', message, duration);
  }
}

async function checkS3(): Promise<void> {
  const startTime = Date.now();
  const required = false;

  try {
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
    const bucket = process.env.S3_BUCKET;

    if (!accessKeyId || !secretAccessKey || !bucket) {
      const duration = Date.now() - startTime;
      results.push({
        name: 'AWS S3',
        required,
        status: 'skipped',
        message: 'Not configured (optional)',
        duration,
      });
      printStatus('AWS S3', 'skipped', 'Not configured (optional)', duration);
      return;
    }

    const s3Client = new S3Client({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });

    await s3Client.send(new HeadBucketCommand({ Bucket: bucket }));

    const duration = Date.now() - startTime;
    results.push({
      name: 'AWS S3',
      required,
      status: 'healthy',
      message: 'Bucket accessible and healthy',
      duration,
    });
    printStatus('AWS S3', 'healthy', 'Bucket accessible and healthy', duration);
  } catch (error) {
    const duration = Date.now() - startTime;
    const message =
      error instanceof Error ? error.message : 'Unknown error occurred';
    results.push({
      name: 'AWS S3',
      required,
      status: 'unhealthy',
      message,
      duration,
    });
    printStatus('AWS S3', 'unhealthy', message, duration);
  }
}

async function checkSendGrid(): Promise<void> {
  const startTime = Date.now();
  const required = false;

  try {
    const sendGridApiKey = process.env.SENDGRID_API_KEY;
    if (!sendGridApiKey) {
      const duration = Date.now() - startTime;
      results.push({
        name: 'SendGrid',
        required,
        status: 'skipped',
        message: 'Not configured (optional)',
        duration,
      });
      printStatus('SendGrid', 'skipped', 'Not configured (optional)', duration);
      return;
    }

    sgMail.setApiKey(sendGridApiKey);

    // Make a simple API call to verify the key is valid
    // Using the lists endpoint which requires no parameters
    const response = await fetch(
      'https://api.sendgrid.com/v3/marketing/lists?page_size=1',
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${sendGridApiKey}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`SendGrid API responded with status ${response.status}`);
    }

    const duration = Date.now() - startTime;
    results.push({
      name: 'SendGrid',
      required,
      status: 'healthy',
      message: 'API accessible and healthy',
      duration,
    });
    printStatus('SendGrid', 'healthy', 'API accessible and healthy', duration);
  } catch (error) {
    const duration = Date.now() - startTime;
    const message =
      error instanceof Error ? error.message : 'Unknown error occurred';
    results.push({
      name: 'SendGrid',
      required,
      status: 'unhealthy',
      message,
      duration,
    });
    printStatus('SendGrid', 'unhealthy', message, duration);
  }
}

// Main health check function
async function runHealthChecks(): Promise<void> {
  console.log(
    `\n${colors.bright}${colors.cyan}=== SaaS Backend Health Check ===${colors.reset}\n`
  );

  console.log(`${colors.bright}Checking required services...${colors.reset}`);
  await checkDatabase();

  console.log(`\n${colors.bright}Checking optional services...${colors.reset}`);
  await checkRedis();
  // await checkClerk();
  await checkStripe();
  await checkS3();
  await checkSendGrid();

  // Print summary
  console.log(
    `\n${colors.bright}${colors.cyan}=== Health Check Summary ===${colors.reset}\n`
  );

  const healthy = results.filter((r) => r.status === 'healthy').length;
  const unhealthy = results.filter((r) => r.status === 'unhealthy').length;
  const skipped = results.filter((r) => r.status === 'skipped').length;
  const requiredUnhealthy = results.filter(
    (r) => r.required && r.status === 'unhealthy'
  ).length;

  console.log(`${colors.green}Healthy: ${healthy}${colors.reset}`);
  console.log(`${colors.red}Unhealthy: ${unhealthy}${colors.reset}`);
  console.log(`${colors.yellow}Skipped: ${skipped}${colors.reset}`);

  // Determine exit code
  const exitCode = requiredUnhealthy > 0 ? 1 : 0;

  if (exitCode === 0) {
    console.log(
      `\n${colors.bright}${colors.green}All required services are healthy!${colors.reset}\n`
    );
  } else {
    console.log(
      `\n${colors.bright}${colors.red}Some required services are unhealthy!${colors.reset}\n`
    );
  }

  process.exit(exitCode);
}

// Run the health checks
runHealthChecks().catch((error) => {
  console.error(
    `${colors.red}${colors.bright}Health check failed with error:${colors.reset}`,
    error
  );
  process.exit(1);
});
