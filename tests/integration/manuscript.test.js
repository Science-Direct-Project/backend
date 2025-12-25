// tests/integration/manuscript.test.js
const request = require('supertest');
const app = require('../../app');
const User = require('../../models/User');
const Manuscript = require('../../models/Manuscript');

describe('Manuscript API', () => {
  let authorToken;
  let authorId;

  beforeAll(async () => {
    // Setup test user
    const author = new User({
      firstName: 'Test',
      lastName: 'Author',
      email: 'author@test.com',
      password: 'password123',
      roles: { author: true }
    });
    await author.save();
    authorId = author._id;

    // Login to get token
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'author@test.com',
        password: 'password123'
      });
    authorToken = res.body.data.token;
  });

  it('should submit a manuscript', async () => {
    const res = await request(app)
      .post('/api/manuscripts/submit')
      .set('Authorization', `Bearer ${authorToken}`)
      .field('title', 'Test Manuscript')
      .field('abstract', 'This is a test abstract')
      .field('domain', 'Computer Science')
      .field('keywords', 'test, manuscript')
      .attach('manuscript', 'test/files/test.pdf');

    expect(res.statusCode).toEqual(201);
    expect(res.body.success).toBe(true);
  });
});