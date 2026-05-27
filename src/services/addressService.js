// src/services/addressService.js

const addressRepository = require('../repositories/addressRepository');
const AppError = require('../utils/AppError');

/**
 * Get all addresses for the current user.
 */
async function getAddresses(userId) {
  return addressRepository.findAllByUserId(userId);
}

/**
 * Add a new address for the current user.
 */
async function addAddress(userId, data) {
  // Validate required fields
  if (!data.addressLine1 || !data.city || !data.state || !data.postalCode) {
    throw new AppError('addressLine1, city, state, and postalCode are required', 400);
  }

  // If this address is being set as default, clear all existing defaults first.
  // This ensures only one address can be default at a time.
  if (data.isDefault) {
    await addressRepository.clearDefaultAddresses(userId);
  }

  return addressRepository.create(userId, data);
}

module.exports = { getAddresses, addAddress };