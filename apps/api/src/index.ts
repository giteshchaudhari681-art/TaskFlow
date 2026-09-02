import { createServer } from './server.js';
import { env } from './config/env.js';

const app = createServer();

const server = app.listen(env.PORT, () => {
  console.log(`🚀 TaskFlow API listening at http://localhost:${env.PORT}`);
  console.log(`📡 Health check available at:`);
  console.log(`   - http://localhost:${env.PORT}/health`);
  console.log(`   - http://localhost:${env.PORT}${env.API_PREFIX}/health`);
  console.log(`🌍 Environment: ${env.NODE_ENV}`);
});

const handleShutdown = (signal: string) => {
  console.log(`\n🛑 Received ${signal}, gracefully shutting down TaskFlow API...`);
  server.close(() => {
    console.log('✅ HTTP server closed. Process exiting.');
    process.exit(0);
  });

  setTimeout(() => {
    console.error('⚠️ Forcefully terminating after timeout');
    process.exit(1);
  }, 10000).unref();
};

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));
