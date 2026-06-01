// tests/helpers.js

const request = require('supertest');
const bcrypt = require('bcryptjs');

// We require the app here — not server.js.
// app.js exports the Express app without starting a server.
// supertest creates its own temporary server internally.
const app = require('../src/app');

// Get a fresh pool pointed at the test database
const pool = require('../src/config/database');

/**
 * Wipe all tables between tests so each test starts with a clean slate.
 * Order matters — delete child tables before parent tables (foreign keys).
 */
async function clearDatabase() {
  // Clear rate limit counters in Redis before each test
  const redis = require('../src/config/redis');
  await redis.flushdb();
  
  await pool.query('DELETE FROM payments');
  await pool.query('DELETE FROM order_items');
  await pool.query('DELETE FROM orders');
  await pool.query('DELETE FROM cart_items');
  await pool.query('DELETE FROM carts');
  await pool.query('DELETE FROM addresses');
  await pool.query('DELETE FROM products');
  await pool.query('DELETE FROM users');
}

/**
 * Create a test user directly in the database and return a valid token.
 * Used by tests that need an authenticated user without going through
 * the register endpoint.
 */
async function createUserAndLogin(overrides = {}) {
  const userData = {
    email: 'test@example.com',
    password: 'testpass123',
    firstName: 'Test',
    lastName: 'User',
    ...overrides,
  };

  // Hash the password exactly as authService does
  const passwordHash = await bcrypt.hash(userData.password, 12);

  // Insert directly — faster than going through the API
  const result = await pool.query(
    `INSERT INTO users (first_name, last_name, email, password_hash)
     VALUES ($1, $2, $3, $4)
     RETURNING id, email, first_name, last_name, role`,
    [userData.firstName, userData.lastName, userData.email, passwordHash]
  );

  const user = result.rows[0];

  // Login via the API to get a real JWT + Redis session
  const loginResponse = await request(app)
    .post('/api/auth/login')
    .send({ email: userData.email, password: userData.password });

  const token = loginResponse.body.token;

  return { user, token };
}

/**
 * Create a test product directly in the database.
 */
async function createProduct(overrides = {}) {
  const data = {
    name: 'Test Product',
    price: 100.00,
    stockQuantity: 50,
    sku: `SKU-${Date.now()}`,
    category: 'test',
    ...overrides,
  };

  const result = await pool.query(
    `INSERT INTO products (name, price, stock_quantity, sku, category)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [data.name, data.price, data.stockQuantity, data.sku, data.category]
  );

  return result.rows[0];
}

/**
 * Create a test address for a user directly in the database.
 */
async function createAddress(userId, overrides = {}) {
  const data = {
    label: 'Home',
    addressLine1: '123 Test Street',
    city: 'Bengaluru',
    state: 'Karnataka',
    postalCode: '560001',
    country: 'India',
    isDefault: true,
    ...overrides,
  };

  const result = await pool.query(
    `INSERT INTO addresses
       (user_id, label, address_line1, city, state, postal_code, country, is_default)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [userId, data.label, data.addressLine1, data.city, data.state,
     data.postalCode, data.country, data.isDefault]
  );

  return result.rows[0];
}

module.exports = { clearDatabase, createUserAndLogin, createProduct, createAddress, app };