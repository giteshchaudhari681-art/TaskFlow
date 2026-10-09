import { describe, it, expect, beforeAll, vi } from 'vitest';
import request from 'supertest';
import { createServer } from '../server.js';

// Safely mock the env module before any imports use it
vi.mock('../config/env.js', async importOriginal => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    env: {
      ...actual.env,
      NODE_ENV: 'production',
      RATE_LIMIT_MAX: 2,
      RATE_LIMIT_WINDOW_MS: 60000,
    },
  };
});

describe('Render Reverse-Proxy Rate Limiting Configuration', () => {
  let app: any;

  beforeAll(() => {
    app = createServer();
  });

  it('1. correctly parses X-Forwarded-For and respects rate limits', async () => {
    const ipA = '203.0.113.1';

    // 1st request (allowed)
    const res1 = await request(app).get('/api/v1/health').set('X-Forwarded-For', ipA);
    expect(res1.status).toBe(200);

    // 2nd request (allowed)
    const res2 = await request(app).get('/api/v1/health').set('X-Forwarded-For', ipA);
    expect(res2.status).toBe(200);

    // 3rd request (rate limited)
    const res3 = await request(app).get('/api/v1/health').set('X-Forwarded-For', ipA);
    expect(res3.status).toBe(429);
    expect(res3.body.success).toBe(false);
    expect(res3.body.error.code).toBe('RATE_LIMIT_EXCEEDED');

    // Requests from a different IP should still be allowed
    const ipB = '203.0.113.2';
    const resB = await request(app).get('/api/v1/health').set('X-Forwarded-For', ipB);
    expect(resB.status).toBe(200);
  });

  it('2. trust proxy is set to 1 explicitly', () => {
    expect(app.get('trust proxy')).toBe(1);
  });
});
