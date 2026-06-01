// src/server.js

require('dotenv').config();
const app = require('./app');
const config = require('./config');
const logger = require('./config/logger');
const pool = require('./config/database');
const redis = require('./config/redis');

const server = app.listen(config.port, () => {
  logger.info(`Server running on port ${config.port} in ${config.nodeEnv} mode`);
});

// ── Graceful shutdown ─────────────────────────────────────────────
// This function is called when the process receives a shutdown signal.
// It stops accepting new requests, waits for in-flight requests to finish,
// then closes database and Redis connections before exiting.

async function shutdown(signal) {
  logger.info(`${signal} received — starting graceful shutdown`);

  // Step 1: Stop accepting new HTTP connections.
  // Existing in-flight requests are still being processed.
  // server.close() calls the callback when all connections are closed.
  server.close(async () => {
    logger.info('HTTP server closed — no new connections accepted');

    try {
      // Step 2: Close the PostgreSQL connection pool.
      // pool.end() waits for all active queries to finish,
      // then closes every connection in the pool.
      await pool.end();
      logger.info('Database pool closed');

      // Step 3: Close the Redis connection.
      // redis.quit() sends the QUIT command to Redis gracefully,
      // waiting for any pending commands to complete first.
      await redis.quit();
      logger.info('Redis connection closed');

      // Step 4: Exit cleanly.
      // Exit code 0 means success — the process ended intentionally.
      logger.info('Graceful shutdown complete');
      process.exit(0);

    } catch (err) {
      // If closing connections fails, log the error and force exit.
      logger.error('Error during shutdown', { error: err.message });
      process.exit(1);
    }
  });

  // ── Safety timeout ────────────────────────────────────────────
  // If shutdown takes longer than 10 seconds, something is stuck.
  // Force exit to avoid hanging forever — better to exit dirty
  // than to never exit at all.
  setTimeout(() => {
    logger.error('Shutdown timeout — forcing exit');
    process.exit(1);
  }, 10000); // 10 seconds
}

// SIGTERM — sent by Docker, Railway, and process managers on deploy
process.on('SIGTERM', () => shutdown('SIGTERM'));

// SIGINT — sent by Ctrl+C in the terminal
process.on('SIGINT', () => shutdown('SIGINT'));

// ── Unhandled errors ──────────────────────────────────────────────
// These should never happen in production if the code is correct.
// Log and attempt graceful shutdown when they do.

process.on('unhandledRejection', (err) => {
  logger.error('Unhandled Promise Rejection', {
    error: err.message,
    stack: err.stack,
  });
  // Attempt graceful shutdown — the process is in an unknown state
  shutdown('unhandledRejection');
});

process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception', {
    error: err.message,
    stack: err.stack,
  });
  // uncaughtException means the process is in an undefined state.
  // Exit immediately — graceful shutdown is not safe here.
  process.exit(1);
});