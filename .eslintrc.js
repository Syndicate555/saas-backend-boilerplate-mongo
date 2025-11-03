module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'prettier',
  ],
  plugins: ['@typescript-eslint', 'prettier'],
  env: {
    node: true,
    es2022: true,
    jest: true,
  },
  rules: {
    // Only enforce critical rules for a boilerplate
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    '@typescript-eslint/no-explicit-any': 'off', // Allow any - developers can enable later
    '@typescript-eslint/no-var-requires': 'off', // Allow require() for dynamic imports
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-non-null-assertion': 'off',
    'no-console': 'off', // Allow console - it's a backend
    'no-fallthrough': 'off', // Allow switch fallthrough with comments
    'prettier/prettier': 'warn', // Warn, don't error on formatting
  },
  ignorePatterns: ['dist', 'node_modules', 'coverage', '*.js', 'scripts', '**/*.d.ts'],
};
