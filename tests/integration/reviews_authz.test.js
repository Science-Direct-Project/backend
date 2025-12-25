const request = require('supertest');
const { setupTestDB, teardownTestDB, clearDatabase } = require('./setupTestDB');

let app;

describe('Review API basic authorization', () => {
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

  test('GET /api/reviews/my-reviews should require authentication', async () => {
    const res = await request(app).get('/api/reviews/my-reviews').expect(401);

    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/access denied/i);
  });
});


