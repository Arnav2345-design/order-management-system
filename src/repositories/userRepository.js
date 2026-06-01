const pool = require('../config/database');

async function findByEmail(email) {
  const result = await pool.query(
    'SELECT * FROM users WHERE email = $1',
    [email]
  );
  return result.rows[0] || null;
}

async function findById(id) {
  const result = await pool.query(
    // We select specific columns — never select password_hash outside of login
    'SELECT id, first_name, last_name, email, role, created_at FROM users WHERE id = $1',
    [id]
  );
  return result.rows[0] || null;
}

async function create({ firstName, lastName, email, passwordHash }) {
  const result = await pool.query(
    `INSERT INTO users (first_name, last_name, email, password_hash)
     VALUES ($1, $2, $3, $4)
     RETURNING id, first_name, last_name, email, role, created_at`,
    [firstName, lastName, email, passwordHash]
  );
  return result.rows[0];
}
/**
 * Find a user by ID including password_hash.
 * Used ONLY for password change — we need the hash to verify
 * the current password. Never return this hash to the client.
 */
async function findByIdWithHash(id) {
  const result = await pool.query(
    'SELECT * FROM users WHERE id = $1',
    [id]
  );
  return result.rows[0] || null;
}

/**
 * Update non-sensitive profile fields (name, phone).
 * Builds the SET clause dynamically — only updates fields that were sent.
 */
async function update(id, fields) {
  // fields is an object like { firstName: 'John', phone: '9999999999' }
  // We need to convert this to SQL: SET first_name = $1, phone = $2

  // Map JS camelCase field names to DB snake_case column names
  const columnMap = {
    firstName: 'first_name',
    lastName:  'last_name',
    phone:     'phone',
  };

  const setClauses = [];  // will become ['first_name = $1', 'phone = $2']
  const values = [];      // will become ['John', '9999999999']

  // Loop over each field the caller sent
  for (const [key, value] of Object.entries(fields)) {
    // Only process fields we explicitly allow — ignore anything else
    if (columnMap[key]) {
      // $1, $2, $3... — PostgreSQL uses 1-based parameter indexes
      setClauses.push(`${columnMap[key]} = $${values.length + 1}`);
      values.push(value);
    }
  }

  // If none of the sent fields are in our allowed list, nothing to update
  if (setClauses.length === 0) {
    throw new Error('No valid fields to update');
  }

  // Add updated_at and the WHERE clause parameter
  // updated_at uses NOW() directly — no need to pass it as a parameter
  const query = `
    UPDATE users
    SET ${setClauses.join(', ')}, updated_at = NOW()
    WHERE id = $${values.length + 1}
    RETURNING id, first_name, last_name, email, phone, role, created_at, updated_at
  `;

  // The last value in the array is the id for the WHERE clause
  values.push(id);

  const result = await pool.query(query, values);
  return result.rows[0] || null;
}

/**
 * Update a user's password hash.
 * Called only after verifying the current password in the service layer.
 */
async function updatePassword(id, newPasswordHash) {
  const result = await pool.query(
    `UPDATE users
     SET password_hash = $1, updated_at = NOW()
     WHERE id = $2
     RETURNING id`,
    [newPasswordHash, id]
  );
  return result.rows[0] || null;
}
module.exports = { findByEmail, findById, findByIdWithHash, create, update, updatePassword };