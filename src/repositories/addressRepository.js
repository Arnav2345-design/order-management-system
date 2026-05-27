// src/repositories/addressRepository.js

const db = require('../config/database');

/**
 * Get all addresses belonging to a specific user.
 */
async function findAllByUserId(userId) {
  const result = await db.query(
    `SELECT * FROM addresses 
     WHERE user_id = $1 
     ORDER BY is_default DESC, created_at ASC`,
    // ORDER BY is_default DESC puts the default address first (true sorts before false).
    // created_at ASC puts older addresses before newer ones after that.
    [userId]
  );
  return result.rows;
}

/**
 * Find a single address by its ID.
 * Used to verify it exists and belongs to the right user before using it.
 */
async function findById(id) {
  const result = await db.query(
    'SELECT * FROM addresses WHERE id = $1',
    [id]
  );
  return result.rows[0] || null;
}

/**
 * Create a new address for a user.
 */
async function create(userId, { label, addressLine1, addressLine2, city, state, postalCode, country, isDefault }) {
  const result = await db.query(
    `INSERT INTO addresses (
       id, user_id, label, address_line1, address_line2,
       city, state, postal_code, country, is_default,
       created_at, updated_at
     )
     VALUES (
       gen_random_uuid(), $1, $2, $3, $4,
       $5, $6, $7, $8, $9,
       NOW(), NOW()
     )
     RETURNING *`,
    [userId, label, addressLine1, addressLine2, city, state, postalCode, country, isDefault || false]
  );
  return result.rows[0];
}

/**
 * When a user sets a new address as default, we first need to un-default
 * all their other addresses. Otherwise multiple addresses could be marked
 * as default simultaneously.
 */
async function clearDefaultAddresses(userId) {
  await db.query(
    'UPDATE addresses SET is_default = false WHERE user_id = $1',
    [userId]
  );
}

module.exports = {
  findAllByUserId,
  findById,
  create,
  clearDefaultAddresses,
};