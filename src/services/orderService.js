// src/services/orderService.js

const orderRepository = require('../repositories/orderRepository');
const addressRepository = require('../repositories/addressRepository');
const cartRepository = require('../repositories/cartRepository');
const productRepository = require('../repositories/productRepository');
const AppError = require('../utils/AppError');
const config = require('../config');
const { ORDER_STATUSES } = require('../utils/constants');

/**
 * Place an order from the current user's cart.
 */
async function placeOrder(userId, { addressId, notes }) {
  // ── Rule 1: The address must exist and belong to this user ────────────────
  const address = await addressRepository.findById(addressId);

  if (!address) {
    throw new AppError('Address not found', 404);
  }

  if (address.user_id !== userId) {
    // Same 404 trick as the cart — don't reveal the address exists
    throw new AppError('Address not found', 404);
  }

  // ── Rule 2: The user must have a cart with items in it ────────────────────
  const cart = await cartRepository.findCartByUserId(userId);

  if (!cart) {
    throw new AppError('Your cart is empty', 400);
  }

  const cartItems = await cartRepository.findItemsByCartId(cart.id);

  if (cartItems.length === 0) {
    throw new AppError('Your cart is empty', 400);
  }

  // ── Rule 3: Re-validate stock for every item at checkout time ─────────────
  // We do this BEFORE the transaction to fail fast with a clear error message.
  for (const item of cartItems) {
    const product = await productRepository.findById(item.product_id);

    if (!product || !product.is_active) {
      throw new AppError(
        `"${item.product_name}" is no longer available`,
        400
      );
    }

    if (item.quantity > product.stock_quantity) {
      throw new AppError(
        `Only ${product.stock_quantity} units of "${item.product_name}" available`,
        400
      );
    }
  }

  // ── Rule 4: Calculate totals ──────────────────────────────────────────────
  // Subtotal: sum of (price × quantity) for all items
  const subtotal = cartItems.reduce((sum, item) => {
    return sum + (parseFloat(item.product_price) * item.quantity);
  }, 0);

  const tax = parseFloat((subtotal * config.order.taxRate).toFixed(2));
  const shippingCost = config.order.shippingCost;
  const total = parseFloat((subtotal + tax + shippingCost).toFixed(2));

  // ── Rule 5: Create the order in a transaction ─────────────────────────────
  const order = await orderRepository.createWithItems(
    {
      userId,
      addressId,
      subtotal: parseFloat(subtotal.toFixed(2)),
      tax,
      shippingCost,
      total,
      notes,
      cartId: cart.id,
    },
    cartItems
  );

  // Return the full order with items attached
  return orderRepository.findById(order.id);
}

/**
 * Get one page of orders for the current user, plus pagination metadata.
 *
 * "offset" is how many rows the database should skip before it starts
 * returning results. Page 1 skips nothing (offset 0). Page 2 skips the
 * first `limit` rows. The formula is: offset = (page - 1) * limit.
 *
 * "totalPages" tells the frontend how many "Next" clicks are possible.
 * Math.ceil rounds UP — e.g. 41 orders at 20 per page = 2.05 → 3 pages,
 * because that 41st order still needs a page to live on.
 */
async function getMyOrders(userId, { page, limit }) {
  const offset = (page - 1) * limit;

  const [orders, total] = await Promise.all([
    orderRepository.findAllByUserId(userId, { limit, offset }),
    orderRepository.countByUserId(userId),
  ]);

  return {
    orders,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Get a single order by ID.
 * Verifies ownership — customers can only see their own orders.
 */
async function getOrderById(userId, orderId, userRole) {
  const order = await orderRepository.findById(orderId);

  if (!order) {
    throw new AppError('Order not found', 404);
  }

  // Admins can see any order. Customers can only see their own.
  if (userRole !== 'admin' && order.user_id !== userId) {
    throw new AppError('Order not found', 404);
  }

  return order;
}

/**
 * Update an order's status.
 * Only admins can call this.
 */
async function updateOrderStatus(orderId, status) {
  // Validate that the status is one of the allowed enum values
  if (!ORDER_STATUSES.includes(status)) {
    throw new AppError(
      `Invalid status. Must be one of: ${ORDER_STATUSES.join(', ')}`,
      400
    );
  }

  const order = await orderRepository.updateStatus(orderId, status);

  if (!order) {
    throw new AppError('Order not found', 404);
  }

  return order;
}

module.exports = { placeOrder, getMyOrders, getOrderById, updateOrderStatus };