// tests/auth.test.js

const request = require('supertest');
const { app, clearDatabase } = require('./helpers');

// beforeEach runs before every single test in this file
// It wipes the database so tests don't interfere with each other
beforeEach(async () => {
  await clearDatabase();
});

describe('POST /api/auth/register', () => {
  it('registers a new user and returns a token', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        password: 'password123',
      });

    // HTTP status should be 201 Created
    expect(response.status).toBe(201);
    // Response should contain a token
    expect(response.body.token).toBeDefined();
    // Response should contain user data
    expect(response.body.user.email).toBe('john@example.com');
    // Password hash must never be returned
    expect(response.body.user.password_hash).toBeUndefined();
  });

  it('rejects duplicate email with 409', async () => {
    // Register once
    await request(app)
      .post('/api/auth/register')
      .send({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        password: 'password123',
      });

    // Register again with same email
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'john@example.com',
        password: 'password456',
      });

    expect(response.status).toBe(409);
  });

  it('rejects missing fields with 400', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({ email: 'incomplete@example.com' });

    expect(response.status).toBe(400);
  });
});

describe('POST /api/auth/login', () => {
  it('logs in with correct credentials and returns a token', async () => {
    // Register first
    await request(app)
      .post('/api/auth/register')
      .send({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        password: 'password123',
      });

    // Then login
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'john@example.com', password: 'password123' });

    expect(response.status).toBe(200);
    expect(response.body.token).toBeDefined();
    expect(response.body.user.password_hash).toBeUndefined();
  });

  it('rejects wrong password with 401', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        password: 'password123',
      });

    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'john@example.com', password: 'wrongpassword' });

    expect(response.status).toBe(401);
  });

  it('rejects non-existent email with 401', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@example.com', password: 'password123' });

    expect(response.status).toBe(401);
  });
});

describe('POST /api/auth/logout', () => {
  it('logs out and invalidates the token', async () => {
    // Register and get token
    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        password: 'password123',
      });

    const token = registerResponse.body.token;

    // Logout
    const logoutResponse = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${token}`);

    expect(logoutResponse.status).toBe(200);

    // Token should now be dead
    const profileResponse = await request(app)
      .get('/api/users/profile')
      .set('Authorization', `Bearer ${token}`);

    expect(profileResponse.status).toBe(401);
  });
});