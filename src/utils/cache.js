// src/utils/cache.js

const redis = require('../config/redis');

// TTL values in seconds — defined once here, used everywhere
const TTL = {
  PRODUCT_LIST: 5 * 60,    // 5 minutes
  SINGLE_PRODUCT: 10 * 60, // 10 minutes
};

/**
 * Get a value from the cache.
 * Returns the parsed object if found, or null if not found.
 */
async function get(key) {
  try {
    const value = await redis.get(key);

    if (!value) return null;

    // Redis stores everything as strings.
    // We JSON.stringify before storing and JSON.parse when retrieving.
    return JSON.parse(value);
  } catch (err) {
    // If Redis fails, log it and return null.
    // Returning null means the caller will fall through to the database.
    // The app keeps working — just without the cache benefit.
    console.error('Cache get error:', err.message);
    return null;
  }
}

/**
 * Store a value in the cache with a TTL.
 * @param {string} key   - The cache key
 * @param {any}    value - The value to store (will be JSON stringified)
 * @param {number} ttl   - Time to live in seconds
 */
async function set(key, value, ttl) {
  try {
    // EX means "expire after this many seconds"
    await redis.set(key, JSON.stringify(value), 'EX', ttl);
  } catch (err) {
    // If storing fails, log it but don't throw.
    // A cache write failure is not a fatal error.
    console.error('Cache set error:', err.message);
  }
}

/**
 * Delete one or more keys from the cache.
 * Called when data changes and the cache needs to be invalidated.
 */
async function del(...keys) {
  try {
    await redis.del(...keys);
  } catch (err) {
    console.error('Cache delete error:', err.message);
  }
}

/**
 * Delete all keys matching a pattern.
 * For example, del pattern 'products:*' deletes all product cache entries.
 * 
 * We use SCAN instead of KEYS because KEYS blocks the Redis server
 * while it scans — dangerous in production with large datasets.
 * SCAN iterates in small batches without blocking.
 */
async function delPattern(pattern) {
  try {
    // SCAN returns a cursor and a batch of keys.
    // When cursor returns '0', the full scan is complete.
    let cursor = '0';
    do {
      const result = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
      cursor = result[0];
      const keys = result[1];
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } while (cursor !== '0');
  } catch (err) {
    console.error('Cache delPattern error:', err.message);
  }
}

module.exports = { get, set, del, delPattern, TTL };