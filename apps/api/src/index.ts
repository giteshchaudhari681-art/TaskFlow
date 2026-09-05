import { createServer } from './server.js';
import { env } from './config/env.js';
import { prisma } from './lib/prisma.js';

const app = createServer();

const server = app.listen(env.PORT, () => {
  console.log(`🚀 TaskFlow API listening at http://localhost:${env.PORT}`);
  console.log(`📡 Health check available at:`);
  console.log(`   - http://localhost:${env.PORT}/health`);
  console.log(`   - http://localhost:${env.PORT}/health/live`);
  console.log(`   - http://localhost:${env.PORT}/health/ready`);
  console.log(`   - http://localhost:${env.PORT}${env.API_PREFIX}/health`);
  console.log(`🌍 Environment: ${env.NODE_ENV}`);
});

let isShuttingDown = false;

const handleShutdown = (signal: string) => {
  if (isShuttingDown) return;
  isShuttingDown = true;

  console.log(`\n🛑 Received ${signal}, gracefully shutting down TaskFlow API...`);

  // Stop accepting new connections and finish in-flight requests
  server.close(async () => {
    console.log('✅ HTTP server closed. Disconnecting database client...');
    try {
      await prisma.$disconnect();
      console.log('✅ Prisma client disconnected cleanly. Process exiting.');
      process.exit(0);
    } catch (err) {
      console.error('❌ Error during Prisma disconnect:', err);
      process.exit(1);
    }
  });

  // Bounded shutdown timeout (10 seconds)
  setTimeout(() => {
    console.error('⚠️ Forcefully terminating after shutdown timeout');
    process.exit(1);
  }, 10000).unref();
};

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));
