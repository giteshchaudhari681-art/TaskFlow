import { jobWorker } from './services/job.worker.js';
import { initSentry } from './monitoring/sentry.js';
import { prisma } from './lib/prisma.js';
import { env } from './config/env.js';

// Initialize Sentry monitoring for the worker process
initSentry();

console.log('🚀 TaskFlow Background Job Worker starting...');
console.log(`⚙️  Polling interval: ${env.WORKER_POLLING_INTERVAL_MS}ms`);
console.log(`⚙️  Max attempts: ${env.WORKER_MAX_ATTEMPTS}`);
console.log(`⚙️  Processing timeout: ${env.WORKER_PROCESSING_TIMEOUT_MS}ms`);
console.log(`⚙️  Shutdown grace period: ${env.WORKER_SHUTDOWN_GRACE_PERIOD_MS}ms`);

let isShuttingDown = false;

const shutdown = async (signal: string) => {
  if (isShuttingDown) return;
  isShuttingDown = true;

  console.log(`\n🛑 Received ${signal}. Initiating graceful worker shutdown...`);
  try {
    await jobWorker.stop();
    await prisma.$disconnect();
    console.log('✅ Worker exited cleanly. Goodbye!');
    process.exit(0);
  } catch (err: unknown) {
    console.error('❌ Error during worker shutdown:', err);
    process.exit(1);
  }
};

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));

jobWorker.start().catch(async (err: unknown) => {
  console.error('💥 Fatal worker loop failure:', err);
  await prisma.$disconnect().catch(() => {});
  process.exit(1);
});
