// src/services/authService.js

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const userRepository = require('../repositories/userRepository');
const AppError = require('../utils/AppError');
const redis = require('../config/redis');

// jti = JWT ID — a unique identifier for each token we issue.
// This is what we store in Redis as the session handle.
// When we want to invalidate a token, we delete its jti from Redis.
function generateToken(userId) {
  const config = require('../config');

  // Generate a unique ID for this token
  const jti = crypto.randomUUID();

  const token = jwt.sign(
    { userId, jti },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );

  return { token, jti };
}

// Stores the session in Redis.
// Key:   session:{jti}
// Value: userId (so we know who this session belongs to)
// TTL:   must match the JWT expiry so the Redis key auto-deletes
//        when the token would have expired anyway
async function createSession(jti, userId) {
  // JWT_EXPIRES_IN is something like '7d' — we need it in seconds for Redis
  // 7 days = 7 * 24 * 60 * 60 = 604800 seconds
  const ttlSeconds = 7 * 24 * 60 * 60;

  // SET session:{jti} {userId} EX {ttlSeconds}
  // EX means "expire after this many seconds"
  await redis.set(`session:${jti}`, userId, 'EX', ttlSeconds);
}

async function register({ firstName, lastName, email, password }) {
  const existing = await userRepository.findByEmail(email);
  if (existing) {
    throw new AppError('Email already in use', 409);
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await userRepository.create({ firstName, lastName, email, passwordHash });

  const { token, jti } = generateToken(user.id);

  // Write session to Redis — if Redis is down, we degrade gracefully
  // and still return the token (Redis errors never crash the app)
  try {
    await createSession(jti, user.id);
  } catch (err) {
    console.error('Redis session write failed on register:', err.message);
  }

  return { user, token };
}

async function login({ email, password }) {
  const user = await userRepository.findByEmail(email);
  if (!user) {
    throw new AppError('Invalid email or password', 401);
  }

  const isMatch = await bcrypt.compare(password, user.password_hash);
  if (!isMatch) {
    throw new AppError('Invalid email or password', 401);
  }

  const { token, jti } = generateToken(user.id);

  try {
    await createSession(jti, user.id);
  } catch (err) {
    console.error('Redis session write failed on login:', err.message);
  }

  const { password_hash: _, ...userWithoutPassword } = user;
  return { user: userWithoutPassword, token };
}

// Deletes the session from Redis.
// After this, any request using the old token will fail the session check
// in authenticate middleware — even if the JWT signature is still valid.
async function logout(jti) {
  await redis.del(`session:${jti}`);
}

module.exports = { register, login, logout };