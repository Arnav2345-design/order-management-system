// jest.config.js
module.exports = {
  // Look for test files in the tests/ folder
  testMatch: ['**/tests/**/*.test.js'],

  // Run tests one file at a time, not in parallel.
  // Parallel tests would conflict — two tests inserting the same email simultaneously.
  maxWorkers: 1,

  // Run this file before any test suite starts
  globalSetup: './tests/setup.js',

  // Run this file after all test suites finish
  globalTeardown: './tests/teardown.js',

  // How long a single test can run before Jest kills it (5 seconds)
  testTimeout: 10000,

   testEnvironment: 'node',
  setupFiles: ['./tests/env.js'],
};