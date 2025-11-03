module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: [
    '**/__tests__/**/*.+(ts|tsx|js)',
    '**/?(*.)+(spec|test).+(ts|tsx|js)',
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/tests/integration/', // Exclude integration tests from default run
  ],
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: {
        strict: false,
      },
    }],
  },
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/index.ts',
    '!src/**/*.interface.ts',
    '!src/**/*.schema.ts',
  ],
  // Coverage thresholds disabled for starter boilerplate
  // Enable and adjust per your project needs
  // coverageThreshold: {
  //   global: {
  //     branches: 50,
  //     functions: 50,
  //     lines: 50,
  //     statements: 50,
  //   },
  // },
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'text-summary', 'lcov', 'html', 'json'],
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/tests/',
    '/dist/',
  ],
  moduleNameMapper: {
    '@/(.*)': '<rootDir>/src/$1',
    '@core/(.*)': '<rootDir>/src/core/$1',
    '@modules/(.*)': '<rootDir>/src/modules/$1',
    '@features/(.*)': '<rootDir>/src/features/$1',
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setup/jest.setup.ts'],
  testTimeout: 10000,
  verbose: true,
  clearMocks: true,
  restoreMocks: true,
};
