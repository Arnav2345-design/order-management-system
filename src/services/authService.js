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

async function register({ name, email, password }) {
  const existing = await userRepository.findByEmail(email);
  if (existing) {
    throw new AppError('Email already in use', 409);
  }

  const saltRounds = 12;
  const hashedPassword = await bcrypt.hash(password, saltRounds);

  const user = await userRepository.create({ name, email, password: hashedPassword });

  const token = generateToken(user.id);

  return { user, token };
}

async function login({ email, password }) {
  const user = await userRepository.findByEmail(email);
  if (!user) {
    throw new AppError('Invalid email or password', 401);
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    throw new AppError('Invalid email or password', 401);
  }

  const token = generateToken(user.id);

  const { password: _, ...userWithoutPassword } = user;
  return { user: userWithoutPassword, token };
}

module.exports = { register, login };