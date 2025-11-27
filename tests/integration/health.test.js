const request = require('supertest');
const { setupTestDB, teardownTestDB, clearDatabase } = require('./setupTestDB');

let app;

describe('Health and fallback endpoints', () => {
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

  test('GET /health should return OK status', async () => {
    const res = await request(app).get('/health').expect(200);

    expect(res.body.status).toBe('OK');
    expect(res.body.timestamp).toBeDefined();
  });

  test('GET unknown route should return 404 JSON response', async () => {
    const res = await request(app).get('/non-existent-route').expect(404);

    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/route not found/i);
  });
});


