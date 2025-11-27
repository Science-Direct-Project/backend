const request = require('supertest');
const { setupTestDB, teardownTestDB, clearDatabase } = require('./setupTestDB');

let app;

describe('Admin API authorization', () => {
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

  test('GET /api/admin/dashboard should require authentication', async () => {
    const res = await request(app).get('/api/admin/dashboard').expect(401);

    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/access denied/i);
  });
});


