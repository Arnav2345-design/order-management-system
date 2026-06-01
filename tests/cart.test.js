// tests/cart.test.js

const request = require('supertest');
const { app, clearDatabase, createUserAndLogin, createProduct } = require('./helpers');

beforeEach(async () => {
  await clearDatabase();
});

describe('GET /api/cart', () => {
  it('returns empty cart for new user', async () => {
    const { token } = await createUserAndLogin();

    const response = await request(app)
      .get('/api/cart')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.data.cart.items).toHaveLength(0);
  });

  it('requires authentication', async () => {
    const response = await request(app).get('/api/cart');
    expect(response.status).toBe(401);
  });
});

describe('POST /api/cart/items', () => {
  it('adds a product to the cart', async () => {
    const { token } = await createUserAndLogin();
    const product = await createProduct({ sku: 'SKU-CART-1' });

    const response = await request(app)
      .post('/api/cart/items')
      .set('Authorization', `Bearer ${token}`)
      .send({ productId: product.id, quantity: 2 });

    expect(response.status).toBe(200);

    // Verify the item is in the cart
    const cartResponse = await request(app)
      .get('/api/cart')
      .set('Authorization', `Bearer ${token}`);

    expect(cartResponse.body.data.cart.items).toHaveLength(1);
    expect(cartResponse.body.data.cart.items[0].quantity).toBe(2);
  });

  it('rejects adding non-existent product', async () => {
    const { token } = await createUserAndLogin();

    const response = await request(app)
      .post('/api/cart/items')
      .set('Authorization', `Bearer ${token}`)
      .send({ productId: '00000000-0000-0000-0000-000000000000', quantity: 1 });

    expect(response.status).toBe(404);
  });

  it('rejects quantity exceeding stock', async () => {
    const { token } = await createUserAndLogin();
    // Create product with only 5 in stock
    const product = await createProduct({ sku: 'SKU-LOW-STOCK', stockQuantity: 5 });

    const response = await request(app)
      .post('/api/cart/items')
      .set('Authorization', `Bearer ${token}`)
      .send({ productId: product.id, quantity: 10 });

    expect(response.status).toBe(400);
  });
});