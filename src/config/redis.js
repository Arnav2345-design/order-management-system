// src/config/redis.js

const Redis = require('ioredis');

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT) || 6379,

  // If Redis is unavailable, don't crash the app.
  // lazyConnect means we don't connect until the first command is sent.
  lazyConnect: true,

  // How many times to retry a failed connection before giving up.
  maxRetriesPerRequest: 3,

  // If all retries fail, stop retrying entirely rather than
  // hammering a dead Redis server forever.
  retryStrategy(times) {
    if (times > 3) {
      return null; // stop retrying
    }
    // Wait 200ms, then 400ms, then 600ms between retries
    return times * 200;
  },
});

// Log when Redis connects successfully
redis.on('connect', () => {
  console.log('Redis connected');
});

// Log Redis errors but don't crash the app.
// If Redis goes down, requests should still work — just slower
// because they'll fall through to the database.
redis.on('error', (err) => {
  console.error('Redis error:', err.message);
});

module.exports = redis;