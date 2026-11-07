import { describe, it, expect, beforeAll, vi } from 'vitest';
import request from 'supertest';
import { createServer } from '../server.js';
import { healthRepository } from '../repositories/health.repository.js';

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

describe('Render Reverse-Proxy Rate Limiting Configuration & Health Exemption', () => {
  let app: any;

  beforeAll(() => {
    app = createServer();
  });

  it('1. trust proxy is set to 1 explicitly', () => {
    expect(app.get('trust proxy')).toBe(1);
  });

  it('2. ordinary API endpoints enforce rate limit after budget is exhausted and isolate by client IP', async () => {
    const ipA = '203.0.113.1';

    // 1st request to protected route (allowed)
    const res1 = await request(app).get('/docs').set('X-Forwarded-For', ipA);
    expect([200, 301]).toContain(res1.status);

    // 2nd request to protected route (allowed)
    const res2 = await request(app).get('/docs').set('X-Forwarded-For', ipA);
    expect([200, 301]).toContain(res2.status);

    // 3rd request to protected route (rate limited)
    const res3 = await request(app).get('/docs').set('X-Forwarded-For', ipA);
    expect(res3.status).toBe(429);
    expect(res3.body.success).toBe(false);
    expect(res3.body.error.code).toBe('RATE_LIMIT_EXCEEDED');

    // Requests from a different IP (ipB) receive their own budget and succeed
    const ipB = '203.0.113.2';
    const resB = await request(app).get('/docs').set('X-Forwarded-For', ipB);
    expect([200, 301]).toContain(resB.status);
  });

  it('3. root and versioned health endpoints are exempt from the global rate limiter', async () => {
    // ipA already exhausted its global application rate limit above
    const ipA = '203.0.113.1';

    // Verify root /health is accessible repeatedly
    for (let i = 0; i < 5; i++) {
      const res = await request(app).get('/health').set('X-Forwarded-For', ipA);
      expect([200, 503]).toContain(res.status);
      expect(res.status).not.toBe(429);
    }

    // Verify root /health/live is accessible repeatedly
    for (let i = 0; i < 5; i++) {
      const res = await request(app).get('/health/live').set('X-Forwarded-For', ipA);
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('live');
    }

    // Verify root /health/ready is accessible repeatedly (does not 429)
    for (let i = 0; i < 5; i++) {
      const res = await request(app).get('/health/ready').set('X-Forwarded-For', ipA);
      expect([200, 503]).toContain(res.status);
      expect(res.status).not.toBe(429);
    }

    // Verify versioned /api/v1/health is accessible repeatedly
    for (let i = 0; i < 5; i++) {
      const res = await request(app).get('/api/v1/health').set('X-Forwarded-For', ipA);
      expect([200, 503]).toContain(res.status);
      expect(res.status).not.toBe(429);
    }

    // Verify versioned /api/v1/health/live is accessible repeatedly
    for (let i = 0; i < 5; i++) {
      const res = await request(app).get('/api/v1/health/live').set('X-Forwarded-For', ipA);
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('live');
    }

    // Verify versioned /api/v1/health/ready is accessible repeatedly (does not 429)
    for (let i = 0; i < 5; i++) {
      const res = await request(app).get('/api/v1/health/ready').set('X-Forwarded-For', ipA);
      expect([200, 503]).toContain(res.status);
      expect(res.status).not.toBe(429);
    }
  });

  it('4. health readiness still accurately reflects database status without masking failures', async () => {
    const pingSpy = vi.spyOn(healthRepository, 'pingDatabase');

    try {
      // Case A: Database healthy -> 200
      pingSpy.mockResolvedValueOnce({ isHealthy: true, latencyMs: 5 });
      const readyRes = await request(app).get('/health/ready');
      expect(readyRes.status).toBe(200);
      expect(readyRes.body.data.status).toBe('ready');

      // Case B: Database down -> 503 SERVICE_UNAVAILABLE (not 429)
      pingSpy.mockResolvedValueOnce({ isHealthy: false, latencyMs: 150 });
      const downRes = await request(app).get('/health/ready');
      expect(downRes.status).toBe(503);
      expect(downRes.body.data.status).toBe('not_ready');
      expect(downRes.body.error.code).toBe('SERVICE_UNAVAILABLE');
    } finally {
      pingSpy.mockRestore();
    }
  });
});
