// src/middleware/authenticate.js

const jwt = require('jsonwebtoken');
const userRepository = require('../repositories/userRepository');
const AppError = require('../utils/AppError');
const redis = require('../config/redis');

async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('Authentication required', 401);
    }

    const token = authHeader.split(' ')[1];

    // Step 1: Verify the JWT signature — same as before
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Step 2: Check the session exists in Redis
    // decoded.jti is the unique token ID we stored in the payload
    // If this key doesn't exist, the user has logged out or was revoked
    try {
      const sessionUserId = await redis.get(`session:${decoded.jti}`);

      if (!sessionUserId) {
        // Token is cryptographically valid but session was deleted —
        // this means the user logged out or was explicitly revoked
        throw new AppError('Session expired, please log in again', 401);
      }
    } catch (err) {
      // If it's our AppError (session not found), re-throw it
      if (err.isOperational) throw err;
      // If Redis itself is down, degrade gracefully — skip the session check
      // so the app keeps working with JWT-only auth during Redis outages
      console.error('Redis session check failed:', err.message);
    }

    // Step 3: Load the user from the database — same as before
    const user = await userRepository.findById(decoded.userId);
    if (!user) {
      throw new AppError('User no longer exists', 401);
    }

    // Attach jti to req so the logout controller can delete the right session
    req.user = user;
    req.jti = decoded.jti;

    next();
  } catch (err) {
    if (err.name === 'JsonWebTokenError') {
      return next(new AppError('Invalid token', 401));
    }
    if (err.name === 'TokenExpiredError') {
      return next(new AppError('Token expired, please log in again', 401));
    }
    next(err);
  }
}

module.exports = authenticate;