// tests/orders.test.js

const request = require('supertest');
const {
  app,
  clearDatabase,
  createUserAndLogin,
  createProduct,
  createAddress,
} = require('./helpers');

beforeEach(async () => {
  await clearDatabase();
});

describe('POST /api/orders', () => {
  it('places an order from cart items', async () => {
    const { user, token } = await createUserAndLogin();
    const product = await createProduct({ sku: 'SKU-ORDER-1', price: 500 });
    const address = await createAddress(user.id);

    // Add item to cart first
    await request(app)
      .post('/api/cart/items')
      .set('Authorization', `Bearer ${token}`)
      .send({ productId: product.id, quantity: 2 });

    // Place the order
    const response = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({ addressId: address.id });

    expect(response.status).toBe(201);
    expect(response.body.data.order).toBeDefined();
    expect(response.body.data.order.items).toHaveLength(1);
    // 2 items at 500 each = 1000 subtotal + 18% tax (180) + 50 shipping = 1230
    expect(parseFloat(response.body.data.order.total)).toBe(1230);
  });

  it('rejects order with empty cart', async () => {
    const { user, token } = await createUserAndLogin();
    const address = await createAddress(user.id);

    const response = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({ addressId: address.id });

    expect(response.status).toBe(400);
  });

  it('rejects order with invalid address', async () => {
    const { token } = await createUserAndLogin();
    const product = await createProduct({ sku: 'SKU-ORDER-2' });

    await request(app)
      .post('/api/cart/items')
      .set('Authorization', `Bearer ${token}`)
      .send({ productId: product.id, quantity: 1 });

    const response = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({ addressId: '00000000-0000-0000-0000-000000000000' });

    expect(response.status).toBe(404);
  });

  it('requires authentication', async () => {
    const response = await request(app)
      .post('/api/orders')
      .send({ addressId: '00000000-0000-0000-0000-000000000000' });

    expect(response.status).toBe(401);
  });
});

describe('GET /api/orders', () => {
  it('returns list of orders for the current user', async () => {
    const { user, token } = await createUserAndLogin();
    const product = await createProduct({ sku: 'SKU-LIST-1' });
    const address = await createAddress(user.id);

    // Place an order
    await request(app)
      .post('/api/cart/items')
      .set('Authorization', `Bearer ${token}`)
      .send({ productId: product.id, quantity: 1 });

    await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({ addressId: address.id });

    const response = await request(app)
      .get('/api/orders')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.data.orders).toHaveLength(1);
  });
});