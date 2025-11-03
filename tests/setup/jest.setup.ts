/**
 * Jest setup file
 * Runs before all tests
 */

// Set test environment variables
process.env['NODE_ENV'] = 'test';
process.env['PORT'] = '3001';
process.env['DATABASE_TYPE'] = 'mongodb';
process.env['LOG_LEVEL'] = 'error'; // Reduce logging noise in tests
process.env['FRONTEND_URL'] = 'http://localhost:3000';

// Mock Clerk if not configured
if (!process.env['CLERK_SECRET_KEY']) {
  process.env['CLERK_SECRET_KEY'] = '';
  process.env['CLERK_PUBLISHABLE_KEY'] = '';
}

// Increase timeout for integration tests
jest.setTimeout(30000);

// Global test utilities
global.console = {
  ...console,
  // Suppress console.log in tests (keep errors and warnings)
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  // Keep error and warn for debugging
  error: console.error,
  warn: console.warn,
};
