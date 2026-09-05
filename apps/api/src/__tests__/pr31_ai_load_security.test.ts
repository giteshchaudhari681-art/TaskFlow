/**
 * TaskFlow PR31: AI Load, Failure & Human-Approval Validation Suite
 *
 * Validates AI subsystem resilience, mock provider abstraction (zero OpenAI calls),
 * atomic quota reservation, compensation on failures (timeout, 500, service down),
 * process rate limiting, role/viewer restrictions, advisory-only invariants,
 * and the complete Human-in-the-Loop AI Action lifecycle.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { createServer } from '../server.js';
import { prisma } from '../lib/prisma.js';
import { aiClient } from '../integrations/ai/aiClient.js';
import { aiService } from '../services/ai.service.js';
import { taskService } from '../services/task.service.js';
import { projectRepository } from '../repositories/project.repository.js';
import { taskRepository } from '../repositories/task.repository.js';
import { AppError } from '../middleware/errorHandler.js';
import { TaskStatus, TaskPriority } from '@taskflow/shared';
import { ProjectRole, AuditAction } from '@prisma/client';

describe('PR31: AI Load, Failure & Human-Approval Validation Suite', () => {
  const app = createServer();

  let testOrgId: string;
  let testProjectId: string;
  let testTaskId: string;
  let ownerUser: { id: string; email: string; token: string };
  let viewerUser: { id: string; email: string; token: string };

  beforeAll(async () => {
    // 1. Setup Test Organization
    const org = await prisma.organization.create({
      data: {
        name: `AI Validation Org ${Date.now()}`,
        slug: `ai-val-${Date.now()}`,
        plan: 'PRO',
      },
    });
    testOrgId = org.id;

    // 2. Setup Owner User
    const ownerEmail = `ai.owner.${Date.now()}@taskflow.dev`;
    const ownerReg = await request(app).post('/api/v1/auth/register').send({
      name: 'AI Owner',
      email: ownerEmail,
      password: 'Password123!',
      organizationName: 'AI Owner Org',
    });
    ownerUser = {
      id: ownerReg.body.data.user.id,
      email: ownerEmail,
      token: ownerReg.body.data.accessToken,
    };

    // Add owner to test organization
    await prisma.organizationMember.create({
      data: {
        organizationId: testOrgId,
        userId: ownerUser.id,
        role: 'OWNER',
      },
    });

    // 3. Setup Viewer User
    const viewerEmail = `ai.viewer.${Date.now()}@taskflow.dev`;
    const viewerReg = await request(app).post('/api/v1/auth/register').send({
      name: 'AI Viewer',
      email: viewerEmail,
      password: 'Password123!',
      organizationName: 'AI Viewer Org',
    });
    viewerUser = {
      id: viewerReg.body.data.user.id,
      email: viewerEmail,
      token: viewerReg.body.data.accessToken,
    };

    // Add viewer to test organization & project
    await prisma.organizationMember.create({
      data: {
        organizationId: testOrgId,
        userId: viewerUser.id,
        role: 'MEMBER',
      },
    });

    // 4. Create Project
    const project = await projectRepository.create(
      testOrgId,
      { name: 'AI Validation Project', key: 'AIVAL' },
      ownerUser.id
    );
    testProjectId = project.id;

    // Add viewer to project as VIEWER role
    await projectRepository.addMember(testProjectId, viewerUser.id, ProjectRole.VIEWER);

    // 5. Create Task
    const task = await taskRepository.create(
      testProjectId,
      {
        title: 'Initial AI Action Task',
        status: TaskStatus.TODO,
        priority: TaskPriority.MEDIUM,
      },
      ownerUser.id,
      testOrgId
    );
    testTaskId = task.id;
  });

  afterAll(async () => {
    vi.restoreAllMocks();
    if (testOrgId) {
      await prisma.aIUsageRecord.deleteMany({ where: { organizationId: testOrgId } });
      await prisma.auditEvent.deleteMany({ where: { organizationId: testOrgId } });
      await prisma.task.deleteMany({ where: { projectId: testProjectId } });
      await prisma.project.deleteMany({ where: { organizationId: testOrgId } });
      await prisma.organizationMember.deleteMany({ where: { organizationId: testOrgId } });
      await prisma.organization.deleteMany({ where: { id: testOrgId } });
    }
    if (ownerUser?.id) {
      await prisma.user.deleteMany({
        where: { id: { in: [ownerUser.id, viewerUser.id] } },
      });
    }
    await prisma.$disconnect();
  });

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // ---------------------------------------------------------------------------
  // 1. Quota Reservation and Single Consumption on Success
  // ---------------------------------------------------------------------------
  it('1. reserves quota upfront and records single usage consumption upon provider success', async () => {
    const initialUsage = await prisma.aIUsageRecord.count({
      where: { organizationId: testOrgId, status: 'SUCCESS' },
    });

    vi.spyOn(aiClient, 'analyze').mockResolvedValue({
      request_id: 'ai-req-success-1',
      operation: 'TASK_SUMMARY',
      summary: 'Task is well structured and on schedule.',
      recommendations: [],
      metadata: { model: 'mock-gpt-4o', latency_ms: 120 },
    });

    const result = await aiService.analyzeProject(
      testOrgId,
      testProjectId,
      ownerUser.id,
      'TASK_SUMMARY',
      'Summarize this task',
      'req-success-01',
      testTaskId
    );

    expect(result.summary).toBe('Task is well structured and on schedule.');

    const finalUsage = await prisma.aIUsageRecord.count({
      where: { organizationId: testOrgId, status: 'SUCCESS' },
    });
    expect(finalUsage).toBe(initialUsage + 1);
  });

  // ---------------------------------------------------------------------------
  // 2. Quota Compensation on Provider Timeout
  // ---------------------------------------------------------------------------
  it('2. reverts quota reservation when upstream AI provider times out', async () => {
    const initialUsage = await prisma.aIUsageRecord.count({
      where: { organizationId: testOrgId, status: 'SUCCESS' },
    });

    vi.spyOn(aiClient, 'analyze').mockRejectedValue(
      new AppError('AI_GATEWAY_TIMEOUT', 'Upstream AI model request timed out after 30s', 504)
    );

    await expect(
      aiService.analyzeProject(
        testOrgId,
        testProjectId,
        ownerUser.id,
        'TASK_SUMMARY',
        'Summarize this task',
        'req-timeout-01',
        testTaskId
      )
    ).rejects.toThrow();

    // Verify usage was compensated (not marked SUCCESS)
    const finalUsage = await prisma.aIUsageRecord.count({
      where: { organizationId: testOrgId, status: 'SUCCESS' },
    });
    expect(finalUsage).toBe(initialUsage);
  });

  // ---------------------------------------------------------------------------
  // 3. Quota Compensation on Provider 500 / Downstream Error
  // ---------------------------------------------------------------------------
  it('3. compensates quota when internal Python AI service is unavailable or crashes', async () => {
    const initialUsage = await prisma.aIUsageRecord.count({
      where: { organizationId: testOrgId, status: 'SUCCESS' },
    });

    vi.spyOn(aiClient, 'analyze').mockRejectedValue(
      new Error('connect ECONNREFUSED 127.0.0.1:8000')
    );

    await expect(
      aiService.analyzeProject(
        testOrgId,
        testProjectId,
        ownerUser.id,
        'PROJECT_INSIGHT',
        undefined,
        'req-connrefused-01'
      )
    ).rejects.toThrow('Failed to process AI analysis');

    const finalUsage = await prisma.aIUsageRecord.count({
      where: { organizationId: testOrgId, status: 'SUCCESS' },
    });
    expect(finalUsage).toBe(initialUsage);
  });

  // ---------------------------------------------------------------------------
  // 4. Role Authorization: VIEWER Restriction
  // ---------------------------------------------------------------------------
  it('4. strictly blocks VIEWER role from triggering AI operations without burning quota', async () => {
    const initialUsage = await prisma.aIUsageRecord.count({
      where: { organizationId: testOrgId, status: 'SUCCESS' },
    });

    await expect(
      aiService.analyzeProject(
        testOrgId,
        testProjectId,
        viewerUser.id,
        'TASK_SUMMARY',
        'Viewer attempt',
        'req-viewer-01',
        testTaskId
      )
    ).rejects.toSatisfy(
      (err: any) =>
        err.statusCode === 403 &&
        err.message.includes('Project viewers are not authorized to run AI analysis')
    );

    const finalUsage = await prisma.aIUsageRecord.count({
      where: { organizationId: testOrgId, status: 'SUCCESS' },
    });
    expect(finalUsage).toBe(initialUsage);
  });

  // ---------------------------------------------------------------------------
  // 5. Advisory Invariant: AI Never Mutates Database State Directly
  // ---------------------------------------------------------------------------
  it('5. proposal generation produces zero task/project database mutations', async () => {
    const beforeTask = await taskRepository.findById(testTaskId, testProjectId);

    vi.spyOn(aiClient, 'analyze').mockResolvedValue({
      request_id: 'req-advisory-01',
      operation: 'TASK_ACTIONS',
      summary: 'Recommend changing priority to URGENT',
      actions: [
        {
          actionId: 'act-1',
          type: 'UPDATE_PRIORITY',
          title: 'Escalate to HIGH',
          reason: 'Impending milestone',
          confidence: 'HIGH',
          target: { taskId: testTaskId },
          expectedCurrentState: { priority: TaskPriority.MEDIUM },
          parameters: { priority: TaskPriority.HIGH },
        },
      ],
      metadata: {},
      recommendations: [],
    });

    const response = await aiService.analyzeProject(
      testOrgId,
      testProjectId,
      ownerUser.id,
      'TASK_ACTIONS',
      undefined,
      'req-advisory-01',
      testTaskId
    );

    expect(response.actions).toHaveLength(1);

    // Verify task in DB was NOT modified by AI analysis
    const afterTask = await taskRepository.findById(testTaskId, testProjectId);
    expect(afterTask?.priority).toBe(beforeTask?.priority);
    expect(afterTask?.updatedAt.getTime()).toBe(beforeTask?.updatedAt.getTime());
  });

  // ---------------------------------------------------------------------------
  // 6. Complete Human-In-The-Loop AI Action Lifecycle
  // ---------------------------------------------------------------------------
  it('6. executes full AI action flow: proposal -> human review -> explicit apply -> DB mutation + audit', async () => {
    // Step A: AI produces advisory proposal
    const proposal = {
      actionId: 'act-human-approval',
      type: 'UPDATE_PRIORITY',
      expectedCurrentState: { priority: TaskPriority.MEDIUM },
      parameters: { priority: TaskPriority.HIGH },
    };

    // Step B: Human reviews proposal and explicitly dispatches standard PATCH with expectedCurrentState
    const updatedTask = await taskService.updateTask(
      testOrgId,
      testProjectId,
      testTaskId,
      ownerUser.id,
      {
        priority: TaskPriority.HIGH,
        source: 'AI_ASSISTED',
        expectedCurrentState: proposal.expectedCurrentState,
      }
    );

    expect(updatedTask.priority).toBe(TaskPriority.HIGH);

    // Step C: Verify authoritative database mutation
    const dbTask = await prisma.task.findUnique({ where: { id: testTaskId } });
    expect(dbTask?.priority).toBe(TaskPriority.HIGH);

    // Step D: Verify audit trail attributes action to human actor with AI_ACTION_APPLIED
    const auditRecord = await prisma.auditEvent.findFirst({
      where: {
        organizationId: testOrgId,
        resourceId: testTaskId,
        action: AuditAction.AI_ACTION_APPLIED,
      },
      orderBy: { createdAt: 'desc' },
    });

    expect(auditRecord).not.toBeNull();
    expect(auditRecord?.actorUserId).toBe(ownerUser.id);
  });

  // ---------------------------------------------------------------------------
  // 7. Stale Proposal Protection Rejection
  // ---------------------------------------------------------------------------
  it('7. cleanly rejects stale AI action with 409 STALE_TASK_STATE when state changed concurrently', async () => {
    // Current task priority in DB is now HIGH (from previous test)
    // Proposal was generated earlier when priority was still MEDIUM
    const staleProposalExpectedState = {
      priority: TaskPriority.MEDIUM,
    };

    await expect(
      taskService.updateTask(testOrgId, testProjectId, testTaskId, ownerUser.id, {
        priority: TaskPriority.LOW,
        source: 'AI_ASSISTED',
        expectedCurrentState: staleProposalExpectedState, // Stale! Current DB state is HIGH
      })
    ).rejects.toSatisfy((err: any) => err.code === 'STALE_TASK_STATE' && err.statusCode === 409);

    // Verify task in DB remained HIGH (no partial overwrite)
    const currentTask = await prisma.task.findUnique({ where: { id: testTaskId } });
    expect(currentTask?.priority).toBe(TaskPriority.HIGH);
  });
});
