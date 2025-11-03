/**
 * Mock data helpers
 * Provides utilities for creating mock test data
 */

import { Example } from '../../src/features/example/example.model';
import { CreateExampleInput } from '../../src/features/example/example.schema';

/**
 * Mock user ID for testing
 */
export const MOCK_USER_ID = 'test-user-id';
export const MOCK_USER_ID_2 = 'test-user-id-2';
export const MOCK_ADMIN_ID = 'test-admin-id';

/**
 * Create a mock example
 */
export const createMockExample = async (
  userId: string = MOCK_USER_ID,
  overrides: Partial<CreateExampleInput & { viewCount?: number }> = {}
) => {
  const defaultData: CreateExampleInput & { userId: string; viewCount?: number } = {
    name: 'Test Example',
    description: 'This is a test example',
    status: 'draft',
    tags: ['test'],
    metadata: { test: true },
    isPublic: false,
    userId,
  };

  const exampleData = { ...defaultData, ...overrides };
  const example = await Example.create(exampleData);

  return example;
};

/**
 * Create multiple mock examples
 */
export const createMockExamples = async (
  count: number,
  userId: string = MOCK_USER_ID,
  overrides: Partial<CreateExampleInput & { viewCount?: number }> = {}
) => {
  const examples = [];

  for (let i = 0; i < count; i++) {
    const example = await createMockExample(userId, {
      name: `Test Example ${i + 1}`,
      ...overrides,
    });
    examples.push(example);
  }

  return examples;
};

/**
 * Create a mock published example
 */
export const createMockPublishedExample = async (
  userId: string = MOCK_USER_ID,
  overrides: Partial<CreateExampleInput> = {}
) => {
  return createMockExample(userId, {
    status: 'published',
    isPublic: true,
    ...overrides,
  });
};

/**
 * Create a mock archived example
 */
export const createMockArchivedExample = async (
  userId: string = MOCK_USER_ID,
  overrides: Partial<CreateExampleInput> = {}
) => {
  return createMockExample(userId, {
    status: 'archived',
    isPublic: false,
    ...overrides,
  });
};

/**
 * Create a mock request object for testing
 */
export const createMockRequest = (overrides: any = {}) => {
  return {
    user: {
      id: MOCK_USER_ID,
      email: 'test@example.com',
      role: 'user',
      clerkId: 'clerk-test-id',
      metadata: {},
    },
    params: {},
    query: {},
    body: {},
    headers: {},
    ...overrides,
  };
};

/**
 * Create a mock response object for testing
 */
export const createMockResponse = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  res.sendStatus = jest.fn().mockReturnValue(res);
  return res;
};

/**
 * Create a mock next function for testing
 */
export const createMockNext = () => {
  return jest.fn();
};
