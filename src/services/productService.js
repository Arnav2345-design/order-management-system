const productRepository = require('../repositories/productRepository');
const AppError = require('../utils/AppError');

async function getAllProducts({ category, page = 1, limit = 20 }) {
  const offset = (page - 1) * limit;
  return productRepository.findAll({ category, limit, offset });
}

async function getProductById(id) {
  const product = await productRepository.findById(id);
  if (!product) {
    throw new AppError('Product not found', 404);
  }
  return product;
}

async function createProduct(data) {
  if (!data.name || !data.price) {
    throw new AppError('name and price are required', 400);
  }
  return productRepository.create(data);
}

async function updateProduct(id, data) {
  const product = await productRepository.update(id, data);
  if (!product) {
    throw new AppError('Product not found', 404);
  }
  return product;
}

async function deleteProduct(id) {
  const product = await productRepository.remove(id);
  if (!product) {
    throw new AppError('Product not found', 404);
  }
  return product;
}

module.exports = { getAllProducts, getProductById, createProduct, updateProduct, deleteProduct };