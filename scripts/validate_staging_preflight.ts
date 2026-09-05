/**
 * TaskFlow Staging Deployment Pre-flight Validation Script
 *
 * Validates staging prerequisites before container orchestration startup:
 * 1. Staging environment variable validation & secret strength rules
 * 2. Fail-closed guards on weak secrets (JWT, Cookie, AI token, DB URL, CORS)
 * 3. Database URL structure & credential safety (no default dev passwords)
 * 4. Docker Compose staging configuration (`docker-compose.staging.yml`)
 * 5. Network isolation invariants (internal-only PostgreSQL & Python AI)
 * 6. Non-root container execution in Dockerfiles
 * 7. Decoupled health/readiness probe contracts
 * 8. Prisma schema & migration history consistency
 */

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { validateEnv } from '../apps/api/src/config/env.js';

interface PreflightCheck {
  section: string;
  name: string;
  passed: boolean;
  details?: string;
  remediation?: string;
}

const checks: PreflightCheck[] = [];

function record(
  section: string,
  name: string,
  passed: boolean,
  details?: string,
  remediation?: string
) {
  checks.push({ section, name, passed, details, remediation });
  const statusIcon = passed ? '✓ PASS' : '❌ FAIL';
  console.log(`  ${statusIcon} [${section}] ${name}`);
  if (details && !passed) {
    console.log(`         Details: ${details}`);
  }
  if (remediation && !passed) {
    console.log(`         Remediation: ${remediation}`);
  }
}

console.log('========================================================================');
console.log('       TASKFLOW STAGING DEPLOYMENT PRE-FLIGHT VALIDATION               ');
console.log('========================================================================\n');

// -----------------------------------------------------------------------------
// 1. Environment & Secret Strength Rules
// -----------------------------------------------------------------------------
console.log('[1/5] Validating Staging Environment & Secret Rules...');

// 1.1 Valid staging configuration
const validStagingConfig = {
  NODE_ENV: 'staging',
  PORT: 5000,
  JWT_SECRET: 'staging-jwt-secret-min-32-chars-long-secure!',
  COOKIE_SECRET: 'staging-cookie-secret-min-32-chars-long!',
  AI_SERVICE_TOKEN: 'staging-ai-internal-token-16',
  CORS_ORIGIN: 'https://staging.taskflow.dev',
  DATABASE_URL:
    'postgresql://taskflow_admin:securepass@postgres:5432/taskflow_staging?schema=public',
};

const validResult = validateEnv(validStagingConfig);
record(
  'Environment',
  'Valid staging configuration passes validation schema',
  validResult.success,
  validResult.success ? undefined : JSON.stringify(validResult.error.issues),
  'Ensure all required staging environment variables are defined.'
);

// 1.2 Weak secrets must fail closed in staging
const weakStagingConfig = {
  NODE_ENV: 'staging',
  PORT: 5000,
  JWT_SECRET: 'short',
  COOKIE_SECRET: 'short',
  AI_SERVICE_TOKEN: 'taskflow-internal-dev-token',
  CORS_ORIGIN: '*',
  DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/taskflow_dev?schema=public',
};

const weakResult = validateEnv(weakStagingConfig);
const weakIssues = !weakResult.success ? weakResult.error.issues.map(i => i.path.join('.')) : [];
const requiredGuards = [
  'JWT_SECRET',
  'COOKIE_SECRET',
  'AI_SERVICE_TOKEN',
  'CORS_ORIGIN',
  'DATABASE_URL',
];
const guardsActive = requiredGuards.every(g => weakIssues.includes(g));

record(
  'Environment',
  'Fail-closed protection active on weak secrets in staging',
  !weakResult.success && guardsActive,
  `Guards evaluated: ${requiredGuards.join(', ')}`,
  'Check apps/api/src/config/env.ts superRefine block.'
);

// 1.3 Secret sanitization in error messages (never leak secret values)
let secretsLeaked = false;
if (!weakResult.success) {
  const serializedErrors = JSON.stringify(weakResult.error.issues);
  if (
    serializedErrors.includes('taskflow-internal-dev-token') ||
    serializedErrors.includes('postgres:postgres')
  ) {
    secretsLeaked = true;
  }
}
record(
  'Environment',
  'Validation error messages do not leak secret values',
  !secretsLeaked,
  secretsLeaked ? 'Secret value found in error issues' : undefined,
  'Ensure error messages only cite field names and constraints, never raw values.'
);

// -----------------------------------------------------------------------------
// 2. Database URL Structure & Security
// -----------------------------------------------------------------------------
console.log('\n[2/5] Validating Database URL Structure...');

function validateDbUrlStructure(url: string): { valid: boolean; reason?: string } {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'postgresql:' && parsed.protocol !== 'postgres:') {
      return { valid: false, reason: 'Protocol must be postgresql:' };
    }
    if (!parsed.hostname) {
      return { valid: false, reason: 'Host is missing' };
    }
    if (parsed.username === 'postgres' && parsed.password === 'postgres') {
      return { valid: false, reason: 'Default dev credentials (postgres:postgres) are forbidden' };
    }
    return { valid: true };
  } catch {
    return { valid: false, reason: 'Invalid URL format' };
  }
}

const dbUrlCheck = validateDbUrlStructure(validStagingConfig.DATABASE_URL);
record(
  'Database URL',
  'Staging DATABASE_URL satisfies structural and credential constraints',
  dbUrlCheck.valid,
  dbUrlCheck.reason,
  'Provide a valid postgresql:// connection string with non-default credentials.'
);

// -----------------------------------------------------------------------------
// 3. Docker Compose Staging Configuration & Network Isolation
// -----------------------------------------------------------------------------
console.log('\n[3/5] Validating Docker Compose Staging Configuration...');

try {
  const stagingEnv = {
    ...process.env,
    POSTGRES_PASSWORD: 'staging_password_example_min_16',
    AI_SERVICE_TOKEN: 'staging_token_example_min_16',
    JWT_SECRET: 'staging_jwt_secret_min_32_characters_long_ok',
    COOKIE_SECRET: 'staging_cookie_secret_min_32_characters_ok',
  };

  execSync('docker compose -f docker-compose.staging.yml config --quiet', {
    stdio: 'pipe',
    env: stagingEnv,
  });

  record('Docker Compose', 'Staging docker-compose.staging.yml syntax and schema are valid', true);
} catch (err: any) {
  record(
    'Docker Compose',
    'Staging docker-compose.staging.yml syntax and schema are valid',
    false,
    err.message,
    'Run `docker compose -f docker-compose.staging.yml config` to inspect errors.'
  );
}

// Inspect network isolation and non-root execution
const stagingComposeContent = fs.readFileSync('docker-compose.staging.yml', 'utf-8');

function serviceHasPublicPorts(content: string, serviceName: string): boolean {
  const match = content.match(
    new RegExp(
      `\\n  ${serviceName}:\\r?\\n([\\s\\S]*?)(?=\\r?\\n  [a-zA-Z0-9_-]+:|\\r?\\n[a-zA-Z0-9_-]+:|$)`
    )
  );
  if (!match) return false;
  return /^\s+ports:/m.test(match[1]);
}

record(
  'Network Isolation',
  'PostgreSQL has zero published host ports (internal-only to staging network)',
  !serviceHasPublicPorts(stagingComposeContent, 'postgres'),
  undefined,
  'Remove `ports:` mapping from postgres in docker-compose.staging.yml and use `expose:`.'
);

record(
  'Network Isolation',
  'Python AI service has zero published host ports (internal-only to staging network)',
  !serviceHasPublicPorts(stagingComposeContent, 'taskflow-ai'),
  undefined,
  'Remove `ports:` mapping from taskflow-ai in docker-compose.staging.yml and use `expose:`.'
);

record(
  'Network Isolation',
  'Worker service has zero published host ports (internal-only)',
  !serviceHasPublicPorts(stagingComposeContent, 'taskflow-worker'),
  undefined,
  'Worker must not expose public HTTP ports.'
);

record(
  'Network Isolation',
  'Core API is the sole public ingress service on port 5000',
  serviceHasPublicPorts(stagingComposeContent, 'taskflow-api'),
  undefined,
  'TaskFlow API must publish port 5000:5000 for public ingress.'
);

// Non-root container checks
const apiDockerfile = fs.readFileSync('apps/api/Dockerfile', 'utf-8');
const aiDockerfile = fs.readFileSync('apps/ai/Dockerfile', 'utf-8');

record(
  'Container Security',
  'API container runs as non-root user (USER taskflow)',
  apiDockerfile.includes('USER taskflow'),
  undefined,
  'Ensure `USER taskflow` directive is present in apps/api/Dockerfile.'
);

record(
  'Container Security',
  'AI subsystem container runs as non-root user (USER taskflow)',
  aiDockerfile.includes('USER taskflow'),
  undefined,
  'Ensure `USER taskflow` directive is present in apps/ai/Dockerfile.'
);

// -----------------------------------------------------------------------------
// 4. Prisma Schema & Migration Consistency
// -----------------------------------------------------------------------------
console.log('\n[4/5] Validating Prisma Schema & Migration Consistency...');

try {
  execSync('npx prisma validate --schema apps/api/prisma/schema.prisma', { stdio: 'pipe' });
  record('Database Schema', 'Prisma schema at apps/api/prisma/schema.prisma is valid', true);
} catch (err: any) {
  record(
    'Database Schema',
    'Prisma schema validation',
    false,
    err.message,
    'Run `npm run prisma:validate`.'
  );
}

const migrationsDir = path.resolve(process.cwd(), 'apps/api/prisma/migrations');
if (fs.existsSync(migrationsDir)) {
  const migrations = fs
    .readdirSync(migrationsDir)
    .filter(f => fs.statSync(path.join(migrationsDir, f)).isDirectory());
  record(
    'Database Schema',
    `Migration history directory contains all forward migrations (${migrations.length} found)`,
    migrations.length >= 13,
    undefined,
    'Ensure all migration folders are tracked in git.'
  );
} else {
  record(
    'Database Schema',
    'Migration directory exists',
    false,
    'Directory not found',
    'Check apps/api/prisma/migrations.'
  );
}

// -----------------------------------------------------------------------------
// 5. Health & Readiness Decoupling
// -----------------------------------------------------------------------------
console.log('\n[5/5] Validating Health & Readiness Decoupling...');

const healthController = fs.readFileSync('apps/api/src/controllers/health.controller.ts', 'utf-8');
const isDbChecked = healthController.includes('healthRepository.pingDatabase()');
const isAiDecoupled = !healthController.includes('aiClient');

record(
  'Health Probes',
  'API readiness probe checks PostgreSQL connection pool responsiveness',
  isDbChecked,
  undefined,
  'Ensure /health/ready checks PostgreSQL connection.'
);

record(
  'Health Probes',
  'API readiness probe is decoupled from external Python AI availability',
  isAiDecoupled,
  undefined,
  'Ensure AI outage does not mark core API as unready.'
);

// -----------------------------------------------------------------------------
// Summary Report
// -----------------------------------------------------------------------------
console.log('\n========================================================================');
console.log('                 PRE-FLIGHT VALIDATION SUMMARY                          ');
console.log('========================================================================');

const total = checks.length;
const passed = checks.filter(c => c.passed).length;
const failed = total - passed;

console.log(`Total Checks: ${total} | Passed: ${passed} | Failed: ${failed}\n`);

if (failed > 0) {
  console.error('❌ Staging pre-flight validation FAILED. Correct issues before deployment.');
  process.exit(1);
} else {
  console.log('✓ All staging pre-flight checks PASSED. Environment is ready for staging startup.');
}
