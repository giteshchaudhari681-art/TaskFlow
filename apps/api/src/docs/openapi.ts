/**
 * TaskFlow Public REST API — OpenAPI 3.1.0 Specification
 *
 * This module defines the authoritative contract for the TaskFlow Public REST API (Node.js / Express).
 * The internal Python AI subsystem maintains its own private OpenAPI documentation (/docs on port 8000)
 * and must NOT be merged into this public client-facing contract.
 */

export const openApiSpec = {
  openapi: '3.1.0',
  info: {
    title: 'TaskFlow API',
    version: '0.1.0',
    description:
      'REST API for the TaskFlow AI-Powered Project Operations Platform. Authoritative backend managing multi-tenant workspaces, projects, Kanban tasks, subtasks, dependencies, milestones, real-time collaboration, notification streams, deterministic project health, and secure internal AI orchestration.',
    contact: {
      name: 'TaskFlow Core Engineering',
      url: 'https://github.com/giteshchaudhari681-art/TaskFlow',
    },
    license: {
      name: 'MIT',
      url: 'https://opensource.org/licenses/MIT',
    },
  },
  servers: [
    {
      url: 'http://localhost:5000',
      description: 'Local Development Server',
    },
    {
      url: '/api/v1',
      description: 'Current API Version Prefix (v1)',
    },
  ],
  tags: [
    { name: 'Health', description: 'Container and application health probes' },
    {
      name: 'Authentication',
      description: 'User registration, login, token refresh, and session management',
    },
    {
      name: 'Users',
      description: 'User profiles, passwords, and personal notification preferences',
    },
    {
      name: 'Organizations',
      description: 'Multi-tenant workspaces, team members, and workspace-scoped settings',
    },
    { name: 'Projects', description: 'Project lifecycle, settings, and member access control' },
    {
      name: 'Project Dashboard',
      description: 'PR 14 deterministic project health, delivery risks, and executive insights',
    },
    {
      name: 'AI Analysis',
      description:
        'Authoritative AI orchestration gateway dispatching to internal Python AI service',
    },
    { name: 'Tasks', description: 'Task lifecycle, kanban stages, priorities, and archiving' },
    { name: 'Subtasks', description: 'Checklist subtasks nested within parent tasks' },
    { name: 'Labels', description: 'Project-scoped categorization labels and assignments' },
    {
      name: 'Dependencies',
      description: 'DAG task dependencies (BLOCKS, BLOCKED_BY, RELATES_TO) and graph visualizer',
    },
    {
      name: 'Milestones',
      description: 'Delivery milestones, target deadlines, and timeline schedule views',
    },
    { name: 'Comments', description: 'Task collaboration discussions and activity comments' },
    { name: 'Activity', description: 'Audit trails and historical event feeds' },
    { name: 'Notifications', description: 'User notifications and preferences' },
    { name: 'Work', description: 'Cross-project personal workspace summary (My Work)' },
    {
      name: 'Search',
      description: 'Global multi-entity search across projects, tasks, and members',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description:
          'Short-lived JWT access token provided in the HTTP Authorization header: `Authorization: Bearer <access_token>`. Refresh tokens are transmitted securely via HTTP-only cookies.',
      },
    },
    parameters: {
      organizationIdParam: {
        name: 'organizationId',
        in: 'path',
        required: true,
        schema: { type: 'string', format: 'uuid' },
        description: 'UUID identifier of the organization/workspace',
      },
      projectIdParam: {
        name: 'projectId',
        in: 'path',
        required: true,
        schema: { type: 'string', format: 'uuid' },
        description: 'UUID identifier of the project',
      },
      taskIdParam: {
        name: 'taskId',
        in: 'path',
        required: true,
        schema: { type: 'string', format: 'uuid' },
        description: 'UUID identifier of the task',
      },
      milestoneIdParam: {
        name: 'milestoneId',
        in: 'path',
        required: true,
        schema: { type: 'string', format: 'uuid' },
        description: 'UUID identifier of the milestone',
      },
      labelIdParam: {
        name: 'labelId',
        in: 'path',
        required: true,
        schema: { type: 'string', format: 'uuid' },
        description: 'UUID identifier of the label',
      },
      subtaskIdParam: {
        name: 'subtaskId',
        in: 'path',
        required: true,
        schema: { type: 'string', format: 'uuid' },
        description: 'UUID identifier of the subtask',
      },
      commentIdParam: {
        name: 'commentId',
        in: 'path',
        required: true,
        schema: { type: 'string', format: 'uuid' },
        description: 'UUID identifier of the comment',
      },
      dependencyIdParam: {
        name: 'dependencyId',
        in: 'path',
        required: true,
        schema: { type: 'string', format: 'uuid' },
        description: 'UUID identifier of the task dependency link',
      },
      userIdParam: {
        name: 'userId',
        in: 'path',
        required: true,
        schema: { type: 'string', format: 'uuid' },
        description: 'UUID identifier of the target user',
      },
      notificationIdParam: {
        name: 'id',
        in: 'path',
        required: true,
        schema: { type: 'string', format: 'uuid' },
        description: 'UUID identifier of the notification',
      },
      pageQuery: {
        name: 'page',
        in: 'query',
        required: false,
        schema: { type: 'integer', minimum: 1, default: 1 },
        description: '1-indexed page number for pagination',
      },
      limitQuery: {
        name: 'limit',
        in: 'query',
        required: false,
        schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
        description: 'Number of items per page (max 100)',
      },
    },
    responses: {
      Unauthorized: {
        description: 'Authentication token missing, expired, or invalid',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' },
            example: {
              success: false,
              error: {
                code: 'UNAUTHORIZED',
                message: 'Authentication required. Please provide a valid access token.',
              },
            },
          },
        },
      },
      Forbidden: {
        description: 'Insufficient permissions or cross-tenant boundary violation',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' },
            example: {
              success: false,
              error: {
                code: 'FORBIDDEN',
                message: 'You do not have permission to perform this action.',
              },
            },
          },
        },
      },
      NotFound: {
        description: 'Requested resource was not found within tenant boundaries',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' },
            example: {
              success: false,
              error: {
                code: 'NOT_FOUND',
                message: 'Requested resource not found.',
              },
            },
          },
        },
      },
      ValidationError: {
        description: 'Request payload or parameters failed validation',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' },
            example: {
              success: false,
              error: {
                code: 'VALIDATION_ERROR',
                message: 'Invalid input parameters.',
                details: [{ field: 'email', message: 'Invalid email format' }],
              },
            },
          },
        },
      },
      Conflict: {
        description: 'Resource state conflict (e.g. duplicate key or circular dependency)',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' },
            example: {
              success: false,
              error: {
                code: 'CONFLICT',
                message: 'A resource with this key already exists.',
              },
            },
          },
        },
      },
      InternalServerError: {
        description: 'Unexpected server error without secret leakage',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' },
            example: {
              success: false,
              error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: 'An unexpected internal error occurred.',
              },
            },
          },
        },
      },
      RateLimitExceeded: {
        description: 'Rate limit exceeded for client/workspace',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' },
            example: {
              success: false,
              error: {
                code: 'RATE_LIMIT_EXCEEDED',
                message:
                  'Too many AI analysis requests. Please wait before requesting another analysis.',
              },
            },
          },
        },
      },
    },
    schemas: {
      ErrorDetail: {
        type: 'object',
        required: ['code', 'message'],
        properties: {
          code: { type: 'string', example: 'VALIDATION_ERROR' },
          message: { type: 'string', example: 'Invalid request data' },
          details: {
            description: 'Optional structured error details or field validation violations',
          },
        },
      },
      ErrorResponse: {
        type: 'object',
        required: ['success', 'error'],
        properties: {
          success: { type: 'boolean', example: false },
          error: { $ref: '#/components/schemas/ErrorDetail' },
        },
      },
      PaginationMeta: {
        type: 'object',
        required: ['page', 'limit', 'total', 'totalPages', 'hasNextPage', 'hasPreviousPage'],
        properties: {
          page: { type: 'integer', example: 1 },
          limit: { type: 'integer', example: 20 },
          total: { type: 'integer', example: 45 },
          totalPages: { type: 'integer', example: 3 },
          hasNextPage: { type: 'boolean', example: true },
          hasPreviousPage: { type: 'boolean', example: false },
        },
      },
      HealthResponse: {
        type: 'object',
        required: ['success', 'data'],
        properties: {
          success: { type: 'boolean', example: true },
          data: {
            type: 'object',
            required: ['status', 'timestamp', 'uptime', 'environment', 'service'],
            properties: {
              status: { type: 'string', example: 'ok' },
              timestamp: { type: 'string', format: 'date-time' },
              uptime: { type: 'number', example: 1245.8 },
              environment: { type: 'string', example: 'development' },
              service: { type: 'string', example: 'taskflow-api' },
            },
          },
        },
      },
      User: {
        type: 'object',
        required: ['id', 'email', 'name', 'createdAt', 'updatedAt'],
        properties: {
          id: { type: 'string', format: 'uuid' },
          email: { type: 'string', format: 'email' },
          name: { type: 'string', example: 'Alex Morgan' },
          avatarUrl: { type: 'string', nullable: true },
          bio: { type: 'string', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      Organization: {
        type: 'object',
        required: ['id', 'name', 'slug', 'createdAt', 'updatedAt'],
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string', example: 'Acme Corporation' },
          slug: { type: 'string', example: 'acme-corp' },
          logoUrl: { type: 'string', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      UserRoleEnum: {
        type: 'string',
        enum: ['OWNER', 'ADMIN', 'MEMBER'],
      },
      ProjectRoleEnum: {
        type: 'string',
        enum: ['OWNER', 'ADMIN', 'MEMBER', 'VIEWER'],
      },
      TaskStatusEnum: {
        type: 'string',
        enum: ['BACKLOG', 'TODO', 'IN_PROGRESS', 'IN_REVIEW', 'BLOCKED', 'DONE', 'CANCELLED'],
      },
      TaskPriorityEnum: {
        type: 'string',
        enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'],
      },
      DependencyTypeEnum: {
        type: 'string',
        enum: ['BLOCKS', 'BLOCKED_BY', 'RELATES_TO'],
      },
      MilestoneStatusEnum: {
        type: 'string',
        enum: ['OPEN', 'COMPLETED', 'CLOSED'],
      },
      ProjectHealthStateEnum: {
        type: 'string',
        enum: ['HEALTHY', 'AT_RISK', 'CRITICAL', 'NO_DATA'],
      },
      DeliveryRiskSeverityEnum: {
        type: 'string',
        enum: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'],
      },
      AIOperationEnum: {
        type: 'string',
        enum: ['PROJECT_SUMMARY', 'TASK_SUMMARY', 'PROJECT_INSIGHT'],
      },
      RecommendationPriorityEnum: {
        type: 'string',
        enum: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'],
      },
      RecommendationCategoryEnum: {
        type: 'string',
        enum: [
          'BLOCKER',
          'DELIVERY_RISK',
          'MILESTONE',
          'PRIORITY',
          'OWNERSHIP',
          'WORKLOAD',
          'PROCESS',
          'RISK_MITIGATION',
          'PLANNING',
          'QUALITY',
          'RESOURCE',
        ],
      },
      RegisterRequest: {
        type: 'object',
        required: ['email', 'password', 'name'],
        properties: {
          email: { type: 'string', format: 'email', example: 'lead@taskflow.io' },
          password: { type: 'string', minLength: 8, example: 'SecurePassword123!' },
          name: { type: 'string', minLength: 2, example: 'Sarah Connor' },
          organizationName: { type: 'string', minLength: 2, example: 'Cyberdyne Systems' },
        },
      },
      LoginRequest: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email', example: 'lead@taskflow.io' },
          password: { type: 'string', example: 'SecurePassword123!' },
        },
      },
      AuthResponseData: {
        type: 'object',
        required: ['user', 'accessToken', 'defaultOrganization'],
        properties: {
          user: { $ref: '#/components/schemas/User' },
          accessToken: { type: 'string', example: 'eyJhbGciOiJIUzI1Ni...' },
          defaultOrganization: { $ref: '#/components/schemas/Organization' },
        },
      },
      UpdateUserProfileRequest: {
        type: 'object',
        properties: {
          name: { type: 'string', minLength: 2 },
          avatarUrl: { type: 'string', format: 'uri' },
          bio: { type: 'string', maxLength: 500 },
        },
      },
      ChangePasswordRequest: {
        type: 'object',
        required: ['currentPassword', 'newPassword'],
        properties: {
          currentPassword: { type: 'string' },
          newPassword: { type: 'string', minLength: 8 },
        },
      },
      NotificationPreferences: {
        type: 'object',
        required: [
          'userId',
          'emailDigest',
          'inApp',
          'taskAssigned',
          'statusChanged',
          'comments',
          'mentions',
          'milestones',
        ],
        properties: {
          userId: { type: 'string', format: 'uuid' },
          emailDigest: { type: 'boolean', default: false },
          inApp: { type: 'boolean', default: true },
          taskAssigned: { type: 'boolean', default: true },
          statusChanged: { type: 'boolean', default: true },
          comments: { type: 'boolean', default: true },
          mentions: { type: 'boolean', default: true },
          milestones: { type: 'boolean', default: true },
        },
      },
      UpdateNotificationPreferencesRequest: {
        type: 'object',
        properties: {
          emailDigest: { type: 'boolean' },
          inApp: { type: 'boolean' },
          taskAssigned: { type: 'boolean' },
          statusChanged: { type: 'boolean' },
          comments: { type: 'boolean' },
          mentions: { type: 'boolean' },
          milestones: { type: 'boolean' },
        },
      },
      OrganizationMember: {
        type: 'object',
        required: ['id', 'userId', 'organizationId', 'role', 'user'],
        properties: {
          id: { type: 'string', format: 'uuid' },
          userId: { type: 'string', format: 'uuid' },
          organizationId: { type: 'string', format: 'uuid' },
          role: { $ref: '#/components/schemas/UserRoleEnum' },
          user: { $ref: '#/components/schemas/User' },
        },
      },
      AddOrgMemberRequest: {
        type: 'object',
        required: ['email', 'role'],
        properties: {
          email: { type: 'string', format: 'email' },
          role: { $ref: '#/components/schemas/UserRoleEnum' },
        },
      },
      UpdateOrgMemberRoleRequest: {
        type: 'object',
        required: ['role'],
        properties: {
          role: { $ref: '#/components/schemas/UserRoleEnum' },
        },
      },
      WorkspaceDetails: {
        allOf: [
          { $ref: '#/components/schemas/Organization' },
          {
            type: 'object',
            properties: {
              membersCount: { type: 'integer', example: 8 },
              projectsCount: { type: 'integer', example: 3 },
            },
          },
        ],
      },
      UpdateWorkspaceRequest: {
        type: 'object',
        properties: {
          name: { type: 'string', minLength: 2 },
          slug: { type: 'string', minLength: 2 },
          logoUrl: { type: 'string', format: 'uri' },
        },
      },
      Project: {
        type: 'object',
        required: ['id', 'organizationId', 'name', 'key', 'isArchived', 'createdAt', 'updatedAt'],
        properties: {
          id: { type: 'string', format: 'uuid' },
          organizationId: { type: 'string', format: 'uuid' },
          name: { type: 'string', example: 'Mobile Banking App' },
          key: { type: 'string', example: 'BANK' },
          description: { type: 'string', nullable: true },
          color: { type: 'string', example: '#4F46E5' },
          icon: { type: 'string', example: 'smartphone' },
          isArchived: { type: 'boolean', example: false },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      CreateProjectRequest: {
        type: 'object',
        required: ['name', 'key'],
        properties: {
          name: { type: 'string', minLength: 2, maxLength: 100, example: 'Payment Modernization' },
          key: { type: 'string', minLength: 2, maxLength: 10, example: 'PAY' },
          description: { type: 'string', maxLength: 1000 },
          color: { type: 'string', example: '#10B981' },
          icon: { type: 'string', example: 'credit-card' },
        },
      },
      UpdateProjectRequest: {
        type: 'object',
        properties: {
          name: { type: 'string', minLength: 2, maxLength: 100 },
          description: { type: 'string', maxLength: 1000 },
          color: { type: 'string' },
          icon: { type: 'string' },
        },
      },
      ProjectMember: {
        type: 'object',
        required: ['id', 'userId', 'projectId', 'role', 'user'],
        properties: {
          id: { type: 'string', format: 'uuid' },
          userId: { type: 'string', format: 'uuid' },
          projectId: { type: 'string', format: 'uuid' },
          role: { $ref: '#/components/schemas/ProjectRoleEnum' },
          user: { $ref: '#/components/schemas/User' },
        },
      },
      AddProjectMemberRequest: {
        type: 'object',
        required: ['userId', 'role'],
        properties: {
          userId: { type: 'string', format: 'uuid' },
          role: { $ref: '#/components/schemas/ProjectRoleEnum' },
        },
      },
      UpdateProjectMemberRoleRequest: {
        type: 'object',
        required: ['role'],
        properties: {
          role: { $ref: '#/components/schemas/ProjectRoleEnum' },
        },
      },
      Task: {
        type: 'object',
        required: [
          'id',
          'projectId',
          'taskNumber',
          'title',
          'status',
          'priority',
          'isArchived',
          'createdAt',
          'updatedAt',
        ],
        properties: {
          id: { type: 'string', format: 'uuid' },
          projectId: { type: 'string', format: 'uuid' },
          issueKey: { type: 'string', example: 'PAY-14' },
          taskNumber: { type: 'integer', example: 14 },
          title: { type: 'string', example: 'Implement Stripe webhook handler' },
          description: { type: 'string', nullable: true },
          status: { $ref: '#/components/schemas/TaskStatusEnum' },
          priority: { $ref: '#/components/schemas/TaskPriorityEnum' },
          order: { type: 'number', example: 1000 },
          assigneeId: { type: 'string', format: 'uuid', nullable: true },
          reporterId: { type: 'string', format: 'uuid' },
          dueDate: { type: 'string', format: 'date-time', nullable: true },
          milestoneId: { type: 'string', format: 'uuid', nullable: true },
          isArchived: { type: 'boolean', example: false },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      CreateTaskRequest: {
        type: 'object',
        required: ['title'],
        properties: {
          title: { type: 'string', minLength: 1, maxLength: 255 },
          description: { type: 'string' },
          status: { $ref: '#/components/schemas/TaskStatusEnum', default: 'TODO' },
          priority: { $ref: '#/components/schemas/TaskPriorityEnum', default: 'MEDIUM' },
          assigneeId: { type: 'string', format: 'uuid', nullable: true },
          dueDate: { type: 'string', format: 'date-time', nullable: true },
          milestoneId: { type: 'string', format: 'uuid', nullable: true },
          labelIds: {
            type: 'array',
            items: { type: 'string', format: 'uuid' },
          },
        },
      },
      UpdateTaskRequest: {
        type: 'object',
        properties: {
          title: { type: 'string', minLength: 1, maxLength: 255 },
          description: { type: 'string', nullable: true },
          status: { $ref: '#/components/schemas/TaskStatusEnum' },
          priority: { $ref: '#/components/schemas/TaskPriorityEnum' },
          assigneeId: { type: 'string', format: 'uuid', nullable: true },
          dueDate: { type: 'string', format: 'date-time', nullable: true },
          milestoneId: { type: 'string', format: 'uuid', nullable: true },
          order: { type: 'number' },
        },
      },
      UpdateTaskStatusRequest: {
        type: 'object',
        required: ['status'],
        properties: {
          status: { $ref: '#/components/schemas/TaskStatusEnum' },
        },
      },
      Subtask: {
        type: 'object',
        required: ['id', 'taskId', 'title', 'isCompleted', 'createdAt', 'updatedAt'],
        properties: {
          id: { type: 'string', format: 'uuid' },
          taskId: { type: 'string', format: 'uuid' },
          title: { type: 'string', example: 'Verify signature verification logic' },
          isCompleted: { type: 'boolean', example: false },
          order: { type: 'number', example: 1 },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      CreateSubtaskRequest: {
        type: 'object',
        required: ['title'],
        properties: {
          title: { type: 'string', minLength: 1, maxLength: 255 },
          status: { type: 'string', enum: ['TODO', 'DONE'], default: 'TODO' },
        },
      },
      UpdateSubtaskRequest: {
        type: 'object',
        properties: {
          title: { type: 'string', minLength: 1, maxLength: 255 },
          status: { type: 'string', enum: ['TODO', 'DONE'] },
        },
      },
      Label: {
        type: 'object',
        required: ['id', 'projectId', 'name', 'color', 'createdAt', 'updatedAt'],
        properties: {
          id: { type: 'string', format: 'uuid' },
          projectId: { type: 'string', format: 'uuid' },
          name: { type: 'string', example: 'Backend' },
          color: { type: 'string', example: '#3B82F6' },
          description: { type: 'string', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      CreateLabelRequest: {
        type: 'object',
        required: ['name', 'color'],
        properties: {
          name: { type: 'string', minLength: 1, maxLength: 50 },
          color: { type: 'string', pattern: '^#(?:[0-9a-fA-F]{3}){1,2}$' },
          description: { type: 'string', maxLength: 200 },
        },
      },
      UpdateLabelRequest: {
        type: 'object',
        properties: {
          name: { type: 'string', minLength: 1, maxLength: 50 },
          color: { type: 'string', pattern: '^#(?:[0-9a-fA-F]{3}){1,2}$' },
          description: { type: 'string', maxLength: 200 },
        },
      },
      AssignTaskLabelRequest: {
        type: 'object',
        required: ['labelId'],
        properties: {
          labelId: { type: 'string', format: 'uuid' },
        },
      },
      TaskDependency: {
        type: 'object',
        required: ['id', 'dependentTaskId', 'dependencyTaskId', 'type', 'createdAt'],
        properties: {
          id: { type: 'string', format: 'uuid' },
          dependentTaskId: { type: 'string', format: 'uuid' },
          dependencyTaskId: { type: 'string', format: 'uuid' },
          type: { $ref: '#/components/schemas/DependencyTypeEnum' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      CreateDependencyRequest: {
        type: 'object',
        required: ['targetTaskId', 'type'],
        properties: {
          targetTaskId: { type: 'string', format: 'uuid' },
          type: { $ref: '#/components/schemas/DependencyTypeEnum' },
        },
      },
      DependencyGraphNode: {
        type: 'object',
        required: ['id', 'issueKey', 'title', 'status', 'priority'],
        properties: {
          id: { type: 'string', format: 'uuid' },
          issueKey: { type: 'string', example: 'PAY-12' },
          title: { type: 'string' },
          status: { $ref: '#/components/schemas/TaskStatusEnum' },
          priority: { $ref: '#/components/schemas/TaskPriorityEnum' },
          assignee: {
            type: 'object',
            nullable: true,
            properties: {
              id: { type: 'string', format: 'uuid' },
              name: { type: 'string' },
              avatarUrl: { type: 'string', nullable: true },
            },
          },
        },
      },
      DependencyGraphEdge: {
        type: 'object',
        required: ['id', 'source', 'target', 'type'],
        properties: {
          id: { type: 'string', format: 'uuid' },
          source: { type: 'string', format: 'uuid' },
          target: { type: 'string', format: 'uuid' },
          type: { $ref: '#/components/schemas/DependencyTypeEnum' },
        },
      },
      DependencyGraphResponse: {
        type: 'object',
        required: ['nodes', 'edges', 'summary'],
        properties: {
          nodes: {
            type: 'array',
            items: { $ref: '#/components/schemas/DependencyGraphNode' },
          },
          edges: {
            type: 'array',
            items: { $ref: '#/components/schemas/DependencyGraphEdge' },
          },
          summary: {
            type: 'object',
            required: ['totalTasks', 'totalDependencies', 'blockedTasksCount'],
            properties: {
              totalTasks: { type: 'integer' },
              totalDependencies: { type: 'integer' },
              blockedTasksCount: { type: 'integer' },
            },
          },
        },
      },
      Milestone: {
        type: 'object',
        required: ['id', 'projectId', 'title', 'status', 'createdAt', 'updatedAt'],
        properties: {
          id: { type: 'string', format: 'uuid' },
          projectId: { type: 'string', format: 'uuid' },
          title: { type: 'string', example: 'Beta Release v0.9' },
          description: { type: 'string', nullable: true },
          dueDate: { type: 'string', format: 'date-time', nullable: true },
          status: { $ref: '#/components/schemas/MilestoneStatusEnum' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      CreateMilestoneRequest: {
        type: 'object',
        required: ['title'],
        properties: {
          title: { type: 'string', minLength: 1, maxLength: 255 },
          description: { type: 'string' },
          dueDate: { type: 'string', format: 'date-time', nullable: true },
        },
      },
      UpdateMilestoneRequest: {
        type: 'object',
        properties: {
          title: { type: 'string', minLength: 1, maxLength: 255 },
          description: { type: 'string' },
          dueDate: { type: 'string', format: 'date-time', nullable: true },
          status: { $ref: '#/components/schemas/MilestoneStatusEnum' },
        },
      },
      TimelineResponse: {
        type: 'object',
        required: ['milestones', 'tasks'],
        properties: {
          milestones: {
            type: 'array',
            items: { $ref: '#/components/schemas/Milestone' },
          },
          tasks: {
            type: 'array',
            items: { $ref: '#/components/schemas/Task' },
          },
        },
      },
      Comment: {
        type: 'object',
        required: ['id', 'taskId', 'userId', 'content', 'createdAt', 'updatedAt'],
        properties: {
          id: { type: 'string', format: 'uuid' },
          taskId: { type: 'string', format: 'uuid' },
          userId: { type: 'string', format: 'uuid' },
          content: {
            type: 'string',
            example: 'Resolved review comments on the schema validation layer.',
          },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
          user: { $ref: '#/components/schemas/User' },
        },
      },
      CreateCommentRequest: {
        type: 'object',
        required: ['content'],
        properties: {
          content: { type: 'string', minLength: 1, maxLength: 5000 },
        },
      },
      UpdateCommentRequest: {
        type: 'object',
        required: ['content'],
        properties: {
          content: { type: 'string', minLength: 1, maxLength: 5000 },
        },
      },
      Activity: {
        type: 'object',
        required: ['id', 'entityType', 'action', 'entityId', 'userId', 'createdAt'],
        properties: {
          id: { type: 'string', format: 'uuid' },
          entityType: { type: 'string', example: 'TASK' },
          action: { type: 'string', example: 'TASK_STATUS_CHANGED' },
          entityId: { type: 'string', format: 'uuid' },
          projectId: { type: 'string', format: 'uuid', nullable: true },
          userId: { type: 'string', format: 'uuid' },
          metadata: { type: 'object' },
          createdAt: { type: 'string', format: 'date-time' },
          user: { $ref: '#/components/schemas/User' },
        },
      },
      Notification: {
        type: 'object',
        required: ['id', 'userId', 'type', 'title', 'message', 'isRead', 'createdAt'],
        properties: {
          id: { type: 'string', format: 'uuid' },
          userId: { type: 'string', format: 'uuid' },
          type: { type: 'string', example: 'TASK_ASSIGNED' },
          title: { type: 'string', example: 'New Task Assignment' },
          message: {
            type: 'string',
            example: 'You were assigned to PAY-14: Implement Stripe webhook',
          },
          entityType: { type: 'string', nullable: true },
          entityId: { type: 'string', format: 'uuid', nullable: true },
          projectId: { type: 'string', format: 'uuid', nullable: true },
          isRead: { type: 'boolean', example: false },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      UnreadCountResponse: {
        type: 'object',
        required: ['unreadCount'],
        properties: {
          unreadCount: { type: 'integer', example: 4 },
        },
      },
      MyWorkResponse: {
        type: 'object',
        required: ['assignedTasks', 'recentActivity'],
        properties: {
          assignedTasks: {
            type: 'array',
            items: { $ref: '#/components/schemas/Task' },
          },
          recentActivity: {
            type: 'array',
            items: { $ref: '#/components/schemas/Activity' },
          },
        },
      },
      SearchItem: {
        type: 'object',
        required: ['id', 'type', 'title'],
        properties: {
          id: { type: 'string', format: 'uuid' },
          type: { type: 'string', enum: ['TASK', 'PROJECT', 'MEMBER'] },
          title: { type: 'string' },
          subtitle: { type: 'string', nullable: true },
          url: { type: 'string' },
          metadata: { type: 'object' },
        },
      },
      SearchResults: {
        type: 'object',
        required: ['results', 'total'],
        properties: {
          results: {
            type: 'array',
            items: { $ref: '#/components/schemas/SearchItem' },
          },
          total: { type: 'integer', example: 12 },
        },
      },
      // PR 14 Project Dashboard 2.0 Schemas
      HealthSummary: {
        type: 'object',
        required: ['state', 'score', 'label', 'summary', 'calculatedAt'],
        properties: {
          state: { $ref: '#/components/schemas/ProjectHealthStateEnum' },
          score: { type: 'integer', minimum: 0, maximum: 100, example: 82 },
          label: { type: 'string', example: 'Healthy' },
          summary: { type: 'string', example: 'Sprint velocity on target with low blocker volume' },
          calculatedAt: { type: 'string', format: 'date-time' },
        },
      },
      HealthSignal: {
        type: 'object',
        required: ['id', 'name', 'status', 'description'],
        properties: {
          id: { type: 'string', example: 'completion-velocity' },
          name: { type: 'string', example: 'Completion Velocity' },
          status: { type: 'string', enum: ['PASS', 'WARN', 'FAIL'], example: 'PASS' },
          description: { type: 'string', example: 'Task completion rate exceeds 75%' },
        },
      },
      DistributionBucket: {
        type: 'object',
        required: ['key', 'label', 'count', 'percentage'],
        properties: {
          key: { type: 'string', example: 'IN_PROGRESS' },
          label: { type: 'string', example: 'In Progress' },
          count: { type: 'integer', example: 8 },
          percentage: { type: 'number', example: 25.5 },
        },
      },
      ProjectMetricBreakdown: {
        type: 'object',
        required: [
          'totalTasks',
          'completedTasks',
          'inFlightTasks',
          'overdueTasks',
          'blockedTasks',
          'completionPercentage',
        ],
        properties: {
          totalTasks: { type: 'integer', example: 32 },
          completedTasks: { type: 'integer', example: 18 },
          inFlightTasks: { type: 'integer', example: 10 },
          overdueTasks: { type: 'integer', example: 2 },
          blockedTasks: { type: 'integer', example: 2 },
          completionPercentage: { type: 'number', example: 56.25 },
        },
      },
      DeliveryRiskItem: {
        type: 'object',
        required: ['id', 'severity', 'title', 'description', 'impact'],
        properties: {
          id: { type: 'string', example: 'risk-overdue-milestone-1' },
          severity: { $ref: '#/components/schemas/DeliveryRiskSeverityEnum' },
          title: { type: 'string', example: 'Milestone Beta Behind Schedule' },
          description: {
            type: 'string',
            example: '2 open blocker tasks remain with due date tomorrow',
          },
          impact: { type: 'string', example: 'Potential delivery slip of 3 business days' },
        },
      },
      MilestoneHealthRollup: {
        type: 'object',
        required: [
          'id',
          'title',
          'dueDate',
          'progressPercentage',
          'isOverdue',
          'totalTasks',
          'completedTasks',
        ],
        properties: {
          id: { type: 'string', format: 'uuid' },
          title: { type: 'string', example: 'Sprint 3 Delivery' },
          dueDate: { type: 'string', format: 'date-time', nullable: true },
          progressPercentage: { type: 'number', example: 75.0 },
          isOverdue: { type: 'boolean', example: false },
          totalTasks: { type: 'integer', example: 12 },
          completedTasks: { type: 'integer', example: 9 },
        },
      },
      BlockerCluster: {
        type: 'object',
        required: ['task', 'blockedCount'],
        properties: {
          task: { $ref: '#/components/schemas/Task' },
          blockedCount: { type: 'integer', example: 3 },
        },
      },
      ProjectDashboardResponse: {
        type: 'object',
        required: [
          'project',
          'health',
          'signals',
          'metrics',
          'taskDistribution',
          'priorityDistribution',
          'risks',
          'milestones',
          'blockerClusters',
          'recentActivity',
        ],
        properties: {
          project: { $ref: '#/components/schemas/Project' },
          health: { $ref: '#/components/schemas/HealthSummary' },
          signals: {
            type: 'array',
            items: { $ref: '#/components/schemas/HealthSignal' },
          },
          metrics: { $ref: '#/components/schemas/ProjectMetricBreakdown' },
          taskDistribution: {
            type: 'array',
            items: { $ref: '#/components/schemas/DistributionBucket' },
          },
          priorityDistribution: {
            type: 'array',
            items: { $ref: '#/components/schemas/DistributionBucket' },
          },
          risks: {
            type: 'array',
            items: { $ref: '#/components/schemas/DeliveryRiskItem' },
          },
          milestones: {
            type: 'array',
            items: { $ref: '#/components/schemas/MilestoneHealthRollup' },
          },
          blockerClusters: {
            type: 'array',
            items: { $ref: '#/components/schemas/BlockerCluster' },
          },
          recentActivity: {
            type: 'array',
            items: { $ref: '#/components/schemas/Activity' },
          },
        },
      },
      // PR 15/16 AI Analysis Schemas
      AIAnalysisRequest: {
        type: 'object',
        required: ['operation'],
        properties: {
          operation: { $ref: '#/components/schemas/AIOperationEnum' },
          user_prompt: {
            type: 'string',
            maxLength: 2000,
            description: 'Optional natural language directive to guide AI synthesis',
            example: 'Focus specifically on the remaining payment gateway blockers.',
          },
        },
      },
      AIRecommendation: {
        type: 'object',
        required: ['title', 'description', 'priority', 'category'],
        properties: {
          title: { type: 'string', example: 'Resolve blocker on payment gateway' },
          description: {
            type: 'string',
            example: 'Critical path dependency requires immediate engineering focus.',
          },
          priority: { $ref: '#/components/schemas/RecommendationPriorityEnum' },
          category: { $ref: '#/components/schemas/RecommendationCategoryEnum' },
        },
      },
      AIAttentionArea: {
        type: 'object',
        required: ['title', 'description', 'severity'],
        properties: {
          title: { type: 'string', example: '2 Overdue High-Priority Tasks' },
          description: {
            type: 'string',
            example:
              'Tasks ALPHA-12 and ALPHA-15 have passed target completion dates without updates.',
          },
          severity: { $ref: '#/components/schemas/RecommendationPriorityEnum' },
        },
      },
      AIAnalysisResponse: {
        type: 'object',
        required: ['request_id', 'operation', 'summary', 'recommendations', 'metadata'],
        properties: {
          request_id: { type: 'string', example: 'f87b8b2e-07e1-4c12-8e68-084d3b664d4b' },
          operation: { $ref: '#/components/schemas/AIOperationEnum' },
          summary: {
            type: 'string',
            example:
              'Project Alpha is progressing on schedule with an 80% completion rate across 4 active milestones.',
          },
          recommendations: {
            type: 'array',
            items: { $ref: '#/components/schemas/AIRecommendation' },
          },
          attention_areas: {
            type: 'array',
            items: { $ref: '#/components/schemas/AIAttentionArea' },
          },
          metadata: {
            type: 'object',
            required: ['provider', 'model', 'prompt_tokens', 'completion_tokens'],
            properties: {
              provider: { type: 'string', example: 'openai' },
              model: { type: 'string', example: 'gpt-4o-mini' },
              prompt_tokens: { type: 'integer', example: 450 },
              completion_tokens: { type: 'integer', example: 180 },
            },
          },
        },
      },
    },
  },
  paths: {
    '/health': {
      get: {
        tags: ['Health'],
        summary: 'Root health probe',
        description:
          'Lightweight liveness probe for Docker container and cloud load balancer health checks.',
        responses: {
          200: {
            description: 'Service is operational',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/HealthResponse' } },
            },
          },
        },
      },
    },
    '/api/v1/health': {
      get: {
        tags: ['Health'],
        summary: 'Versioned API health check',
        description: 'Returns runtime health status, service identity, uptime, and environment.',
        responses: {
          200: {
            description: 'API runtime is operational',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/HealthResponse' } },
            },
          },
        },
      },
    },
    '/api/v1/auth/register': {
      post: {
        tags: ['Authentication'],
        summary: 'Register new user account',
        description:
          'Creates a new user account, provisions an initial organization workspace, sets HTTP-only refresh cookie, and returns access token.',
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/RegisterRequest' } },
          },
        },
        responses: {
          201: {
            description: 'User registered successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['success', 'data'],
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/AuthResponseData' },
                  },
                },
              },
            },
          },
          400: { $ref: '#/components/responses/ValidationError' },
          409: { $ref: '#/components/responses/Conflict' },
        },
      },
    },
    '/api/v1/auth/login': {
      post: {
        tags: ['Authentication'],
        summary: 'Authenticate with email and password',
        description:
          'Authenticates credentials, issues access token, sets HTTP-only refresh token cookie, and records session.',
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/LoginRequest' } },
          },
        },
        responses: {
          200: {
            description: 'Authenticated successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['success', 'data'],
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/AuthResponseData' },
                  },
                },
              },
            },
          },
          400: { $ref: '#/components/responses/ValidationError' },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/api/v1/auth/refresh': {
      post: {
        tags: ['Authentication'],
        summary: 'Rotate refresh token and issue new access token',
        description:
          'Rotates refresh token stored in HTTP-only cookie, detects token reuse attacks, and returns fresh access token.',
        responses: {
          200: {
            description: 'Token refreshed successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['success', 'data'],
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'object',
                      required: ['accessToken'],
                      properties: { accessToken: { type: 'string' } },
                    },
                  },
                },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/api/v1/auth/logout': {
      post: {
        tags: ['Authentication'],
        summary: 'Revoke active session and clear cookie',
        description: 'Revokes the refresh token session in database and clears the refresh cookie.',
        responses: {
          200: {
            description: 'Logged out successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['success', 'data'],
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'object',
                      required: ['message'],
                      properties: {
                        message: { type: 'string', example: 'Logged out successfully' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/v1/auth/me': {
      get: {
        tags: ['Authentication'],
        summary: 'Get active session context',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'Current session user and workspace memberships',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['success', 'data'],
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'object',
                      required: ['user', 'organizations'],
                      properties: {
                        user: { $ref: '#/components/schemas/User' },
                        organizations: {
                          type: 'array',
                          items: { $ref: '#/components/schemas/Organization' },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/api/v1/users/me': {
      get: {
        tags: ['Users'],
        summary: 'Get current user profile',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'Profile data',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['success', 'data'],
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/User' },
                  },
                },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
      patch: {
        tags: ['Users'],
        summary: 'Update current user profile',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/UpdateUserProfileRequest' },
            },
          },
        },
        responses: {
          200: {
            description: 'Updated profile data',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['success', 'data'],
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/User' },
                  },
                },
              },
            },
          },
          400: { $ref: '#/components/responses/ValidationError' },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/api/v1/users/me/password': {
      patch: {
        tags: ['Users'],
        summary: 'Change password and revoke other sessions',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/ChangePasswordRequest' } },
          },
        },
        responses: {
          200: {
            description: 'Password changed and fresh token issued',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['success', 'data'],
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'object',
                      required: ['accessToken', 'message'],
                      properties: {
                        accessToken: { type: 'string' },
                        message: { type: 'string' },
                      },
                    },
                  },
                },
              },
            },
          },
          400: { $ref: '#/components/responses/ValidationError' },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/api/v1/users/me/notification-preferences': {
      get: {
        tags: ['Users'],
        summary: 'Get notification delivery preferences',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'Current notification preference flags',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['success', 'data'],
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/NotificationPreferences' },
                  },
                },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
      patch: {
        tags: ['Users'],
        summary: 'Update notification delivery preferences',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/UpdateNotificationPreferencesRequest' },
            },
          },
        },
        responses: {
          200: {
            description: 'Updated notification preferences',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['success', 'data'],
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/NotificationPreferences' },
                  },
                },
              },
            },
          },
          400: { $ref: '#/components/responses/ValidationError' },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/api/v1/organizations': {
      get: {
        tags: ['Organizations'],
        summary: 'List user workspaces',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'List of organization workspaces the user belongs to',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['success', 'data'],
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Organization' },
                    },
                  },
                },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/api/v1/organizations/{organizationId}': {
      get: {
        tags: ['Organizations'],
        summary: 'Get workspace details and aggregate counts',
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/organizationIdParam' }],
        responses: {
          200: {
            description: 'Workspace details',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['success', 'data'],
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/WorkspaceDetails' },
                  },
                },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
      patch: {
        tags: ['Organizations'],
        summary: 'Update workspace metadata',
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/organizationIdParam' }],
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/UpdateWorkspaceRequest' } },
          },
        },
        responses: {
          200: {
            description: 'Updated workspace',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['success', 'data'],
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/Organization' },
                  },
                },
              },
            },
          },
          400: { $ref: '#/components/responses/ValidationError' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/api/v1/organizations/{organizationId}/members': {
      get: {
        tags: ['Organizations'],
        summary: 'List workspace members',
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/organizationIdParam' }],
        responses: {
          200: {
            description: 'List of members and their roles in the workspace',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['success', 'data'],
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/OrganizationMember' },
                    },
                  },
                },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
        },
      },
      post: {
        tags: ['Organizations'],
        summary: 'Add member to workspace (Owner/Admin only)',
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/organizationIdParam' }],
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/AddOrgMemberRequest' } },
          },
        },
        responses: {
          201: {
            description: 'Member added to workspace',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['success', 'data'],
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/OrganizationMember' },
                  },
                },
              },
            },
          },
          400: { $ref: '#/components/responses/ValidationError' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
          409: { $ref: '#/components/responses/Conflict' },
        },
      },
    },
    '/api/v1/organizations/{organizationId}/members/{userId}': {
      patch: {
        tags: ['Organizations'],
        summary: 'Update member workspace role (Owner/Admin only)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { $ref: '#/components/parameters/organizationIdParam' },
          { $ref: '#/components/parameters/userIdParam' },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/UpdateOrgMemberRoleRequest' },
            },
          },
        },
        responses: {
          200: {
            description: 'Role updated',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['success', 'data'],
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/OrganizationMember' },
                  },
                },
              },
            },
          },
          400: { $ref: '#/components/responses/ValidationError' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
      delete: {
        tags: ['Organizations'],
        summary: 'Remove member from workspace (Owner/Admin only)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { $ref: '#/components/parameters/organizationIdParam' },
          { $ref: '#/components/parameters/userIdParam' },
        ],
        responses: {
          200: {
            description: 'Member removed',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['success', 'data'],
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'object',
                      required: ['message'],
                      properties: { message: { type: 'string' } },
                    },
                  },
                },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/api/v1/organizations/{organizationId}/search': {
      get: {
        tags: ['Search'],
        summary: 'Organization-scoped search',
        security: [{ bearerAuth: [] }],
        parameters: [
          { $ref: '#/components/parameters/organizationIdParam' },
          {
            name: 'q',
            in: 'query',
            required: true,
            schema: { type: 'string' },
            description: 'Search term query',
          },
          {
            name: 'type',
            in: 'query',
            required: false,
            schema: { type: 'string', enum: ['TASK', 'PROJECT', 'MEMBER'] },
          },
          {
            name: 'projectId',
            in: 'query',
            required: false,
            schema: { type: 'string', format: 'uuid' },
          },
          {
            name: 'limit',
            in: 'query',
            required: false,
            schema: { type: 'integer', minimum: 1, maximum: 50, default: 20 },
          },
        ],
        responses: {
          200: {
            description: 'Search results matching criteria',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['success', 'data'],
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/SearchResults' },
                  },
                },
              },
            },
          },
          400: { $ref: '#/components/responses/ValidationError' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
        },
      },
    },
    '/api/v1/organizations/{organizationId}/projects': {
      get: {
        tags: ['Projects'],
        summary: 'List projects in workspace',
        security: [{ bearerAuth: [] }],
        parameters: [
          { $ref: '#/components/parameters/organizationIdParam' },
          {
            name: 'archived',
            in: 'query',
            required: false,
            schema: { type: 'boolean', default: false },
            description: 'Filter archived projects',
          },
        ],
        responses: {
          200: {
            description: 'List of projects',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['success', 'data'],
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Project' },
                    },
                  },
                },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
        },
      },
      post: {
        tags: ['Projects'],
        summary: 'Create project in workspace',
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/organizationIdParam' }],
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/CreateProjectRequest' } },
          },
        },
        responses: {
          201: {
            description: 'Project created',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['success', 'data'],
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/Project' },
                  },
                },
              },
            },
          },
          400: { $ref: '#/components/responses/ValidationError' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          409: { $ref: '#/components/responses/Conflict' },
        },
      },
    },
    '/api/v1/organizations/{organizationId}/projects/{projectId}': {
      get: {
        tags: ['Projects'],
        summary: 'Get project details',
        security: [{ bearerAuth: [] }],
        parameters: [
          { $ref: '#/components/parameters/organizationIdParam' },
          { $ref: '#/components/parameters/projectIdParam' },
        ],
        responses: {
          200: {
            description: 'Project details and summary metrics',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['success', 'data'],
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/Project' },
                  },
                },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
      patch: {
        tags: ['Projects'],
        summary: 'Update project settings',
        security: [{ bearerAuth: [] }],
        parameters: [
          { $ref: '#/components/parameters/organizationIdParam' },
          { $ref: '#/components/parameters/projectIdParam' },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/UpdateProjectRequest' } },
          },
        },
        responses: {
          200: {
            description: 'Project updated',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['success', 'data'],
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/Project' },
                  },
                },
              },
            },
          },
          400: { $ref: '#/components/responses/ValidationError' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/api/v1/organizations/{organizationId}/projects/{projectId}/archive': {
      post: {
        tags: ['Projects'],
        summary: 'Archive project',
        security: [{ bearerAuth: [] }],
        parameters: [
          { $ref: '#/components/parameters/organizationIdParam' },
          { $ref: '#/components/parameters/projectIdParam' },
        ],
        responses: {
          200: {
            description: 'Project archived',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['success', 'data'],
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/Project' },
                  },
                },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/api/v1/organizations/{organizationId}/projects/{projectId}/unarchive': {
      post: {
        tags: ['Projects'],
        summary: 'Unarchive project',
        security: [{ bearerAuth: [] }],
        parameters: [
          { $ref: '#/components/parameters/organizationIdParam' },
          { $ref: '#/components/parameters/projectIdParam' },
        ],
        responses: {
          200: {
            description: 'Project unarchive',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['success', 'data'],
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/Project' },
                  },
                },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/api/v1/organizations/{organizationId}/projects/{projectId}/members': {
      get: {
        tags: ['Projects'],
        summary: 'List project members',
        security: [{ bearerAuth: [] }],
        parameters: [
          { $ref: '#/components/parameters/organizationIdParam' },
          { $ref: '#/components/parameters/projectIdParam' },
        ],
        responses: {
          200: {
            description: 'List of members and their project roles',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['success', 'data'],
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/ProjectMember' },
                    },
                  },
                },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
      post: {
        tags: ['Projects'],
        summary: 'Add member to project (Owner/Admin only)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { $ref: '#/components/parameters/organizationIdParam' },
          { $ref: '#/components/parameters/projectIdParam' },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/AddProjectMemberRequest' },
            },
          },
        },
        responses: {
          201: {
            description: 'Member added',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['success', 'data'],
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/ProjectMember' },
                  },
                },
              },
            },
          },
          400: { $ref: '#/components/responses/ValidationError' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
          409: { $ref: '#/components/responses/Conflict' },
        },
      },
    },
    '/api/v1/organizations/{organizationId}/projects/{projectId}/members/{userId}': {
      patch: {
        tags: ['Projects'],
        summary: 'Update member role in project (Owner/Admin only)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { $ref: '#/components/parameters/organizationIdParam' },
          { $ref: '#/components/parameters/projectIdParam' },
          { $ref: '#/components/parameters/userIdParam' },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/UpdateProjectMemberRoleRequest' },
            },
          },
        },
        responses: {
          200: {
            description: 'Member role updated',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['success', 'data'],
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/ProjectMember' },
                  },
                },
              },
            },
          },
          400: { $ref: '#/components/responses/ValidationError' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
      delete: {
        tags: ['Projects'],
        summary: 'Remove member from project (Owner/Admin only)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { $ref: '#/components/parameters/organizationIdParam' },
          { $ref: '#/components/parameters/projectIdParam' },
          { $ref: '#/components/parameters/userIdParam' },
        ],
        responses: {
          200: {
            description: 'Member removed',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['success', 'data'],
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'object',
                      required: ['message'],
                      properties: { message: { type: 'string' } },
                    },
                  },
                },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/api/v1/organizations/{organizationId}/projects/{projectId}/dashboard': {
      get: {
        tags: ['Project Dashboard'],
        summary: 'Get Project Dashboard 2.0 and delivery health rollup',
        description:
          'Returns PR 14 deterministic project health score, explainable signal breakdown, delivery risks, active blocker clusters, milestone progress, and distribution metrics.',
        security: [{ bearerAuth: [] }],
        parameters: [
          { $ref: '#/components/parameters/organizationIdParam' },
          { $ref: '#/components/parameters/projectIdParam' },
        ],
        responses: {
          200: {
            description: 'Project dashboard metrics and health summary',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['success', 'data'],
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/ProjectDashboardResponse' },
                  },
                },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/api/v1/organizations/{organizationId}/projects/{projectId}/ai/analyze': {
      post: {
        tags: ['AI Analysis'],
        summary: 'Run AI intelligence synthesis over project context',
        description:
          'Executes qualitative synthesis (PROJECT_SUMMARY, TASK_SUMMARY, PROJECT_INSIGHT) via the internal Python AI service. Enforces RBAC (Project VIEWER is restricted) and preserves end-to-end correlation IDs.',
        security: [{ bearerAuth: [] }],
        parameters: [
          { $ref: '#/components/parameters/organizationIdParam' },
          { $ref: '#/components/parameters/projectIdParam' },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/AIAnalysisRequest' } },
          },
        },
        responses: {
          200: {
            description: 'AI analysis generated successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['success', 'data'],
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/AIAnalysisResponse' },
                  },
                },
              },
            },
          },
          400: { $ref: '#/components/responses/ValidationError' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
          429: { $ref: '#/components/responses/RateLimitExceeded' },
          500: { $ref: '#/components/responses/InternalServerError' },
          502: {
            description: 'Upstream AI provider error occurred during analysis',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } },
            },
          },
          503: {
            description: 'Internal AI service unavailable or unconfigured provider',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } },
            },
          },
          504: {
            description: 'AI service request timed out',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } },
            },
          },
        },
      },
    },
    '/api/v1/organizations/{organizationId}/projects/{projectId}/dependencies/graph': {
      get: {
        tags: ['Dependencies'],
        summary: 'Get project dependency visualizer graph',
        security: [{ bearerAuth: [] }],
        parameters: [
          { $ref: '#/components/parameters/organizationIdParam' },
          { $ref: '#/components/parameters/projectIdParam' },
        ],
        responses: {
          200: {
            description: 'Nodes, edges, and blocker summary',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['success', 'data'],
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/DependencyGraphResponse' },
                  },
                },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/api/v1/organizations/{organizationId}/projects/{projectId}/timeline': {
      get: {
        tags: ['Milestones'],
        summary: 'Get project milestones and task timeline data',
        security: [{ bearerAuth: [] }],
        parameters: [
          { $ref: '#/components/parameters/organizationIdParam' },
          { $ref: '#/components/parameters/projectIdParam' },
        ],
        responses: {
          200: {
            description: 'Timeline dataset',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['success', 'data'],
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/TimelineResponse' },
                  },
                },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/api/v1/organizations/{organizationId}/projects/{projectId}/activity': {
      get: {
        tags: ['Activity'],
        summary: 'Get project activity audit feed',
        security: [{ bearerAuth: [] }],
        parameters: [
          { $ref: '#/components/parameters/organizationIdParam' },
          { $ref: '#/components/parameters/projectIdParam' },
          { name: 'limit', in: 'query', required: false, schema: { type: 'integer', default: 20 } },
          { name: 'cursor', in: 'query', required: false, schema: { type: 'string' } },
          {
            name: 'taskId',
            in: 'query',
            required: false,
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        responses: {
          200: {
            description: 'Activity feed events',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['success', 'data'],
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Activity' },
                    },
                  },
                },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/api/v1/organizations/{organizationId}/projects/{projectId}/labels': {
      get: {
        tags: ['Labels'],
        summary: 'List project labels',
        security: [{ bearerAuth: [] }],
        parameters: [
          { $ref: '#/components/parameters/organizationIdParam' },
          { $ref: '#/components/parameters/projectIdParam' },
        ],
        responses: {
          200: {
            description: 'List of labels',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['success', 'data'],
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Label' },
                    },
                  },
                },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
      post: {
        tags: ['Labels'],
        summary: 'Create project label',
        security: [{ bearerAuth: [] }],
        parameters: [
          { $ref: '#/components/parameters/organizationIdParam' },
          { $ref: '#/components/parameters/projectIdParam' },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/CreateLabelRequest' } },
          },
        },
        responses: {
          201: {
            description: 'Label created',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['success', 'data'],
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/Label' },
                  },
                },
              },
            },
          },
          400: { $ref: '#/components/responses/ValidationError' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/api/v1/organizations/{organizationId}/projects/{projectId}/labels/{labelId}': {
      patch: {
        tags: ['Labels'],
        summary: 'Update project label',
        security: [{ bearerAuth: [] }],
        parameters: [
          { $ref: '#/components/parameters/organizationIdParam' },
          { $ref: '#/components/parameters/projectIdParam' },
          { $ref: '#/components/parameters/labelIdParam' },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/UpdateLabelRequest' } },
          },
        },
        responses: {
          200: {
            description: 'Label updated',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['success', 'data'],
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/Label' },
                  },
                },
              },
            },
          },
          400: { $ref: '#/components/responses/ValidationError' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
      delete: {
        tags: ['Labels'],
        summary: 'Delete project label',
        security: [{ bearerAuth: [] }],
        parameters: [
          { $ref: '#/components/parameters/organizationIdParam' },
          { $ref: '#/components/parameters/projectIdParam' },
          { $ref: '#/components/parameters/labelIdParam' },
        ],
        responses: {
          200: {
            description: 'Label deleted',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['success', 'data'],
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'object',
                      required: ['message'],
                      properties: { message: { type: 'string' } },
                    },
                  },
                },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/api/v1/organizations/{organizationId}/projects/{projectId}/milestones': {
      get: {
        tags: ['Milestones'],
        summary: 'List project milestones',
        security: [{ bearerAuth: [] }],
        parameters: [
          { $ref: '#/components/parameters/organizationIdParam' },
          { $ref: '#/components/parameters/projectIdParam' },
        ],
        responses: {
          200: {
            description: 'List of milestones',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['success', 'data'],
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Milestone' },
                    },
                  },
                },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
      post: {
        tags: ['Milestones'],
        summary: 'Create project milestone',
        security: [{ bearerAuth: [] }],
        parameters: [
          { $ref: '#/components/parameters/organizationIdParam' },
          { $ref: '#/components/parameters/projectIdParam' },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/CreateMilestoneRequest' } },
          },
        },
        responses: {
          201: {
            description: 'Milestone created',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['success', 'data'],
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/Milestone' },
                  },
                },
              },
            },
          },
          400: { $ref: '#/components/responses/ValidationError' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/api/v1/organizations/{organizationId}/projects/{projectId}/milestones/{milestoneId}': {
      get: {
        tags: ['Milestones'],
        summary: 'Get milestone details',
        security: [{ bearerAuth: [] }],
        parameters: [
          { $ref: '#/components/parameters/organizationIdParam' },
          { $ref: '#/components/parameters/projectIdParam' },
          { $ref: '#/components/parameters/milestoneIdParam' },
        ],
        responses: {
          200: {
            description: 'Milestone data',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['success', 'data'],
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/Milestone' },
                  },
                },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
      patch: {
        tags: ['Milestones'],
        summary: 'Update milestone',
        security: [{ bearerAuth: [] }],
        parameters: [
          { $ref: '#/components/parameters/organizationIdParam' },
          { $ref: '#/components/parameters/projectIdParam' },
          { $ref: '#/components/parameters/milestoneIdParam' },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/UpdateMilestoneRequest' } },
          },
        },
        responses: {
          200: {
            description: 'Milestone updated',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['success', 'data'],
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/Milestone' },
                  },
                },
              },
            },
          },
          400: { $ref: '#/components/responses/ValidationError' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
      delete: {
        tags: ['Milestones'],
        summary: 'Delete milestone',
        security: [{ bearerAuth: [] }],
        parameters: [
          { $ref: '#/components/parameters/organizationIdParam' },
          { $ref: '#/components/parameters/projectIdParam' },
          { $ref: '#/components/parameters/milestoneIdParam' },
        ],
        responses: {
          200: {
            description: 'Milestone deleted',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['success', 'data'],
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'object',
                      required: ['message'],
                      properties: { message: { type: 'string' } },
                    },
                  },
                },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/api/v1/organizations/{organizationId}/projects/{projectId}/tasks': {
      get: {
        tags: ['Tasks'],
        summary: 'List project tasks with filters',
        security: [{ bearerAuth: [] }],
        parameters: [
          { $ref: '#/components/parameters/organizationIdParam' },
          { $ref: '#/components/parameters/projectIdParam' },
          {
            name: 'status',
            in: 'query',
            required: false,
            schema: { $ref: '#/components/schemas/TaskStatusEnum' },
          },
          {
            name: 'priority',
            in: 'query',
            required: false,
            schema: { $ref: '#/components/schemas/TaskPriorityEnum' },
          },
          {
            name: 'assigneeId',
            in: 'query',
            required: false,
            schema: { type: 'string', format: 'uuid' },
          },
          {
            name: 'labelId',
            in: 'query',
            required: false,
            schema: { type: 'string', format: 'uuid' },
          },
          {
            name: 'milestoneId',
            in: 'query',
            required: false,
            schema: { type: 'string', format: 'uuid' },
          },
          {
            name: 'archived',
            in: 'query',
            required: false,
            schema: { type: 'boolean', default: false },
          },
          { name: 'search', in: 'query', required: false, schema: { type: 'string' } },
          { $ref: '#/components/parameters/pageQuery' },
          { $ref: '#/components/parameters/limitQuery' },
        ],
        responses: {
          200: {
            description: 'Paginated task list',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['success', 'data'],
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Task' },
                    },
                    meta: { $ref: '#/components/schemas/PaginationMeta' },
                  },
                },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
      post: {
        tags: ['Tasks'],
        summary: 'Create new task in project',
        security: [{ bearerAuth: [] }],
        parameters: [
          { $ref: '#/components/parameters/organizationIdParam' },
          { $ref: '#/components/parameters/projectIdParam' },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/CreateTaskRequest' } },
          },
        },
        responses: {
          201: {
            description: 'Task created',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['success', 'data'],
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/Task' },
                  },
                },
              },
            },
          },
          400: { $ref: '#/components/responses/ValidationError' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/api/v1/organizations/{organizationId}/projects/{projectId}/tasks/{taskId}': {
      get: {
        tags: ['Tasks'],
        summary: 'Get task details',
        security: [{ bearerAuth: [] }],
        parameters: [
          { $ref: '#/components/parameters/organizationIdParam' },
          { $ref: '#/components/parameters/projectIdParam' },
          { $ref: '#/components/parameters/taskIdParam' },
        ],
        responses: {
          200: {
            description: 'Task data',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['success', 'data'],
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/Task' },
                  },
                },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
      patch: {
        tags: ['Tasks'],
        summary: 'Update task properties',
        security: [{ bearerAuth: [] }],
        parameters: [
          { $ref: '#/components/parameters/organizationIdParam' },
          { $ref: '#/components/parameters/projectIdParam' },
          { $ref: '#/components/parameters/taskIdParam' },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/UpdateTaskRequest' } },
          },
        },
        responses: {
          200: {
            description: 'Task updated',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['success', 'data'],
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/Task' },
                  },
                },
              },
            },
          },
          400: { $ref: '#/components/responses/ValidationError' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
      delete: {
        tags: ['Tasks'],
        summary: 'Delete task and related records',
        security: [{ bearerAuth: [] }],
        parameters: [
          { $ref: '#/components/parameters/organizationIdParam' },
          { $ref: '#/components/parameters/projectIdParam' },
          { $ref: '#/components/parameters/taskIdParam' },
        ],
        responses: {
          200: {
            description: 'Task deleted',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['success', 'data'],
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'object',
                      required: ['message'],
                      properties: { message: { type: 'string' } },
                    },
                  },
                },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/api/v1/organizations/{organizationId}/projects/{projectId}/tasks/{taskId}/status': {
      patch: {
        tags: ['Tasks'],
        summary: 'Update task workflow status (Kanban stage transition)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { $ref: '#/components/parameters/organizationIdParam' },
          { $ref: '#/components/parameters/projectIdParam' },
          { $ref: '#/components/parameters/taskIdParam' },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/UpdateTaskStatusRequest' },
            },
          },
        },
        responses: {
          200: {
            description: 'Task status updated',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['success', 'data'],
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/Task' },
                  },
                },
              },
            },
          },
          400: { $ref: '#/components/responses/ValidationError' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/api/v1/organizations/{organizationId}/projects/{projectId}/tasks/{taskId}/archive': {
      post: {
        tags: ['Tasks'],
        summary: 'Archive task',
        security: [{ bearerAuth: [] }],
        parameters: [
          { $ref: '#/components/parameters/organizationIdParam' },
          { $ref: '#/components/parameters/projectIdParam' },
          { $ref: '#/components/parameters/taskIdParam' },
        ],
        responses: {
          200: {
            description: 'Task archived',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['success', 'data'],
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/Task' },
                  },
                },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/api/v1/organizations/{organizationId}/projects/{projectId}/tasks/{taskId}/unarchive': {
      post: {
        tags: ['Tasks'],
        summary: 'Unarchive task',
        security: [{ bearerAuth: [] }],
        parameters: [
          { $ref: '#/components/parameters/organizationIdParam' },
          { $ref: '#/components/parameters/projectIdParam' },
          { $ref: '#/components/parameters/taskIdParam' },
        ],
        responses: {
          200: {
            description: 'Task unarchived',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['success', 'data'],
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/Task' },
                  },
                },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/api/v1/organizations/{organizationId}/projects/{projectId}/tasks/{taskId}/labels': {
      post: {
        tags: ['Labels'],
        summary: 'Assign label to task',
        security: [{ bearerAuth: [] }],
        parameters: [
          { $ref: '#/components/parameters/organizationIdParam' },
          { $ref: '#/components/parameters/projectIdParam' },
          { $ref: '#/components/parameters/taskIdParam' },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/AssignTaskLabelRequest' } },
          },
        },
        responses: {
          200: {
            description: 'Label assigned',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['success', 'data'],
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'object',
                      required: ['message'],
                      properties: { message: { type: 'string' } },
                    },
                  },
                },
              },
            },
          },
          400: { $ref: '#/components/responses/ValidationError' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/api/v1/organizations/{organizationId}/projects/{projectId}/tasks/{taskId}/labels/{labelId}': {
      delete: {
        tags: ['Labels'],
        summary: 'Remove label from task',
        security: [{ bearerAuth: [] }],
        parameters: [
          { $ref: '#/components/parameters/organizationIdParam' },
          { $ref: '#/components/parameters/projectIdParam' },
          { $ref: '#/components/parameters/taskIdParam' },
          { $ref: '#/components/parameters/labelIdParam' },
        ],
        responses: {
          200: {
            description: 'Label removed',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['success', 'data'],
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'object',
                      required: ['message'],
                      properties: { message: { type: 'string' } },
                    },
                  },
                },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/api/v1/organizations/{organizationId}/projects/{projectId}/tasks/{taskId}/subtasks': {
      get: {
        tags: ['Subtasks'],
        summary: 'List task subtasks',
        security: [{ bearerAuth: [] }],
        parameters: [
          { $ref: '#/components/parameters/organizationIdParam' },
          { $ref: '#/components/parameters/projectIdParam' },
          { $ref: '#/components/parameters/taskIdParam' },
        ],
        responses: {
          200: {
            description: 'List of subtasks',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['success', 'data'],
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Subtask' },
                    },
                  },
                },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
      post: {
        tags: ['Subtasks'],
        summary: 'Create subtask',
        security: [{ bearerAuth: [] }],
        parameters: [
          { $ref: '#/components/parameters/organizationIdParam' },
          { $ref: '#/components/parameters/projectIdParam' },
          { $ref: '#/components/parameters/taskIdParam' },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/CreateSubtaskRequest' } },
          },
        },
        responses: {
          201: {
            description: 'Subtask created',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['success', 'data'],
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/Subtask' },
                  },
                },
              },
            },
          },
          400: { $ref: '#/components/responses/ValidationError' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/api/v1/organizations/{organizationId}/projects/{projectId}/tasks/{taskId}/subtasks/{subtaskId}':
      {
        patch: {
          tags: ['Subtasks'],
          summary: 'Update subtask status or title',
          security: [{ bearerAuth: [] }],
          parameters: [
            { $ref: '#/components/parameters/organizationIdParam' },
            { $ref: '#/components/parameters/projectIdParam' },
            { $ref: '#/components/parameters/taskIdParam' },
            { $ref: '#/components/parameters/subtaskIdParam' },
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/UpdateSubtaskRequest' } },
            },
          },
          responses: {
            200: {
              description: 'Subtask updated',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    required: ['success', 'data'],
                    properties: {
                      success: { type: 'boolean', example: true },
                      data: { $ref: '#/components/schemas/Subtask' },
                    },
                  },
                },
              },
            },
            400: { $ref: '#/components/responses/ValidationError' },
            401: { $ref: '#/components/responses/Unauthorized' },
            403: { $ref: '#/components/responses/Forbidden' },
            404: { $ref: '#/components/responses/NotFound' },
          },
        },
        delete: {
          tags: ['Subtasks'],
          summary: 'Delete subtask',
          security: [{ bearerAuth: [] }],
          parameters: [
            { $ref: '#/components/parameters/organizationIdParam' },
            { $ref: '#/components/parameters/projectIdParam' },
            { $ref: '#/components/parameters/taskIdParam' },
            { $ref: '#/components/parameters/subtaskIdParam' },
          ],
          responses: {
            200: {
              description: 'Subtask deleted',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    required: ['success', 'data'],
                    properties: {
                      success: { type: 'boolean', example: true },
                      data: {
                        type: 'object',
                        required: ['message'],
                        properties: { message: { type: 'string' } },
                      },
                    },
                  },
                },
              },
            },
            401: { $ref: '#/components/responses/Unauthorized' },
            403: { $ref: '#/components/responses/Forbidden' },
            404: { $ref: '#/components/responses/NotFound' },
          },
        },
      },
    '/api/v1/organizations/{organizationId}/projects/{projectId}/tasks/{taskId}/dependencies': {
      get: {
        tags: ['Dependencies'],
        summary: 'List dependencies for a task',
        security: [{ bearerAuth: [] }],
        parameters: [
          { $ref: '#/components/parameters/organizationIdParam' },
          { $ref: '#/components/parameters/projectIdParam' },
          { $ref: '#/components/parameters/taskIdParam' },
        ],
        responses: {
          200: {
            description: 'Dependencies list',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['success', 'data'],
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/TaskDependency' },
                    },
                  },
                },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
      post: {
        tags: ['Dependencies'],
        summary: 'Create task dependency link',
        description:
          'Creates a dependency relation (BLOCKS, BLOCKED_BY, RELATES_TO). Validates DAG acyclicity to prevent circular dependencies.',
        security: [{ bearerAuth: [] }],
        parameters: [
          { $ref: '#/components/parameters/organizationIdParam' },
          { $ref: '#/components/parameters/projectIdParam' },
          { $ref: '#/components/parameters/taskIdParam' },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateDependencyRequest' },
            },
          },
        },
        responses: {
          201: {
            description: 'Dependency created',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['success', 'data'],
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/TaskDependency' },
                  },
                },
              },
            },
          },
          400: { $ref: '#/components/responses/ValidationError' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
          409: { $ref: '#/components/responses/Conflict' },
        },
      },
    },
    '/api/v1/organizations/{organizationId}/projects/{projectId}/tasks/{taskId}/dependencies/{dependencyId}':
      {
        delete: {
          tags: ['Dependencies'],
          summary: 'Delete dependency link',
          security: [{ bearerAuth: [] }],
          parameters: [
            { $ref: '#/components/parameters/organizationIdParam' },
            { $ref: '#/components/parameters/projectIdParam' },
            { $ref: '#/components/parameters/taskIdParam' },
            { $ref: '#/components/parameters/dependencyIdParam' },
          ],
          responses: {
            200: {
              description: 'Dependency removed',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    required: ['success', 'data'],
                    properties: {
                      success: { type: 'boolean', example: true },
                      data: {
                        type: 'object',
                        required: ['message'],
                        properties: { message: { type: 'string' } },
                      },
                    },
                  },
                },
              },
            },
            401: { $ref: '#/components/responses/Unauthorized' },
            403: { $ref: '#/components/responses/Forbidden' },
            404: { $ref: '#/components/responses/NotFound' },
          },
        },
      },
    '/api/v1/organizations/{organizationId}/projects/{projectId}/tasks/{taskId}/comments': {
      get: {
        tags: ['Comments'],
        summary: 'List comments on a task',
        security: [{ bearerAuth: [] }],
        parameters: [
          { $ref: '#/components/parameters/organizationIdParam' },
          { $ref: '#/components/parameters/projectIdParam' },
          { $ref: '#/components/parameters/taskIdParam' },
        ],
        responses: {
          200: {
            description: 'List of comments',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['success', 'data'],
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Comment' },
                    },
                  },
                },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
      post: {
        tags: ['Comments'],
        summary: 'Add comment to task',
        security: [{ bearerAuth: [] }],
        parameters: [
          { $ref: '#/components/parameters/organizationIdParam' },
          { $ref: '#/components/parameters/projectIdParam' },
          { $ref: '#/components/parameters/taskIdParam' },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/CreateCommentRequest' } },
          },
        },
        responses: {
          201: {
            description: 'Comment created',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['success', 'data'],
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/Comment' },
                  },
                },
              },
            },
          },
          400: { $ref: '#/components/responses/ValidationError' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/api/v1/organizations/{organizationId}/projects/{projectId}/tasks/{taskId}/comments/{commentId}':
      {
        patch: {
          tags: ['Comments'],
          summary: 'Edit comment (author only)',
          security: [{ bearerAuth: [] }],
          parameters: [
            { $ref: '#/components/parameters/organizationIdParam' },
            { $ref: '#/components/parameters/projectIdParam' },
            { $ref: '#/components/parameters/taskIdParam' },
            { $ref: '#/components/parameters/commentIdParam' },
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/UpdateCommentRequest' } },
            },
          },
          responses: {
            200: {
              description: 'Comment edited',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    required: ['success', 'data'],
                    properties: {
                      success: { type: 'boolean', example: true },
                      data: { $ref: '#/components/schemas/Comment' },
                    },
                  },
                },
              },
            },
            400: { $ref: '#/components/responses/ValidationError' },
            401: { $ref: '#/components/responses/Unauthorized' },
            403: { $ref: '#/components/responses/Forbidden' },
            404: { $ref: '#/components/responses/NotFound' },
          },
        },
        delete: {
          tags: ['Comments'],
          summary: 'Delete comment (author or admin)',
          security: [{ bearerAuth: [] }],
          parameters: [
            { $ref: '#/components/parameters/organizationIdParam' },
            { $ref: '#/components/parameters/projectIdParam' },
            { $ref: '#/components/parameters/taskIdParam' },
            { $ref: '#/components/parameters/commentIdParam' },
          ],
          responses: {
            200: {
              description: 'Comment deleted',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    required: ['success', 'data'],
                    properties: {
                      success: { type: 'boolean', example: true },
                      data: {
                        type: 'object',
                        required: ['message'],
                        properties: { message: { type: 'string' } },
                      },
                    },
                  },
                },
              },
            },
            401: { $ref: '#/components/responses/Unauthorized' },
            403: { $ref: '#/components/responses/Forbidden' },
            404: { $ref: '#/components/responses/NotFound' },
          },
        },
      },
    '/api/v1/organizations/{organizationId}/projects/{projectId}/tasks/{taskId}/activity': {
      get: {
        tags: ['Activity'],
        summary: 'Get task historical activity log',
        security: [{ bearerAuth: [] }],
        parameters: [
          { $ref: '#/components/parameters/organizationIdParam' },
          { $ref: '#/components/parameters/projectIdParam' },
          { $ref: '#/components/parameters/taskIdParam' },
        ],
        responses: {
          200: {
            description: 'Task activity events',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['success', 'data'],
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Activity' },
                    },
                  },
                },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/api/v1/notifications': {
      get: {
        tags: ['Notifications'],
        summary: 'List user notifications',
        security: [{ bearerAuth: [] }],
        parameters: [
          { $ref: '#/components/parameters/pageQuery' },
          { $ref: '#/components/parameters/limitQuery' },
          {
            name: 'read',
            in: 'query',
            required: false,
            schema: { type: 'boolean' },
            description: 'Filter by read state',
          },
        ],
        responses: {
          200: {
            description: 'Paginated notifications list',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['success', 'data'],
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Notification' },
                    },
                    meta: { $ref: '#/components/schemas/PaginationMeta' },
                  },
                },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/api/v1/notifications/unread-count': {
      get: {
        tags: ['Notifications'],
        summary: 'Get count of unread notifications',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'Unread notification count',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['success', 'data'],
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/UnreadCountResponse' },
                  },
                },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/api/v1/notifications/{id}/read': {
      patch: {
        tags: ['Notifications'],
        summary: 'Mark single notification as read',
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/notificationIdParam' }],
        responses: {
          200: {
            description: 'Notification marked as read',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['success', 'data'],
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/Notification' },
                  },
                },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/api/v1/notifications/read-all': {
      post: {
        tags: ['Notifications'],
        summary: 'Mark all user notifications as read',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'All notifications marked as read',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['success', 'data'],
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'object',
                      required: ['message'],
                      properties: {
                        message: { type: 'string', example: 'All notifications marked as read' },
                      },
                    },
                  },
                },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/api/v1/notifications/preferences': {
      get: {
        tags: ['Notifications'],
        summary: 'Get notification delivery preferences (alias)',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'Notification preferences',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['success', 'data'],
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/NotificationPreferences' },
                  },
                },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
      patch: {
        tags: ['Notifications'],
        summary: 'Update notification delivery preferences (alias)',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/UpdateNotificationPreferencesRequest' },
            },
          },
        },
        responses: {
          200: {
            description: 'Updated notification preferences',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['success', 'data'],
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/NotificationPreferences' },
                  },
                },
              },
            },
          },
          400: { $ref: '#/components/responses/ValidationError' },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/api/v1/work/my-work': {
      get: {
        tags: ['Work'],
        summary: 'Cross-project personal workload dashboard (My Work)',
        description:
          'Aggregates all open tasks assigned to the authenticated user across projects and their recent activity trail.',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'My Work summary data',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['success', 'data'],
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/MyWorkResponse' },
                  },
                },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/api/v1/search': {
      get: {
        tags: ['Search'],
        summary: 'Global search across workspace',
        description:
          'Searches across tasks, projects, and members. Requires organization context via x-organization-id header or query.',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'q',
            in: 'query',
            required: true,
            schema: { type: 'string' },
            description: 'Search term',
          },
          {
            name: 'type',
            in: 'query',
            required: false,
            schema: { type: 'string', enum: ['TASK', 'PROJECT', 'MEMBER'] },
          },
          {
            name: 'projectId',
            in: 'query',
            required: false,
            schema: { type: 'string', format: 'uuid' },
          },
          { name: 'limit', in: 'query', required: false, schema: { type: 'integer', default: 20 } },
          {
            name: 'x-organization-id',
            in: 'header',
            required: false,
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        responses: {
          200: {
            description: 'Search results',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['success', 'data'],
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/SearchResults' },
                  },
                },
              },
            },
          },
          400: { $ref: '#/components/responses/ValidationError' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
        },
      },
    },
  },
} as const;
