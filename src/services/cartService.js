// src/services/cartService.js

const cartRepository = require('../repositories/cartRepository');
const productRepository = require('../repositories/productRepository');
const AppError = require('../utils/AppError');

/**
 * Get (or create) the current user's cart, with all items attached.
 * 
 * "Get or create" is a very common pattern: try to find the thing,
 * and if it doesn't exist yet, make it. This way the caller never
 * has to worry about whether the cart exists.
 */
async function getOrCreateCart(userId) {
  // Step 1: Try to find an existing cart for this user.
  let cart = await cartRepository.findCartByUserId(userId);

  // Step 2: If no cart exists yet, create one now.
  if (!cart) {
    cart = await cartRepository.createCart(userId);
  }

  // Step 3: Fetch all items currently in this cart (may be empty array).
  const items = await cartRepository.findItemsByCartId(cart.id);

  // Step 4: Calculate the total price so the frontend doesn't have to.
  // reduce() walks through every item and accumulates a running total.
  // Starting value is 0 (the second argument to reduce).
  const totalPrice = items.reduce((sum, item) => {
    // item.product_price comes from our JOIN in the repository.
    // We multiply price × quantity for each line item.
    return sum + (parseFloat(item.product_price) * item.quantity);
  }, 0);

  // Return the cart, its items, and the computed total as one object.
  return {
    ...cart,           // Spread all cart fields (id, user_id, created_at, etc.)
    items,
    totalPrice: parseFloat(totalPrice.toFixed(2)), // Round to 2 decimal places
  };
}

/**
 * Add a product to the cart, or update its quantity if already present.
 * 
 * This is the most complex function because it has the most rules to enforce.
 */
async function addItemToCart(userId, productId, quantity) {
  // ── Rule 1: The product must exist and be active ──────────────────────────
  const product = await productRepository.findById(productId);

  if (!product) {
    throw new AppError('Product not found', 404);
  }

  if (!product.is_active) {
    throw new AppError('This product is no longer available', 400);
  }

  // ── Rule 2: Requested quantity must be positive ───────────────────────────
  if (quantity < 1) {
    throw new AppError('Quantity must be at least 1', 400);
  }

  // ── Rule 3: Get or create this user's cart ────────────────────────────────
  // We call findCartByUserId (not getOrCreateCart) because we only want
  // the cart row itself here, not the full cart-with-items response.
  let cart = await cartRepository.findCartByUserId(userId);
  if (!cart) {
    cart = await cartRepository.createCart(userId);
  }

  // ── Rule 4: Check if this product is already in the cart ──────────────────
  const existingItem = await cartRepository.findCartItemByProduct(cart.id, productId);

  if (existingItem) {
    // The product is already in the cart. We ADD the new quantity to the existing one.
    // Example: cart has 2, user adds 3 → new quantity is 5.
    const newQuantity = existingItem.quantity + quantity;

    // ── Rule 5: Total quantity cannot exceed available stock ─────────────────
    if (newQuantity > product.stock_quantity) {
      throw new AppError(
        `Cannot add ${quantity} more. Only ${product.stock_quantity - existingItem.quantity} additional units available.`,
        400
      );
    }

    // Update the existing cart item row with the new combined quantity.
    await cartRepository.updateCartItemQuantity(existingItem.id, newQuantity);
  } else {
    // The product is NOT in the cart yet. We're inserting a fresh row.

    // ── Rule 5 (again): Requested quantity cannot exceed stock ───────────────
    if (quantity > product.stock_quantity) {
      throw new AppError(
        `Only ${product.stock_quantity} units available`,
        400
      );
    }

    await cartRepository.createCartItem(cart.id, productId, quantity);
  }

  // Return the full updated cart (consistent response shape every time).
  return getOrCreateCart(userId);
}

/**
 * Update the quantity of a specific item already in the cart.
 * 
 * This is different from addItem — the user is setting an absolute
 * quantity, not adding to it. Example: "I want exactly 4 of this."
 */
async function updateCartItem(userId, itemId, quantity) {
  // ── Find the cart item and verify it belongs to this user ─────────────────
  const item = await cartRepository.findCartItemById(itemId);

  if (!item) {
    throw new AppError('Cart item not found', 404);
  }

  // Security check: fetch this user's cart and confirm the item belongs to it.
  // Without this check, any authenticated user could modify anyone else's cart
  // just by guessing item IDs.
  const cart = await cartRepository.findCartByUserId(userId);

  if (!cart || item.cart_id !== cart.id) {
    // We return 404 here (not 403 Forbidden) intentionally.
    // Returning 403 would confirm the item EXISTS but belongs to someone else —
    // that leaks information. 404 reveals nothing.
    throw new AppError('Cart item not found', 404);
  }

  // ── If quantity is 0, treat it as a remove operation ─────────────────────
  if (quantity === 0) {
    await cartRepository.deleteCartItem(itemId);
    return getOrCreateCart(userId);
  }

  // ── Quantity must be positive ─────────────────────────────────────────────
  if (quantity < 0) {
    throw new AppError('Quantity cannot be negative', 400);
  }

  // ── Validate against current stock ───────────────────────────────────────
  const product = await productRepository.findById(item.product_id);

  if (!product || !product.is_active) {
    throw new AppError('This product is no longer available', 400);
  }

  if (quantity > product.stock_quantity) {
    throw new AppError(
      `Only ${product.stock_quantity} units available`,
      400
    );
  }

  await cartRepository.updateCartItemQuantity(itemId, quantity);
  return getOrCreateCart(userId);
}

/**
 * Remove a specific item from the cart entirely.
 */
async function removeCartItem(userId, itemId) {
  const item = await cartRepository.findCartItemById(itemId);

  if (!item) {
    throw new AppError('Cart item not found', 404);
  }

  // Same ownership check as in updateCartItem.
  const cart = await cartRepository.findCartByUserId(userId);

  if (!cart || item.cart_id !== cart.id) {
    throw new AppError('Cart item not found', 404);
  }

  await cartRepository.deleteCartItem(itemId);
  return getOrCreateCart(userId);
}

module.exports = {
  getOrCreateCart,
  addItemToCart,
  updateCartItem,
  removeCartItem,
};