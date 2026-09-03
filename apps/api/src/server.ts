import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { env } from './config/env.js';
import { healthRoutes } from './routes/health.routes.js';
import { authRoutes } from './routes/auth.routes.js';
import { userRoutes } from './routes/user.routes.js';
import { organizationRoutes } from './routes/organization.routes.js';
import notificationRoutes from './routes/notification.routes.js';
import workRoutes from './routes/work.routes.js';
import searchRoutes from './routes/search.routes.js';
import { errorHandler } from './middleware/errorHandler.js';
import { notFoundHandler } from './middleware/notFound.js';

export const createServer = (): Express => {
  const app = express();

  // Security Headers
  app.use(helmet());

  // Cookie Parser
  app.use(cookieParser(env.COOKIE_SECRET));

  // CORS Configuration
  app.use(
    cors({
      origin: env.CORS_ORIGIN,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );

  // Rate Limiting
  const limiter = rateLimit({
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    max: env.RATE_LIMIT_MAX,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests from this IP, please try again later.',
      },
    },
  });
  app.use(limiter);

  // Request Body Parsers
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Root Health Probe (useful for container / cloud platform probes)
  app.use('/health', healthRoutes);

  // Versioned API Routes
  app.use(`${env.API_PREFIX}/health`, healthRoutes);
  app.use(`${env.API_PREFIX}/auth`, authRoutes);
  app.use(`${env.API_PREFIX}/users`, userRoutes);
  app.use(`${env.API_PREFIX}/organizations`, organizationRoutes);
  app.use(`${env.API_PREFIX}/notifications`, notificationRoutes);
  app.use(`${env.API_PREFIX}/work`, workRoutes);
  app.use(`${env.API_PREFIX}/search`, searchRoutes);

  // 404 Not Found Handler
  app.use(notFoundHandler);

  // Global Error Handler
  app.use(errorHandler);

  return app;
};
