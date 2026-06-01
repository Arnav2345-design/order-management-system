// tests/products.test.js

const request = require('supertest');
const { app, clearDatabase, createUserAndLogin, createProduct } = require('./helpers');

beforeEach(async () => {
  await clearDatabase();
});

describe('GET /api/products', () => {
  it('returns empty array when no products exist', async () => {
    const response = await request(app).get('/api/products');

    expect(response.status).toBe(200);
    expect(response.body.products).toBeDefined();
    expect(response.body.products).toHaveLength(0);
  });

  it('returns list of active products', async () => {
    // Create two products directly in the database
    await createProduct({ name: 'Product A', sku: 'SKU-A' });
    await createProduct({ name: 'Product B', sku: 'SKU-B' });

    const response = await request(app).get('/api/products');

    expect(response.status).toBe(200);
    expect(response.body.products).toHaveLength(2);
  });

  it('does not return inactive products', async () => {
    await createProduct({ name: 'Active Product', sku: 'SKU-ACTIVE' });
    // Create an inactive product directly via SQL
    const pool = require('../src/config/database');
    await pool.query(
      `INSERT INTO products (name, price, stock_quantity, sku, is_active)
       VALUES ('Inactive Product', 100, 10, 'SKU-INACTIVE', false)`
    );

    const response = await request(app).get('/api/products');

    expect(response.status).toBe(200);
    expect(response.body.products).toHaveLength(1);
    expect(response.body.products[0].name).toBe('Active Product');
  });
});

describe('GET /api/products/:id', () => {
  it('returns a single product by id', async () => {
    const product = await createProduct({ name: 'Test Product', sku: 'SKU-1' });

    const response = await request(app).get(`/api/products/${product.id}`);

    expect(response.status).toBe(200);
    expect(response.body.product.id).toBe(product.id);
    expect(response.body.product.name).toBe('Test Product');
  });

  it('returns 404 for non-existent product', async () => {
    const response = await request(app)
      .get('/api/products/00000000-0000-0000-0000-000000000000');

    expect(response.status).toBe(404);
  });
});