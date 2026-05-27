const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const userRepository = require('../repositories/userRepository');
const AppError = require('../utils/AppError');

function generateToken(userId) {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN }
  );
}

async function register({ firstName, lastName, email, password }) {
  const existing = await userRepository.findByEmail(email);
  if (existing) {
    throw new AppError('Email already in use', 409);
  }

  const saltRounds = 12;
  // Hash the password and store it as passwordHash — matching the column name
  const passwordHash = await bcrypt.hash(password, saltRounds);

  const user = await userRepository.create({ firstName, lastName, email, passwordHash });
  const token = generateToken(user.id);
  return { user, token };
}

async function login({ email, password }) {
  const user = await userRepository.findByEmail(email);
  if (!user) {
    throw new AppError('Invalid email or password', 401);
  }

  // Compare against password_hash, not password
  const isMatch = await bcrypt.compare(password, user.password_hash);
  if (!isMatch) {
    throw new AppError('Invalid email or password', 401);
  }

  const token = generateToken(user.id);

  // Strip password_hash before returning the user object
  const { password_hash: _, ...userWithoutPassword } = user;
  return { user: userWithoutPassword, token };
}

module.exports = { register, login };