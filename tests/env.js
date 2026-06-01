// tests/env.js
// This runs in the same process as the tests, before any module is loaded.
// Setting NODE_ENV here ensures rateLimiter.js sees it when it's first required.
process.env.NODE_ENV = 'test';
process.env.DB_NAME = 'order_management_test';