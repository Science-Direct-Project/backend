const request = require('supertest');
const mongoose = require('mongoose');
const { setupTestDB, teardownTestDB, clearDatabase } = require('./setupTestDB');

let app;

describe('Auth API endpoints', () => {
  beforeAll(async () => {
    await setupTestDB();
    app = require('../../app');
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  afterEach(async () => {
    await clearDatabase();
  });

  const registerPayload = {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    password: 'password123',
    affiliation: 'Test University',
    country: 'Testland',
  };

  test('POST /api/auth/register should create a new user and return token', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send(registerPayload)
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.user).toBeDefined();
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user.email).toBe(registerPayload.email.toLowerCase());
  });

  test('POST /api/auth/register should not allow duplicate email', async () => {
    await request(app).post('/api/auth/register').send(registerPayload).expect(201);

    const res = await request(app)
      .post('/api/auth/register')
      .send(registerPayload)
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/already exists/i);
  });

  test('POST /api/auth/register should validate required fields', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'invalid', password: '123' })
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.errors).toBeInstanceOf(Array);
  });

  test('POST /api/auth/login should login existing user and return token', async () => {
    // First register a user
    await request(app).post('/api/auth/register').send(registerPayload).expect(201);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: registerPayload.email, password: registerPayload.password })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user.email).toBe(registerPayload.email.toLowerCase());
  });

  test('POST /api/auth/login should reject invalid credentials', async () => {
    await request(app).post('/api/auth/register').send(registerPayload).expect(201);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: registerPayload.email, password: 'wrong-password' })
      .expect(401);

    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/invalid credentials/i);
  });

  test('GET /api/auth/profile should return user profile when authenticated', async () => {
    const registerRes = await request(app)
      .post('/api/auth/register')
      .send(registerPayload)
      .expect(201);

    const token = registerRes.body.data.token;

    const res = await request(app)
      .get('/api/auth/profile')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe(registerPayload.email.toLowerCase());
  });

  test('GET /api/auth/profile should return 401 when no token provided', async () => {
    const res = await request(app).get('/api/auth/profile').expect(401);

    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/no token provided/i);
  });
});


