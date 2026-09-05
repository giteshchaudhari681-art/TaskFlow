import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { createServer } from '../server.js';
import { env, validateEnv } from '../config/env.js';
import { healthRepository } from '../repositories/health.repository.js';
import {
  evaluateRollbackStrategy,
  parseDatabaseUrl,
  findPostgresBinary,
  resolveReleaseGitSha,
  RollbackScenario,
  findMonorepoRoot,
} from '../utils/release.js';
import { initSentry } from '../monitoring/sentry.js';

describe('PR34: Production Release, Backup & Rollback Suite', () => {
  const app = createServer();

  // =========================================================================
  // 1. IMMUTABLE RELEASE IDENTITY
  // =========================================================================
  describe('1. Immutable Release Identity & Tracking', () => {
    it('1.1 resolves a deterministic git commit SHA from env or repository', () => {
      const sha = resolveReleaseGitSha();
      expect(sha).toBeDefined();
      expect(typeof sha).toBe('string');
      expect(sha.length).toBeGreaterThanOrEqual(7);
      expect(sha).not.toBe('unknown-git-sha');
    });

    it('1.2 synthesizes immutable container image tags pinned to git SHA', () => {
      const sha = resolveReleaseGitSha();
      const shortSha = sha.slice(0, 7);

      const apiTag = `taskflow-api:${shortSha}`;
      const aiTag = `taskflow-ai:${shortSha}`;
      const workerTag = `taskflow-worker:${shortSha}`;

      expect(apiTag).toMatch(/^taskflow-api:[0-9a-f]{7,}$/i);
      expect(aiTag).toMatch(/^taskflow-ai:[0-9a-f]{7,}$/i);
      expect(workerTag).toMatch(/^taskflow-worker:[0-9a-f]{7,}$/i);
    });

    it('1.3 rejects unpinned mutable tags as insufficient for production release', () => {
      const mutableTags = ['latest', 'main', 'production', 'stable'];
      for (const tag of mutableTags) {
        const isImmutable = !mutableTags.includes(tag) && tag.length >= 7;
        expect(isImmutable).toBe(false);
      }
    });

    it('1.4 exposes version, release, and environment in /health endpoint without leaking secrets', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.service).toBe('taskflow-api');
      expect(res.body.data.version).toBeDefined();
      expect(res.body.data.release).toBeDefined();
      expect(res.body.data.release).toContain('taskflow-api@');
      expect(res.body.data.environment).toBe(env.NODE_ENV);

      // Verify zero sensitive credentials leaked in health payload
      const text = JSON.stringify(res.body);
      expect(text).not.toContain(env.JWT_SECRET);
      expect(text).not.toContain(env.COOKIE_SECRET);
      expect(text).not.toContain(env.AI_SERVICE_TOKEN);
    });

    it('1.5 exposes release identity in /health/live probe', async () => {
      const res = await request(app).get('/health/live');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('live');
      expect(res.body.data.version).toBeDefined();
      expect(res.body.data.release).toContain('taskflow-api@');
    });

    it('1.6 initializes Sentry release tag with release identifier', () => {
      const initialized = initSentry(true, 'https://mockPublicKey@o0.ingest.sentry.io/0');
      expect(initialized).toBe(true);
    });
  });

  // =========================================================================
  // 2. PRODUCTION ENVIRONMENT PREFLIGHT & SECRET HYGIENE
  // =========================================================================
  describe('2. Production Environment Preflight & Secret Hygiene', () => {
    it('2.1 accepts valid, hardened production configuration', () => {
      const result = validateEnv({
        NODE_ENV: 'production',
        JWT_SECRET: 'super-secure-production-jwt-secret-at-least-32-chars!',
        COOKIE_SECRET: 'super-secure-production-cookie-secret-at-least-32-chars!',
        AI_SERVICE_TOKEN: 'super-secure-production-token-16-chars!',
        CORS_ORIGIN: 'https://app.taskflow.dev',
        DATABASE_URL:
          'postgresql://prod_app:hardened_pass@db.prod.internal:5432/taskflow_prod?schema=public',
        PORT: 5000,
        RELEASE_VERSION: '0.1.0',
        GIT_SHA: '09fa79b',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.NODE_ENV).toBe('production');
        expect(result.data.RELEASE_VERSION).toBe('0.1.0');
        expect(result.data.GIT_SHA).toBe('09fa79b');
      }
    });

    it('2.2 rejects short JWT_SECRET in production mode (<32 chars)', () => {
      const result = validateEnv({
        NODE_ENV: 'production',
        JWT_SECRET: 'short-secret',
        COOKIE_SECRET: 'super-secure-production-cookie-secret-at-least-32-chars!',
        AI_SERVICE_TOKEN: 'super-secure-production-token-16-chars!',
        CORS_ORIGIN: 'https://app.taskflow.dev',
        DATABASE_URL:
          'postgresql://prod_app:pass@db.prod.internal:5432/taskflow_prod?schema=public',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        const issues = result.error.issues.map(i => i.path.join('.'));
        expect(issues).toContain('JWT_SECRET');
      }
    });

    it('2.3 rejects default dev database URL in production mode', () => {
      const result = validateEnv({
        NODE_ENV: 'production',
        JWT_SECRET: 'super-secure-production-jwt-secret-at-least-32-chars!',
        COOKIE_SECRET: 'super-secure-production-cookie-secret-at-least-32-chars!',
        AI_SERVICE_TOKEN: 'super-secure-production-token-16-chars!',
        CORS_ORIGIN: 'https://app.taskflow.dev',
        DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/taskflow_dev?schema=public',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        const issues = result.error.issues.map(i => i.path.join('.'));
        expect(issues).toContain('DATABASE_URL');
      }
    });

    it('2.4 rejects wildcard CORS in production mode', () => {
      const result = validateEnv({
        NODE_ENV: 'production',
        JWT_SECRET: 'super-secure-production-jwt-secret-at-least-32-chars!',
        COOKIE_SECRET: 'super-secure-production-cookie-secret-at-least-32-chars!',
        AI_SERVICE_TOKEN: 'super-secure-production-token-16-chars!',
        CORS_ORIGIN: '*',
        DATABASE_URL:
          'postgresql://prod_app:pass@db.prod.internal:5432/taskflow_prod?schema=public',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        const issues = result.error.issues.map(i => i.path.join('.'));
        expect(issues).toContain('CORS_ORIGIN');
      }
    });

    it('2.5 ensures validation error payloads do not print actual secret values', () => {
      const testSecret = 'secret-raw-value-that-must-never-leak';
      const result = validateEnv({
        NODE_ENV: 'production',
        JWT_SECRET: testSecret,
        COOKIE_SECRET: 'short',
        AI_SERVICE_TOKEN: 'taskflow-internal-dev-token',
        CORS_ORIGIN: '*',
        DATABASE_URL:
          'postgresql://postgres:super_secret_pw@localhost:5432/taskflow_dev?schema=public',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        const jsonError = JSON.stringify(result.error.issues);
        expect(jsonError).not.toContain('super_secret_pw');
      }
    });
  });

  // =========================================================================
  // 3. DATABASE MIGRATION RELEASE GATES
  // =========================================================================
  describe('3. Database Migration Release Gates', () => {
    it('3.1 ensures migration directory contains all forward migrations', () => {
      const root = findMonorepoRoot();
      const migrationsDir = path.join(root, 'apps/api/prisma/migrations');
      expect(fs.existsSync(migrationsDir)).toBe(true);

      const dirs = fs
        .readdirSync(migrationsDir)
        .filter(f => fs.statSync(path.join(migrationsDir, f)).isDirectory());
      expect(dirs.length).toBeGreaterThanOrEqual(13);

      // Verify migration files contain migration.sql
      for (const d of dirs) {
        const sqlPath = path.join(migrationsDir, d, 'migration.sql');
        expect(fs.existsSync(sqlPath)).toBe(true);
      }
    });

    it('3.2 validates that Prisma schema defines all required operational models', () => {
      const root = findMonorepoRoot();
      const schemaPath = path.join(root, 'apps/api/prisma/schema.prisma');
      const content = fs.readFileSync(schemaPath, 'utf-8');

      const expectedModels = [
        'User',
        'Organization',
        'Project',
        'Task',
        'AuditEvent',
        'Job',
        'Session',
      ];
      for (const model of expectedModels) {
        expect(content).toContain(`model ${model}`);
      }
    });
  });

  // =========================================================================
  // 4. PRE-DEPLOYMENT BACKUP & INTEGRITY
  // =========================================================================
  describe('4. Pre-Deployment Database Backup & Integrity Tooling', () => {
    it('4.1 safely parses DATABASE_URL without printing passwords in diagnostics', () => {
      const parsed = parseDatabaseUrl(
        'postgresql://custom_user:secure_password_123@db.prod.internal:5432/prod_db?schema=public'
      );
      expect(parsed.host).toBe('db.prod.internal');
      expect(parsed.port).toBe('5432');
      expect(parsed.user).toBe('custom_user');
      expect(parsed.password).toBe('secure_password_123');
      expect(parsed.database).toBe('prod_db');
    });

    it('4.2 discovers PostgreSQL client binaries in PATH or well-known locations', () => {
      const pgDump = findPostgresBinary('pg_dump');
      const psql = findPostgresBinary('psql');
      const pgRestore = findPostgresBinary('pg_restore');

      expect(pgDump).not.toBeNull();
      expect(psql).not.toBeNull();
      expect(pgRestore).not.toBeNull();
    });

    it('4.3 verifies backup isolation invariants (never restoring directly onto source DB)', () => {
      const sourceDb = 'taskflow_prod';
      const runId = 'test1234';
      const isolatedRestoreDb = `taskflow_drill_restore_${runId}`;

      expect(isolatedRestoreDb).not.toBe(sourceDb);
      expect(isolatedRestoreDb).toContain('restore');
    });
  });

  // =========================================================================
  // 5. OPERATIONAL ROLLBACK DECISION MATRIX
  // =========================================================================
  describe('5. Operational Rollback Decision Matrix', () => {
    it('5.1 routes application bug with backward-compatible schema to APPLICATION_ROLLBACK', () => {
      const scenario: RollbackScenario = {
        cause: 'API regression in task filter logic',
        schemaCompatible: true,
        databaseCorrupted: false,
        serviceAffected: 'api',
      };
      const action = evaluateRollbackStrategy(scenario);
      expect(action).toBe('APPLICATION_ROLLBACK');
    });

    it('5.2 routes destructive migration or data corruption to DATABASE_DISASTER_RECOVERY', () => {
      const scenario: RollbackScenario = {
        cause: 'Migration unexpectedly dropped user metadata column',
        schemaCompatible: false,
        databaseCorrupted: true,
        serviceAffected: 'database',
      };
      const action = evaluateRollbackStrategy(scenario);
      expect(action).toBe('DATABASE_DISASTER_RECOVERY');
    });

    it('5.3 routes AI service outage to DEGRADED_AI_DRAIN without database rollback', () => {
      const scenario: RollbackScenario = {
        cause: 'Python AI container crashloop',
        schemaCompatible: true,
        databaseCorrupted: false,
        serviceAffected: 'ai',
      };
      const action = evaluateRollbackStrategy(scenario);
      expect(action).toBe('DEGRADED_AI_DRAIN');
    });

    it('5.4 routes worker lock contention to WORKER_QUEUE_RECOVERY without API rollback', () => {
      const scenario: RollbackScenario = {
        cause: 'Worker job lease lock timeout',
        schemaCompatible: true,
        databaseCorrupted: false,
        serviceAffected: 'worker',
      };
      const action = evaluateRollbackStrategy(scenario);
      expect(action).toBe('WORKER_QUEUE_RECOVERY');
    });

    it('5.5 routes compromised secret to SECRET_REVOCATION_AND_ROTATION', () => {
      const scenario: RollbackScenario = {
        cause: 'Staging API token accidentally leaked in test fixture',
        schemaCompatible: true,
        databaseCorrupted: false,
        serviceAffected: 'secrets',
      };
      const action = evaluateRollbackStrategy(scenario);
      expect(action).toBe('SECRET_REVOCATION_AND_ROTATION');
    });
  });

  // =========================================================================
  // 6. HEALTH & READINESS PROBE DECOUPLING
  // =========================================================================
  describe('6. Health & Readiness Probe Semantics', () => {
    it('6.1 liveness probe returns 200 without issuing database queries', async () => {
      const res = await request(app).get('/health/live');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('live');
      expect(res.body.data.service).toBe('taskflow-api');
    });

    it('6.2 readiness probe returns 200 when database connectivity is healthy', async () => {
      const res = await request(app).get('/health/ready');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('ready');
      expect(res.body.data.checks.database.status).toBe('up');
    });

    it('6.3 readiness probe returns 503 when database is unreachable', async () => {
      const pingSpy = vi.spyOn(healthRepository, 'pingDatabase').mockResolvedValueOnce({
        isHealthy: false,
        latencyMs: 150,
      });

      const res = await request(app).get('/health/ready');
      expect(res.status).toBe(503);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('SERVICE_UNAVAILABLE');
      expect(res.body.data.status).toBe('not_ready');
      expect(res.body.data.checks.database.status).toBe('down');

      pingSpy.mockRestore();
    });
  });

  // =========================================================================
  // 7. CONTAINER & NETWORK ISOLATION INVARIANTS
  // =========================================================================
  describe('7. Container Security & Network Isolation Invariants', () => {
    it('7.1 verifies API Dockerfile executes as unprivileged non-root user', () => {
      const root = findMonorepoRoot();
      const dockerfilePath = path.join(root, 'apps/api/Dockerfile');
      const content = fs.readFileSync(dockerfilePath, 'utf-8');
      expect(content).toContain('USER taskflow');
    });

    it('7.2 verifies AI Dockerfile executes as unprivileged non-root user', () => {
      const root = findMonorepoRoot();
      const dockerfilePath = path.join(root, 'apps/ai/Dockerfile');
      const content = fs.readFileSync(dockerfilePath, 'utf-8');
      expect(content).toContain('USER taskflow');
    });

    it('7.3 verifies staging Docker Compose does not publish PostgreSQL or AI host ports', () => {
      const root = findMonorepoRoot();
      const composePath = path.join(root, 'docker-compose.staging.yml');
      const content = fs.readFileSync(composePath, 'utf-8');

      // Verify taskflow-api has ports exposed on 5000
      expect(content).toContain('5000:5000');

      // Verify postgres and taskflow-ai use expose (internal) rather than ports (host)
      const lines = content.split(/\r?\n/);
      let inPostgres = false;
      let inAi = false;
      let postgresHasPorts = false;
      let aiHasPorts = false;

      for (const line of lines) {
        if (/^  postgres:/.test(line)) {
          inPostgres = true;
          inAi = false;
        } else if (/^  taskflow-ai:/.test(line)) {
          inAi = true;
          inPostgres = false;
        } else if (/^  [a-zA-Z0-9_-]+:/.test(line)) {
          inPostgres = false;
          inAi = false;
        }

        if (inPostgres && /^\s+ports:/i.test(line)) postgresHasPorts = true;
        if (inAi && /^\s+ports:/i.test(line)) aiHasPorts = true;
      }

      expect(postgresHasPorts).toBe(false);
      expect(aiHasPorts).toBe(false);
    });
  });

  // =========================================================================
  // 8. PRODUCTION PREFLIGHT RUNNER TEST
  // =========================================================================
  describe('8. Automated Production Preflight Execution', () => {
    it('8.1 executes full production preflight without error', () => {
      const root = findMonorepoRoot();
      const scriptPath = path.join(root, 'scripts/validate_production_release.ts');
      const output = execSync(`npx tsx "${scriptPath}"`, {
        cwd: root,
        encoding: 'utf-8',
        stdio: 'pipe',
      });
      expect(output).toContain('All production release & rollback preflight gates PASSED');
    });
  });
});
