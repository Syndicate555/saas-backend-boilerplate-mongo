# Testing Documentation

This directory contains all tests for the SaaS Backend Boilerplate project.

## Table of Contents

- [Overview](#overview)
- [Test Structure](#test-structure)
- [Running Tests](#running-tests)
- [Writing Tests](#writing-tests)
- [Coverage Reports](#coverage-reports)
- [Best Practices](#best-practices)

## Overview

The testing suite includes:
- **Unit Tests**: Test individual functions and business logic in isolation
- **Integration Tests**: Test API endpoints with full request/response cycle
- **Test Helpers**: Reusable utilities for creating mock data and test setup

## Test Structure

```
tests/
├── unit/                    # Unit tests
│   └── example.service.test.ts
├── integration/             # Integration tests
│   └── example.api.test.ts
├── helpers/                 # Test utilities
│   ├── api.helper.ts       # API test helpers
│   ├── app.helper.ts       # Test app setup
│   ├── db.helper.ts        # Database test helpers
│   └── mock.helper.ts      # Mock data generators
├── setup/                   # Test configuration
│   └── jest.setup.ts       # Jest setup file
└── README.md               # This file
```

## Running Tests

### Run all tests
```bash
npm test
```

### Run tests in watch mode
```bash
npm run test:watch
```

### Run tests with coverage
```bash
npm run test:coverage
```

### Run only unit tests
```bash
npm run test:unit
```

### Run only integration tests
```bash
npm run test:integration
```

### Run specific test file
```bash
npm test -- tests/unit/example.service.test.ts
```

### Run tests matching a pattern
```bash
npm test -- --testNamePattern="should create"
```

## Coverage Reports

After running `npm run test:coverage`, coverage reports are generated in multiple formats:

### Coverage Metrics

The test suite tracks the following coverage metrics:

1. **Statement Coverage**: Percentage of executable statements that were executed
2. **Branch Coverage**: Percentage of conditional branches (if/else) that were executed
3. **Function Coverage**: Percentage of functions that were called
4. **Line Coverage**: Percentage of lines of code that were executed

### Coverage Thresholds

The project enforces minimum coverage thresholds (configured in `jest.config.js`):

- Statements: 80%
- Branches: 80%
- Functions: 80%
- Lines: 80%

### Viewing Coverage Reports

#### Terminal Output
The terminal displays a summary table showing coverage for each file:

```
-----------------------|---------|----------|---------|---------|-------------------
File                   | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s
-----------------------|---------|----------|---------|---------|-------------------
All files              |   93.45 |    79.06 |    90.9 |   95.14 |
 example.service.ts    |   93.45 |    79.06 |    90.9 |   95.14 | 144-149,284,318
-----------------------|---------|----------|---------|---------|-------------------
```

#### HTML Report
Open `coverage/index.html` in a browser for an interactive, detailed coverage report that shows:
- Which lines were executed
- Which branches were taken
- Which functions were called
- Color-coded highlighting of covered/uncovered code

#### JSON Report
The `coverage/coverage-final.json` file contains raw coverage data that can be used by CI/CD tools.

#### LCOV Report
The `coverage/lcov.info` file can be used by coverage visualization tools like Coveralls or Codecov.

## Writing Tests

### Unit Tests

Unit tests focus on testing business logic in isolation:

```typescript
import { exampleService } from '../../src/features/example/example.service';
import { setupTestDB } from '../helpers/db.helper';
import { createMockExample, MOCK_USER_ID } from '../helpers/mock.helper';

setupTestDB(); // Setup test database

describe('ExampleService', () => {
  describe('create', () => {
    it('should create a new example', async () => {
      const data = {
        name: 'Test Example',
        description: 'Test description',
        status: 'draft' as const,
        isPublic: false,
      };

      const example = await exampleService.create(MOCK_USER_ID, data);

      expect(example).toBeDefined();
      expect(example.name).toBe(data.name);
      expect(example.userId).toBe(MOCK_USER_ID);
    });
  });
});
```

### Integration Tests

Integration tests test the full HTTP request/response cycle:

```typescript
import request from 'supertest';
import { createTestApp } from '../helpers/app.helper';
import { authPost } from '../helpers/api.helper';
import { setupTestDB } from '../helpers/db.helper';

setupTestDB();

describe('Example API', () => {
  let app: Express;

  beforeAll(async () => {
    app = await createTestApp();
  });

  it('should create an example via API', async () => {
    const data = {
      name: 'API Test',
      status: 'draft',
      isPublic: false,
    };

    const response = await authPost(app, '/api/examples', data);

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.name).toBe(data.name);
  });
});
```

### Test Helpers

#### Database Helpers

```typescript
import { setupTestDB, clearTestDB } from '../helpers/db.helper';

// Setup MongoDB in-memory for all tests
setupTestDB();

// Or manually control setup/teardown
beforeAll(async () => {
  await connectTestDB();
});

afterEach(async () => {
  await clearTestDB();
});

afterAll(async () => {
  await disconnectTestDB();
});
```

#### Mock Data Helpers

```typescript
import {
  createMockExample,
  createMockExamples,
  MOCK_USER_ID,
} from '../helpers/mock.helper';

// Create a single mock example
const example = await createMockExample(MOCK_USER_ID, {
  name: 'Custom Name',
  isPublic: true,
});

// Create multiple mock examples
const examples = await createMockExamples(5, MOCK_USER_ID);
```

#### API Test Helpers

```typescript
import { authGet, authPost, authPut, authDelete } from '../helpers/api.helper';

// Make authenticated requests
const response = await authPost(app, '/api/examples', data);
const getResponse = await authGet(app, '/api/examples/123');
const putResponse = await authPut(app, '/api/examples/123', updates);
const deleteResponse = await authDelete(app, '/api/examples/123');

// Use different user tokens
const response = await authGet(app, '/api/examples/123', 'other-user-token');
```

## Best Practices

### 1. Test Organization

- Group related tests using `describe()` blocks
- Use clear, descriptive test names
- Follow the Arrange-Act-Assert pattern

```typescript
it('should throw NotFoundError if example does not exist', async () => {
  // Arrange
  const fakeId = '507f1f77bcf86cd799439011';

  // Act & Assert
  await expect(
    exampleService.getById(fakeId, MOCK_USER_ID)
  ).rejects.toThrow(NotFoundError);
});
```

### 2. Database Cleanup

- Use `setupTestDB()` for automatic cleanup between tests
- Tests should not depend on execution order
- Each test should be independent

### 3. Mock External Dependencies

- Mock external APIs and services
- Use test database (MongoDB Memory Server)
- Mock authentication in integration tests

### 4. Test Coverage

- Aim for high coverage but focus on meaningful tests
- Test both happy paths and error cases
- Test edge cases and boundary conditions
- Don't test third-party code

### 5. Performance

- Keep unit tests fast (< 100ms each)
- Use `beforeAll` for expensive setup
- Clean up only what's necessary

### 6. Error Testing

```typescript
// Test that specific errors are thrown
await expect(
  exampleService.delete(id, MOCK_USER_ID)
).rejects.toThrow(ForbiddenError);

// Test error messages
try {
  await exampleService.create(userId, invalidData);
} catch (error) {
  expect(error.message).toContain('validation failed');
}
```

### 7. Async Testing

Always use `async/await` with proper error handling:

```typescript
it('should handle async operations', async () => {
  const result = await asyncFunction();
  expect(result).toBeDefined();
});
```

### 8. Test Data

- Use meaningful test data
- Avoid hard-coded values when possible
- Use helper functions for consistency

```typescript
// Good
const example = await createMockExample(MOCK_USER_ID, {
  status: 'published',
  isPublic: true,
});

// Avoid
const example = {
  _id: 'abc123',
  name: 'Test',
  userId: 'user1',
  // ...many more fields
};
```

## Continuous Integration

Tests should be run in CI/CD pipelines before deployment:

```yaml
# Example GitHub Actions workflow
- name: Run tests
  run: npm test

- name: Check coverage
  run: npm run test:coverage

- name: Upload coverage
  uses: codecov/codecov-action@v3
  with:
    files: ./coverage/lcov.info
```

## Debugging Tests

### Run tests in debug mode

```bash
node --inspect-brk node_modules/.bin/jest --runInBand
```

### Enable verbose logging

```bash
DEBUG=* npm test
```

### Run a single test

```bash
npm test -- -t "should create a new example"
```

### Use console.log in tests

```typescript
it('should debug this test', async () => {
  const result = await someFunction();
  console.log('Result:', result);
  expect(result).toBeDefined();
});
```

## Common Issues

### MongoDB Connection Issues

If you encounter MongoDB connection errors:
1. Ensure MongoDB Memory Server is installed
2. Check that `setupTestDB()` is called before tests
3. Verify Node.js version compatibility

### Test Timeouts

If tests timeout:
1. Increase timeout in jest.config.js: `testTimeout: 30000`
2. Check for unresolved promises
3. Ensure database connections are properly closed

### Port Conflicts

If you get port binding errors:
1. Ensure dev servers aren't running during tests
2. Use different ports for test environment
3. Check for leaked processes

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [MongoDB Memory Server](https://github.com/nodkz/mongodb-memory-server)
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)
