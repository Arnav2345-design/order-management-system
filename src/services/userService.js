// src/services/userService.js

const bcrypt = require('bcryptjs');
const userRepository = require('../repositories/userRepository');
const AppError = require('../utils/AppError');

/**
 * Get the current user's profile.
 * findById already excludes password_hash — safe to return directly.
 */
async function getProfile(userId) {
  const user = await userRepository.findById(userId);

  if (!user) {
    throw new AppError('User not found', 404);
  }

  return user;
}

/**
 * Update non-sensitive profile fields.
 * Only processes firstName, lastName, phone — nothing else.
 */
async function updateProfile(userId, data) {
  // Extract only the fields we allow to be updated this way.
  // If the caller sends { email: 'new@email.com' }, we silently ignore it —
  // email change is a separate flow (requires verification) not built today.
  const allowedFields = {};

  if (data.firstName !== undefined) allowedFields.firstName = data.firstName.trim();
  if (data.lastName  !== undefined) allowedFields.lastName  = data.lastName.trim();
  if (data.phone     !== undefined) allowedFields.phone     = data.phone.trim();

  if (Object.keys(allowedFields).length === 0) {
    throw new AppError('No valid fields provided. Allowed: firstName, lastName, phone', 400);
  }

  const updated = await userRepository.update(userId, allowedFields);

  if (!updated) {
    throw new AppError('User not found', 404);
  }

  return updated;
}

/**
 * Change the current user's password.
 * Requires the current password as proof — even with a valid JWT.
 */
async function changePassword(userId, { currentPassword, newPassword }) {
  if (!currentPassword || !newPassword) {
    throw new AppError('currentPassword and newPassword are required', 400);
  }

  if (newPassword.length < 8) {
    throw new AppError('New password must be at least 8 characters', 400);
  }

  // We need the password_hash to verify — use findByIdWithHash, not findById
  const user = await userRepository.findByIdWithHash(userId);

  if (!user) {
    throw new AppError('User not found', 404);
  }

  // Verify the current password against the stored hash
  const isCorrect = await bcrypt.compare(currentPassword, user.password_hash);

  if (!isCorrect) {
    throw new AppError('Current password is incorrect', 400);
  }

  // Hash the new password — same cost factor (12) as registration
  const newHash = await bcrypt.hash(newPassword, 12);

  await userRepository.updatePassword(userId, newHash);

  // Return nothing — just success. Never return the hash.
  return { message: 'Password changed successfully' };
}

module.exports = { getProfile, updateProfile, changePassword };