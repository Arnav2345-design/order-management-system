// src/services/productService.js

const productRepository = require('../repositories/productRepository');
const AppError = require('../utils/AppError');
const cache = require('../utils/cache');

async function getAllProducts({ category, page = 1, limit = 20 }) {
  // Build a cache key that uniquely identifies this exact query.
  // Different combinations of category/page/limit get their own cache entry.
  // Example: "products:list:electronics:1:20"
  const cacheKey = `products:list:${category || 'all'}:${page}:${limit}`;

  // Step 1: Check the cache first
  const cached = await cache.get(cacheKey);
  if (cached) {
    // Cache hit — return immediately without touching the database
    console.log('Cache hit:', cacheKey);
    return cached;
  }

  // Step 2: Cache miss — fetch from database
  console.log('Cache miss:', cacheKey);
  const offset = (page - 1) * limit;
  const products = await productRepository.findAll({ category, limit, offset });

  // Step 3: Store in cache for next time
  await cache.set(cacheKey, products, cache.TTL.PRODUCT_LIST);

  return products;
}

async function getProductById(id) {
  // Each product gets its own cache key based on its ID
  const cacheKey = `products:single:${id}`;

  // Step 1: Check cache
  const cached = await cache.get(cacheKey);
  if (cached) {
    console.log('Cache hit:', cacheKey);
    return cached;
  }

  // Step 2: Cache miss — fetch from database
  console.log('Cache miss:', cacheKey);
  const product = await productRepository.findById(id);

  if (!product) {
    throw new AppError('Product not found', 404);
  }

  // Step 3: Store in cache
  await cache.set(cacheKey, product, cache.TTL.SINGLE_PRODUCT);

  return product;
}

async function createProduct(data) {
  if (!data.name || !data.price) {
    throw new AppError('name and price are required', 400);
  }

  const product = await productRepository.create(data);

  // Invalidate the product list cache so the new product appears immediately.
  // We delete ALL list cache entries because the new product should appear
  // in every category/page combination.
  await cache.delPattern('products:list:*');

  return product;
}

async function updateProduct(id, data) {
  const product = await productRepository.update(id, data);

  if (!product) {
    throw new AppError('Product not found', 404);
  }

  // Invalidate both the specific product cache and all list caches.
  // The list might show the old name/price, so both must be cleared.
  await cache.del(`products:single:${id}`);
  await cache.delPattern('products:list:*');

  return product;
}

async function deleteProduct(id) {
  const product = await productRepository.remove(id);

  if (!product) {
    throw new AppError('Product not found', 404);
  }

  // Same invalidation as update
  await cache.del(`products:single:${id}`);
  await cache.delPattern('products:list:*');

  return product;
}

module.exports = { getAllProducts, getProductById, createProduct, updateProduct, deleteProduct };