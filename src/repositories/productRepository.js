const pool = require('../config/database');

async function findAll({ category, limit = 20, offset = 0 }) {
  const params = [limit, offset];
  let query = `
    SELECT * FROM products
    WHERE is_active = true
  `;

  if (category) {
    params.push(category);
    query += ` AND category = $${params.length}`;
  }

  query += ` ORDER BY created_at DESC LIMIT $1 OFFSET $2`;

  const result = await pool.query(query, params);
  return result.rows;
}

async function findById(id) {
  const result = await pool.query(
    'SELECT * FROM products WHERE id = $1 AND is_active = true',
    [id]
  );
  return result.rows[0] || null;
}

async function create({ name, description, price, stock_quantity, sku, category }) {
  const result = await pool.query(
    `INSERT INTO products (name, description, price, stock_quantity, sku, category)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [name, description, price, stock_quantity, sku, category]
  );
  return result.rows[0];
}

async function update(id, { name, description, price, stock_quantity, sku, category, is_active }) {
  const result = await pool.query(
    `UPDATE products
     SET name = COALESCE($1, name),
         description = COALESCE($2, description),
         price = COALESCE($3, price),
         stock_quantity = COALESCE($4, stock_quantity),
         sku = COALESCE($5, sku),
         category = COALESCE($6, category),
         is_active = COALESCE($7, is_active),
         updated_at = NOW()
     WHERE id = $8
     RETURNING *`,
    [name, description, price, stock_quantity, sku, category, is_active, id]
  );
  return result.rows[0] || null;
}

async function remove(id) {
  const result = await pool.query(
    `UPDATE products SET is_active = false, updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [id]
  );
  return result.rows[0] || null;
}

module.exports = { findAll, findById, create, update, remove };