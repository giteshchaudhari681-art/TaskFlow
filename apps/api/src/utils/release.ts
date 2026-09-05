import fs from 'node:fs';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';

export interface PgConnectionInfo {
  host: string;
  port: string;
  user: string;
  password?: string;
  database: string;
}

export interface BackupReceipt {
  timestamp: string;
  gitSha: string;
  database: string;
  host: string;
  filePath: string;
  sizeBytes: number;
  durationMs: number;
  retentionPolicy: string;
}

export type RollbackAction =
  | 'APPLICATION_ROLLBACK'
  | 'DATABASE_DISASTER_RECOVERY'
  | 'DEGRADED_AI_DRAIN'
  | 'WORKER_QUEUE_RECOVERY'
  | 'SECRET_REVOCATION_AND_ROTATION';

export interface RollbackScenario {
  cause: string;
  schemaCompatible: boolean;
  databaseCorrupted: boolean;
  serviceAffected: 'api' | 'ai' | 'worker' | 'database' | 'secrets';
}

/**
 * Finds the monorepo root by walking up until package.json and apps directory are found.
 */
export function findMonorepoRoot(startDir = process.cwd()): string {
  let current = startDir;
  while (current && current !== path.dirname(current)) {
    if (
      fs.existsSync(path.join(current, 'package.json')) &&
      fs.existsSync(path.join(current, 'apps'))
    ) {
      return current;
    }
    current = path.dirname(current);
  }
  return startDir;
}

/**
 * Resolves the current git commit SHA deterministically.
 */
export function resolveReleaseGitSha(): string {
  if (process.env.GIT_SHA && process.env.GIT_SHA.trim()) {
    return process.env.GIT_SHA.trim();
  }
  if (process.env.COMMIT_SHA && process.env.COMMIT_SHA.trim()) {
    return process.env.COMMIT_SHA.trim();
  }
  try {
    const out = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf-8', timeout: 3000 });
    return out.trim();
  } catch {
    return 'unknown-git-sha';
  }
}

/**
 * Safely parses a PostgreSQL database URL into connection parameters without printing credentials.
 */
export function parseDatabaseUrl(urlStr: string): PgConnectionInfo {
  const url = new URL(urlStr);
  return {
    host: url.hostname || 'localhost',
    port: url.port || '5432',
    user: decodeURIComponent(url.username || 'postgres'),
    password: decodeURIComponent(url.password || ''),
    database: url.pathname.replace(/^\//, '') || 'taskflow_dev',
  };
}

/**
 * Locates a PostgreSQL binary in PATH or standard installation directories.
 */
export function findPostgresBinary(binaryName: string): string | null {
  try {
    const res = spawnSync(binaryName, ['--version'], { stdio: 'ignore' });
    if (res.status === 0) return binaryName;
  } catch {
    // Ignore and fallback to well-known locations
  }

  const candidateDirs = [
    'C:\\Program Files\\PostgreSQL\\18\\bin',
    'C:\\Program Files\\PostgreSQL\\17\\bin',
    'C:\\Program Files\\PostgreSQL\\16\\bin',
    'C:\\Program Files (x86)\\PostgreSQL\\18\\bin',
    'C:\\Program Files (x86)\\PostgreSQL\\16\\bin',
    '/usr/bin',
    '/usr/local/bin',
  ];

  for (const dir of candidateDirs) {
    const ext = process.platform === 'win32' ? '.exe' : '';
    const fullPath = path.join(dir, `${binaryName}${ext}`);
    if (fs.existsSync(fullPath)) {
      return fullPath;
    }
  }

  return null;
}

/**
 * Deterministic Rollback Decision Matrix logic
 */
export function evaluateRollbackStrategy(scenario: RollbackScenario): RollbackAction {
  if (scenario.serviceAffected === 'secrets') {
    return 'SECRET_REVOCATION_AND_ROTATION';
  }
  if (scenario.databaseCorrupted || !scenario.schemaCompatible) {
    return 'DATABASE_DISASTER_RECOVERY';
  }
  if (scenario.serviceAffected === 'ai') {
    return 'DEGRADED_AI_DRAIN';
  }
  if (scenario.serviceAffected === 'worker') {
    return 'WORKER_QUEUE_RECOVERY';
  }
  return 'APPLICATION_ROLLBACK';
}
