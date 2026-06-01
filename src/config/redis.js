// src/config/redis.js

const Redis = require('ioredis');
const config = require('./index');

const redis = new Redis({
  host: config.redis.host,
  port: config.redis.port,
  lazyConnect: true,
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    if (times > 3) return null;
    return times * 200;
  },
});

redis.on('connect', () => {
  console.log('Redis connected');
});

redis.on('error', (err) => {
  console.error('Redis error:', err.message);
});

module.exports = redis;