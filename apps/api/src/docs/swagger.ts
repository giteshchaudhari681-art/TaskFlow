import { Router, Request, Response } from 'express';
import swaggerUi from 'swagger-ui-express';
import { openApiSpec } from './openapi.js';

export const docsRouter = Router();

// Custom CSS for a sleek, modern, TaskFlow dark-themed Swagger UI
const customCss = `
  body {
    background-color: #0b0f19;
    color: #e2e8f0;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  }
  .swagger-ui {
    color: #cbd5e1;
  }
  .swagger-ui .topbar {
    background-color: #0f172a;
    border-bottom: 1px solid #1e293b;
    padding: 12px 0;
  }
  .swagger-ui .topbar .topbar-wrapper .link {
    font-weight: 700;
    color: #60a5fa;
    font-size: 1.25rem;
  }
  .swagger-ui .info {
    margin: 28px 0;
  }
  .swagger-ui .info .title {
    color: #f8fafc;
    font-size: 2.2rem;
  }
  .swagger-ui .info p, .swagger-ui .info li {
    color: #94a3b8;
  }
  .swagger-ui .scheme-container {
    background-color: #0f172a;
    border: 1px solid #1e293b;
    border-radius: 8px;
    padding: 16px;
    box-shadow: none;
    margin-bottom: 24px;
  }
  .swagger-ui .opblock-tag {
    color: #e2e8f0;
    border-bottom: 1px solid #1e293b;
    font-size: 1.25rem;
    padding: 12px 0;
  }
  .swagger-ui .opblock {
    background: #0f172a !important;
    border: 1px solid #1e293b !important;
    border-radius: 8px !important;
    box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.3) !important;
    margin: 0 0 12px !important;
  }
  .swagger-ui .opblock.opblock-get {
    border-color: #1d4ed8 !important;
  }
  .swagger-ui .opblock.opblock-post {
    border-color: #047857 !important;
  }
  .swagger-ui .opblock.opblock-patch {
    border-color: #d97706 !important;
  }
  .swagger-ui .opblock.opblock-delete {
    border-color: #b91c1c !important;
  }
  .swagger-ui .opblock-summary-method {
    border-radius: 6px !important;
    font-weight: 700 !important;
  }
  .swagger-ui .opblock-summary-path,
  .swagger-ui .opblock-summary-path__deprecated {
    color: #f1f5f9 !important;
  }
  .swagger-ui .opblock-summary-description {
    color: #94a3b8 !important;
  }
  .swagger-ui section.models {
    background-color: #0f172a;
    border: 1px solid #1e293b;
    border-radius: 8px;
  }
  .swagger-ui section.models h4 {
    color: #e2e8f0;
  }
  .swagger-ui .model-box {
    background-color: #0b0f19;
  }
  .swagger-ui .model, .swagger-ui .model-title {
    color: #cbd5e1;
  }
  .swagger-ui .prop-type {
    color: #38bdf8;
  }
  .swagger-ui .btn {
    border-radius: 6px;
  }
  .swagger-ui .btn.authorize {
    background-color: #2563eb;
    border-color: #2563eb;
    color: #ffffff;
  }
  .swagger-ui select {
    background-color: #1e293b;
    color: #f1f5f9;
    border: 1px solid #334155;
    border-radius: 6px;
  }
  .swagger-ui input[type="text"], .swagger-ui textarea {
    background-color: #1e293b !important;
    color: #f1f5f9 !important;
    border: 1px solid #334155 !important;
    border-radius: 6px !important;
  }
`;

const swaggerUiOptions = {
  customCss,
  customSiteTitle: 'TaskFlow API Documentation',
  customfavIcon: '/favicon.ico',
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    filter: true,
    tryItOutEnabled: true,
  },
};

// Raw OpenAPI JSON endpoint
docsRouter.get('/openapi.json', (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/json');
  res.json(openApiSpec);
});

// Swagger UI UI assets and explorer
docsRouter.use('/', swaggerUi.serve);
docsRouter.get('/', swaggerUi.setup(openApiSpec, swaggerUiOptions));
