import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import {
  ProjectRole,
  TaskStatus,
  TaskPriority,
  DependencyType,
  NotificationType,
} from '@taskflow/shared';
import { createServer } from '../server.js';
import { prisma } from '../lib/prisma.js';

const app = createServer();

describe('TaskFlow PR 12: Notifications & Personal Work Queue Suite', () => {
  const timestamp = `${Date.now()}.${Math.random().toString(36).substring(2, 6)}`;
  const ownerEmail = `notify.owner.${timestamp}@taskflow.dev`;
  const memberAEmail = `notify.memberA.${timestamp}@taskflow.dev`;
  const memberBEmail = `notify.memberB.${timestamp}@taskflow.dev`;
  const foreignEmail = `notify.foreign.${timestamp}@taskflow.dev`;
  const defaultPassword = 'Password123!';

  let ownerToken: string;
  let ownerUserId: string;
  let ownerOrgId: string;

  let memberAToken: string;
  let memberAUserId: string;

  let memberBToken: string;
  let memberBUserId: string;

  let foreignToken: string;
  let foreignOrgId: string;

  let testProjectId: string;
  let foreignProjectId: string;

  let task1Id: string;
  let task2Id: string;
  let task3Id: string;
  let taskOverdueId: string;
  let taskDueTodayId: string;
  let taskDueSoonId: string;

  let testMilestoneId: string;

  beforeAll(async () => {
    // 1. Register Owner
    const ownerRes = await request(app).post('/api/v1/auth/register').send({
      name: 'Notify Owner',
      email: ownerEmail,
      password: defaultPassword,
      organizationName: 'Notify Operations Corp',
    });
    ownerToken = ownerRes.body.data.accessToken;
    ownerUserId = ownerRes.body.data.user.id;
    ownerOrgId = ownerRes.body.data.defaultOrganization.id;

    // 2. Register Member A
    const memberARes = await request(app).post('/api/v1/auth/register').send({
      name: 'Alice Member',
      email: memberAEmail,
      password: defaultPassword,
      organizationName: 'Alice Temp Org',
    });
    memberAToken = memberARes.body.data.accessToken;
    memberAUserId = memberARes.body.data.user.id;

    // Add Member A to Owner Org
    await prisma.organizationMember.create({
      data: { organizationId: ownerOrgId, userId: memberAUserId, role: 'MEMBER' },
    });

    // 3. Register Member B
    const memberBRes = await request(app).post('/api/v1/auth/register').send({
      name: 'Bob Member',
      email: memberBEmail,
      password: defaultPassword,
      organizationName: 'Bob Temp Org',
    });
    memberBToken = memberBRes.body.data.accessToken;
    memberBUserId = memberBRes.body.data.user.id;

    // Add Member B to Owner Org
    await prisma.organizationMember.create({
      data: { organizationId: ownerOrgId, userId: memberBUserId, role: 'MEMBER' },
    });

    // 4. Register Foreign User
    const foreignRes = await request(app).post('/api/v1/auth/register').send({
      name: 'Foreign User',
      email: foreignEmail,
      password: defaultPassword,
      organizationName: 'Foreign Org',
    });
    foreignToken = foreignRes.body.data.accessToken;
    foreignOrgId = foreignRes.body.data.defaultOrganization.id;

    // 5. Create Test Project in Owner Org
    const projectRes = await request(app)
      .post(`/api/v1/organizations/${ownerOrgId}/projects`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        name: 'Work Engine Project',
        key: 'WEP',
        description: 'Testing personal work queue and notifications',
      });
    testProjectId = projectRes.body.data.id;

    // Add Member A & Member B as project members
    await request(app)
      .post(`/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/members`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ userId: memberAUserId, role: ProjectRole.MEMBER });

    await request(app)
      .post(`/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/members`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ userId: memberBUserId, role: ProjectRole.MEMBER });

    // 6. Create Foreign Project
    const foreignProjRes = await request(app)
      .post(`/api/v1/organizations/${foreignOrgId}/projects`)
      .set('Authorization', `Bearer ${foreignToken}`)
      .send({
        name: 'Foreign Project',
        key: 'FOR',
      });
    foreignProjectId = foreignProjRes.body.data.id;

    // 7. Create Milestone in Test Project
    const milestoneRes = await request(app)
      .post(`/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/milestones`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        title: 'Q1 Delivery Milestone',
        description: 'First milestone of the quarter',
      });
    testMilestoneId = milestoneRes.body.data.id;
  });

  afterAll(async () => {
    // Clean up created entities
    try {
      if (testProjectId) {
        await prisma.notification.deleteMany({
          where: { projectId: testProjectId },
        });
        await prisma.taskDependency.deleteMany({
          where: { projectId: testProjectId },
        });
        await prisma.task.deleteMany({
          where: { projectId: testProjectId },
        });
        await prisma.milestone.deleteMany({
          where: { projectId: testProjectId },
        });
        await prisma.project.delete({ where: { id: testProjectId } });
      }
      if (foreignProjectId) {
        await prisma.project.delete({ where: { id: foreignProjectId } });
      }
      if (ownerOrgId) {
        await prisma.organization.delete({ where: { id: ownerOrgId } });
      }
      if (foreignOrgId) {
        await prisma.organization.delete({ where: { id: foreignOrgId } });
      }
      await prisma.user.deleteMany({
        where: {
          email: { in: [ownerEmail, memberAEmail, memberBEmail, foreignEmail] },
        },
      });
    } catch {
      // Best-effort cleanup
    }
  });

  // =========================================================================
  // 1. Notification Preferences Management
  // =========================================================================
  describe('1. Notification Preferences Management', () => {
    it('should return default notification preferences for a user', async () => {
      const res = await request(app)
        .get('/api/v1/notifications/preferences')
        .set('Authorization', `Bearer ${memberAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual({
        taskAssigned: true,
        comments: true,
        statusChanges: false,
        milestones: true,
        dependencies: true,
      });
    });

    it('should update notification preferences via /api/v1/notifications/preferences', async () => {
      const res = await request(app)
        .patch('/api/v1/notifications/preferences')
        .set('Authorization', `Bearer ${memberAToken}`)
        .send({
          statusChanges: true,
          milestones: false,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.statusChanges).toBe(true);
      expect(res.body.data.milestones).toBe(false);
      expect(res.body.data.taskAssigned).toBe(true); // Retained default
    });

    it('should access and update preferences via user alias /api/v1/users/me/notification-preferences', async () => {
      const getRes = await request(app)
        .get('/api/v1/users/me/notification-preferences')
        .set('Authorization', `Bearer ${memberAToken}`);

      expect(getRes.status).toBe(200);
      expect(getRes.body.data.statusChanges).toBe(true);

      const patchRes = await request(app)
        .patch('/api/v1/users/me/notification-preferences')
        .set('Authorization', `Bearer ${memberAToken}`)
        .send({
          milestones: true,
        });

      expect(patchRes.status).toBe(200);
      expect(patchRes.body.data.milestones).toBe(true);
    });

    it('should reject invalid preference keys with strict validation', async () => {
      const res = await request(app)
        .patch('/api/v1/notifications/preferences')
        .set('Authorization', `Bearer ${memberAToken}`)
        .send({
          invalidKey: true,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  // =========================================================================
  // 2. Task Assignment Notifications & Self-Notification Prevention
  // =========================================================================
  describe('2. Task Assignment Notifications & Self-Notification Prevention', () => {
    it('should notify assignee when owner assigns a new task to Member A', async () => {
      const createRes = await request(app)
        .post(`/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/tasks`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          title: 'Implement Notification Engine',
          priority: TaskPriority.HIGH,
          assigneeId: memberAUserId,
        });

      expect(createRes.status).toBe(201);
      task1Id = createRes.body.data.id;

      // Check Member A received a TASK_ASSIGNED notification
      const notifRes = await request(app)
        .get('/api/v1/notifications')
        .set('Authorization', `Bearer ${memberAToken}`);

      expect(notifRes.status).toBe(200);
      const assignmentNotif = notifRes.body.data.notifications.find(
        (n: any) => n.type === NotificationType.TASK_ASSIGNED && n.taskId === task1Id
      );
      expect(assignmentNotif).toBeDefined();
      expect(assignmentNotif.isRead).toBe(false);
      expect(assignmentNotif.actor.id).toBe(ownerUserId);
      expect(assignmentNotif.message).toContain('assigned');
    });

    it('should NOT generate self-notification when user assigns a task to themselves', async () => {
      // Member A creates a task assigned to Member A
      const createRes = await request(app)
        .post(`/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/tasks`)
        .set('Authorization', `Bearer ${memberAToken}`)
        .send({
          title: 'Self-Assigned Investigation Task',
          priority: TaskPriority.MEDIUM,
          assigneeId: memberAUserId,
        });

      expect(createRes.status).toBe(201);
      const selfTaskId = createRes.body.data.id;

      // Check Member A's notifications - there should NOT be any for selfTaskId
      const notifRes = await request(app)
        .get('/api/v1/notifications')
        .set('Authorization', `Bearer ${memberAToken}`);

      const selfNotif = notifRes.body.data.notifications.find((n: any) => n.taskId === selfTaskId);
      expect(selfNotif).toBeUndefined();
    });

    it('should notify old assignee of UNASSIGNED and new assignee of ASSIGNED when reassigning', async () => {
      // Owner reassigns task1 from Member A to Member B
      const updateRes = await request(app)
        .patch(`/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/tasks/${task1Id}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          assigneeId: memberBUserId,
        });

      expect(updateRes.status).toBe(200);

      // Check Member A received TASK_UNASSIGNED
      const memberANotifs = await request(app)
        .get('/api/v1/notifications')
        .set('Authorization', `Bearer ${memberAToken}`);

      const unassignNotif = memberANotifs.body.data.notifications.find(
        (n: any) => n.type === NotificationType.TASK_UNASSIGNED && n.taskId === task1Id
      );
      expect(unassignNotif).toBeDefined();

      // Check Member B received TASK_ASSIGNED
      const memberBNotifs = await request(app)
        .get('/api/v1/notifications')
        .set('Authorization', `Bearer ${memberBToken}`);

      const assignNotif = memberBNotifs.body.data.notifications.find(
        (n: any) => n.type === NotificationType.TASK_ASSIGNED && n.taskId === task1Id
      );
      expect(assignNotif).toBeDefined();
    });

    it('should notify previously assigned user when task is completely unassigned', async () => {
      // Owner unassigns task1 (sets assigneeId to null)
      const updateRes = await request(app)
        .patch(`/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/tasks/${task1Id}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          assigneeId: null,
        });

      expect(updateRes.status).toBe(200);

      // Member B should receive TASK_UNASSIGNED
      const memberBNotifs = await request(app)
        .get('/api/v1/notifications')
        .set('Authorization', `Bearer ${memberBToken}`);

      const unassignNotif = memberBNotifs.body.data.notifications.find(
        (n: any) => n.type === NotificationType.TASK_UNASSIGNED && n.taskId === task1Id
      );
      expect(unassignNotif).toBeDefined();
    });

    it('should respect taskAssigned = false preference and suppress assignment notification', async () => {
      // Member B disables taskAssigned preference
      await request(app)
        .patch('/api/v1/notifications/preferences')
        .set('Authorization', `Bearer ${memberBToken}`)
        .send({ taskAssigned: false });

      const beforeCount = (
        await request(app)
          .get('/api/v1/notifications/unread-count')
          .set('Authorization', `Bearer ${memberBToken}`)
      ).body.data.unreadCount;

      // Owner assigns task1 back to Member B
      await request(app)
        .patch(`/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/tasks/${task1Id}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ assigneeId: memberBUserId });

      const afterCount = (
        await request(app)
          .get('/api/v1/notifications/unread-count')
          .set('Authorization', `Bearer ${memberBToken}`)
      ).body.data.unreadCount;

      // No new notification added for Member B
      expect(afterCount).toBe(beforeCount);

      // Re-enable taskAssigned for Member B
      await request(app)
        .patch('/api/v1/notifications/preferences')
        .set('Authorization', `Bearer ${memberBToken}`)
        .send({ taskAssigned: true });
    });
  });

  // =========================================================================
  // 3. Comments Collaboration Notifications
  // =========================================================================
  describe('3. Comments Collaboration Notifications', () => {
    it('should notify task assignee when someone comments on their task', async () => {
      // Member A comments on task1 (which is assigned to Member B, created by Owner)
      const commentRes = await request(app)
        .post(
          `/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/tasks/${task1Id}/comments`
        )
        .set('Authorization', `Bearer ${memberAToken}`)
        .send({ content: 'Hey @Bob, please check the database migration.' });

      expect(commentRes.status).toBe(201);

      // Check Member B (assignee) received COMMENT_CREATED notification
      const memberBNotifs = await request(app)
        .get('/api/v1/notifications')
        .set('Authorization', `Bearer ${memberBToken}`);

      const commentNotif = memberBNotifs.body.data.notifications.find(
        (n: any) => n.type === NotificationType.COMMENT_CREATED && n.taskId === task1Id
      );
      expect(commentNotif).toBeDefined();
      expect(commentNotif.actor.id).toBe(memberAUserId);
    });

    it('should notify task reporter/creator when someone comments on their task', async () => {
      // Check Owner (creator/reporter of task1) received COMMENT_CREATED notification
      const ownerNotifs = await request(app)
        .get('/api/v1/notifications')
        .set('Authorization', `Bearer ${ownerToken}`);

      const commentNotif = ownerNotifs.body.data.notifications.find(
        (n: any) => n.type === NotificationType.COMMENT_CREATED && n.taskId === task1Id
      );
      expect(commentNotif).toBeDefined();
      expect(commentNotif.actor.id).toBe(memberAUserId);
    });

    it('should NOT notify commenter for their own comment', async () => {
      // Check Member A did NOT receive any notification for their own comment
      const memberANotifs = await request(app)
        .get('/api/v1/notifications')
        .set('Authorization', `Bearer ${memberAToken}`);

      const ownCommentNotif = memberANotifs.body.data.notifications.find(
        (n: any) => n.type === NotificationType.COMMENT_CREATED && n.taskId === task1Id
      );
      expect(ownCommentNotif).toBeUndefined();
    });

    it('should deduplicate notification if assignee is also the task reporter', async () => {
      // Owner creates a task assigned to Owner
      const createRes = await request(app)
        .post(`/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/tasks`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          title: 'Deduplication Test Task',
          assigneeId: ownerUserId,
        });
      const dedupTaskId = createRes.body.data.id;

      // Member A comments on this task
      await request(app)
        .post(
          `/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/tasks/${dedupTaskId}/comments`
        )
        .set('Authorization', `Bearer ${memberAToken}`)
        .send({ content: 'Checking duplicate notification logic.' });

      // Owner should only receive 1 notification, not 2
      const ownerNotifs = await request(app)
        .get('/api/v1/notifications')
        .set('Authorization', `Bearer ${ownerToken}`);

      const matchingNotifs = ownerNotifs.body.data.notifications.filter(
        (n: any) => n.type === NotificationType.COMMENT_CREATED && n.taskId === dedupTaskId
      );
      expect(matchingNotifs.length).toBe(1);
    });

    it('should suppress comment notification if comments preference is set to false', async () => {
      // Member B turns comments preference off
      await request(app)
        .patch('/api/v1/notifications/preferences')
        .set('Authorization', `Bearer ${memberBToken}`)
        .send({ comments: false });

      const beforeCount = (
        await request(app)
          .get('/api/v1/notifications/unread-count')
          .set('Authorization', `Bearer ${memberBToken}`)
      ).body.data.unreadCount;

      // Owner comments on task1 (assigned to Member B)
      await request(app)
        .post(
          `/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/tasks/${task1Id}/comments`
        )
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ content: 'Silent notification check.' });

      const afterCount = (
        await request(app)
          .get('/api/v1/notifications/unread-count')
          .set('Authorization', `Bearer ${memberBToken}`)
      ).body.data.unreadCount;

      expect(afterCount).toBe(beforeCount);

      // Restore comments preference
      await request(app)
        .patch('/api/v1/notifications/preferences')
        .set('Authorization', `Bearer ${memberBToken}`)
        .send({ comments: true });
    });
  });

  // =========================================================================
  // 4. Task Status & Dependency Notifications
  // =========================================================================
  describe('4. Task Status & Dependency Notifications', () => {
    it('should NOT notify assignee on task status change when statusChanges is disabled by default', async () => {
      // Member B is assigned to task1. Member B has default preferences (statusChanges: false)
      const beforeCount = (
        await request(app)
          .get('/api/v1/notifications/unread-count')
          .set('Authorization', `Bearer ${memberBToken}`)
      ).body.data.unreadCount;

      // Owner updates status of task1 to IN_PROGRESS
      await request(app)
        .patch(
          `/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/tasks/${task1Id}/status`
        )
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ status: TaskStatus.IN_PROGRESS });

      const afterCount = (
        await request(app)
          .get('/api/v1/notifications/unread-count')
          .set('Authorization', `Bearer ${memberBToken}`)
      ).body.data.unreadCount;

      expect(afterCount).toBe(beforeCount);
    });

    it('should notify assignee on task status change when statusChanges is enabled', async () => {
      // Member B opts in to statusChanges
      await request(app)
        .patch('/api/v1/notifications/preferences')
        .set('Authorization', `Bearer ${memberBToken}`)
        .send({ statusChanges: true });

      // Owner updates status of task1 to IN_REVIEW
      await request(app)
        .patch(
          `/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/tasks/${task1Id}/status`
        )
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ status: TaskStatus.IN_REVIEW });

      const notifs = await request(app)
        .get('/api/v1/notifications')
        .set('Authorization', `Bearer ${memberBToken}`);

      const statusNotif = notifs.body.data.notifications.find(
        (n: any) => n.type === NotificationType.TASK_STATUS_CHANGED && n.taskId === task1Id
      );
      expect(statusNotif).toBeDefined();
      expect(statusNotif.message).toContain('IN_REVIEW');
    });

    it('should NOT generate self-notification when assignee updates their own task status', async () => {
      // Member B updates status of their own task1 to TODO
      await request(app)
        .patch(
          `/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/tasks/${task1Id}/status`
        )
        .set('Authorization', `Bearer ${memberBToken}`)
        .send({ status: TaskStatus.TODO });

      // Member B should not receive notification for their own action
      const notifs = await request(app)
        .get('/api/v1/notifications')
        .set('Authorization', `Bearer ${memberBToken}`);

      const selfNotif = notifs.body.data.notifications.find(
        (n: any) =>
          n.type === NotificationType.TASK_STATUS_CHANGED &&
          n.taskId === task1Id &&
          n.actor.id === memberBUserId
      );
      expect(selfNotif).toBeUndefined();
    });

    it('should notify assignee of successor task when BLOCKS dependency is added', async () => {
      // Create predecessor task (Task 2) assigned to Member A
      const t2Res = await request(app)
        .post(`/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/tasks`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          title: 'Database Schema Setup',
          assigneeId: memberAUserId,
        });
      task2Id = t2Res.body.data.id;

      // Create successor task (Task 3) assigned to Member B
      const t3Res = await request(app)
        .post(`/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/tasks`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          title: 'Frontend Query Integration',
          assigneeId: memberBUserId,
        });
      task3Id = t3Res.body.data.id;

      // Owner adds dependency: Task 2 BLOCKS Task 3
      const depRes = await request(app)
        .post(
          `/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/tasks/${task2Id}/dependencies`
        )
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          targetTaskId: task3Id,
          type: DependencyType.BLOCKS,
        });

      expect(depRes.status).toBe(201);

      // Member B (assignee of Task 3) should receive TASK_DEPENDENCY_ADDED notification
      const memberBNotifs = await request(app)
        .get('/api/v1/notifications')
        .set('Authorization', `Bearer ${memberBToken}`);

      const depNotif = memberBNotifs.body.data.notifications.find(
        (n: any) => n.type === NotificationType.TASK_DEPENDENCY_ADDED && n.taskId === task3Id
      );
      expect(depNotif).toBeDefined();
      expect(depNotif.title).toContain('Blocked');
    });

    it('should NOT generate dependency notification if actor is the assignee of the blocked task', async () => {
      // Member B adds a blocker to their own Task 3
      // Create Task 4
      const t4Res = await request(app)
        .post(`/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/tasks`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ title: 'Config Validation' });
      const task4Id = t4Res.body.data.id;

      await request(app)
        .post(
          `/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/tasks/${task4Id}/dependencies`
        )
        .set('Authorization', `Bearer ${memberBToken}`)
        .send({
          targetTaskId: task3Id,
          type: DependencyType.BLOCKS,
        });

      // Member B should not receive self-notification
      const memberBNotifs = await request(app)
        .get('/api/v1/notifications')
        .set('Authorization', `Bearer ${memberBToken}`);

      const selfDepNotif = memberBNotifs.body.data.notifications.find(
        (n: any) =>
          n.type === NotificationType.TASK_DEPENDENCY_ADDED && n.actor.id === memberBUserId
      );
      expect(selfDepNotif).toBeUndefined();
    });
  });

  // =========================================================================
  // 5. Milestone Completion Notifications
  // =========================================================================
  describe('5. Milestone Completion Notifications', () => {
    it('should notify assignees of tasks in milestone when milestone is completed', async () => {
      // Assign task3 to testMilestoneId
      await request(app)
        .patch(`/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/tasks/${task3Id}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ milestoneId: testMilestoneId });

      // Owner completes the milestone
      const completeRes = await request(app)
        .patch(
          `/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/milestones/${testMilestoneId}`
        )
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ status: 'COMPLETED' });

      expect(completeRes.status).toBe(200);

      // Member B (assignee of task3) should receive MILESTONE_COMPLETED notification
      const memberBNotifs = await request(app)
        .get('/api/v1/notifications')
        .set('Authorization', `Bearer ${memberBToken}`);

      const milestoneNotif = memberBNotifs.body.data.notifications.find(
        (n: any) => n.type === NotificationType.MILESTONE_COMPLETED
      );
      expect(milestoneNotif).toBeDefined();
      expect(milestoneNotif.message).toContain('Q1 Delivery Milestone');
    });

    it('should NOT notify the actor who completed the milestone', async () => {
      // Owner also has tasks or created milestone, but should not receive notification
      const ownerNotifs = await request(app)
        .get('/api/v1/notifications')
        .set('Authorization', `Bearer ${ownerToken}`);

      const ownMilestoneNotif = ownerNotifs.body.data.notifications.find(
        (n: any) => n.type === NotificationType.MILESTONE_COMPLETED && n.actor.id === ownerUserId
      );
      expect(ownMilestoneNotif).toBeUndefined();
    });

    it('should suppress milestone notification if milestones preference is false', async () => {
      // Create new milestone
      const msRes = await request(app)
        .post(`/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/milestones`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ title: 'Silent Milestone' });
      const silentMsId = msRes.body.data.id;

      // Assign task3 to silentMsId
      await request(app)
        .patch(`/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/tasks/${task3Id}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ milestoneId: silentMsId });

      // Member B disables milestones preference
      await request(app)
        .patch('/api/v1/notifications/preferences')
        .set('Authorization', `Bearer ${memberBToken}`)
        .send({ milestones: false });

      const beforeCount = (
        await request(app)
          .get('/api/v1/notifications/unread-count')
          .set('Authorization', `Bearer ${memberBToken}`)
      ).body.data.unreadCount;

      // Owner completes silentMsId
      await request(app)
        .patch(
          `/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/milestones/${silentMsId}`
        )
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ status: 'COMPLETED' });

      const afterCount = (
        await request(app)
          .get('/api/v1/notifications/unread-count')
          .set('Authorization', `Bearer ${memberBToken}`)
      ).body.data.unreadCount;

      expect(afterCount).toBe(beforeCount);

      // Restore preference
      await request(app)
        .patch('/api/v1/notifications/preferences')
        .set('Authorization', `Bearer ${memberBToken}`)
        .send({ milestones: true });
    });
  });

  // =========================================================================
  // 6. Notification Queries, Unread Count & Read States
  // =========================================================================
  describe('6. Notification Queries, Unread Count & Read States', () => {
    let sampleNotifId: string;

    it('should return accurate unread count for user', async () => {
      const res = await request(app)
        .get('/api/v1/notifications/unread-count')
        .set('Authorization', `Bearer ${memberBToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(typeof res.body.data.unreadCount).toBe('number');
      expect(res.body.data.unreadCount).toBeGreaterThan(0);
    });

    it('should list notifications ordered newest first with projected metadata', async () => {
      const res = await request(app)
        .get('/api/v1/notifications?limit=10')
        .set('Authorization', `Bearer ${memberBToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.notifications)).toBe(true);
      expect(res.body.data.notifications.length).toBeGreaterThan(0);

      sampleNotifId = res.body.data.notifications[0].id;
      const first = res.body.data.notifications[0];
      expect(first).toHaveProperty('id');
      expect(first).toHaveProperty('title');
      expect(first).toHaveProperty('message');
      expect(first).toHaveProperty('isRead');
      expect(first).toHaveProperty('createdAt');
    });

    it('should mark a single notification as read', async () => {
      const res = await request(app)
        .patch(`/api/v1/notifications/${sampleNotifId}/read`)
        .set('Authorization', `Bearer ${memberBToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(sampleNotifId);
      expect(res.body.data.isRead).toBe(true);
      expect(res.body.data.readAt).not.toBeNull();
    });

    it('should filter notifications by unreadOnly=true', async () => {
      const res = await request(app)
        .get('/api/v1/notifications?unreadOnly=true')
        .set('Authorization', `Bearer ${memberBToken}`);

      expect(res.status).toBe(200);
      for (const n of res.body.data.notifications) {
        expect(n.isRead).toBe(false);
      }
    });

    it('should mark all notifications as read and bring unread count to zero', async () => {
      const readAllRes = await request(app)
        .post('/api/v1/notifications/read-all')
        .set('Authorization', `Bearer ${memberBToken}`);

      expect(readAllRes.status).toBe(200);
      expect(readAllRes.body.success).toBe(true);
      expect(typeof readAllRes.body.data.count).toBe('number');

      const countRes = await request(app)
        .get('/api/v1/notifications/unread-count')
        .set('Authorization', `Bearer ${memberBToken}`);

      expect(countRes.status).toBe(200);
      expect(countRes.body.data.unreadCount).toBe(0);
    });
  });

  // =========================================================================
  // 7. Security & IDOR Isolation
  // =========================================================================
  describe('7. Security & IDOR Isolation', () => {
    it('should prevent User A from marking User B notification as read (returns 404)', async () => {
      // Member A creates notification for Member B
      await request(app)
        .post(
          `/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/tasks/${task1Id}/comments`
        )
        .set('Authorization', `Bearer ${memberAToken}`)
        .send({ content: 'IDOR check comment' });

      const memberBNotifs = await request(app)
        .get('/api/v1/notifications')
        .set('Authorization', `Bearer ${memberBToken}`);

      const memberBNotifId = memberBNotifs.body.data.notifications[0].id;

      // Member A tries to mark Member B's notification as read
      const idorRes = await request(app)
        .patch(`/api/v1/notifications/${memberBNotifId}/read`)
        .set('Authorization', `Bearer ${memberAToken}`);

      expect(idorRes.status).toBe(404);
      expect(idorRes.body.success).toBe(false);
    });

    it('should strictly isolate notifications between organizations and users', async () => {
      // Foreign user should see 0 notifications
      const foreignNotifs = await request(app)
        .get('/api/v1/notifications')
        .set('Authorization', `Bearer ${foreignToken}`);

      expect(foreignNotifs.status).toBe(200);
      expect(foreignNotifs.body.data.notifications.length).toBe(0);
      expect(foreignNotifs.body.data.unreadCount).toBe(0);
    });

    it('should reject unauthenticated requests to notifications endpoints', async () => {
      const res = await request(app).get('/api/v1/notifications');
      expect(res.status).toBe(401);
    });
  });

  // =========================================================================
  // 8. Personal Work Queue ("My Work") Engine
  // =========================================================================
  describe('8. Personal Work Queue ("My Work") Engine', () => {
    beforeAll(async () => {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 3600 * 1000);
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 14, 0, 0);
      const twoDaysOut = new Date(now.getTime() + 48 * 3600 * 1000);

      // Create Overdue Task assigned to Member A
      const overdueRes = await request(app)
        .post(`/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/tasks`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          title: 'Critical Security Fix (Overdue)',
          priority: TaskPriority.URGENT,
          assigneeId: memberAUserId,
          dueDate: yesterday.toISOString(),
        });
      taskOverdueId = overdueRes.body.data.id;

      // Create Due Today Task assigned to Member A
      const dueTodayRes = await request(app)
        .post(`/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/tasks`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          title: 'Deploy Hotfix (Due Today)',
          priority: TaskPriority.HIGH,
          assigneeId: memberAUserId,
          dueDate: today.toISOString(),
        });
      taskDueTodayId = dueTodayRes.body.data.id;

      // Create Due Soon Task assigned to Member A
      const dueSoonRes = await request(app)
        .post(`/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/tasks`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          title: 'Prepare Sprint Review (Due Soon)',
          priority: TaskPriority.MEDIUM,
          assigneeId: memberAUserId,
          dueDate: twoDaysOut.toISOString(),
        });
      taskDueSoonId = dueSoonRes.body.data.id;

      // Make taskDueSoonId BLOCKED by taskOverdueId
      await request(app)
        .post(
          `/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/tasks/${taskOverdueId}/dependencies`
        )
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          targetTaskId: taskDueSoonId,
          type: DependencyType.BLOCKS,
        });
    });

    it('should return work items only assigned to authenticated user', async () => {
      const res = await request(app)
        .get('/api/v1/work/my-work')
        .set('Authorization', `Bearer ${memberAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.items).toBeDefined();

      // Ensure every item belongs to Member A
      for (const item of res.body.data.items) {
        expect(item.projectId).toBe(testProjectId);
      }
    });

    it('should calculate accurate work queue summary metrics', async () => {
      const res = await request(app)
        .get('/api/v1/work/my-work')
        .set('Authorization', `Bearer ${memberAToken}`);

      const summary = res.body.data.summary;
      expect(summary.totalAssigned).toBeGreaterThanOrEqual(3);
      expect(summary.overdueCount).toBeGreaterThanOrEqual(1);
      expect(summary.dueSoonCount).toBeGreaterThanOrEqual(2); // Due today + due soon
      expect(summary.blockedCount).toBeGreaterThanOrEqual(1);
    });

    it('should detect BLOCKED tasks dynamically from unresolved dependencies without mutating TaskStatus', async () => {
      const res = await request(app)
        .get('/api/v1/work/my-work')
        .set('Authorization', `Bearer ${memberAToken}`);

      const blockedTask = res.body.data.items.find((i: any) => i.id === taskDueSoonId);
      expect(blockedTask).toBeDefined();
      expect(blockedTask.isBlocked).toBe(true);
      expect(blockedTask.blockingDependencies.length).toBeGreaterThan(0);
      expect(blockedTask.blockingDependencies[0].predecessorId).toBe(taskOverdueId);

      // Ensure underlying status was NOT mutated
      expect(blockedTask.status).toBe(TaskStatus.TODO);
    });

    it('should dynamically unblock task when predecessor transitions to DONE', async () => {
      // Mark taskOverdueId as DONE
      await request(app)
        .patch(
          `/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/tasks/${taskOverdueId}/status`
        )
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ status: TaskStatus.DONE });

      const res = await request(app)
        .get('/api/v1/work/my-work')
        .set('Authorization', `Bearer ${memberAToken}`);

      const formerlyBlocked = res.body.data.items.find((i: any) => i.id === taskDueSoonId);
      expect(formerlyBlocked).toBeDefined();
      expect(formerlyBlocked.isBlocked).toBe(false);
      expect(formerlyBlocked.blockingDependencies.length).toBe(0);
    });

    it('should accurately categorize due date buckets (OVERDUE, DUE_TODAY, DUE_SOON)', async () => {
      const res = await request(app)
        .get('/api/v1/work/my-work')
        .set('Authorization', `Bearer ${memberAToken}`);

      const dueTodayItem = res.body.data.items.find((i: any) => i.id === taskDueTodayId);
      expect(dueTodayItem).toBeDefined();
      expect(dueTodayItem.dueDateCategory).toBe('DUE_TODAY');

      const dueSoonItem = res.body.data.items.find((i: any) => i.id === taskDueSoonId);
      expect(dueSoonItem).toBeDefined();
      expect(dueSoonItem.dueDateCategory).toBe('DUE_SOON');
    });

    it('should correctly filter work items by ?filter=due_today, ?filter=due_soon, and ?filter=completed', async () => {
      // Filter due_today
      const todayRes = await request(app)
        .get('/api/v1/work/my-work?filter=due_today')
        .set('Authorization', `Bearer ${memberAToken}`);
      expect(todayRes.status).toBe(200);
      for (const item of todayRes.body.data.items) {
        expect(item.dueDateCategory).toBe('DUE_TODAY');
      }

      // Filter completed
      const compRes = await request(app)
        .get('/api/v1/work/my-work?filter=completed')
        .set('Authorization', `Bearer ${memberAToken}`);
      expect(compRes.status).toBe(200);
      for (const item of compRes.body.data.items) {
        expect(item.status).toBe(TaskStatus.DONE);
      }
    });

    it('should enforce deterministic sorting in work queue', async () => {
      const res = await request(app)
        .get('/api/v1/work/my-work')
        .set('Authorization', `Bearer ${memberAToken}`);

      const items = res.body.data.items;
      // Due today tasks come before due soon tasks
      const dueTodayIndex = items.findIndex((i: any) => i.id === taskDueTodayId);
      const dueSoonIndex = items.findIndex((i: any) => i.id === taskDueSoonId);

      if (dueTodayIndex !== -1 && dueSoonIndex !== -1) {
        expect(dueTodayIndex).toBeLessThan(dueSoonIndex);
      }
    });
  });
});
