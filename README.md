# SaaS Backend Boilerplate

Production-ready, modular backend boilerplate for building SaaS MVPs quickly. Built with TypeScript, Express.js, MongoDB, and optional Clerk authentication.

## ✨ Features

### Core Features (Always Included)
- **Authentication**: Optional Clerk integration with JWT verification (mock auth in development)
- **Validation**: Request validation with Zod
- **Database**: MongoDB with Mongoose ODM
- **Rate Limiting**: Configurable rate limiters with optional Redis support
- **Logging**: Structured logging with Winston
- **Error Tracking**: Optional Sentry integration
- **Testing**: Jest + Supertest configuration included
- **Type Safety**: Full TypeScript with strict mode and zero errors
- **Graceful Degradation**: All optional modules fail gracefully when not configured

### Optional Modules
- **Payments**: Stripe integration with webhooks
- **File Uploads**: AWS S3 with pre-signed URLs
- **Real-time**: Socket.io with optional Clerk auth
- **Background Jobs**: BullMQ + Redis
- **Email**: SendGrid with templates
- **RBAC**: Role-based access control

## Quick Start

Get up and running in under 5 minutes with zero configuration required!

### Prerequisites
- Node.js 20+
- MongoDB running locally (or use Docker Compose to start everything)
- Docker & Docker Compose (optional, but recommended)

### 1. Clone & Install

```bash
# Clone the repository
git clone https://github.com/yourusername/saas-backend-boilerplate.git
cd saas-backend-boilerplate

# Install dependencies
npm install
```

### 2. Configure Environment

```bash
# Copy environment file (works out of the box for local development!)
cp .env.example .env
```

**That's it!** The default `.env` file is pre-configured to work with:
- MongoDB running locally at `mongodb://localhost:27017/saas-dev`
- Mock authentication (no Clerk keys required for development)
- All optional features disabled

**Note:** Clerk authentication is optional in development. The boilerplate uses mock auth by default, so you can start building immediately without any external services!

### 3. Start Development

#### Option A: With Docker Compose (Recommended - Zero Setup!)
Starts MongoDB, Redis, and the app with a single command:

```bash
# Start all services
docker-compose up

# Or run in background
docker-compose up -d

# View logs
docker-compose logs -f app

# Stop everything
docker-compose down
```

Access points:
- API: http://localhost:3000
- MongoDB Express (GUI): http://localhost:8081 (username: admin, password: admin123)
- Redis Commander (GUI): http://localhost:8082

#### Option B: Local Development (Requires MongoDB)
If you have MongoDB running locally:

```bash
# Start the development server
npm run dev
```

The server will start at http://localhost:3000 with hot reloading enabled.

### 4. Verify It's Working

```bash
# Health check
curl http://localhost:3000/health

# Expected response: {"status":"ok","timestamp":"...","uptime":...}

# API info
curl http://localhost:3000/api

# Create an example (no auth required in development!)
curl -X POST http://localhost:3000/api/examples \
  -H "Content-Type: application/json" \
  -d '{"name": "My First Example", "description": "Testing the API", "isActive": true}'

# List examples
curl http://localhost:3000/api/examples

# Get example by ID
curl http://localhost:3000/api/examples/{id}
```

### 5. Next Steps

1. **Explore the Example Feature**: Check out `/src/features/example/` to see a complete CRUD implementation
2. **Add Your First Feature**: Copy the example feature and modify it for your needs
3. **Enable Optional Modules**: Add API keys to `.env` to enable Stripe, AWS S3, SendGrid, etc.
4. **Enable Production Auth**: Sign up for Clerk and add your keys to `.env` when ready
5. **Run Tests**: `npm test` to see the example tests in action
6. **Check Documentation**: See `/docs` for detailed guides on each module

## What's Different About This Boilerplate?

This isn't just another boilerplate - it's been audited and improved for real-world production use:

### Development-First Approach
- **No External Dependencies Required**: Start coding immediately without signing up for Clerk, Stripe, AWS, etc.
- **Mock Authentication**: Built-in mock auth for development - add Clerk keys only when you're ready for production
- **Graceful Degradation**: All optional modules fail gracefully when not configured - no crashes, just helpful warnings

### Production-Ready Code Quality
- **Zero TypeScript Errors**: Every file type-checks perfectly with strict mode enabled
- **Conditional Module Loading**: Optional modules only load when configured, reducing startup time and memory
- **Comprehensive Error Handling**: Proper error types, async error handling, and graceful fallbacks throughout
- **Type Safety**: Full TypeScript coverage with proper typing for all modules and features

### Real-World Patterns
- **Modular Architecture**: Clean separation between core functionality, optional modules, and business features
- **Feature-Based Structure**: Each feature is self-contained with its own model, schema, service, controller, and routes
- **MongoDB Database**: Mongoose ODM with connection pooling and retry logic
- **Testing Ready**: Jest and Supertest configured with examples you can actually run

## Project Structure

```
src/
├── core/                       # Core functionality (always included)
│   ├── config/                # Environment, database, logger, Redis setup
│   │   ├── env.ts            # Environment variable validation with Zod
│   │   ├── database.ts       # MongoDB database initialization
│   │   ├── logger.ts         # Winston logger configuration
│   │   └── redis.ts          # Optional Redis connection
│   ├── middleware/           # Express middleware
│   │   ├── errorHandler.ts  # Global error handling
│   │   ├── rateLimiter.ts   # Rate limiting (works with/without Redis)
│   │   ├── requestLogger.ts # HTTP request logging
│   │   ├── validate.ts      # Zod schema validation
│   │   └── asyncHandler.ts  # Async route wrapper
│   ├── types/               # TypeScript type definitions
│   │   ├── express.d.ts     # Express type extensions
│   │   ├── errors.ts        # Custom error classes
│   │   └── index.ts         # Shared types
│   ├── utils/               # Utility functions
│   │   ├── apiResponse.ts   # Standardized API responses
│   │   ├── pagination.ts    # Pagination helpers
│   │   └── asyncHandler.ts  # Async error handling
│   └── server.ts            # Express app configuration
│
├── database/                  # Database setup
│   └── mongodb/              # MongoDB implementation
│       ├── connection.ts    # MongoDB connection with retry logic
│       └── models/          # Mongoose models
│           ├── User.ts      # User model with Clerk integration
│           └── AuditLog.ts  # Audit logging model
│
├── modules/                   # Optional modules (enable as needed)
│   ├── auth/                 # Authentication
│   │   ├── clerk.ts         # Clerk SDK integration
│   │   ├── middleware.ts    # Auth middleware with mock fallback
│   │   └── webhook.ts       # Clerk webhook handler
│   ├── payments/            # Stripe integration
│   │   ├── stripe.ts        # Stripe client
│   │   ├── service.ts       # Payment operations
│   │   ├── webhook.ts       # Stripe webhook handler
│   │   └── routes.ts        # Payment endpoints
│   ├── uploads/             # File uploads
│   │   ├── s3.ts           # AWS S3 client and operations
│   │   └── routes.ts       # Upload endpoints
│   ├── realtime/            # Real-time features
│   │   ├── server.ts       # Socket.io setup
│   │   └── handlers.ts     # Socket event handlers
│   ├── jobs/                # Background jobs
│   │   ├── queue.ts        # BullMQ queue setup
│   │   ├── workers.ts      # Job processors
│   │   └── jobs/           # Job definitions
│   ├── email/               # Email service
│   │   ├── sendgrid.ts     # SendGrid client
│   │   ├── templates.ts    # Email templates
│   │   └── service.ts      # Email operations
│   └── rbac/                # Role-based access control
│       ├── permissions.ts   # Permission definitions
│       └── middleware.ts    # RBAC middleware
│
├── features/                  # Business logic (your application features)
│   └── example/              # Complete CRUD example
│       ├── example.model.ts     # Mongoose/Supabase model
│       ├── example.schema.ts    # Zod validation schemas
│       ├── example.service.ts   # Business logic
│       ├── example.controller.ts # Request handlers
│       └── example.routes.ts    # Route definitions
│
└── index.ts                   # Application entry point
```

### Key Principles

1. **Core**: Essential functionality that's always active (config, middleware, utilities)
2. **Database**: Flexible data layer supporting multiple database providers
3. **Modules**: Optional integrations that load conditionally based on configuration
4. **Features**: Your business logic organized by domain (copy `example/` to create new features)

## Available Scripts

```bash
npm run dev              # Start development server with hot reload
npm run build            # Build TypeScript to JavaScript
npm start                # Start production server
npm test                 # Run tests with Jest
npm run test:watch       # Run tests in watch mode
npm run test:coverage    # Run tests with coverage report
npm run lint             # Run ESLint
npm run lint:fix         # Run ESLint and auto-fix issues
npm run format           # Format code with Prettier
npm run health-check     # Check if the API is running
npm run seed             # Seed database with sample data
npm run migrate          # Run database migrations
npm run docker:up        # Start Docker Compose services
npm run docker:down      # Stop Docker Compose services
npm run docker:build     # Build Docker images
```

## Adding a New Feature

The example feature provides a complete template for building new features. Here's how to create your own:

### 1. Copy the Example Feature

```bash
cp -r src/features/example src/features/your-feature
```

### 2. Update Each File

The example feature includes 5 files that work together:

- **`your-feature.model.ts`**: Database model (Mongoose schema)
- **`your-feature.schema.ts`**: Zod validation schemas for requests
- **`your-feature.service.ts`**: Business logic and database operations
- **`your-feature.controller.ts`**: HTTP request handlers
- **`your-feature.routes.ts`**: Route definitions with middleware

### 3. Register Routes

Add your routes to `src/index.ts`:

```typescript
import yourFeatureRoutes from './features/your-feature/your-feature.routes';

// In the routes section
app.use('/api/your-feature', yourFeatureRoutes);
```

### 4. Add Tests (Optional)

```bash
cp tests/integration/example.test.ts tests/integration/your-feature.test.ts
```

### Example Feature Structure

The example feature demonstrates:
- Full CRUD operations (Create, Read, Update, Delete)
- Pagination and filtering
- Input validation with Zod
- Error handling
- TypeScript types
- MongoDB with Mongoose ODM
- Optional authentication (mock in dev, Clerk in production)

## Enabling Optional Modules

All optional modules are disabled by default and only load when configured. Just add the required environment variables to enable them!

### Authentication (Clerk) - Production Only

Development uses mock authentication by default. Enable Clerk for production:

1. Sign up at https://clerk.com and create an application
2. Add to `.env`:
```env
CLERK_SECRET_KEY=sk_live_...
CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_WEBHOOK_SECRET=whsec_...
```

3. The auth middleware automatically switches from mock to real Clerk authentication

### Payments (Stripe)

1. Get API keys from https://dashboard.stripe.com/test/apikeys
2. Add to `.env`:
```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

3. Use in your code:
```typescript
import { createCheckoutSession } from './modules/payments/service';

const session = await createCheckoutSession({
  priceId: 'price_xxx',
  customerId: 'cus_xxx',
  successUrl: 'https://yourapp.com/success',
  cancelUrl: 'https://yourapp.com/cancel'
});
```

### File Uploads (AWS S3)

1. Create S3 bucket and IAM credentials in AWS Console
2. Add to `.env`:
```env
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1
S3_BUCKET=your-bucket-name
```

3. Use pre-signed URLs for secure uploads:
```typescript
import { getPresignedUploadUrl } from './modules/uploads/s3';

const { uploadUrl, downloadUrl } = await getPresignedUploadUrl({
  key: 'user-files/document.pdf',
  contentType: 'application/pdf'
});
```

### Background Jobs (BullMQ)

Requires Redis. Enable with Docker Compose or connect to external Redis:

1. Add to `.env`:
```env
REDIS_URL=redis://localhost:6379
```

2. Define and queue jobs:
```typescript
import { emailQueue } from './modules/jobs/queue';

await emailQueue.add('welcome', {
  userId: 'user_123',
  email: 'user@example.com'
});
```

### Email (SendGrid)

1. Get API key from https://app.sendgrid.com/settings/api_keys
2. Add to `.env`:
```env
SENDGRID_API_KEY=SG.xxx
SENDGRID_FROM_EMAIL=noreply@yourapp.com
```

3. Send emails:
```typescript
import { sendEmail } from './modules/email/service';

await sendEmail({
  to: 'user@example.com',
  subject: 'Welcome!',
  html: '<h1>Welcome to our app!</h1>'
});
```

### Real-time (Socket.io)

Automatically enabled. Optionally requires Redis for multi-instance deployments:

```typescript
import { setupSocketIO } from './modules/realtime/server';
import { createServer } from 'http';

const httpServer = createServer(app);
const io = setupSocketIO(httpServer);

// Use in your routes
io.emit('notification', { message: 'Hello!' });
```

### Error Tracking (Sentry)

1. Create project at https://sentry.io
2. Add to `.env`:
```env
SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
```

3. Errors are automatically tracked in production

## Testing

The boilerplate includes Jest and Supertest configuration for testing your API.

```bash
# Run all tests
npm test

# Run with coverage report
npm run test:coverage

# Run specific test file
npm test -- example.test.ts

# Run in watch mode (re-runs on file changes)
npm run test:watch
```

### Test Structure

```
tests/
├── unit/              # Unit tests for utilities and services
├── integration/       # API endpoint tests
└── setup/             # Test configuration and helpers
    ├── setup.ts       # Global test setup
    └── teardown.ts    # Global test teardown
```

### Writing Tests

The example feature includes test examples. Use them as a template:

```typescript
import request from 'supertest';
import app from '../../src/index';

describe('Your Feature', () => {
  it('should create an item', async () => {
    const response = await request(app)
      .post('/api/your-feature')
      .send({ name: 'Test' });

    expect(response.status).toBe(201);
    expect(response.body.data).toHaveProperty('id');
  });
});
```

## Deployment

### Environment Variables Checklist

Before deploying to production, ensure you have:

**Required:**
- `NODE_ENV=production`
- `DATABASE_TYPE=mongodb`
- `MONGO_URI` (MongoDB connection string)
- `CLERK_SECRET_KEY` (for production authentication)
- `FRONTEND_URL` (your frontend domain)

**Recommended:**
- `REDIS_URL` (for rate limiting and jobs)
- `SENTRY_DSN` (for error tracking)
- `LOG_LEVEL=info` (or `warn` for production)

**Optional** (based on features you're using):
- Stripe keys for payments
- AWS credentials for file uploads
- SendGrid keys for email
- And any other module-specific variables

### Platform Deployment

#### Railway (Recommended)
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

# Create new project
railway init

# Add environment variables in Railway dashboard

# Deploy
railway up
```

#### Render
1. Connect your GitHub repository
2. Select "Web Service"
3. Set environment variables in dashboard
4. Deploy automatically on push to main

#### Heroku
```bash
# Create Heroku app
heroku create your-app-name

# Add MongoDB addon or use Atlas
heroku addons:create mongodb:sandbox

# Set environment variables
heroku config:set NODE_ENV=production
heroku config:set CLERK_SECRET_KEY=sk_live_...
heroku config:set MONGO_URI=mongodb+srv://...

# Deploy
git push heroku main
```

#### Docker
```bash
# Build production image
docker build -t saas-backend .

# Run container
docker run -p 3000:3000 --env-file .env.production saas-backend

# Or use docker-compose
docker-compose -f docker-compose.prod.yml up -d
```

#### DigitalOcean App Platform
1. Connect your GitHub repository
2. Select Node.js environment
3. Set build command: `npm run build`
4. Set run command: `npm start`
5. Add environment variables
6. Deploy

## Security

This boilerplate includes multiple layers of security:

- **Helmet.js**: Security headers (XSS protection, content security policy, etc.)
- **CORS**: Configurable cross-origin resource sharing
- **Rate Limiting**: Prevents brute force and DoS attacks (Redis-backed in production)
- **Input Validation**: All requests validated with Zod schemas
- **Authentication**: JWT verification with Clerk (or mock auth in dev)
- **NoSQL Injection Prevention**: Mongoose sanitization and query validation
- **Environment Variable Validation**: Type-checked with Zod on startup
- **Error Handling**: No sensitive data leaked in error responses
- **Audit Logging**: Track important actions with timestamps and user IDs

### Security Best Practices

1. **Never commit secrets**: Use `.env` for sensitive data (already in `.gitignore`)
2. **Use environment variables**: All API keys should be in `.env`, not hardcoded
3. **Enable Clerk in production**: Don't use mock auth for production deployments
4. **Use HTTPS**: Always deploy behind HTTPS (free with most platforms)
5. **Update dependencies**: Run `npm audit` regularly and update packages
6. **Review permissions**: Check RBAC middleware before enabling admin routes

## Monitoring and Observability

### Built-in Endpoints

```bash
# Health check - returns service status
GET /health
# Response: {"status":"ok","timestamp":"...","uptime":123.45}

# API information
GET /api
# Response: {"name":"SaaS Backend API","version":"1.0.0"}
```

### Logging

The boilerplate uses Winston for structured logging:

- **Development**: Pretty-printed colored logs to console
- **Production**: JSON-formatted logs (easy to parse with log aggregators)
- **Log Levels**: error, warn, info, http, debug (configurable via `LOG_LEVEL` env var)

```typescript
import logger from './core/config/logger';

logger.info('User created', { userId, email });
logger.error('Payment failed', { error, orderId });
```

### Error Tracking

Enable Sentry for automatic error tracking in production:

1. Set `SENTRY_DSN` in `.env`
2. Errors are automatically captured and sent to Sentry
3. Includes request context, user info, and stack traces

### Application Performance Monitoring (APM)

Ready to integrate with:
- **DataDog**: Add `dd-trace` package and initialize
- **New Relic**: Add `newrelic` package and configure
- **Elastic APM**: Add elastic APM agent

The structured logging and error handling makes integration straightforward.

## Contributing

Contributions are welcome! Here's how to get started:

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes and ensure:
   - TypeScript compiles without errors (`npm run build`)
   - Tests pass (`npm test`)
   - Code follows style guide (`npm run lint`)
4. Commit your changes (`git commit -m 'Add amazing feature'`)
5. Push to your branch (`git push origin feature/amazing-feature`)
6. Open a Pull Request with a clear description

### Development Guidelines

- Follow the existing code structure and patterns
- Add tests for new features
- Update documentation as needed
- Keep PRs focused on a single feature or fix
- Use clear, descriptive commit messages

## License

MIT License - see [LICENSE](LICENSE) file for details.

This means you can freely use, modify, and distribute this boilerplate for personal or commercial projects.

## Support

- **Documentation**: Check the `/docs` folder for detailed guides
- **Issues**: Report bugs or request features via [GitHub Issues](https://github.com/yourusername/saas-backend-boilerplate/issues)
- **Discussions**: Ask questions or share ideas in [GitHub Discussions](https://github.com/yourusername/saas-backend-boilerplate/discussions)

## Roadmap

Planned features and improvements:

- [ ] GraphQL API option alongside REST
- [ ] Admin dashboard endpoints
- [ ] API versioning support (v1, v2)
- [ ] Multi-tenancy patterns
- [ ] Kubernetes deployment templates
- [ ] API rate limiting by subscription plan
- [ ] Webhook management system
- [ ] Database migration tools
- [ ] CLI for scaffolding features
- [ ] More payment provider options (Paddle, Lemon Squeezy)

## Changelog

### v1.0.0 (Current)
- Initial release with production-ready features
- Optional Clerk authentication with mock fallback
- Conditional module loading
- Zero TypeScript errors
- Comprehensive documentation
- Docker Compose development environment
- Full CRUD example feature

---

Built for developers who want to ship SaaS products fast without compromising on code quality.
