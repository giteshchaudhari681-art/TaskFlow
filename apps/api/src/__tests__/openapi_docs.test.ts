import { describe, it, expect } from 'vitest';
import request from 'supertest';
import SwaggerParser from '@apidevtools/swagger-parser';
import { createServer } from '../server.js';
import { openApiSpec } from '../docs/openapi.js';
import { env } from '../config/env.js';

describe('TaskFlow PR 17: OpenAPI / Swagger API Documentation & Contract Hardening Suite', () => {
  const app = createServer();

  describe('1. OpenAPI JSON Endpoints & Discovery', () => {
    it('serves valid OpenAPI specification at /openapi.json', async () => {
      const res = await request(app).get('/openapi.json');
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/json/);
      expect(res.body.openapi).toBe('3.1.0');
      expect(res.body.info.title).toBe('TaskFlow API');
      expect(res.body.info.version).toBe('0.1.0');
    });

    it('passes formal OpenAPI schema validation via SwaggerParser', async () => {
      // Validates structural compliance, schema types, $ref resolution, and HTTP methods
      const parsed = await SwaggerParser.validate(JSON.parse(JSON.stringify(openApiSpec)));
      expect(parsed).toBeDefined();
      expect(parsed.info.title).toBe('TaskFlow API');
    });

    it('serves identical OpenAPI specification at /api/openapi.json', async () => {
      const res = await request(app).get('/api/openapi.json');
      expect(res.status).toBe(200);
      expect(res.body).toEqual(openApiSpec);
    });

    it('serves identical OpenAPI specification at /api/v1/openapi.json', async () => {
      const res = await request(app).get('/api/v1/openapi.json');
      expect(res.status).toBe(200);
      expect(res.body).toEqual(openApiSpec);
    });
  });

  describe('2. Swagger UI Integration & Asset Delivery', () => {
    it('serves Swagger UI explorer at /docs/', async () => {
      const res = await request(app).get('/docs/');
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/html/);
      expect(res.text).toContain('swagger-ui');
    });

    it('serves Swagger UI explorer at /api/docs/', async () => {
      const res = await request(app).get('/api/docs/');
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/html/);
      expect(res.text).toContain('swagger-ui');
    });

    it('serves Swagger UI explorer at /api/v1/docs/', async () => {
      const res = await request(app).get('/api/v1/docs/');
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/html/);
      expect(res.text).toContain('swagger-ui');
    });
  });

  describe('3. OpenAPI Specification Metadata & Structure Verification', () => {
    it('has valid OpenAPI 3.1.0 root metadata', () => {
      expect(openApiSpec.openapi).toBe('3.1.0');
      expect(openApiSpec.info.title).toBe('TaskFlow API');
      expect(openApiSpec.info.description).toContain(
        'TaskFlow AI-Powered Project Operations Platform'
      );
      expect(openApiSpec.info.version).toBe('0.1.0');
      expect(openApiSpec.servers.length).toBeGreaterThanOrEqual(1);
    });

    it('defines expected tags matching all functional domains', () => {
      const expectedTags = [
        'Health',
        'Authentication',
        'Users',
        'Organizations',
        'Projects',
        'Project Dashboard',
        'AI Analysis',
        'Tasks',
        'Subtasks',
        'Labels',
        'Dependencies',
        'Milestones',
        'Comments',
        'Activity',
        'Notifications',
        'Work',
        'Search',
        'Entitlements',
      ];
      const tagNames = openApiSpec.tags.map(t => t.name);
      for (const expected of expectedTags) {
        expect(tagNames).toContain(expected);
      }
    });

    it('configures bearerAuth security scheme for public API without internal token', () => {
      const securitySchemes = openApiSpec.components.securitySchemes;
      expect(securitySchemes).toHaveProperty('bearerAuth');
      expect(securitySchemes.bearerAuth.type).toBe('http');
      expect(securitySchemes.bearerAuth.scheme).toBe('bearer');
      expect(securitySchemes.bearerAuth.bearerFormat).toBe('JWT');

      // Crucial: The public API must NOT advertise internal X-TaskFlow-Service-Token
      const rawSecurity = JSON.stringify(securitySchemes);
      expect(rawSecurity).not.toContain('X-TaskFlow-Service-Token');
    });
  });

  describe('4. Security & Secret Leakage Audit', () => {
    it('contains zero secret keys, tokens, or database credentials in OpenAPI JSON', () => {
      const jsonString = JSON.stringify(openApiSpec);

      // Forbidden secret patterns and environment secrets
      expect(jsonString).not.toMatch(/sk-[a-zA-Z0-9]{20,}/);
      if (env.AI_SERVICE_TOKEN) {
        expect(jsonString).not.toContain(env.AI_SERVICE_TOKEN);
      }
      expect(jsonString).not.toContain(env.JWT_SECRET);
      expect(jsonString).not.toContain(env.COOKIE_SECRET);
      expect(jsonString).not.toContain(env.DATABASE_URL);
    });
  });

  describe('5. Component Schemas & Model Alignment', () => {
    const schemas = openApiSpec.components.schemas;

    it('defines standard response envelopes and error structures', () => {
      expect(schemas).toHaveProperty('ErrorResponse');
      expect(schemas).toHaveProperty('ErrorDetail');
      expect(schemas).toHaveProperty('PaginationMeta');
      expect(schemas).toHaveProperty('HealthResponse');
    });

    it('defines domain models and enums matching TaskFlow runtime types', () => {
      expect(schemas).toHaveProperty('User');
      expect(schemas).toHaveProperty('Organization');
      expect(schemas).toHaveProperty('Project');
      expect(schemas).toHaveProperty('Task');
      expect(schemas).toHaveProperty('Subtask');
      expect(schemas).toHaveProperty('Label');
      expect(schemas).toHaveProperty('TaskDependency');
      expect(schemas).toHaveProperty('Milestone');
      expect(schemas).toHaveProperty('Comment');
      expect(schemas).toHaveProperty('Activity');
      expect(schemas).toHaveProperty('Notification');
      expect(schemas).toHaveProperty('MyWorkResponse');
      expect(schemas).toHaveProperty('SearchResults');
    });

    it('defines PR 14 Project Dashboard 2.0 schemas accurately', () => {
      expect(schemas).toHaveProperty('ProjectDashboardResponse');
      expect(schemas).toHaveProperty('HealthSummary');
      expect(schemas).toHaveProperty('HealthSignal');
      expect(schemas).toHaveProperty('ProjectMetricBreakdown');
      expect(schemas).toHaveProperty('DistributionBucket');
      expect(schemas).toHaveProperty('DeliveryRiskItem');
      expect(schemas).toHaveProperty('MilestoneHealthRollup');
      expect(schemas).toHaveProperty('BlockerCluster');

      // Verify ProjectDashboardResponse contains all PR 14 fields
      const dashboardProps = schemas.ProjectDashboardResponse.properties;
      expect(dashboardProps).toHaveProperty('project');
      expect(dashboardProps).toHaveProperty('health');
      expect(dashboardProps).toHaveProperty('signals');
      expect(dashboardProps).toHaveProperty('metrics');
      expect(dashboardProps).toHaveProperty('taskDistribution');
      expect(dashboardProps).toHaveProperty('priorityDistribution');
      expect(dashboardProps).toHaveProperty('risks');
      expect(dashboardProps).toHaveProperty('milestones');
      expect(dashboardProps).toHaveProperty('blockerClusters');
      expect(dashboardProps).toHaveProperty('recentActivity');
    });

    it('defines PR 16 AI analysis request and response schemas accurately', () => {
      expect(schemas).toHaveProperty('AIAnalysisRequest');
      expect(schemas).toHaveProperty('AIAnalysisResponse');
      expect(schemas).toHaveProperty('AIRecommendation');
      expect(schemas).toHaveProperty('AIOperationEnum');

      const requestProps = schemas.AIAnalysisRequest.properties;
      expect(requestProps).toHaveProperty('operation');
      expect(requestProps).toHaveProperty('user_prompt');

      const responseProps = schemas.AIAnalysisResponse.properties;
      expect(responseProps).toHaveProperty('request_id');
      expect(responseProps).toHaveProperty('operation');
      expect(responseProps).toHaveProperty('summary');
      expect(responseProps).toHaveProperty('recommendations');
      expect(responseProps).toHaveProperty('metadata');
    });

    it('ensures all internal $ref references resolve to existing components', () => {
      const specString = JSON.stringify(openApiSpec);
      const refRegex = /"\$ref":\s*"#\/([^"]+)"/g;
      let match;

      while ((match = refRegex.exec(specString)) !== null) {
        const refToken = match[1];
        if (!refToken) continue;
        const refPath = refToken.split('/');
        let current: any = openApiSpec;
        for (const segment of refPath) {
          expect(current).toHaveProperty(segment);
          current = current[segment];
        }
        expect(current).toBeDefined();
      }
    });
  });

  describe('6. Route Inventory & Coverage Verification', () => {
    const paths = openApiSpec.paths as Record<string, any>;

    it('documents all essential health and authentication endpoints', () => {
      expect(paths).toHaveProperty('/health');
      expect(paths).toHaveProperty('/health/live');
      expect(paths).toHaveProperty('/health/ready');
      expect(paths).toHaveProperty('/api/v1/health');
      expect(paths).toHaveProperty('/api/v1/health/live');
      expect(paths).toHaveProperty('/api/v1/health/ready');
      expect(paths).toHaveProperty('/api/v1/auth/register');
      expect(paths).toHaveProperty('/api/v1/auth/login');
      expect(paths).toHaveProperty('/api/v1/auth/refresh');
      expect(paths).toHaveProperty('/api/v1/auth/logout');
      expect(paths).toHaveProperty('/api/v1/auth/me');
    });

    it('documents user profile and notification preference endpoints', () => {
      expect(paths).toHaveProperty('/api/v1/users/me');
      expect(paths).toHaveProperty('/api/v1/users/me/password');
      expect(paths).toHaveProperty('/api/v1/users/me/notification-preferences');
    });

    it('documents organization workspace and member management endpoints', () => {
      expect(paths).toHaveProperty('/api/v1/organizations');
      expect(paths).toHaveProperty('/api/v1/organizations/{organizationId}');
      expect(paths).toHaveProperty('/api/v1/organizations/{organizationId}/members');
      expect(paths).toHaveProperty('/api/v1/organizations/{organizationId}/members/{userId}');
      expect(paths).toHaveProperty('/api/v1/organizations/{organizationId}/search');
      expect(paths).toHaveProperty('/api/v1/organizations/{organizationId}/audit-events');
      expect(paths).toHaveProperty('/api/v1/organizations/{organizationId}/jobs/summary');
      expect(paths).toHaveProperty('/api/v1/organizations/{organizationId}/usage');
      expect(paths).toHaveProperty('/api/v1/organizations/{organizationId}/plan');
    });

    it('documents project lifecycle, members, dashboard, and AI analysis endpoints', () => {
      expect(paths).toHaveProperty('/api/v1/organizations/{organizationId}/projects');
      expect(paths).toHaveProperty('/api/v1/organizations/{organizationId}/projects/{projectId}');
      expect(paths).toHaveProperty(
        '/api/v1/organizations/{organizationId}/projects/{projectId}/archive'
      );
      expect(paths).toHaveProperty(
        '/api/v1/organizations/{organizationId}/projects/{projectId}/unarchive'
      );
      expect(paths).toHaveProperty(
        '/api/v1/organizations/{organizationId}/projects/{projectId}/members'
      );
      expect(paths).toHaveProperty(
        '/api/v1/organizations/{organizationId}/projects/{projectId}/members/{userId}'
      );
      expect(paths).toHaveProperty(
        '/api/v1/organizations/{organizationId}/projects/{projectId}/dashboard'
      );
      expect(paths).toHaveProperty(
        '/api/v1/organizations/{organizationId}/projects/{projectId}/ai/analyze'
      );
      expect(paths).toHaveProperty(
        '/api/v1/organizations/{organizationId}/projects/{projectId}/dependencies/graph'
      );
      expect(paths).toHaveProperty(
        '/api/v1/organizations/{organizationId}/projects/{projectId}/timeline'
      );
      expect(paths).toHaveProperty(
        '/api/v1/organizations/{organizationId}/projects/{projectId}/activity'
      );
    });

    it('documents project tasks, subtasks, dependencies, labels, comments, and milestones', () => {
      expect(paths).toHaveProperty(
        '/api/v1/organizations/{organizationId}/projects/{projectId}/labels'
      );
      expect(paths).toHaveProperty(
        '/api/v1/organizations/{organizationId}/projects/{projectId}/labels/{labelId}'
      );
      expect(paths).toHaveProperty(
        '/api/v1/organizations/{organizationId}/projects/{projectId}/milestones'
      );
      expect(paths).toHaveProperty(
        '/api/v1/organizations/{organizationId}/projects/{projectId}/milestones/{milestoneId}'
      );
      expect(paths).toHaveProperty(
        '/api/v1/organizations/{organizationId}/projects/{projectId}/tasks'
      );
      expect(paths).toHaveProperty(
        '/api/v1/organizations/{organizationId}/projects/{projectId}/tasks/{taskId}'
      );
      expect(paths).toHaveProperty(
        '/api/v1/organizations/{organizationId}/projects/{projectId}/tasks/{taskId}/status'
      );
      expect(paths).toHaveProperty(
        '/api/v1/organizations/{organizationId}/projects/{projectId}/tasks/{taskId}/archive'
      );
      expect(paths).toHaveProperty(
        '/api/v1/organizations/{organizationId}/projects/{projectId}/tasks/{taskId}/unarchive'
      );
      expect(paths).toHaveProperty(
        '/api/v1/organizations/{organizationId}/projects/{projectId}/tasks/{taskId}/labels'
      );
      expect(paths).toHaveProperty(
        '/api/v1/organizations/{organizationId}/projects/{projectId}/tasks/{taskId}/labels/{labelId}'
      );
      expect(paths).toHaveProperty(
        '/api/v1/organizations/{organizationId}/projects/{projectId}/tasks/{taskId}/subtasks'
      );
      expect(paths).toHaveProperty(
        '/api/v1/organizations/{organizationId}/projects/{projectId}/tasks/{taskId}/subtasks/{subtaskId}'
      );
      expect(paths).toHaveProperty(
        '/api/v1/organizations/{organizationId}/projects/{projectId}/tasks/{taskId}/dependencies'
      );
      expect(paths).toHaveProperty(
        '/api/v1/organizations/{organizationId}/projects/{projectId}/tasks/{taskId}/dependencies/{dependencyId}'
      );
      expect(paths).toHaveProperty(
        '/api/v1/organizations/{organizationId}/projects/{projectId}/tasks/{taskId}/comments'
      );
      expect(paths).toHaveProperty(
        '/api/v1/organizations/{organizationId}/projects/{projectId}/tasks/{taskId}/comments/{commentId}'
      );
      expect(paths).toHaveProperty(
        '/api/v1/organizations/{organizationId}/projects/{projectId}/tasks/{taskId}/activity'
      );
    });

    it('documents notifications, personal work, and search endpoints', () => {
      expect(paths).toHaveProperty('/api/v1/notifications');
      expect(paths).toHaveProperty('/api/v1/notifications/unread-count');
      expect(paths).toHaveProperty('/api/v1/notifications/{id}/read');
      expect(paths).toHaveProperty('/api/v1/notifications/read-all');
      expect(paths).toHaveProperty('/api/v1/notifications/preferences');
      expect(paths).toHaveProperty('/api/v1/work/my-work');
      expect(paths).toHaveProperty('/api/v1/search');
    });

    it('verifies total documented paths count equals 59 unique path endpoints', () => {
      const pathCount = Object.keys(paths).length;
      expect(pathCount).toBe(59);
    });

    it('ensures all path parameters in route keys are formally declared in parameters array', () => {
      for (const [pathKey, pathItem] of Object.entries(paths)) {
        const paramMatches = pathKey.match(/\{([^}]+)\}/g);
        if (paramMatches) {
          const expectedParams = paramMatches.map(p => p.replace(/[{}]/g, ''));
          for (const method of ['get', 'post', 'patch', 'delete'] as const) {
            const op = pathItem[method];
            if (op) {
              const declaredParams = (op.parameters || []).map((p: any) => {
                if (p.$ref) {
                  const refName = p.$ref.split('/').pop() || '';
                  return (openApiSpec.components.parameters as Record<string, any>)[refName]?.name;
                }
                return p.name;
              });
              for (const expected of expectedParams) {
                expect(declaredParams).toContain(expected);
              }
            }
          }
        }
      }
    });
  });
});
