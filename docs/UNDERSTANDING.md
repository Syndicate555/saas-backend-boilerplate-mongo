# Understanding the SaaS Backend Boilerplate (Part 1 of 2)

> **⚠️ IMPORTANT NOTE**: This documentation was written for the dual MongoDB/Supabase version of this boilerplate.
>
> **The codebase has been migrated to MongoDB-only.** All Supabase references in this document are now outdated.
>
> For information about the migration and current MongoDB-only setup, see:
> - [MONGODB_MIGRATION.md](../MONGODB_MIGRATION.md) - Migration guide
> - [MIGRATION_SUMMARY.md](../MIGRATION_SUMMARY.md) - Summary of changes
>
> The database sections below contain historical Supabase information that no longer applies to the current codebase.

This comprehensive guide covers the architecture, core systems, and middleware stack of this production-ready SaaS backend boilerplate.

---

## Table of Contents - Part 1

1. [Architecture Overview](#section-1-architecture-overview)
2. [Core Systems Deep Dive - Configuration](#section-2-core-systems-deep-dive---configuration)
3. [Core Systems Deep Dive - Middleware Stack](#section-3-core-systems-deep-dive---middleware-stack)

---

## Section 1: Architecture Overview

### 1.1 High-Level System Design

This boilerplate follows a modular, layered architecture designed for scalability, maintainability, and flexibility. The system is built on Express.js with TypeScript and supports multiple database backends (MongoDB/Supabase) with optional feature modules.

```mermaid
graph TD
    Client[Client Application] -->|HTTP/WebSocket| LB[Load Balancer]
    LB --> Server[Express Server]

    Server --> MW[Middleware Stack]
    MW -->|1| Helmet[Helmet Security]
    MW -->|2| CORS[CORS Handler]
    MW -->|3| BodyParser[Body Parser]
    MW -->|4| ReqLogger[Request Logger]
    MW -->|5| RateLimit[Rate Limiter]
    MW -->|6| Auth[Auth Middleware]

    Auth --> Routes[API Routes]
    Routes --> Core[Core Features]
    Routes --> Optional[Optional Modules]

    Core --> Validation[Zod Validation]
    Validation --> Controller[Controllers]
    Controller --> Service[Services]
    Service --> DB[Database Layer]

    DB -->|MongoDB| Mongo[(MongoDB)]
    DB -->|Supabase| Supa[(Supabase)]

    Optional --> Payments[Payments - Stripe]
    Optional --> Uploads[Uploads - S3]
    Optional --> Jobs[Jobs - BullMQ]
    Optional --> Realtime[Realtime - Socket.IO]
    Optional --> Email[Email - SendGrid]

    Jobs --> Redis[(Redis)]
    Realtime --> Redis
    RateLimit -.Optional.-> Redis

    Server --> ErrorHandler[Error Handler]
    ErrorHandler --> Sentry[Sentry]

    style Core fill:#4CAF50
    style Optional fill:#2196F3
    style Redis fill:#DC382D
    style Mongo fill:#47A248
    style Supa fill:#3ECF8E
```

### 1.2 Request/Response Flow

Here's the complete journey of an API request through the system:

```mermaid
sequenceDiagram
    participant C as Client
    participant S as Express Server
    participant M as Middleware Stack
    participant A as Auth
    participant V as Validation
    participant Ctrl as Controller
    participant Svc as Service
    participant DB as Database
    participant R as Response Handler

    C->>S: HTTP Request
    S->>M: Pass to Middleware

    Note over M: 1. Helmet (Security Headers)
    Note over M: 2. CORS (Origin Check)
    Note over M: 3. Body Parser
    Note over M: 4. Compression
    Note over M: 5. Request Logger
    Note over M: 6. Response Helpers
    Note over M: 7. Rate Limiter

    M->>A: Check Authentication
    alt No Token & Route Requires Auth
        A->>C: 401 Unauthorized
    else Token Invalid
        A->>C: 401 Unauthorized
    else Valid Token
        A->>A: Verify with Clerk
        A->>DB: Load/Create User
        A->>M: Attach User to Request
    end

    M->>V: Validate Request Data
    alt Validation Fails
        V->>C: 400 Bad Request
    else Validation Passes
        V->>Ctrl: Call Controller
    end

    Ctrl->>Svc: Business Logic
    Svc->>DB: Database Operations
    DB->>Svc: Return Data
    Svc->>Ctrl: Return Results
    Ctrl->>R: Format Response
    R->>C: JSON Response

    Note over S: If Error Occurs
    S->>M: Error Handler
    M->>C: Formatted Error Response
```

### 1.3 Module Organization

The codebase is organized into three main categories:

#### **Core** (`src/core/`)
Essential infrastructure shared across the entire application. Cannot be disabled.

```
src/core/
├── config/          # System configuration
│   ├── env.ts       # Environment validation with Zod
│   ├── database.ts  # Database connection abstraction
│   ├── redis.ts     # Redis connection with graceful degradation
│   └── logger.ts    # Winston logger setup
├── middleware/      # Express middleware
│   ├── errorHandler.ts    # Global error handling
│   ├── rateLimiter.ts     # Rate limiting
│   ├── validate.ts        # Zod validation middleware
│   ├── requestLogger.ts   # Request/response logging
│   └── asyncHandler.ts    # Async route wrapper
├── types/           # TypeScript definitions
│   ├── express.d.ts       # Express type extensions
│   ├── errors.ts          # Custom error classes
│   └── index.ts           # Shared types
├── utils/           # Utility functions
│   ├── apiResponse.ts     # Response formatters
│   ├── pagination.ts      # Pagination helpers
│   └── asyncHandler.ts    # Async error handling
└── server.ts        # Express app configuration
```

#### **Features** (`src/features/`)
Business domain features that form the core functionality. Each feature is a complete vertical slice.

```
src/features/
└── example/         # Example CRUD feature
    ├── example.model.ts      # Database model (Mongoose)
    ├── example.schema.ts     # Zod validation schemas
    ├── example.controller.ts # HTTP request handlers
    ├── example.service.ts    # Business logic
    └── example.routes.ts     # Route definitions
```

**Feature Pattern:**
- Model: Database schema and methods
- Schema: Request/response validation
- Controller: HTTP layer (request → response)
- Service: Business logic (reusable across controllers)
- Routes: Express route configuration

#### **Modules** (`src/modules/`)
Optional functionality that can be enabled/disabled via environment variables.

```
src/modules/
├── auth/           # Clerk authentication
├── payments/       # Stripe integration
├── uploads/        # S3 file uploads
├── email/          # SendGrid email
├── jobs/           # BullMQ background jobs
├── realtime/       # Socket.IO websockets
└── rbac/           # Role-based access control
```

### 1.4 How Optional Modules Work with Feature Flags

The system uses feature flags to enable/disable modules based on environment configuration:

**Feature Flag Definition** (`src/core/config/env.ts`):
```typescript
export const features = {
  auth: !!env.CLERK_SECRET_KEY,
  redis: !!env.REDIS_URL,
  s3: !!(env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY && env.S3_BUCKET),
  stripe: !!(env.STRIPE_SECRET_KEY && env.STRIPE_WEBHOOK_SECRET),
  sendgrid: !!(env.SENDGRID_API_KEY && env.SENDGRID_FROM_EMAIL),
  sentry: !!env.SENTRY_DSN,
  jobs: !!env.REDIS_URL,      // Jobs require Redis
  realtime: !!env.REDIS_URL,  // Realtime requires Redis for adapter
} as const;
```

**Conditional Module Loading** (`src/index.ts`):
```typescript
async function mountRoutes(app: Express): Promise<void> {
  // Core routes - always loaded
  const exampleRoutes = require('./features/example/example.routes').default;
  app.use('/api/examples', exampleRoutes);

  // Optional: Payments (if Stripe configured)
  if (features.stripe) {
    const paymentRoutes = require('./modules/payments/routes').default;
    app.use('/api/payments', paymentRoutes);
  }

  // Optional: Uploads (if S3 configured)
  if (features.s3) {
    const uploadRoutes = require('./modules/uploads/routes').default;
    app.use('/api/uploads', uploadRoutes);
  }

  // Optional: Background jobs (if Redis configured)
  if (features.jobs) {
    const { startWorkers } = require('./modules/jobs/worker');
    await startWorkers();
  }

  // Optional: Realtime (if Redis configured)
  if (features.realtime && server) {
    const { setupSocketIO } = require('./modules/realtime/server');
    setupSocketIO(server);
  }
}
```

**Graceful Degradation:**
- If Redis is unavailable, rate limiting falls back to in-memory storage
- If Clerk is not configured in development, mock authentication is used
- Missing optional services are logged as warnings, not errors

### 1.5 Key Design Decisions and Rationale

#### 1. Multiple Database Support
**Decision:** Support both MongoDB and Supabase through an abstraction layer

**Rationale:**
- Different teams have different preferences and existing infrastructure
- Supabase provides built-in auth, realtime, and storage in one platform
- MongoDB offers flexible schema and mature ecosystem
- Abstraction allows switching databases without changing business logic

#### 2. Feature Flags for Optional Modules
**Decision:** Use environment variables to enable/disable features

**Rationale:**
- Pay only for services you need (Stripe, S3, SendGrid, etc.)
- Start simple, add complexity as needed
- Easier testing (can disable services in test environment)
- Follows 12-factor app methodology

#### 3. Zod for Runtime Validation
**Decision:** Use Zod instead of class-validator or joi

**Rationale:**
- Full TypeScript integration with type inference
- Compose schemas easily (pick, omit, extend)
- Runtime validation with compile-time type safety
- Single source of truth for types and validation

#### 4. Clerk for Authentication
**Decision:** Use Clerk instead of building custom auth

**Rationale:**
- Authentication is complex and security-critical
- Clerk provides user management, SSO, MFA out of the box
- Focus on business logic instead of auth infrastructure
- Can still be disabled for development with mock auth

#### 5. Modular Architecture
**Decision:** Separate core, features, and modules

**Rationale:**
- Clear separation of concerns
- Easy to add/remove features
- New developers can understand structure quickly
- Scales well as codebase grows

#### 6. Winston for Logging
**Decision:** Use Winston instead of console.log or pino

**Rationale:**
- Structured logging with metadata
- Multiple transports (console, file, external services)
- Log levels for different environments
- Request correlation with request IDs

#### 7. Express Over Fastify
**Decision:** Use Express.js as the web framework

**Rationale:**
- Mature ecosystem with extensive middleware
- Most developers are familiar with Express
- Better documentation and community support
- Good enough performance for most SaaS applications

---

## Section 2: Core Systems Deep Dive - Configuration

### 2.1 Environment Validation (`src/core/config/env.ts`)

The system uses Zod for compile-time type safety AND runtime validation of environment variables.

#### How It Works

**Step 1: Define Schema**
```typescript
const envSchema = z.object({
  // Application
  NODE_ENV: z.enum(['development', 'staging', 'production']).default('development'),
  PORT: z.string().transform(Number).default('3000'),

  // Database
  DATABASE_TYPE: z.enum(['mongodb', 'supabase']).default('mongodb'),

  // MongoDB (optional)
  MONGO_URI: z.string().optional(),

  // Supabase (optional)
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_ANON_KEY: z.string().optional(),

  // Redis (optional - needed for jobs, realtime)
  REDIS_URL: z.string().optional(),

  // Clerk (optional - mock auth in dev)
  CLERK_SECRET_KEY: z.string().optional(),
  CLERK_PUBLISHABLE_KEY: z.string().optional(),

  // AWS S3 (optional)
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  S3_BUCKET: z.string().optional(),

  // Stripe (optional)
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),

  // SendGrid (optional)
  SENDGRID_API_KEY: z.string().optional(),
  SENDGRID_FROM_EMAIL: z.string().email().optional(),

  // Sentry (optional)
  SENTRY_DSN: z.string().optional(),

  // CORS
  FRONTEND_URL: z.string().default('http://localhost:3001'),

  // Logging
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'http', 'debug']).default('info'),
});
```

**Step 2: Validate at Startup**
```typescript
const envResult = envSchema.safeParse(process.env);

if (!envResult.success) {
  console.error('❌ Invalid environment variables:');
  console.error(JSON.stringify(envResult.error.format(), null, 2));
  process.exit(1);
}

const env = envResult.data;
```

**Step 3: Additional Validation**
```typescript
// Ensure MongoDB URI if database type is MongoDB
if (env.DATABASE_TYPE === 'mongodb' && !env.MONGO_URI) {
  console.error('❌ MONGO_URI is required when DATABASE_TYPE is mongodb');
  console.error('💡 Set MONGO_URI=mongodb://localhost:27017/saas-dev in your .env file');
  process.exit(1);
}

// Ensure S3 variables are all set together
if ((env.AWS_ACCESS_KEY_ID || env.AWS_SECRET_ACCESS_KEY || env.S3_BUCKET) &&
    !(env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY && env.S3_BUCKET)) {
  console.error('❌ All AWS S3 variables must be set together');
  process.exit(1);
}
```

**Benefits:**
- Type-safe access to environment variables
- Fails fast on startup if configuration is invalid
- Helpful error messages guide developers
- Automatic type conversion (string → number, etc.)

### 2.2 Database Connection Logic

The database module provides a unified interface for MongoDB and Supabase:

**Abstraction Interface** (`src/core/config/database.ts`):
```typescript
export interface DatabaseConnection {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  getClient(): any;
}

class Database implements DatabaseConnection {
  private connected = false;

  async connect(): Promise<void> {
    if (this.connected) {
      logger.warn('Database connection already established');
      return;
    }

    try {
      logger.info(`Connecting to ${env.DATABASE_TYPE} database...`);

      if (env.DATABASE_TYPE === 'mongodb') {
        await connectMongoDB();
      } else if (env.DATABASE_TYPE === 'supabase') {
        await testSupabaseConnection();
      }

      this.connected = true;
      logger.info(`Successfully connected to ${env.DATABASE_TYPE} database`);
    } catch (error) {
      logger.error('Failed to connect to database', { error });
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (!this.connected) return;

    if (env.DATABASE_TYPE === 'mongodb') {
      await disconnectMongoDB();
    }
    // Supabase client doesn't need explicit disconnection

    this.connected = false;
  }

  isConnected(): boolean {
    return this.connected;
  }

  getClient(): any {
    if (!this.connected) {
      throw new Error('Database not connected. Call connect() first.');
    }

    if (env.DATABASE_TYPE === 'supabase') {
      return getSupabaseClient();
    }

    return null; // MongoDB uses mongoose models directly
  }
}

export const database = new Database();
```

**MongoDB Connection** (`src/database/mongodb/connection.ts`):
```typescript
import mongoose from 'mongoose';

export async function connectMongoDB(): Promise<void> {
  await mongoose.connect(env.MONGO_URI!, {
    // Connection options
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  });

  logger.info('MongoDB connected successfully');
}

export async function disconnectMongoDB(): Promise<void> {
  await mongoose.disconnect();
  logger.info('MongoDB disconnected');
}
```

**Supabase Connection** (`src/database/supabase/client.ts`):
```typescript
import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabase: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (!supabase) {
    supabase = createClient(
      env.SUPABASE_URL!,
      env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }
  return supabase;
}

export async function testSupabaseConnection(): Promise<void> {
  const client = getSupabaseClient();
  const { error } = await client.from('users').select('count').limit(1);

  if (error && error.code !== 'PGRST116') { // PGRST116 = table doesn't exist (OK)
    throw new Error(`Supabase connection failed: ${error.message}`);
  }

  logger.info('Supabase connected successfully');
}
```

### 2.3 Redis Connection and Graceful Degradation

Redis is optional and used for rate limiting, caching, jobs, and realtime features.

**Initialization** (`src/core/config/redis.ts`):
```typescript
import Redis from 'ioredis';

let redis: Redis | null = null;

export function initializeRedis(): Redis | null {
  if (!features.redis) {
    logger.info('Redis is not configured, skipping initialization');
    return null;
  }

  if (redis) {
    logger.warn('Redis client already initialized');
    return redis;
  }

  try {
    redis = new Redis(env.REDIS_URL!, {
      retryStrategy: (times: number) => {
        const delay = Math.min(times * 50, 2000);
        logger.warn(`Redis connection attempt ${times}, retrying in ${delay}ms...`);
        return delay;
      },
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      lazyConnect: false,
    });

    // Event handlers
    redis.on('connect', () => logger.info('Redis client connected'));
    redis.on('ready', () => logger.info('Redis client ready'));
    redis.on('error', (error) => logger.error('Redis client error', { error }));
    redis.on('close', () => logger.warn('Redis connection closed'));
    redis.on('reconnecting', () => logger.info('Redis client reconnecting...'));

    return redis;
  } catch (error) {
    logger.error('Failed to initialize Redis client', { error });
    return null;
  }
}

export function getRedisClient(): Redis | null {
  if (!features.redis) return null;
  if (!redis) redis = initializeRedis();
  return redis;
}
```

**Helper Functions with Graceful Failure:**
```typescript
export async function get<T = string>(key: string): Promise<T | null> {
  const client = getRedisClient();
  if (!client) return null; // Gracefully return null if Redis unavailable

  try {
    const value = await client.get(key);
    if (!value) return null;

    try {
      return JSON.parse(value) as T;
    } catch {
      return value as unknown as T;
    }
  } catch (error) {
    logger.error('Redis get error', { error, key });
    return null; // Return null on error instead of throwing
  }
}

export async function set(
  key: string,
  value: any,
  ttl?: number
): Promise<boolean> {
  const client = getRedisClient();
  if (!client) return false; // Gracefully return false if Redis unavailable

  try {
    const serialized = typeof value === 'string' ? value : JSON.stringify(value);

    if (ttl) {
      await client.setex(key, ttl, serialized);
    } else {
      await client.set(key, serialized);
    }

    return true;
  } catch (error) {
    logger.error('Redis set error', { error, key });
    return false; // Return false on error instead of throwing
  }
}
```

**Why Graceful Degradation:**
- Application continues to work without Redis
- Rate limiting falls back to in-memory storage
- Caching degrades to no caching
- Jobs and realtime features are disabled but app runs

### 2.4 Logger Setup and Usage

Winston logger with environment-specific configuration:

**Logger Configuration** (`src/core/config/logger.ts`):
```typescript
import winston from 'winston';

const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Development format: colorized, human-readable
const devFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
    return `${timestamp} [${level}]: ${message} ${metaStr}`;
  })
);

// Production format: JSON for log aggregation
const prodFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Create transports
const transports: winston.transport[] = [
  new winston.transports.Console({
    format: env.NODE_ENV === 'development' ? devFormat : prodFormat,
  })
];

// File transports in production
if (env.NODE_ENV === 'production') {
  transports.push(
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
    }),
    new winston.transports.File({
      filename: 'logs/combined.log',
    })
  );
}

export const logger = winston.createLogger({
  level: env.LOG_LEVEL,
  levels: logLevels,
  transports,
});
```

**Usage Examples:**
```typescript
// Basic logging
logger.info('User logged in');
logger.error('Database connection failed', { error });
logger.warn('Rate limit approaching threshold', { userId, limit });

// With structured metadata
logger.info('Payment processed', {
  userId: user.id,
  amount: payment.amount,
  currency: payment.currency,
  paymentId: payment.id,
});

// Helper function with request context
import { logWithContext } from './config/logger';

logWithContext('error', 'Failed to create resource', {
  requestId: req.requestId,
  userId: req.user?.id,
  method: req.method,
  path: req.path,
  error: error,
});
```

### 2.5 Feature Flags System

The feature flags system is the core mechanism for enabling/disabling modules:

**Declaration** (`src/core/config/env.ts`):
```typescript
export const features = {
  auth: !!env.CLERK_SECRET_KEY,
  redis: !!env.REDIS_URL,
  s3: !!(env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY && env.S3_BUCKET),
  stripe: !!(env.STRIPE_SECRET_KEY && env.STRIPE_WEBHOOK_SECRET),
  sendgrid: !!(env.SENDGRID_API_KEY && env.SENDGRID_FROM_EMAIL),
  sentry: !!env.SENTRY_DSN,
  jobs: !!env.REDIS_URL,      // Jobs require Redis
  realtime: !!env.REDIS_URL,  // Realtime requires Redis
} as const;
```

**Usage in Bootstrap** (`src/index.ts`):
```typescript
async function bootstrap(): Promise<void> {
  // Initialize Redis if configured
  if (features.redis) {
    logger.info('💾 Initializing Redis...');
    initializeRedis();
  } else {
    logger.warn('⚠️  Redis not configured - jobs and realtime features disabled');
  }

  // Initialize authentication
  if (features.auth) {
    logger.info('🔐 Clerk authentication enabled');
  } else {
    logger.warn('⚠️  Running without authentication (development mode only)');
  }

  // Log enabled features
  if (features.stripe) logger.info('💳 Stripe payments enabled');
  if (features.s3) logger.info('☁️  AWS S3 uploads enabled');
  if (features.sendgrid) logger.info('📧 SendGrid email enabled');
  if (features.sentry) logger.info('🐛 Sentry error tracking enabled');
}
```

**Usage in Middleware**:
```typescript
// Rate limiter checks for Redis
if (features.redis && redisClient) {
  return rateLimit({
    store: new RedisStore({ /* config */ }),
  });
}
// Fallback to memory store
return rateLimit({ /* config */ });
```

**Benefits:**
- Zero config for services you don't use
- Clear visibility of enabled features at startup
- Type-safe feature checks with TypeScript
- Easy to add new features

---

## Section 3: Core Systems Deep Dive - Middleware Stack

### 3.1 Order of Middleware Execution

The order of middleware is critical for security, performance, and correctness:

**Middleware Stack** (`src/core/server.ts`):
```typescript
export function createServer(): Express {
  const app = express();

  // 1. Sentry (must be first to capture all errors)
  if (features.sentry && env.SENTRY_DSN) {
    Sentry.init({ /* config */ });
    app.use(Sentry.Handlers.requestHandler());
    app.use(Sentry.Handlers.tracingHandler());
  }

  // 2. Trust proxy (for correct IP detection)
  app.set('trust proxy', 1);

  // 3. Security middleware (Helmet)
  app.use(helmet({
    contentSecurityPolicy: env.NODE_ENV === 'production',
    crossOriginEmbedderPolicy: env.NODE_ENV === 'production',
  }));

  // 4. CORS configuration
  app.use(cors({
    origin: (origin, callback) => {
      // Check if origin is allowed
      const allowedOrigins = env.FRONTEND_URL.split(',').map(url => url.trim());
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  }));

  // 5. Body parsing middleware
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // 6. Raw body for webhook verification
  app.use('/api/webhooks', express.raw({ type: 'application/json' }));

  // 7. Compression
  app.use(compression());

  // 8. Request logging (adds request ID)
  app.use(requestLogger);

  // 9. Response helpers (adds res.success(), res.error())
  app.use(responseHelpers);

  // 10. Pagination helper (adds res.paginated())
  app.use(attachPagination);

  // 11. Rate limiting on API routes
  app.use('/api', apiLimiter);

  // 12. API Routes (with per-route middleware)
  // app.use('/api/examples', requireAuth, exampleRoutes);

  // 13. Error logging (before error handler)
  app.use(errorLogger);

  // 14. Sentry error handler (before custom error handler)
  if (features.sentry && env.SENTRY_DSN) {
    app.use(Sentry.Handlers.errorHandler());
  }

  // 15. 404 handler (after all routes)
  app.use(notFoundHandler);

  // 16. Error handler (must be last)
  app.use(errorHandler);

  return app;
}
```

**Why This Order:**
1. **Sentry first** - captures all subsequent errors and requests
2. **Security early** - Helmet adds security headers before processing
3. **CORS early** - reject invalid origins immediately
4. **Body parsing** - needed by subsequent middleware
5. **Logging** - track all requests with unique IDs
6. **Rate limiting** - prevent abuse before expensive operations
7. **Routes** - handle business logic
8. **Error handlers last** - catch all errors from above

### 3.2 Error Handling Flow

Comprehensive error handling with type-specific responses:

**Error Handler** (`src/core/middleware/errorHandler.ts`):
```typescript
export function errorHandler(
  error: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Log error with context
  logger.error('Request error', {
    error,
    requestId: req.requestId,
    userId: req.user?.id,
    method: req.method,
    path: req.path,
  });

  // Send to Sentry if configured
  if (features.sentry) {
    Sentry.captureException(error, {
      tags: {
        requestId: req.requestId,
        path: req.path,
        method: req.method,
      },
      user: req.user ? { id: req.user.id, email: req.user.email } : undefined,
    });
  }

  let statusCode = 500;
  let errorResponse: any = {
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
    },
  };

  // Handle Zod validation errors
  if (error instanceof ZodError) {
    statusCode = 400;
    errorResponse = {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
        })),
      },
    };
  }
  // Handle custom base errors
  else if (error instanceof BaseError) {
    statusCode = error.statusCode;
    errorResponse = {
      success: false,
      error: {
        code: error.code,
        message: error.message,
        ...(error instanceof ValidationError && { details: error.details }),
      },
    };
  }
  // Handle MongoDB errors
  else if (error.name === 'MongoError' || error.name === 'MongoServerError') {
    const mongoError = error as any;
    if (mongoError.code === 11000) {
      statusCode = 409;
      errorResponse.error = {
        code: 'CONFLICT',
        message: 'Resource already exists',
      };
    }
  }
  // Handle Stripe errors
  else if (error.name === 'StripeError') {
    statusCode = 402;
    errorResponse.error = {
      code: 'PAYMENT_ERROR',
      message: 'Payment processing failed',
    };
  }

  // Add stack trace in development
  if (env.NODE_ENV === 'development') {
    errorResponse.error.stack = error.stack;
  }

  // Add request ID for tracing
  if (req.requestId) {
    errorResponse.error.requestId = req.requestId;
  }

  res.status(statusCode).json(errorResponse);
}
```

**Custom Error Classes** (`src/core/types/errors.ts`):
```typescript
export class BaseError extends Error {
  constructor(
    public message: string,
    public statusCode: number,
    public code: string
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends BaseError {
  constructor(
    message: string,
    public details: any[]
  ) {
    super(message, 400, 'VALIDATION_ERROR');
  }
}

export class AuthError extends BaseError {
  constructor(message: string = 'Authentication failed') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

export class ForbiddenError extends BaseError {
  constructor(message: string = 'Access denied') {
    super(message, 403, 'FORBIDDEN');
  }
}

export class NotFoundError extends BaseError {
  constructor(message: string = 'Resource not found') {
    super(message, 404, 'NOT_FOUND');
  }
}

export class RateLimitError extends BaseError {
  constructor(message: string = 'Rate limit exceeded') {
    super(message, 429, 'RATE_LIMIT_EXCEEDED');
  }
}
```

**Error Flow Diagram:**
```
Request Error Occurs
        ↓
Error Logger (logs error)
        ↓
Sentry Handler (if enabled)
        ↓
Custom Error Handler
        ↓
    ┌───────────────────────┐
    │ Identify Error Type   │
    └───────────────────────┘
            ↓
    ┌───────────────────────┐
    │   Zod Validation?     │ → 400 Bad Request
    │   Custom BaseError?   │ → Use error.statusCode
    │   MongoDB Duplicate?  │ → 409 Conflict
    │   Clerk/JWT Error?    │ → 401 Unauthorized
    │   Stripe Error?       │ → 402 Payment Required
    │   Unknown Error?      │ → 500 Internal Error
    └───────────────────────┘
            ↓
    Format Error Response
            ↓
    Add Request ID
            ↓
    Add Stack (if dev)
            ↓
    Send JSON Response
```

### 3.3 Validation with Zod

Type-safe request validation using Zod schemas:

**Validation Middleware** (`src/core/middleware/validate.ts`):
```typescript
export function validate(
  schema: ZodSchema,
  target: 'body' | 'query' | 'params' = 'body',
  options: ValidationOptions = {}
) {
  return async (
    req: Request,
    _res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      // Get data to validate
      const dataToValidate = req[target];

      // Parse and validate data
      const validatedData = await schema.parseAsync(dataToValidate);

      // Replace request data with validated (and transformed) data
      req[target] = validatedData;

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const validationErrors = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code,
        }));

        next(new ValidationError('Validation failed', validationErrors));
      } else {
        next(error);
      }
    }
  };
}
```

**Example Schema** (`src/features/example/example.schema.ts`):
```typescript
import { z } from 'zod';

export const createExampleSchema = z.object({
  title: z.string().min(3).max(100),
  description: z.string().min(10).max(500).optional(),
  category: z.enum(['tech', 'business', 'lifestyle']),
  tags: z.array(z.string()).min(1).max(5),
  isPublic: z.boolean().default(false),
});

export const updateExampleSchema = createExampleSchema.partial();

export const listExamplesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  category: z.enum(['tech', 'business', 'lifestyle']).optional(),
  search: z.string().min(1).optional(),
  sortBy: z.enum(['createdAt', 'title', 'views']).default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
});

export const idParamSchema = z.object({
  id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ID format'),
});
```

**Usage in Routes:**
```typescript
router.post(
  '/',
  requireAuth,
  validate(createExampleSchema, 'body'),
  exampleController.create
);

router.get(
  '/',
  validate(listExamplesQuerySchema, 'query'),
  exampleController.list
);

router.put(
  '/:id',
  requireAuth,
  validate(idParamSchema, 'params'),
  validate(updateExampleSchema, 'body'),
  exampleController.update
);
```

**Benefits:**
- Type inference: `req.body` has correct TypeScript type after validation
- Automatic coercion: strings → numbers, dates, etc.
- Clear error messages for API consumers
- Reusable schemas with composition (pick, omit, extend)

### 3.4 Rate Limiting Strategies

Multiple rate limiting strategies with Redis fallback:

**Rate Limiter Configuration** (`src/core/middleware/rateLimiter.ts`):
```typescript
function createRateLimiter(options: {
  windowMs: number;
  max: number;
  message?: string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  keyGenerator?: (req: Request) => string;
  name?: string;
}) {
  const redisClient = getRedisClient();

  const baseOptions = {
    windowMs: options.windowMs,
    max: options.max,
    message: options.message || 'Too many requests, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: options.keyGenerator || ((req: Request) => {
      // Use user ID if authenticated, otherwise use IP
      return req.user?.id || req.ip || 'unknown';
    }),
    handler: (_req: Request, _res: Response) => {
      throw new RateLimitError(options.message || 'Rate limit exceeded');
    },
  };

  // Use Redis store if available
  if (features.redis && redisClient) {
    return rateLimit({
      ...baseOptions,
      store: new RedisStore({
        sendCommand: (...args: string[]) => redisClient.sendCommand(args),
        prefix: `rate-limit:${options.name || 'general'}:`,
      }),
    });
  }

  // Fallback to memory store (not shared across instances)
  return rateLimit(baseOptions);
}
```

**Predefined Limiters:**
```typescript
// General API: 500 requests per 15 minutes
export const apiLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 500,
  name: 'api',
});

// Strict: 100 requests per 15 minutes
export const strictLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 100,
  name: 'strict',
});

// Authentication: 10 attempts per 15 minutes
export const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  skipSuccessfulRequests: true, // Only count failed attempts
  name: 'auth',
  keyGenerator: (req: Request) => req.body?.email || req.ip || 'unknown',
});

// File uploads: 20 per hour
export const uploadLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 20,
  name: 'upload',
});

// Webhooks: 1000 per minute
export const webhookLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 1000,
  name: 'webhook',
  keyGenerator: (req: Request) => `${req.path}:${req.ip}`,
});
```

**Subscription-Based Rate Limiting:**
```typescript
export function subscriptionBasedLimiter(
  freeLimit: number = 100,
  proLimit: number = 1000,
  enterpriseLimit: number = 10000
) {
  return rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: (req: Request) => {
      if (!req.user) return freeLimit;

      switch (req.user.subscription) {
        case 'pro': return proLimit;
        case 'enterprise': return enterpriseLimit;
        default: return freeLimit;
      }
    },
    keyGenerator: (req: Request) => req.user?.id || req.ip || 'unknown',
  });
}
```

### 3.5 Authentication Flow with Clerk

Clerk JWT verification with mock authentication in development:

**Authentication Middleware** (`src/modules/auth/middleware.ts`):
```typescript
export async function requireAuth(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  // Handle missing Clerk credentials gracefully
  if (!features.auth) {
    if (env.NODE_ENV === 'development') {
      // Mock user for development
      req.user = {
        id: 'dev-user-id',
        email: 'dev@example.com',
        role: 'admin',
        clerkId: 'dev-clerk-id',
        metadata: {},
      };
      return next();
    } else {
      return next(new AuthError('Authentication not configured'));
    }
  }

  try {
    // Extract token from Authorization header
    const token = extractToken(req);

    if (!token) {
      throw new AuthError('No authentication token provided');
    }

    // Verify token with Clerk
    const session = await clerkClient.verifyToken(token);

    if (!session || !session.sub) {
      throw new AuthError('Invalid authentication token');
    }

    // Get user from Clerk
    const clerkUser = await clerkClient.users.getUser(session.sub);

    // Load or create user in our database
    let user;

    if (env.DATABASE_TYPE === 'mongodb') {
      user = await User.findByClerkId(session.sub);

      if (!user) {
        // Auto-create user
        user = await User.create({
          clerkId: session.sub,
          email: clerkUser.emailAddresses[0]?.emailAddress,
          name: `${clerkUser.firstName} ${clerkUser.lastName}`.trim(),
          emailVerified: clerkUser.emailAddresses[0]?.verification?.status === 'verified',
        });
      }
    } else {
      // Supabase implementation
      user = await UserRepository.findByClerkId(session.sub);
      // ... similar logic
    }

    // Attach user to request
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      clerkId: session.sub,
      metadata: user.metadata,
    };

    next();
  } catch (error) {
    if (error instanceof AuthError) {
      next(error);
    } else {
      logger.error('Authentication error', { error });
      next(new AuthError('Authentication failed'));
    }
  }
}
```

**Optional Authentication:**
```typescript
export async function optionalAuth(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const token = extractToken(req);

    if (!token) {
      return next(); // Continue without authentication
    }

    await requireAuth(req, _res, next);
  } catch {
    next(); // Continue without authentication on error
  }
}
```

**Role-Based Authorization:**
```typescript
export function requireRole(...roles: string[]) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      throw new AuthError('Authentication required');
    }

    if (!roles.includes(req.user.role)) {
      throw new ForbiddenError(
        `Access denied. Required role(s): ${roles.join(', ')}`
      );
    }

    next();
  };
}
```

**Permission-Based Authorization:**
```typescript
export function requirePermission(...permissions: string[]) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      throw new AuthError('Authentication required');
    }

    // Admin bypasses all permission checks
    if (req.user.role === 'admin') {
      return next();
    }

    const hasPermission = permissions.some(permission => {
      return checkRolePermission(req.user!.role, permission);
    });

    if (!hasPermission) {
      throw new ForbiddenError(
        `Access denied. Required permission(s): ${permissions.join(', ')}`
      );
    }

    next();
  };
}
```

### 3.6 How to Add Custom Middleware

**Step 1: Create Middleware File**
Create `/Users/saffataziz/Downloads/saas-backend-boilerplate-master/src/core/middleware/myCustomMiddleware.ts`:

```typescript
import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger';

export function myCustomMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Your middleware logic here
  logger.info('Custom middleware executed', {
    path: req.path,
    method: req.method,
  });

  // Continue to next middleware
  next();
}

// With options
export function createCustomMiddleware(options: { feature: string }) {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Use options
    logger.info(`Feature ${options.feature} middleware executed`);
    next();
  };
}
```

**Step 2: Add to Server Configuration**
Add to `/Users/saffataziz/Downloads/saas-backend-boilerplate-master/src/core/server.ts`:

```typescript
import { myCustomMiddleware } from './middleware/myCustomMiddleware';

export function createServer(): Express {
  const app = express();

  // ... existing middleware ...

  // Add your middleware in the appropriate position
  app.use(myCustomMiddleware);

  // ... rest of middleware ...
}
```

**Step 3: Use in Specific Routes**
Add to route files:

```typescript
import { myCustomMiddleware } from '../../core/middleware/myCustomMiddleware';

router.get(
  '/special-endpoint',
  requireAuth,
  myCustomMiddleware, // Route-specific middleware
  controller.specialHandler
);
```

**Common Middleware Patterns:**

**Caching Middleware:**
```typescript
export function cacheMiddleware(ttl: number = 60) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const key = `cache:${req.path}:${JSON.stringify(req.query)}`;

    const cached = await redis.get(key);
    if (cached) {
      return res.json(JSON.parse(cached));
    }

    // Override res.json to cache response
    const originalJson = res.json.bind(res);
    res.json = function(data: any) {
      redis.setex(key, ttl, JSON.stringify(data));
      return originalJson(data);
    };

    next();
  };
}
```

**API Version Middleware:**
```typescript
export function apiVersion(version: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const requestedVersion = req.headers['api-version'] as string;

    if (requestedVersion && requestedVersion !== version) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'API_VERSION_MISMATCH',
          message: `API version ${version} required, got ${requestedVersion}`,
        },
      });
    }

    next();
  };
}
```

---

**End of Part 1**

---

# Understanding the SaaS Backend Boilerplate (Part 2 of 2)

This comprehensive guide continues with database patterns, optional modules, feature development, and common workflows.

---

## Table of Contents - Part 2

4. [Database Layer](#section-4-database-layer)
5. [Adding New Features](#section-5-adding-new-features)
6. [Optional Modules Deep Dive](#section-6-optional-modules-deep-dive)
7. [Common Workflows](#section-7-common-workflows)

---

## Section 4: Database Layer

### 4.1 MongoDB Setup and Mongoose Models

#### Connection Setup

**MongoDB Connection** (`/Users/saffataziz/Downloads/saas-backend-boilerplate-master/src/database/mongodb/connection.ts`):
```typescript
import mongoose from 'mongoose';

export async function connectMongoDB(): Promise<void> {
  await mongoose.connect(env.MONGO_URI!, {
    // Connection options
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  });

  logger.info('MongoDB connected successfully');
}

export async function disconnectMongoDB(): Promise<void> {
  await mongoose.disconnect();
  logger.info('MongoDB disconnected');
}
```

**Connection String Format:**
```
mongodb://localhost:27017/saas-dev           # Local
mongodb+srv://user:pass@cluster.mongodb.net/db  # Atlas
```

#### Model Patterns

**User Model** (`/Users/saffataziz/Downloads/saas-backend-boilerplate-master/src/database/mongodb/models/User.ts`):
```typescript
export interface IUser extends Document {
  clerkId: string;
  email: string;
  name?: string;
  role: UserRole;
  subscription: SubscriptionStatus;
  stripeCustomerId?: string;
  metadata?: Record<string, any>;
  lastLoginAt?: Date;
  emailVerified: boolean;
  profileImage?: string;
  deletedAt?: Date;           // Soft delete
  createdAt: Date;            // Auto-managed
  updatedAt: Date;            // Auto-managed

  // Virtual properties
  isDeleted: boolean;
  isActive: boolean;

  // Instance methods
  updateLastLogin(): Promise<void>;
  updateSubscription(subscription: SubscriptionStatus): Promise<void>;
  softDelete(): Promise<void>;
}

export interface IUserModel extends Model<IUser> {
  // Static methods
  findByClerkId(clerkId: string): Promise<IUser | null>;
  findByEmail(email: string): Promise<IUser | null>;
  findByStripeCustomerId(stripeCustomerId: string): Promise<IUser | null>;
  softDelete(userId: string): Promise<boolean>;
  restore(userId: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>(
  {
    clerkId: { type: String, required: true, unique: true, index: true },
    email: { type: String, required: true, unique: true, lowercase: true, index: true },
    name: { type: String, trim: true },
    role: { type: String, enum: Object.values(UserRole), default: UserRole.USER },
    subscription: { type: String, enum: Object.values(SubscriptionStatus), default: SubscriptionStatus.FREE },
    deletedAt: { type: Date, default: null, index: true },
  },
  {
    timestamps: true,  // Auto-adds createdAt and updatedAt
  }
);
```

#### Soft Delete Pattern

**Pre-Find Middleware** (automatically excludes soft-deleted):
```typescript
// Exclude soft deleted records by default
userSchema.pre(/^find/, function (this: any) {
  const options = this.getOptions() as any;
  if (!options?.includeDeleted) {
    this.where({ deletedAt: null });
  }
});

// Usage
const users = await User.find();  // Only non-deleted
const allUsers = await User.find().setOptions({ includeDeleted: true });  // Including deleted
```

**Soft Delete Methods:**
```typescript
// Static method (by ID)
await User.softDelete(userId);

// Instance method (on document)
const user = await User.findById(userId);
await user.softDelete();

// Restore
await User.restore(userId);
```

#### Timestamps and Audit Logging

**Automatic Timestamps:**
```typescript
const schema = new Schema({
  // fields...
}, {
  timestamps: true,  // Adds createdAt and updatedAt
});
```

**Audit Log Model** (`/Users/saffataziz/Downloads/saas-backend-boilerplate-master/src/database/mongodb/models/AuditLog.ts`):
```typescript
export interface IAuditLog extends Document {
  userId?: mongoose.Types.ObjectId;
  userEmail?: string;
  action: AuditAction | string;
  resource: string;
  resourceId?: string;
  metadata?: Record<string, any>;
  changes?: {
    before?: any;
    after?: any;
  };
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
  duration?: number;
  statusCode?: number;
  error?: {
    message: string;
    code?: string;
    stack?: string;
  };
  createdAt: Date;
}

// Static method to create audit log
AuditLog.log({
  userId: 'user-id',
  action: 'update',
  resource: 'example',
  resourceId: 'example-id',
  changes: {
    before: { name: 'Old Name' },
    after: { name: 'New Name' },
  },
  ipAddress: req.ip,
  userAgent: req.get('user-agent'),
  requestId: req.requestId,
});
```

**TTL Index** (auto-delete old logs):
```typescript
// Delete logs after 90 days (except critical)
auditLogSchema.index(
  { createdAt: 1 },
  {
    expireAfterSeconds: 90 * 24 * 60 * 60,
    partialFilterExpression: { action: { $ne: 'critical' } }
  }
);
```

### 4.2 Supabase Setup and Table Schemas

#### Supabase Client Setup

**Client Initialization** (`/Users/saffataziz/Downloads/saas-backend-boilerplate-master/src/database/supabase/client.ts`):
```typescript
import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabase: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (!supabase) {
    supabase = createClient(
      env.SUPABASE_URL!,
      env.SUPABASE_ANON_KEY!,
      {
        auth: {
          persistSession: false, // We're using Clerk for auth
        },
        db: {
          schema: 'public',
        },
      }
    );
  }
  return supabase;
}
```

**Environment Variables:**
```bash
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1...
DATABASE_TYPE=supabase
```

#### Table Schemas (SQL)

**Users Table:**
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clerk_id TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  role TEXT NOT NULL DEFAULT 'user',
  subscription TEXT NOT NULL DEFAULT 'free',
  stripe_customer_id TEXT,
  metadata JSONB DEFAULT '{}',
  last_login_at TIMESTAMP WITH TIME ZONE,
  email_verified BOOLEAN DEFAULT false,
  profile_image TEXT,
  deleted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_users_clerk_id ON users(clerk_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_deleted_at ON users(deleted_at);
CREATE INDEX idx_users_subscription ON users(subscription);

-- Updated at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

**Audit Logs Table:**
```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  user_email TEXT,
  action TEXT NOT NULL,
  resource TEXT NOT NULL,
  resource_id TEXT,
  metadata JSONB DEFAULT '{}',
  changes JSONB,
  ip_address TEXT,
  user_agent TEXT,
  request_id TEXT,
  duration INTEGER,
  status_code INTEGER,
  error JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource, resource_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
```

#### Repository Pattern for Supabase

**User Repository:**
```typescript
export const UserRepository = {
  async findById(id: string) {
    const { data, error } = await getSupabaseClient()
      .from('users')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw new Error(error.message);
    return data;
  },

  async findByClerkId(clerkId: string) {
    const { data, error } = await getSupabaseClient()
      .from('users')
      .select('*')
      .eq('clerk_id', clerkId)
      .single();

    if (error && error.code !== 'PGRST116') throw new Error(error.message);
    return data;
  },

  async create(userData: any) {
    const { data, error } = await getSupabaseClient()
      .from('users')
      .insert(userData)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  },

  async softDelete(id: string) {
    const { data, error } = await getSupabaseClient()
      .from('users')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  },
};
```

### 4.3 Common Queries and Operations

#### MongoDB Queries

**Basic CRUD:**
```typescript
// Create
const user = await User.create({
  clerkId: 'clerk_xxx',
  email: 'user@example.com',
  name: 'John Doe',
});

// Read
const user = await User.findById(userId);
const user = await User.findOne({ email: 'user@example.com' });
const users = await User.find({ role: 'admin' });

// Update
await User.updateOne({ _id: userId }, { $set: { name: 'New Name' } });
const user = await User.findById(userId);
user.name = 'New Name';
await user.save();

// Delete (soft)
await User.softDelete(userId);

// Delete (hard)
await User.deleteOne({ _id: userId });
```

**Advanced Queries:**
```typescript
// Pagination
const page = 1;
const limit = 20;
const skip = (page - 1) * limit;

const [users, total] = await Promise.all([
  User.find({ deletedAt: null })
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip),
  User.countDocuments({ deletedAt: null }),
]);

// Text search
const results = await Example.find({
  $text: { $search: searchTerm },
  isPublic: true,
}).sort({ score: { $meta: 'textScore' } });

// Aggregation
const stats = await User.aggregate([
  { $match: { deletedAt: null } },
  { $group: { _id: '$subscription', count: { $sum: 1 } } },
]);

// Population (joins)
const example = await Example.findById(id)
  .populate('userId', 'name email');
```

#### Supabase Queries

**Basic CRUD:**
```typescript
// Create
const { data: user, error } = await supabase
  .from('users')
  .insert({ clerk_id: 'clerk_xxx', email: 'user@example.com' })
  .select()
  .single();

// Read
const { data: user } = await supabase
  .from('users')
  .select('*')
  .eq('id', userId)
  .single();

const { data: users } = await supabase
  .from('users')
  .select('*')
  .eq('role', 'admin');

// Update
const { data } = await supabase
  .from('users')
  .update({ name: 'New Name' })
  .eq('id', userId)
  .select()
  .single();

// Delete (soft)
await supabase
  .from('users')
  .update({ deleted_at: new Date().toISOString() })
  .eq('id', userId);

// Delete (hard)
await supabase
  .from('users')
  .delete()
  .eq('id', userId);
```

**Advanced Queries:**
```typescript
// Pagination with count
const { data: users, count } = await supabase
  .from('users')
  .select('*', { count: 'exact' })
  .is('deleted_at', null)
  .order('created_at', { ascending: false })
  .range(offset, offset + limit - 1);

// Filtering
const { data } = await supabase
  .from('examples')
  .select('*')
  .eq('status', 'published')
  .eq('is_public', true)
  .in('tags', ['tech', 'business'])
  .gte('created_at', startDate)
  .lte('created_at', endDate);

// Full text search (requires postgres extension)
const { data } = await supabase
  .from('examples')
  .select('*')
  .textSearch('name', searchTerm);

// Joins (foreign key relationships)
const { data } = await supabase
  .from('examples')
  .select(`
    *,
    user:users!user_id (
      id,
      name,
      email
    )
  `)
  .eq('id', exampleId);
```

### 4.4 How to Switch Between Databases

The boilerplate provides a unified abstraction, but you need to implement dual-database support in your services.

#### Step 1: Set Environment Variable

```bash
# Use MongoDB
DATABASE_TYPE=mongodb
MONGO_URI=mongodb://localhost:27017/saas-dev

# OR use Supabase
DATABASE_TYPE=supabase
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1...
```

#### Step 2: Implement Database-Agnostic Service

**Example Service Pattern:**
```typescript
export class ExampleService {
  async create(userId: string, data: CreateExampleInput): Promise<any> {
    if (env.DATABASE_TYPE === 'mongodb') {
      // MongoDB implementation
      const example = await Example.create({
        ...data,
        userId,
      });
      return example;
    } else {
      // Supabase implementation
      const { data: example, error } = await getSupabaseClient()
        .from('examples')
        .insert({ ...data, user_id: userId })
        .select()
        .single();

      if (error) throw new Error(error.message);
      return example;
    }
  }

  async getById(id: string): Promise<any> {
    if (env.DATABASE_TYPE === 'mongodb') {
      const example = await Example.findById(id).populate('userId', 'name email');
      if (!example) throw new NotFoundError('Example not found');
      return example;
    } else {
      const { data: example, error } = await getSupabaseClient()
        .from('examples')
        .select('*, user:users!user_id(id, name, email)')
        .eq('id', id)
        .single();

      if (error) throw new NotFoundError('Example not found');
      return example;
    }
  }
}
```

#### Step 3: Migration Considerations

**MongoDB to Supabase:**
- Export data using `mongoexport`
- Transform field names (camelCase → snake_case)
- Create Supabase tables with SQL
- Import data using Supabase SQL editor

**Supabase to MongoDB:**
- Export data using SQL queries
- Transform field names (snake_case → camelCase)
- Import using MongoDB import tools

---

## Section 5: Adding New Features

### 5.1 Step-by-Step Guide to Create a New Feature from Scratch

Let's create a "Tasks" feature as an example.

#### Step 1: Create Feature Directory

```bash
mkdir -p src/features/tasks
```

#### Step 2: Create Model (`src/features/tasks/tasks.model.ts`)

```typescript
import mongoose, { Document, Schema, Model } from 'mongoose';

export interface ITask extends Document {
  title: string;
  description?: string;
  userId: mongoose.Types.ObjectId;
  status: 'todo' | 'in_progress' | 'done';
  priority: 'low' | 'medium' | 'high';
  dueDate?: Date;
  completedAt?: Date;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;

  // Instance methods
  complete(): Promise<void>;
  softDelete(): Promise<void>;
}

export interface ITaskModel extends Model<ITask> {
  findByUser(userId: string, status?: string): Promise<ITask[]>;
  softDelete(id: string): Promise<boolean>;
}

const taskSchema = new Schema<ITask, ITaskModel>(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      trim: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['todo', 'in_progress', 'done'],
      default: 'todo',
      index: true,
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium',
    },
    dueDate: {
      type: Date,
      index: true,
    },
    completedAt: Date,
    deletedAt: {
      type: Date,
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret: any) => {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Indexes
taskSchema.index({ userId: 1, status: 1 });
taskSchema.index({ userId: 1, dueDate: 1 });

// Pre-find middleware to exclude soft deleted
taskSchema.pre(/^find/, function (this: any) {
  const options = this.getOptions?.() || {};
  if (!options.includeDeleted) {
    this.where({ deletedAt: null });
  }
});

// Static methods
taskSchema.statics.findByUser = async function (
  userId: string,
  status?: string
): Promise<ITask[]> {
  const query: any = { userId };
  if (status) query.status = status;

  return this.find(query).sort({ createdAt: -1 });
};

taskSchema.statics.softDelete = async function (id: string): Promise<boolean> {
  const result = await this.updateOne(
    { _id: id, deletedAt: null },
    { deletedAt: new Date() }
  );
  return result.modifiedCount > 0;
};

// Instance methods
taskSchema.methods.complete = async function (): Promise<void> {
  this.status = 'done';
  this.completedAt = new Date();
  await this.save();
};

taskSchema.methods.softDelete = async function (): Promise<void> {
  this.deletedAt = new Date();
  await this.save();
};

export const Task = mongoose.model<ITask, ITaskModel>('Task', taskSchema);
```

#### Step 3: Create Validation Schemas (`src/features/tasks/tasks.schema.ts`)

```typescript
import { z } from 'zod';

export const createTaskSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  status: z.enum(['todo', 'in_progress', 'done']).default('todo'),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  dueDate: z.string().datetime().optional(),
});

export const updateTaskSchema = createTaskSchema.partial();

export const listTasksQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['todo', 'in_progress', 'done']).optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  sortBy: z.enum(['createdAt', 'dueDate', 'priority']).default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
});

export const idParamSchema = z.object({
  id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ID format'),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type ListTasksQuery = z.infer<typeof listTasksQuerySchema>;
```

#### Step 4: Create Service (`src/features/tasks/tasks.service.ts`)

```typescript
import { Task, ITask } from './tasks.model';
import { CreateTaskInput, UpdateTaskInput, ListTasksQuery } from './tasks.schema';
import { NotFoundError, ForbiddenError } from '../../core/types/errors';
import { logger } from '../../core/config/logger';
import { AuditLog } from '../../database/mongodb/models/AuditLog';

export class TaskService {
  async create(userId: string, data: CreateTaskInput): Promise<ITask> {
    const task = await Task.create({ ...data, userId });

    await AuditLog.log({
      userId,
      action: 'create',
      resource: 'task',
      resourceId: task._id.toString(),
      metadata: { title: data.title },
    });

    logger.info('Task created', { userId, taskId: task._id });
    return task;
  }

  async getById(id: string, userId: string): Promise<ITask> {
    const task = await Task.findById(id);

    if (!task) {
      throw new NotFoundError('Task not found');
    }

    if (task.userId.toString() !== userId) {
      throw new ForbiddenError('You can only access your own tasks');
    }

    return task;
  }

  async list(query: ListTasksQuery, userId: string): Promise<{
    data: ITask[];
    total: number;
    page: number;
    limit: number;
  }> {
    const { page, limit, status, priority, sortBy, order } = query;
    const skip = (page - 1) * limit;

    const filter: any = { userId };
    if (status) filter.status = status;
    if (priority) filter.priority = priority;

    const sort: any = {};
    sort[sortBy] = order === 'asc' ? 1 : -1;

    const [tasks, total] = await Promise.all([
      Task.find(filter).sort(sort).limit(limit).skip(skip),
      Task.countDocuments(filter),
    ]);

    return { data: tasks, total, page, limit };
  }

  async update(id: string, userId: string, data: UpdateTaskInput): Promise<ITask> {
    const task = await this.getById(id, userId);

    const changes: any = { before: {}, after: {} };

    Object.keys(data).forEach((key) => {
      if ((task as any)[key] !== (data as any)[key]) {
        changes.before[key] = (task as any)[key];
        changes.after[key] = (data as any)[key];
        (task as any)[key] = (data as any)[key];
      }
    });

    await task.save();

    await AuditLog.log({
      userId,
      action: 'update',
      resource: 'task',
      resourceId: id,
      changes,
    });

    logger.info('Task updated', { userId, taskId: id });
    return task;
  }

  async delete(id: string, userId: string): Promise<void> {
    const task = await this.getById(id, userId);
    await task.softDelete();

    await AuditLog.log({
      userId,
      action: 'delete',
      resource: 'task',
      resourceId: id,
    });

    logger.info('Task deleted', { userId, taskId: id });
  }

  async complete(id: string, userId: string): Promise<ITask> {
    const task = await this.getById(id, userId);
    await task.complete();

    await AuditLog.log({
      userId,
      action: 'complete',
      resource: 'task',
      resourceId: id,
    });

    return task;
  }
}

export const taskService = new TaskService();
```

#### Step 5: Create Controller (`src/features/tasks/tasks.controller.ts`)

```typescript
import { Request, Response } from 'express';
import { taskService } from './tasks.service';
import { success, paginated, deleted } from '../../core/utils/apiResponse';
import { asyncHandler } from '../../core/middleware/asyncHandler';

export class TaskController {
  create = asyncHandler(async (req: Request, res: Response) => {
    const task = await taskService.create(req.user!.id, req.body);
    res.status(201).json(success(task, { message: 'Task created successfully' }));
  });

  getById = asyncHandler(async (req: Request, res: Response) => {
    const task = await taskService.getById(req.params.id, req.user!.id);
    res.json(success(task));
  });

  list = asyncHandler(async (req: Request, res: Response) => {
    const result = await taskService.list(req.query as any, req.user!.id);
    res.json(paginated(result.data, result.total, result.page, result.limit));
  });

  update = asyncHandler(async (req: Request, res: Response) => {
    const task = await taskService.update(req.params.id, req.user!.id, req.body);
    res.json(success(task, { message: 'Task updated successfully' }));
  });

  delete = asyncHandler(async (req: Request, res: Response) => {
    await taskService.delete(req.params.id, req.user!.id);
    res.json(deleted('Task deleted successfully'));
  });

  complete = asyncHandler(async (req: Request, res: Response) => {
    const task = await taskService.complete(req.params.id, req.user!.id);
    res.json(success(task, { message: 'Task completed successfully' }));
  });
}

export const taskController = new TaskController();
```

#### Step 6: Create Routes (`src/features/tasks/tasks.routes.ts`)

```typescript
import { Router } from 'express';
import { taskController } from './tasks.controller';
import { validate } from '../../core/middleware/validate';
import { requireAuth } from '../../modules/auth/middleware';
import {
  createTaskSchema,
  updateTaskSchema,
  listTasksQuerySchema,
  idParamSchema,
} from './tasks.schema';

const router = Router();

// All routes require authentication
router.use(requireAuth);

// Create task
router.post(
  '/',
  validate(createTaskSchema, 'body'),
  taskController.create
);

// List tasks
router.get(
  '/',
  validate(listTasksQuerySchema, 'query'),
  taskController.list
);

// Get task by ID
router.get(
  '/:id',
  validate(idParamSchema, 'params'),
  taskController.getById
);

// Update task
router.put(
  '/:id',
  validate(idParamSchema, 'params'),
  validate(updateTaskSchema, 'body'),
  taskController.update
);

// Delete task
router.delete(
  '/:id',
  validate(idParamSchema, 'params'),
  taskController.delete
);

// Complete task
router.post(
  '/:id/complete',
  validate(idParamSchema, 'params'),
  taskController.complete
);

export default router;
```

#### Step 7: Register Routes in Main App (`src/index.ts`)

```typescript
// In mountRoutes function
async function mountRoutes(app: Express): Promise<void> {
  // ... existing routes ...

  // Tasks feature
  const taskRoutes = require('./features/tasks/tasks.routes').default;
  app.use('/api/tasks', taskRoutes);
}
```

### 5.2 File Naming Conventions

```
src/features/<feature-name>/
├── <feature-name>.model.ts       # Database model (Mongoose schema)
├── <feature-name>.schema.ts      # Validation schemas (Zod)
├── <feature-name>.service.ts     # Business logic
├── <feature-name>.controller.ts  # HTTP request handlers
└── <feature-name>.routes.ts      # Route definitions
```

**Naming Rules:**
- Use kebab-case for directories: `user-profile`, `payment-methods`
- Use camelCase for file prefixes matching directory: `userProfile.model.ts`
- Use PascalCase for classes: `UserProfileService`, `PaymentController`
- Use camelCase for exported instances: `userProfileService`, `paymentController`

### 5.3 Model → Schema → Service → Controller → Routes Pattern

This pattern ensures clean separation of concerns:

```
Request
  ↓
Route (defines endpoint + middleware)
  ↓
Validation (Zod schema validates request data)
  ↓
Controller (handles HTTP request/response)
  ↓
Service (business logic + database operations)
  ↓
Model (database schema + methods)
  ↓
Database
```

**Why This Pattern:**
- **Model**: Database structure and data methods
- **Schema**: Type-safe validation and TypeScript types
- **Service**: Reusable business logic (can be called from controllers, jobs, webhooks)
- **Controller**: HTTP-specific logic (request/response handling)
- **Routes**: API endpoint definitions and middleware composition

### 5.4 Testing New Features

Create test file: `src/features/tasks/tasks.test.ts`

```typescript
import request from 'supertest';
import { app } from '../../core/server';
import { Task } from './tasks.model';
import { connectDatabase, disconnectDatabase } from '../../test/helpers';

describe('Tasks API', () => {
  beforeAll(async () => {
    await connectDatabase();
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  beforeEach(async () => {
    await Task.deleteMany({});
  });

  describe('POST /api/tasks', () => {
    it('should create a new task', async () => {
      const response = await request(app)
        .post('/api/tasks')
        .set('Authorization', 'Bearer valid-token')
        .send({
          title: 'Test Task',
          description: 'Test description',
          priority: 'high',
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe('Test Task');
    });

    it('should return 400 for invalid data', async () => {
      const response = await request(app)
        .post('/api/tasks')
        .set('Authorization', 'Bearer valid-token')
        .send({
          title: '', // Invalid: too short
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/tasks', () => {
    it('should list user tasks', async () => {
      // Create test tasks
      await Task.create([
        { title: 'Task 1', userId: 'user-id' },
        { title: 'Task 2', userId: 'user-id' },
      ]);

      const response = await request(app)
        .get('/api/tasks')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body.data).toHaveLength(2);
    });
  });
});
```

**Run Tests:**
```bash
npm test                    # Run all tests
npm test tasks             # Run tests matching pattern
npm test -- --coverage     # Run with coverage
```

### 5.5 Documentation Requirements

Add API documentation comment to controller methods:

```typescript
/**
 * @api {post} /api/tasks Create Task
 * @apiName CreateTask
 * @apiGroup Tasks
 * @apiPermission authenticated
 *
 * @apiHeader {String} Authorization Bearer token
 *
 * @apiParam {String} title Task title (1-200 characters)
 * @apiParam {String} [description] Task description
 * @apiParam {String="low","medium","high"} [priority=medium] Task priority
 * @apiParam {String} [dueDate] Due date (ISO 8601 format)
 *
 * @apiSuccess {Boolean} success Response status
 * @apiSuccess {Object} data Task object
 * @apiSuccess {String} data.id Task ID
 * @apiSuccess {String} data.title Task title
 *
 * @apiError (400) ValidationError Invalid request data
 * @apiError (401) Unauthorized Missing or invalid token
 */
```

---

## Section 6: Optional Modules Deep Dive

### 6.1 Authentication Module (`src/modules/auth/`)

**What it does:**
- Clerk JWT token verification
- User session management
- Auto-create users from Clerk data
- Mock authentication for development

**Required Environment Variables:**
```bash
CLERK_SECRET_KEY=sk_test_xxxxx
CLERK_PUBLISHABLE_KEY=pk_test_xxxxx
```

**Integration Points:**
- Middleware: `requireAuth`, `optionalAuth`, `requireRole`
- Webhook: `/api/webhooks/clerk` for user sync
- User model: Auto-creates users on first login

**Usage Example:**
```typescript
import { requireAuth, requireRole } from '../../modules/auth/middleware';

// Protected route
router.get('/profile', requireAuth, profileController.get);

// Admin-only route
router.delete('/users/:id', requireAuth, requireRole('admin'), userController.delete);

// Optional auth (public but personalized if logged in)
router.get('/feed', optionalAuth, feedController.list);
```

### 6.2 Payments Module (`src/modules/payments/`)

**What it does:**
- Stripe checkout session creation
- Subscription management via customer portal
- Webhook handling for payment events
- User subscription updates

**Required Environment Variables:**
```bash
STRIPE_SECRET_KEY=sk_test_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
```

**Integration Points:**
- Routes: `/api/payments/checkout`, `/api/payments/portal`
- Webhook: `/api/webhooks/stripe`
- User model: Updates `subscription` and `stripeCustomerId`

**Usage Example:**
```typescript
// Frontend: Create checkout session
const response = await fetch('/api/payments/checkout', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    priceId: 'price_xxxxx', // Stripe price ID
  }),
});

const { url } = await response.json();
window.location.href = url; // Redirect to Stripe checkout

// Backend: Webhook handles subscription activation
// When payment succeeds, webhook updates user.subscription to 'pro'
```

**Webhook Events Handled:**
- `checkout.session.completed` - Activate subscription
- `customer.subscription.updated` - Update subscription status
- `customer.subscription.deleted` - Cancel subscription

### 6.3 Uploads Module (`src/modules/uploads/`)

**What it does:**
- Generate presigned S3 upload URLs
- Secure file uploads from client
- Return public file URLs

**Required Environment Variables:**
```bash
AWS_ACCESS_KEY_ID=AKIAXXXXX
AWS_SECRET_ACCESS_KEY=xxxxx
AWS_REGION=us-east-1
S3_BUCKET=my-app-uploads
```

**Integration Points:**
- Routes: `/api/uploads/presigned-url`
- S3 service: Generate signed URLs

**Usage Example:**
```typescript
// Step 1: Get presigned URL from backend
const response = await fetch('/api/uploads/presigned-url', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    fileName: 'profile.jpg',
    contentType: 'image/jpeg',
  }),
});

const { url, key } = await response.json();

// Step 2: Upload file directly to S3
await fetch(url, {
  method: 'PUT',
  headers: { 'Content-Type': 'image/jpeg' },
  body: file, // File object from input
});

// Step 3: Save file key to your resource
await fetch('/api/profile', {
  method: 'PUT',
  body: JSON.stringify({ profileImage: key }),
});
```

### 6.4 Realtime Module (`src/modules/realtime/`)

**What it does:**
- Socket.IO server for WebSocket connections
- Authenticated real-time communication
- User-specific rooms and broadcasts

**Required Environment Variables:**
```bash
REDIS_URL=redis://localhost:6379  # For Socket.IO adapter
FRONTEND_URL=http://localhost:3000
```

**Integration Points:**
- Server setup in `src/index.ts`
- Authentication via Clerk tokens
- Event emitters in services

**Usage Example:**
```typescript
// Backend: Emit event to user
import { getIo } from '../../modules/realtime/server';

// In service method
const io = getIo();
io.to(`user-${userId}`).emit('task:created', {
  id: task.id,
  title: task.title,
});

// Frontend: Listen for events
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000', {
  auth: { token: 'Bearer xxxxx' },
});

socket.on('connect', () => {
  console.log('Connected to server');
});

socket.on('task:created', (data) => {
  console.log('New task created:', data);
  // Update UI
});
```

### 6.5 Jobs Module (`src/modules/jobs/`)

**What it does:**
- Background job processing with BullMQ
- Scheduled tasks and cron jobs
- Retry logic and error handling

**Required Environment Variables:**
```bash
REDIS_URL=redis://localhost:6379
```

**Integration Points:**
- Queue definitions in `src/modules/jobs/queue.ts`
- Worker processes in `src/modules/jobs/worker.ts`
- Job definitions in `src/modules/jobs/jobs/`

**Usage Example:**
```typescript
// Define job (src/modules/jobs/jobs/sendEmail.job.ts)
import { Job } from 'bullmq';
import { sendEmail } from '../../email/service';

export async function sendEmailJob(job: Job) {
  const { to, subject, html, text } = job.data;

  await sendEmail({ to, subject, html, text });

  return { sent: true, to };
}

// Add job to queue
import { emailQueue } from '../../modules/jobs/queue';

await emailQueue.add('send-welcome-email', {
  to: user.email,
  subject: 'Welcome!',
  html: '<h1>Welcome to our app!</h1>',
  text: 'Welcome to our app!',
}, {
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 1000,
  },
});

// Scheduled job
await emailQueue.add(
  'daily-digest',
  { type: 'digest' },
  {
    repeat: {
      pattern: '0 9 * * *', // Every day at 9 AM
    },
  }
);
```

### 6.6 Email Module (`src/modules/email/`)

**What it does:**
- Send transactional emails via SendGrid
- Email templates
- Welcome emails, password resets, etc.

**Required Environment Variables:**
```bash
SENDGRID_API_KEY=SG.xxxxx
SENDGRID_FROM_EMAIL=noreply@yourdomain.com
```

**Integration Points:**
- Service: `src/modules/email/service.ts`
- Called from controllers, jobs, webhooks

**Usage Example:**
```typescript
import { sendEmail, sendWelcomeEmail } from '../../modules/email/service';

// Send welcome email
await sendWelcomeEmail({
  name: user.name,
  email: user.email,
});

// Send custom email
await sendEmail({
  to: user.email,
  subject: 'Password Reset',
  html: '<p>Click here to reset: <a href="...">Reset Password</a></p>',
  text: 'Click here to reset: ...',
});

// Queue email for background processing
import { emailQueue } from '../../modules/jobs/queue';

await emailQueue.add('send-email', {
  to: user.email,
  subject: 'Your Report',
  html: reportHtml,
  text: reportText,
});
```

---

## Section 7: Common Workflows

### 7.1 Adding a New API Endpoint

**Scenario:** Add `GET /api/tasks/:id/comments` to list task comments.

**Step 1: Add to Schema** (`tasks.schema.ts`):
```typescript
export const getCommentsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
```

**Step 2: Add to Service** (`tasks.service.ts`):
```typescript
async getComments(taskId: string, userId: string, query: any) {
  // Verify task access
  await this.getById(taskId, userId);

  const { page, limit } = query;
  const skip = (page - 1) * limit;

  const [comments, total] = await Promise.all([
    Comment.find({ taskId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip),
    Comment.countDocuments({ taskId }),
  ]);

  return { data: comments, total, page, limit };
}
```

**Step 3: Add to Controller** (`tasks.controller.ts`):
```typescript
getComments = asyncHandler(async (req: Request, res: Response) => {
  const result = await taskService.getComments(
    req.params.id,
    req.user!.id,
    req.query
  );
  res.json(paginated(result.data, result.total, result.page, result.limit));
});
```

**Step 4: Add Route** (`tasks.routes.ts`):
```typescript
router.get(
  '/:id/comments',
  validate(idParamSchema, 'params'),
  validate(getCommentsQuerySchema, 'query'),
  taskController.getComments
);
```

### 7.2 Adding Authentication to Existing Route

**Before:**
```typescript
router.get('/public-data', dataController.getPublic);
```

**After (require auth):**
```typescript
import { requireAuth } from '../../modules/auth/middleware';

router.get('/public-data', requireAuth, dataController.getPublic);
```

**After (optional auth):**
```typescript
import { optionalAuth } from '../../modules/auth/middleware';

router.get('/public-data', optionalAuth, dataController.getPublic);

// In controller
getPublic = asyncHandler(async (req: Request, res: Response) => {
  // req.user will be set if authenticated, undefined otherwise
  const isAuthenticated = !!req.user;
  const data = await dataService.get(isAuthenticated);
  res.json(success(data));
});
```

**After (role-based):**
```typescript
import { requireAuth, requireRole } from '../../modules/auth/middleware';

router.delete(
  '/admin-only',
  requireAuth,
  requireRole('admin'),
  adminController.delete
);
```

### 7.3 Adding File Uploads to Feature

**Step 1: Get Presigned URL:**
```typescript
// In controller
uploadAvatar = asyncHandler(async (req: Request, res: Response) => {
  const { fileName, contentType } = req.body;

  // Generate unique key
  const key = `avatars/${req.user!.id}/${Date.now()}-${fileName}`;

  const { url } = await getPresignedUploadUrl(key, contentType);

  res.json(success({ uploadUrl: url, key }));
});
```

**Step 2: Add Route:**
```typescript
router.post('/avatar/upload-url', requireAuth, userController.uploadAvatar);
```

**Step 3: Save File Reference:**
```typescript
// After client uploads to S3, save the key
updateAvatar = asyncHandler(async (req: Request, res: Response) => {
  const { key } = req.body;

  const user = await User.findById(req.user!.id);
  user.profileImage = getPublicUrl(key);
  await user.save();

  res.json(success(user));
});
```

### 7.4 Sending Emails

**Option 1: Direct Send (for immediate emails):**
```typescript
import { sendEmail } from '../../modules/email/service';

// In service method
await sendEmail({
  to: user.email,
  subject: 'Task Completed',
  html: `<p>Your task "${task.title}" has been completed!</p>`,
  text: `Your task "${task.title}" has been completed!`,
});
```

**Option 2: Queue (for non-critical emails):**
```typescript
import { emailQueue } from '../../modules/jobs/queue';

await emailQueue.add('send-notification', {
  to: user.email,
  subject: 'Weekly Digest',
  html: digestHtml,
  text: digestText,
}, {
  attempts: 3,
  backoff: { type: 'exponential', delay: 1000 },
});
```

**Option 3: Scheduled:**
```typescript
await emailQueue.add(
  'daily-summary',
  { userId: user.id },
  {
    repeat: {
      pattern: '0 18 * * *', // 6 PM daily
      tz: 'America/New_York',
    },
  }
);
```

### 7.5 Running Background Jobs

**Define Job** (`src/modules/jobs/jobs/processData.job.ts`):
```typescript
import { Job } from 'bullmq';
import { logger } from '../../../core/config/logger';

export async function processDataJob(job: Job) {
  const { userId, data } = job.data;

  logger.info('Processing data job', { jobId: job.id, userId });

  try {
    // Long-running processing
    const result = await performComplexCalculation(data);

    // Update database with result
    await saveResult(userId, result);

    // Send notification
    await notifyUser(userId, 'Processing complete!');

    return { success: true, result };
  } catch (error) {
    logger.error('Job failed', { error, jobId: job.id });
    throw error; // Will trigger retry
  }
}
```

**Register Worker** (`src/modules/jobs/worker.ts`):
```typescript
import { Worker } from 'bullmq';
import { processDataJob } from './jobs/processData.job';

const dataWorker = new Worker('data-processing', async (job) => {
  return await processDataJob(job);
}, {
  connection: redisConnection,
  concurrency: 5,
});
```

**Enqueue Job:**
```typescript
import { Queue } from 'bullmq';
import { getRedisClient } from '../../core/config/redis';

const dataQueue = new Queue('data-processing', {
  connection: getRedisClient(),
});

// Add job
await dataQueue.add('process-user-data', {
  userId: user.id,
  data: largeDataset,
}, {
  attempts: 3,
  backoff: { type: 'exponential', delay: 2000 },
  removeOnComplete: 100, // Keep last 100 completed
  removeOnFail: 50,      // Keep last 50 failed
});
```

### 7.6 Handling Webhooks

**Stripe Webhook Example** (`src/modules/payments/webhook.ts`):
```typescript
import { Router, Request, Response } from 'express';
import Stripe from 'stripe';
import { env } from '../../core/config/env';
import { User } from '../../database/mongodb/models/User';
import { logger } from '../../core/config/logger';

const router = Router();
const stripe = new Stripe(env.STRIPE_SECRET_KEY!);

router.post('/stripe', async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'] as string;

  let event: Stripe.Event;

  try {
    // Verify webhook signature
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    logger.error('Webhook signature verification failed', { err });
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle event
  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;

        // Get user ID from metadata
        const userId = session.metadata?.userId;
        if (!userId) break;

        // Update user subscription
        const user = await User.findById(userId);
        if (user) {
          await user.updateSubscription('pro', session.customer as string);
          logger.info('Subscription activated', { userId });
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;

        // Find user by Stripe customer ID
        const user = await User.findByStripeCustomerId(subscription.customer as string);
        if (user) {
          await user.updateSubscription('free');
          logger.info('Subscription cancelled', { userId: user.id });
        }
        break;
      }

      default:
        logger.info('Unhandled webhook event', { type: event.type });
    }

    res.json({ received: true });
  } catch (error) {
    logger.error('Webhook processing error', { error, eventType: event.type });
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

export default router;
```

**Register Webhook Route** (`src/index.ts`):
```typescript
// IMPORTANT: Raw body parser needed for webhook signature verification
app.use('/api/webhooks/stripe', express.raw({ type: 'application/json' }), webhookRoutes);
```

**Test Webhook Locally:**
```bash
# Install Stripe CLI
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# Trigger test event
stripe trigger checkout.session.completed
```

---

**End of Part 2**

---

*Generated: 2025-11-02*
*Version: 1.0.0*
