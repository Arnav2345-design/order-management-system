const productService = require('../services/productService');

async function getAllProducts(req, res, next) {
  try {
    const { category, page, limit } = req.query;
    const products = await productService.getAllProducts({ category, page, limit });
    res.json({ products });
  } catch (err) {
    next(err);
  }
}

async function getProductById(req, res, next) {
  try {
    const product = await productService.getProductById(req.params.id);
    res.json({ product });
  } catch (err) {
    next(err);
  }
}

async function createProduct(req, res, next) {
  try {
    const product = await productService.createProduct(req.body);
    res.status(201).json({ product });
  } catch (err) {
    next(err);
  }
}

async function updateProduct(req, res, next) {
  try {
    const product = await productService.updateProduct(req.params.id, req.body);
    res.json({ product });
  } catch (err) {
    next(err);
  }
}

async function deleteProduct(req, res, next) {
  try {
    const product = await productService.deleteProduct(req.params.id);
    res.json({ message: 'Product deleted', product });
  } catch (err) {
    next(err);
  }
}

module.exports = { getAllProducts, getProductById, createProduct, updateProduct, deleteProduct };