// src/repositories/cartRepository.js

const db = require('../config/database');

// ─── CART-LEVEL OPERATIONS ───────────────────────────────────────────────────

/**
 * Find the cart that belongs to a specific user.
 * Returns null if no cart exists yet for this user.
 */
async function findCartByUserId(userId) {
  const result = await db.query(
    'SELECT * FROM carts WHERE user_id = $1',
    [userId]
  );
  // result.rows is always an array. If no cart exists, it's an empty array.
  // result.rows[0] gives us the first row, or undefined if empty.
  // The || null turns undefined into null, which is easier to check.
  return result.rows[0] || null;
}

/**
 * Create a brand-new cart for a user and return it.
 * This only runs when a user adds their first ever item.
 */
async function createCart(userId) {
  const result = await db.query(
    // gen_random_uuid() is a PostgreSQL function that generates a UUID for us.
    // RETURNING * means "after inserting, give me back the full row you just created".
    // Without RETURNING *, an INSERT gives you nothing back.
    `INSERT INTO carts (id, user_id, created_at, updated_at)
     VALUES (gen_random_uuid(), $1, NOW(), NOW())
     RETURNING *`,
    [userId]
  );
  return result.rows[0];
}

// ─── CART ITEM OPERATIONS ─────────────────────────────────────────────────────

/**
 * Get all items in a cart, joined with product details.
 * 
 * Why JOIN? The cart_items table only stores product_id and quantity.
 * The customer wants to see the product name, price, etc.
 * A JOIN fetches columns from both tables in one query.
 */
async function findItemsByCartId(cartId) {
  const result = await db.query(
    `SELECT 
       ci.id,              -- The cart_item's own ID (used when updating/deleting)
       ci.cart_id,
       ci.quantity,
       ci.created_at,
       p.id          AS product_id,
       p.name        AS product_name,
       p.price       AS product_price,
       p.sku         AS product_sku,
       p.stock_quantity
     FROM cart_items ci
     -- INNER JOIN: only return rows where both sides match.
     -- If a product was hard-deleted (which we don't do, but just in case),
     -- INNER JOIN would automatically exclude that orphaned cart item.
     INNER JOIN products p ON p.id = ci.product_id
     WHERE ci.cart_id = $1
     ORDER BY ci.created_at ASC`,
    [cartId]
  );
  return result.rows;
}

/**
 * Find a single cart item by its own ID.
 * Used before updating or deleting — we need to confirm it exists
 * and that it belongs to the right cart.
 */
async function findCartItemById(itemId) {
  const result = await db.query(
    'SELECT * FROM cart_items WHERE id = $1',
    [itemId]
  );
  return result.rows[0] || null;
}

/**
 * Find a cart item by cart ID + product ID together.
 * This is how we check "does this product already exist in this cart?"
 * before deciding whether to INSERT or UPDATE.
 */
async function findCartItemByProduct(cartId, productId) {
  const result = await db.query(
    'SELECT * FROM cart_items WHERE cart_id = $1 AND product_id = $2',
    [cartId, productId]
  );
  return result.rows[0] || null;
}

/**
 * Add a new product to a cart for the first time.
 * Only called when the product is NOT already in the cart.
 */
async function createCartItem(cartId, productId, quantity) {
  const result = await db.query(
    `INSERT INTO cart_items (id, cart_id, product_id, quantity, created_at, updated_at)
     VALUES (gen_random_uuid(), $1, $2, $3, NOW(), NOW())
     RETURNING *`,
    [cartId, productId, quantity]
  );
  return result.rows[0];
}

/**
 * Update the quantity of a cart item that already exists.
 * Called when the same product is added again, or when the user
 * explicitly changes the quantity.
 */
async function updateCartItemQuantity(itemId, quantity) {
  const result = await db.query(
    `UPDATE cart_items
     SET quantity = $1, updated_at = NOW()
     WHERE id = $2
     RETURNING *`,
    [quantity, itemId]
  );
  return result.rows[0] || null;
}

/**
 * Delete a single cart item row entirely.
 * Called when quantity reaches 0 or user explicitly removes an item.
 */
async function deleteCartItem(itemId) {
  await db.query(
    'DELETE FROM cart_items WHERE id = $1',
    [itemId]
  );
  // DELETE returns nothing useful, so we don't return anything here.
}

module.exports = {
  findCartByUserId,
  createCart,
  findItemsByCartId,
  findCartItemById,
  findCartItemByProduct,
  createCartItem,
  updateCartItemQuantity,
  deleteCartItem,
};