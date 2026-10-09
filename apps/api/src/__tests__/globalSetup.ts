import { execSync } from 'child_process';
import { env } from '../config/env.js';

export default async function setup() {
  if (env.NODE_ENV !== 'test') {
    throw new Error('globalSetup should only run in test environment');
  }

  const dbUrl = env.DATABASE_URL;
  console.log(`[globalSetup] Applying Prisma migrations to test database: ${dbUrl}`);

  try {
    // Explicitly pass the validated test URL to the Prisma CLI to avoid bleed
    execSync('npx prisma migrate deploy', {
      env: {
        ...process.env,
        DATABASE_URL: dbUrl,
      },
      stdio: 'inherit',
    });
    console.log('[globalSetup] Migrations applied successfully.');
  } catch (err) {
    console.error('[globalSetup] FATAL ERROR: Failed to apply Prisma migrations to test database.', err);
    process.exit(1);
  }
}
