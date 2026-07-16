const request = require('supertest');
const app = require('../app');

describe('GET /health', () => {
  it('should return 200 OK and health status', async () => {
    const res = await request(app).get('/health');
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('OK');
    expect(res.body.timestamp).toBeDefined();
  });
});

describe('GET /invalid-route-error', () => {
  it('should return 404 Not Found error response structure', async () => {
    const res = await request(app).get('/invalid-route-error');
    expect(res.statusCode).toBe(404);
    expect(res.body.statusCode).toBe(404);
    expect(res.body.error).toBe('Error');
    expect(res.body.message).toBe('Not Found');
  });
});
