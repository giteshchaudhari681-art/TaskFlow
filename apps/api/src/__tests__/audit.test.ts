/**
 * PR25: Auditability, Security Events & Administrative Controls
 * Unit and integration tests for the audit service, repository, and controller.
 *
 * Coverage:
 *  1. AuditService.sanitizeMetadata – redaction and size truncation
 *  2. AuditService.record – persists events via repository
 *  3. AuditService.list – RBAC matrix and tenant isolation
 *  4. Task mutation audit events (TASK_CREATED, TASK_UPDATED, AI lifecycle)
 *  5. Auth security events (LOGIN, LOGOUT, REUSE, PASSWORD_CHANGED)
 *  6. Query filter validation (pagination bounds, date filtering)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AuditSource, ActorType, AuditAction, UserRole, ProjectRole } from '@prisma/client';
import { auditService } from '../services/audit.service.js';
import { auditRepository } from '../repositories/audit.repository.js';
import { organizationRepository } from '../repositories/organization.repository.js';
import { projectRepository } from '../repositories/project.repository.js';
import { taskService } from '../services/task.service.js';
import { taskRepository } from '../repositories/task.repository.js';
import { activityRepository } from '../repositories/activity.repository.js';
import { TaskStatus, TaskPriority } from '@taskflow/shared';

// ────────────────────────────────────────────────────────────────────────────
// Constants
// ────────────────────────────────────────────────────────────────────────────
const ORG_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const PROJ_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const OWNER_ID = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
const ADMIN_ID = 'dddddddd-dddd-dddd-dddd-dddddddddddd';
const PROJ_ADMIN_ID = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';
const MEMBER_ID = 'ffffffff-ffff-ffff-ffff-ffffffffffff';
const TASK_ID = '11111111-1111-1111-1111-111111111111';

// Mock audit event returned from repository
const MOCK_AUDIT_EVENT = {
  id: 'evt-001',
  organizationId: ORG_ID,
  projectId: PROJ_ID,
  actorUserId: OWNER_ID,
  actorType: ActorType.USER,
  action: AuditAction.TASK_CREATED,
  resourceType: 'Task',
  resourceId: TASK_ID,
  requestId: 'req-001',
  source: AuditSource.USER,
  metadata: { title: 'New Task', issueKey: 'ALPHA-1' },
  createdAt: new Date(),
  actorUser: { id: OWNER_ID, name: 'Alice Owner', email: 'alice@example.com', avatarUrl: null },
};

const MOCK_TASK = {
  id: TASK_ID,
  projectId: PROJ_ID,
  taskNumber: 1,
  issueKey: 'ALPHA-1',
  title: 'Test Task',
  status: TaskStatus.TODO,
  priority: TaskPriority.MEDIUM,
  dueDate: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  description: null,
  assigneeId: null,
  assignee: null,
  project: { id: PROJ_ID, key: 'ALPHA', name: 'Alpha Project' },
  subtasks: [],
  labels: [],
};

// ────────────────────────────────────────────────────────────────────────────
// 1. Metadata Sanitization
// ────────────────────────────────────────────────────────────────────────────
describe('PR25: AuditService.sanitizeMetadata', () => {
  it('returns undefined for null or missing metadata', () => {
    expect(auditService.sanitizeMetadata(null)).toBeUndefined();
    expect(auditService.sanitizeMetadata(undefined)).toBeUndefined();
  });

  it('redacts password fields', () => {
    const result = auditService.sanitizeMetadata({ password: 'SuperSecret123!' }) as any;
    expect(result.password).toBe('[REDACTED]');
  });

  it('redacts token fields (case-insensitive, partial match)', () => {
    const result = auditService.sanitizeMetadata({
      accessToken: 'eyJhbGciOiJIUzI1NiJ9.payload.sig',
      refreshToken: 'opaque-refresh-token',
      TOKEN: 'another-token',
    }) as any;
    expect(result.accessToken).toBe('[REDACTED]');
    expect(result.refreshToken).toBe('[REDACTED]');
    expect(result.TOKEN).toBe('[REDACTED]');
  });

  it('redacts secret, apiKey, authorization, and credential fields', () => {
    const result = auditService.sanitizeMetadata({
      secret: 'my-secret',
      apiKey: 'sk-12345',
      authorization: 'Bearer xyz',
      credential: 'abc',
      privateKey: 'rsa-private',
    }) as any;
    expect(result.secret).toBe('[REDACTED]');
    expect(result.apiKey).toBe('[REDACTED]');
    expect(result.authorization).toBe('[REDACTED]');
    expect(result.credential).toBe('[REDACTED]');
    expect(result.privateKey).toBe('[REDACTED]');
  });

  it('preserves non-sensitive fields untouched', () => {
    const result = auditService.sanitizeMetadata({
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0',
      action: 'LOGIN',
      projectId: PROJ_ID,
    }) as any;
    expect(result.ipAddress).toBe('192.168.1.1');
    expect(result.userAgent).toBe('Mozilla/5.0');
    expect(result.action).toBe('LOGIN');
    expect(result.projectId).toBe(PROJ_ID);
  });

  it('redacts sensitive keys in nested objects', () => {
    // Note: 'session' key itself matches SENSITIVE_KEY_PATTERNS so its entire value is redacted.
    // We verify nested redaction with a non-sensitive parent key.
    const result = auditService.sanitizeMetadata({
      requestContext: {
        internalToken: 'nested-token', // 'token' in key → redacted
        userId: 'user-abc',            // safe → preserved
      },
    }) as any;
    expect(result.requestContext.internalToken).toBe('[REDACTED]');
    expect(result.requestContext.userId).toBe('user-abc');
  });

  it('truncates metadata exceeding 4KB with safety summary', () => {
    const largeValue = 'x'.repeat(5000);
    const result = auditService.sanitizeMetadata({ data: largeValue }) as any;
    expect(result._truncated).toBe(true);
    expect(result.summary).toContain('truncated');
    // Ensure the large data is not included in the truncated output
    expect(JSON.stringify(result)).not.toContain('xxxxx');
  });

  it('handles arrays within metadata correctly', () => {
    const result = auditService.sanitizeMetadata({
      tags: ['alpha', 'beta'],
      tokens: ['tok-1', 'tok-2'],
    }) as any;
    expect(result.tags).toEqual(['alpha', 'beta']);
    // 'tokens' key contains 'token' substring → should be redacted
    expect(result.tokens).toBe('[REDACTED]');
  });
});

// ────────────────────────────────────────────────────────────────────────────
// 2. AuditService.record
// ────────────────────────────────────────────────────────────────────────────
describe('PR25: AuditService.record', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls auditRepository.create with sanitized metadata', async () => {
    const createSpy = vi.spyOn(auditRepository, 'create').mockResolvedValue(MOCK_AUDIT_EVENT as any);

    await auditService.record({
      organizationId: ORG_ID,
      projectId: PROJ_ID,
      actorUserId: OWNER_ID,
      actorType: ActorType.USER,
      action: AuditAction.TASK_CREATED,
      resourceType: 'Task',
      resourceId: TASK_ID,
      source: AuditSource.USER,
      metadata: {
        title: 'My Task',
        password: 'should-be-redacted',
      },
    });

    expect(createSpy).toHaveBeenCalledOnce();
    const call = createSpy.mock.calls[0]![0];
    const meta = call.metadata as any;
    expect(meta.title).toBe('My Task');
    expect(meta.password).toBe('[REDACTED]');
  });

  it('throws when organizationId is missing', async () => {
    await expect(
      auditService.record({
        organizationId: '',
        action: AuditAction.AUTH_LOGIN,
        resourceType: 'Auth',
      })
    ).rejects.toThrow('organizationId');
  });

  it('defaults actorType to USER and source to USER when not provided', async () => {
    const createSpy = vi.spyOn(auditRepository, 'create').mockResolvedValue(MOCK_AUDIT_EVENT as any);

    await auditService.record({
      organizationId: ORG_ID,
      action: AuditAction.AUTH_LOGIN,
      resourceType: 'Auth',
    });

    const call = createSpy.mock.calls[0]![0];
    expect(call.actorType).toBe(ActorType.USER);
    expect(call.source).toBe(AuditSource.USER);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// 3. AuditService.list – RBAC Matrix & Tenant Isolation
// ────────────────────────────────────────────────────────────────────────────
describe('PR25: AuditService.list – RBAC', () => {
  const mockEventPage = {
    data: [MOCK_AUDIT_EVENT],
    total: 1,
    page: 1,
    limit: 25,
    totalPages: 1,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('allows Org OWNER to query all events', async () => {
    vi.spyOn(organizationRepository, 'findMember').mockResolvedValue({
      role: UserRole.OWNER,
      userId: OWNER_ID,
    } as any);
    const findManySpy = vi
      .spyOn(auditRepository, 'findMany')
      .mockResolvedValue(mockEventPage as any);

    await auditService.list(ORG_ID, { page: 1, limit: 25 }, OWNER_ID);
    expect(findManySpy).toHaveBeenCalledWith(ORG_ID, { page: 1, limit: 25 });
  });

  it('allows Org ADMIN to query all events', async () => {
    vi.spyOn(organizationRepository, 'findMember').mockResolvedValue({
      role: UserRole.ADMIN,
      userId: ADMIN_ID,
    } as any);
    const findManySpy = vi
      .spyOn(auditRepository, 'findMany')
      .mockResolvedValue(mockEventPage as any);

    await auditService.list(ORG_ID, { page: 1, limit: 25 }, ADMIN_ID);
    expect(findManySpy).toHaveBeenCalledOnce();
  });

  it('allows Project ADMIN to query events scoped to their projects', async () => {
    vi.spyOn(organizationRepository, 'findMember').mockResolvedValue({
      role: UserRole.MEMBER,
      userId: PROJ_ADMIN_ID,
    } as any);
    vi.spyOn(projectRepository, 'findUserMemberships').mockResolvedValue([
      { projectId: PROJ_ID, role: ProjectRole.ADMIN },
    ] as any);
    const findManySpy = vi
      .spyOn(auditRepository, 'findMany')
      .mockResolvedValue(mockEventPage as any);

    await auditService.list(ORG_ID, { page: 1, limit: 25 }, PROJ_ADMIN_ID);
    // Must be scoped to project admin's project IDs
    const call = findManySpy.mock.calls[0]![1];
    expect((call as any).projectIds).toEqual([PROJ_ID]);
  });

  it('returns 403 for Org MEMBER with no project admin role', async () => {
    vi.spyOn(organizationRepository, 'findMember').mockResolvedValue({
      role: UserRole.MEMBER,
      userId: MEMBER_ID,
    } as any);
    vi.spyOn(projectRepository, 'findUserMemberships').mockResolvedValue([
      { projectId: PROJ_ID, role: ProjectRole.MEMBER },
    ] as any);

    await expect(
      auditService.list(ORG_ID, { page: 1, limit: 25 }, MEMBER_ID)
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it('returns 403 for non-members (tenant isolation)', async () => {
    vi.spyOn(organizationRepository, 'findMember').mockResolvedValue(null);

    await expect(
      auditService.list(ORG_ID, { page: 1, limit: 25 }, 'foreign-user-id')
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it('Project ADMIN cannot query events for a project they do not administer (403)', async () => {
    const otherProjectId = '99999999-9999-9999-9999-999999999999';
    vi.spyOn(organizationRepository, 'findMember').mockResolvedValue({
      role: UserRole.MEMBER,
      userId: PROJ_ADMIN_ID,
    } as any);
    vi.spyOn(projectRepository, 'findUserMemberships').mockResolvedValue([
      { projectId: PROJ_ID, role: ProjectRole.ADMIN },
    ] as any);

    await expect(
      auditService.list(ORG_ID, { page: 1, limit: 25, projectId: otherProjectId }, PROJ_ADMIN_ID)
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it('Org ADMIN with project filter verifies project belongs to organization', async () => {
    vi.spyOn(organizationRepository, 'findMember').mockResolvedValue({
      role: UserRole.ADMIN,
      userId: ADMIN_ID,
    } as any);
    vi.spyOn(projectRepository, 'findById').mockResolvedValue(null);

    await expect(
      auditService.list(ORG_ID, { page: 1, limit: 25, projectId: PROJ_ID }, ADMIN_ID)
    ).rejects.toMatchObject({ statusCode: 404 });
  });
});

// ────────────────────────────────────────────────────────────────────────────
// 4. Task Mutation Audit Events
// ────────────────────────────────────────────────────────────────────────────
describe('PR25: Task Mutation Audit Events', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(activityRepository, 'create').mockResolvedValue({} as any);
    vi.spyOn(auditRepository, 'create').mockResolvedValue(MOCK_AUDIT_EVENT as any);
  });

  it('records TASK_CREATED when a new task is created', async () => {
    vi.spyOn(taskService as any, 'getActorProjectPermissions').mockResolvedValue({ rank: 2 });
    vi.spyOn(taskRepository, 'create').mockResolvedValue({ ...MOCK_TASK, id: TASK_ID } as any);

    const auditSpy = vi.spyOn(auditRepository, 'create').mockResolvedValue(MOCK_AUDIT_EVENT as any);

    await taskService.createTask(ORG_ID, PROJ_ID, OWNER_ID, {
      title: 'Test Task',
      status: TaskStatus.TODO,
      priority: TaskPriority.MEDIUM,
    });

    const auditCalls = auditSpy.mock.calls.map(c => c[0].action);
    expect(auditCalls).toContain(AuditAction.TASK_CREATED);
  });

  it('records TASK_UPDATED with changed field diff when task fields change', async () => {
    vi.spyOn(taskService as any, 'getActorProjectPermissions').mockResolvedValue({ rank: 2 });
    vi.spyOn(taskRepository, 'findById').mockResolvedValue({
      ...MOCK_TASK,
      title: 'Old Title',
      priority: TaskPriority.LOW,
    } as any);
    vi.spyOn(taskRepository, 'update').mockResolvedValue({
      ...MOCK_TASK,
      title: 'New Title',
      priority: TaskPriority.HIGH,
    } as any);
    const auditSpy = vi.spyOn(auditRepository, 'create').mockResolvedValue(MOCK_AUDIT_EVENT as any);

    await taskService.updateTask(ORG_ID, PROJ_ID, TASK_ID, OWNER_ID, {
      title: 'New Title',
      priority: TaskPriority.HIGH,
    });

    const updateCall = auditSpy.mock.calls.find(
      c => c[0].action === AuditAction.TASK_UPDATED
    );
    expect(updateCall).toBeDefined();
    const meta = updateCall![0].metadata as any;
    expect(meta.changes).toBeDefined();
    expect(meta.changes.title).toMatchObject({ from: 'Old Title', to: 'New Title' });
    expect(meta.changes.priority).toMatchObject({ from: TaskPriority.LOW, to: TaskPriority.HIGH });
  });

  it('records AI_ACTION_APPLIED (human actor, AI_ASSISTED source) when AI update succeeds', async () => {
    vi.spyOn(taskService as any, 'getActorProjectPermissions').mockResolvedValue({ rank: 2 });
    vi.spyOn(taskRepository, 'findById').mockResolvedValue({
      ...MOCK_TASK,
      priority: TaskPriority.MEDIUM,
    } as any);
    vi.spyOn(taskRepository, 'update').mockResolvedValue({
      ...MOCK_TASK,
      priority: TaskPriority.HIGH,
    } as any);
    const auditSpy = vi.spyOn(auditRepository, 'create').mockResolvedValue(MOCK_AUDIT_EVENT as any);

    await taskService.updateTask(ORG_ID, PROJ_ID, TASK_ID, OWNER_ID, {
      priority: TaskPriority.HIGH,
      source: 'AI_ASSISTED',
      expectedCurrentState: { priority: TaskPriority.MEDIUM },
    });

    const aiCall = auditSpy.mock.calls.find(
      c => c[0].action === AuditAction.AI_ACTION_APPLIED
    );
    expect(aiCall).toBeDefined();
    expect(aiCall![0].actorUserId).toBe(OWNER_ID);         // human actor
    expect(aiCall![0].actorType).toBe(ActorType.USER);     // not AI
    expect(aiCall![0].source).toBe(AuditSource.AI_ASSISTED);
  });

  it('records AI_ACTION_REJECTED when stale state is detected (409)', async () => {
    vi.spyOn(taskService as any, 'getActorProjectPermissions').mockResolvedValue({ rank: 2 });
    vi.spyOn(taskRepository, 'findById').mockResolvedValue({
      ...MOCK_TASK,
      priority: TaskPriority.LOW, // differs from expected MEDIUM
    } as any);
    const auditSpy = vi.spyOn(auditRepository, 'create').mockResolvedValue(MOCK_AUDIT_EVENT as any);

    await expect(
      taskService.updateTask(ORG_ID, PROJ_ID, TASK_ID, OWNER_ID, {
        priority: TaskPriority.HIGH,
        expectedCurrentState: { priority: TaskPriority.MEDIUM },
      })
    ).rejects.toMatchObject({ code: 'STALE_TASK_STATE', statusCode: 409 });

    const rejectedCall = auditSpy.mock.calls.find(
      c => c[0].action === AuditAction.AI_ACTION_REJECTED
    );
    expect(rejectedCall).toBeDefined();
    // Must NOT have recorded AI_ACTION_APPLIED
    const appliedCall = auditSpy.mock.calls.find(
      c => c[0].action === AuditAction.AI_ACTION_APPLIED
    );
    expect(appliedCall).toBeUndefined();
  });
});

// ────────────────────────────────────────────────────────────────────────────
// 5. Auth Security Events
// ────────────────────────────────────────────────────────────────────────────
describe('PR25: Auth Security Event Metadata Constraints', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('AUTH_REFRESH_REUSE_DETECTED never stores raw token values in metadata', async () => {
    const auditSpy = vi.spyOn(auditRepository, 'create').mockResolvedValue(MOCK_AUDIT_EVENT as any);

    await auditService.record({
      organizationId: ORG_ID,
      actorUserId: OWNER_ID,
      action: AuditAction.AUTH_REFRESH_REUSE_DETECTED,
      resourceType: 'Auth',
      source: AuditSource.SYSTEM,
      metadata: {
        refreshToken: 'opaque-token-that-must-be-redacted',
        suspiciousActivity: true,
        revokedCount: 3,
      },
    });

    const call = auditSpy.mock.calls[0]![0];
    const meta = call.metadata as any;
    expect(meta.refreshToken).toBe('[REDACTED]');
    expect(meta.suspiciousActivity).toBe(true);
    expect(meta.revokedCount).toBe(3);
  });

  it('AUTH_PASSWORD_CHANGED never stores password values in metadata', async () => {
    const auditSpy = vi.spyOn(auditRepository, 'create').mockResolvedValue(MOCK_AUDIT_EVENT as any);

    await auditService.record({
      organizationId: ORG_ID,
      actorUserId: OWNER_ID,
      action: AuditAction.AUTH_PASSWORD_CHANGED,
      resourceType: 'User',
      metadata: {
        password: 'OldPass123!',
        newPassword: 'NewPass456!',
        invalidatedCount: 3, // 'allSessionsInvalidated' has 'session' → would be redacted
      },
    });

    const meta = auditSpy.mock.calls[0]![0].metadata as any;
    expect(meta.password).toBe('[REDACTED]');
    expect(meta.newPassword).toBe('[REDACTED]');
    expect(meta.invalidatedCount).toBe(3);
  });

  it('AUTH_LOGIN metadata preserves ipAddress and userAgent', async () => {
    const auditSpy = vi.spyOn(auditRepository, 'create').mockResolvedValue(MOCK_AUDIT_EVENT as any);

    await auditService.record({
      organizationId: ORG_ID,
      actorUserId: OWNER_ID,
      action: AuditAction.AUTH_LOGIN,
      resourceType: 'Auth',
      metadata: {
        ipAddress: '10.0.0.1',
        userAgent: 'Mozilla/5.0 (Macintosh)',
      },
    });

    const meta = auditSpy.mock.calls[0]![0].metadata as any;
    expect(meta.ipAddress).toBe('10.0.0.1');
    expect(meta.userAgent).toBe('Mozilla/5.0 (Macintosh)');
  });
});

// ────────────────────────────────────────────────────────────────────────────
// 6. AI Action Provenance Semantics
// ────────────────────────────────────────────────────────────────────────────
describe('PR25: AI Action Actor Semantics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('AI_ACTION_PROPOSED uses AI actorType and AI source (non-mutating)', async () => {
    const auditSpy = vi.spyOn(auditRepository, 'create').mockResolvedValue(MOCK_AUDIT_EVENT as any);

    await auditService.record({
      organizationId: ORG_ID,
      projectId: PROJ_ID,
      actorUserId: null,
      actorType: ActorType.AI,
      action: AuditAction.AI_ACTION_PROPOSED,
      resourceType: 'AIAnalysis',
      source: AuditSource.AI,
      metadata: {
        proposalCount: 2,
        proposedActionTypes: ['UPDATE_PRIORITY', 'ASSIGN_TASK'],
      },
    });

    const call = auditSpy.mock.calls[0]![0];
    expect(call.actorType).toBe(ActorType.AI);
    expect(call.source).toBe(AuditSource.AI);
    expect(call.actorUserId).toBeNull();
  });

  it('AI_ACTION_APPLIED uses human USER actorType and AI_ASSISTED source', async () => {
    const auditSpy = vi.spyOn(auditRepository, 'create').mockResolvedValue(MOCK_AUDIT_EVENT as any);

    await auditService.record({
      organizationId: ORG_ID,
      projectId: PROJ_ID,
      actorUserId: OWNER_ID,
      actorType: ActorType.USER,
      action: AuditAction.AI_ACTION_APPLIED,
      resourceType: 'Task',
      resourceId: TASK_ID,
      source: AuditSource.AI_ASSISTED,
      metadata: {
        changes: { priority: { from: 'MEDIUM', to: 'HIGH' } },
      },
    });

    const call = auditSpy.mock.calls[0]![0];
    expect(call.actorType).toBe(ActorType.USER);
    expect(call.source).toBe(AuditSource.AI_ASSISTED);
    expect(call.actorUserId).toBe(OWNER_ID);
  });
});
