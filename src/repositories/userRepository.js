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

module.exports = { findByEmail, findById, create };