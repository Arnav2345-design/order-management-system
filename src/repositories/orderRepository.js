// src/repositories/orderRepository.js

const db = require('../config/database');

/**
 * Find all orders for a specific user, most recent first.
 * We don't JOIN order_items here — we keep this query light.
 * Full order details (with items) come from findById.
 */
async function findAllByUserId(userId) {
  const result = await db.query(
    `SELECT * FROM orders 
     WHERE user_id = $1 
     ORDER BY created_at DESC`,
    [userId]
  );
  return result.rows;
}

/**
 * Find a single order by ID, with all its items and product details.
 * This uses two queries — one for the order, one for the items.
 */
async function findById(orderId) {
  // Query 1: Get the order itself
  const orderResult = await db.query(
    'SELECT * FROM orders WHERE id = $1',
    [orderId]
  );
  const order = orderResult.rows[0];

  if (!order) return null;

  // Query 2: Get all items in this order, joined with product names
  const itemsResult = await db.query(
    `SELECT 
       oi.id,
       oi.quantity,
       oi.unit_price,
       oi.total_price,
       p.id   AS product_id,
       p.name AS product_name,
       p.sku  AS product_sku
     FROM order_items oi
     INNER JOIN products p ON p.id = oi.product_id
     WHERE oi.order_id = $1`,
    [orderId]
  );

  // Attach items to the order object and return it as one piece
  return { ...order, items: itemsResult.rows };
}

/**
 * Create a complete order in a single database transaction.
 * 
 * This is the most critical function in the entire codebase.
 * It does 4 things automically:
 *   1. Creates the order row
 *   2. Creates one order_item row per cart item
 *   3. Decrements stock on each product
 *   4. Deletes all cart items (empties the cart)
 * 
 * If anything fails, the entire transaction rolls back.
 * 
 * @param {object} orderData - { userId, addressId, subtotal, tax, shippingCost, total, notes }
 * @param {array}  cartItems - array of cart item objects from the cart repository
 */
async function createWithItems(orderData, cartItems) {
  // Step 1: Check out a dedicated client from the connection pool.
  // A transaction must run on a SINGLE connection — all queries must go
  // through this same client, not the pool directly.
  const client = await db.connect();

  try {
    // Step 2: Tell PostgreSQL we're starting a transaction.
    // From this point, nothing is permanent until we call COMMIT.
    await client.query('BEGIN');

    // Step 3: Create the order row.
    const orderResult = await client.query(
      `INSERT INTO orders (
         id, user_id, address_id, status,
         subtotal, tax, shipping_cost, total, notes,
         created_at, updated_at
       )
       VALUES (
         gen_random_uuid(), $1, $2, 'pending',
         $3, $4, $5, $6, $7,
         NOW(), NOW()
       )
       RETURNING *`,
      [
        orderData.userId,
        orderData.addressId,
        orderData.subtotal,
        orderData.tax,
        orderData.shippingCost,
        orderData.total,
        orderData.notes || null,
      ]
    );
    const order = orderResult.rows[0];

    // Step 4: Create one order_item row for each item in the cart.
    // We loop through cartItems and run an INSERT for each one.
    for (const item of cartItems) {
      // unit_price is snapshotted from the product's current price.
      // This means even if the price changes later, the order
      // permanently records what the customer actually paid.
      const unitPrice = parseFloat(item.product_price);
      const totalPrice = unitPrice * item.quantity;

      await client.query(
        `INSERT INTO order_items (
           id, order_id, product_id, quantity, unit_price, total_price, created_at
         )
         VALUES (
           gen_random_uuid(), $1, $2, $3, $4, $5, NOW()
         )`,
        [order.id, item.product_id, item.quantity, unitPrice, totalPrice]
      );

      // Step 5: Decrement stock for this product.
      // We subtract the ordered quantity from stock_quantity.
      await client.query(
        `UPDATE products 
         SET stock_quantity = stock_quantity - $1, updated_at = NOW()
         WHERE id = $2`,
        [item.quantity, item.product_id]
      );
    }

    // Step 6: Empty the cart by deleting all cart_items for this cart.
    await client.query(
      'DELETE FROM cart_items WHERE cart_id = $1',
      [orderData.cartId]
    );

    // Step 7: Everything succeeded — make it all permanent.
    await client.query('COMMIT');

    return order;
  } catch (err) {
    // Step 8: Something went wrong — undo EVERYTHING since BEGIN.
    // The database returns to exactly the state it was in before
    // we called BEGIN. No partial writes remain.
    await client.query('ROLLBACK');

    // Re-throw the error so the service layer can handle it.
    throw err;
  } finally {
    // Step 9: ALWAYS release the client back to the pool.
    // If we don't do this, the pool runs out of connections
    // and the entire app grinds to a halt.
    // finally{} runs whether we succeeded, failed, or threw — always.
    client.release();
  }
}

/**
 * Update the status of an order.
 * Only called by admins.
 */
async function updateStatus(orderId, status) {
  const result = await db.query(
    `UPDATE orders 
     SET status = $1, updated_at = NOW()
     WHERE id = $2
     RETURNING *`,
    [status, orderId]
  );
  return result.rows[0] || null;
}

module.exports = {
  findAllByUserId,
  findById,
  createWithItems,
  updateStatus,
};