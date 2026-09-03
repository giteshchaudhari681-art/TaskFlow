import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import {
  ProjectRole,
  TaskStatus,
  TaskPriority,
  DependencyType,
  ActivityActionType,
} from '@taskflow/shared';
import { createServer } from '../server.js';
import { prisma } from '../lib/prisma.js';

const app = createServer();

describe('TaskFlow PR 11: Comments, Activity Feed & Task Collaboration Suite', () => {
  const timestamp = `${Date.now()}.${Math.random().toString(36).substring(2, 6)}`;
  const ownerEmail = `collab.owner.${timestamp}@taskflow.dev`;
  const memberAEmail = `collab.memberA.${timestamp}@taskflow.dev`;
  const memberBEmail = `collab.memberB.${timestamp}@taskflow.dev`;
  const viewerEmail = `collab.viewer.${timestamp}@taskflow.dev`;
  const foreignEmail = `collab.foreign.${timestamp}@taskflow.dev`;
  const defaultPassword = 'Password123!';

  let ownerToken: string;
  let ownerOrgId: string;

  let memberAToken: string;
  let memberAUserId: string;

  let memberBToken: string;
  let memberBUserId: string;

  let viewerToken: string;
  let viewerUserId: string;

  let foreignToken: string;
  let foreignOrgId: string;

  let testProjectId: string;
  let foreignProjectId: string;

  let testTaskId: string;
  let targetTaskId: string;
  let foreignTaskId: string;

  let testLabelId: string;
  let testMilestoneId: string;

  let commentAId: string;
  let commentBId: string;

  beforeAll(async () => {
    // 1. Register Owner
    const ownerRes = await request(app).post('/api/v1/auth/register').send({
      name: 'Collab Owner',
      email: ownerEmail,
      password: defaultPassword,
      organizationName: 'Collab Operations Corp',
    });
    ownerToken = ownerRes.body.data.accessToken;
    ownerOrgId = ownerRes.body.data.defaultOrganization.id;

    // 2. Register Member A
    const memberARes = await request(app).post('/api/v1/auth/register').send({
      name: 'Member Alice',
      email: memberAEmail,
      password: defaultPassword,
    });
    memberAToken = memberARes.body.data.accessToken;
    memberAUserId = memberARes.body.data.user.id;
    await prisma.organizationMember.create({
      data: { organizationId: ownerOrgId, userId: memberAUserId, role: 'MEMBER' },
    });

    // 3. Register Member B
    const memberBRes = await request(app).post('/api/v1/auth/register').send({
      name: 'Member Bob',
      email: memberBEmail,
      password: defaultPassword,
    });
    memberBToken = memberBRes.body.data.accessToken;
    memberBUserId = memberBRes.body.data.user.id;
    await prisma.organizationMember.create({
      data: { organizationId: ownerOrgId, userId: memberBUserId, role: 'MEMBER' },
    });

    // 4. Register Viewer
    const viewerRes = await request(app).post('/api/v1/auth/register').send({
      name: 'Viewer Vicky',
      email: viewerEmail,
      password: defaultPassword,
    });
    viewerToken = viewerRes.body.data.accessToken;
    viewerUserId = viewerRes.body.data.user.id;
    await prisma.organizationMember.create({
      data: { organizationId: ownerOrgId, userId: viewerUserId, role: 'MEMBER' },
    });

    // 5. Register Foreign user
    const foreignRes = await request(app).post('/api/v1/auth/register').send({
      name: 'Foreign Frank',
      email: foreignEmail,
      password: defaultPassword,
      organizationName: 'Foreign Corp',
    });
    foreignToken = foreignRes.body.data.accessToken;
    foreignOrgId = foreignRes.body.data.defaultOrganization.id;

    // 6. Create test project
    const projRes = await request(app)
      .post(`/api/v1/organizations/${ownerOrgId}/projects`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Collab Project', key: `COL${Date.now().toString().slice(-6)}` });
    testProjectId = projRes.body.data.id;

    // 7. Add members to project
    await request(app)
      .post(`/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/members`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ userId: memberAUserId, role: ProjectRole.MEMBER });
    await request(app)
      .post(`/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/members`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ userId: memberBUserId, role: ProjectRole.MEMBER });
    await request(app)
      .post(`/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/members`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ userId: viewerUserId, role: ProjectRole.VIEWER });

    // 8. Create tasks in test project
    const taskRes1 = await request(app)
      .post(`/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/tasks`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ title: 'Task Alpha Collaboration', priority: TaskPriority.MEDIUM });
    testTaskId = taskRes1.body.data.id;

    const taskRes2 = await request(app)
      .post(`/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/tasks`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ title: 'Task Beta Target', priority: TaskPriority.LOW });
    targetTaskId = taskRes2.body.data.id;

    // 9. Create a label in test project
    const labelRes = await request(app)
      .post(`/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/labels`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Backend', color: 'indigo' });
    testLabelId = labelRes.body.data.id;

    // 10. Create a milestone in test project
    const msRes = await request(app)
      .post(`/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/milestones`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ title: 'Q3 Release Milestone', startDate: '2026-09-01', dueDate: '2026-09-30' });
    testMilestoneId = msRes.body.data.id;

    // 11. Create a foreign project and task
    const foreignProjRes = await request(app)
      .post(`/api/v1/organizations/${foreignOrgId}/projects`)
      .set('Authorization', `Bearer ${foreignToken}`)
      .send({ name: 'Foreign Project', key: `FOR${Date.now().toString().slice(-6)}` });
    foreignProjectId = foreignProjRes.body.data.id;

    const foreignTaskRes = await request(app)
      .post(`/api/v1/organizations/${foreignOrgId}/projects/${foreignProjectId}/tasks`)
      .set('Authorization', `Bearer ${foreignToken}`)
      .send({ title: 'Foreign Secret Task' });
    foreignTaskId = foreignTaskRes.body.data.id;
  });

  afterAll(async () => {
    await prisma.project.deleteMany({ where: { id: { in: [testProjectId, foreignProjectId] } } });
    await prisma.user.deleteMany({
      where: { email: { in: [ownerEmail, memberAEmail, memberBEmail, viewerEmail, foreignEmail] } },
    });
  });

  // ================================================================
  // COMMENT SYSTEM TESTS
  // ================================================================

  describe('Comment System', () => {
    it('1. Create comment: member can create a comment with author info', async () => {
      const res = await request(app)
        .post(
          `/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/tasks/${testTaskId}/comments`
        )
        .set('Authorization', `Bearer ${memberAToken}`)
        .send({ content: 'The API integration is blocked on authentication.' });

      expect(res.status).toBe(201);
      commentAId = res.body.data.id;
      expect(res.body.success).toBe(true);
      expect(res.body.data.content).toBe('The API integration is blocked on authentication.');
      expect(res.body.data.authorId).toBe(memberAUserId);
      expect(res.body.data.author.name).toBe('Member Alice');
      expect(res.body.data.author.email).toBe(memberAEmail.toLowerCase());
      expect(res.body.data.isDeleted).toBe(false);
      expect(res.body.data.deletedAt).toBeNull();
      expect(res.body.data.createdAt).toBeDefined();
    });

    it('2. Create another comment: second member can post comment', async () => {
      const res = await request(app)
        .post(
          `/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/tasks/${testTaskId}/comments`
        )
        .set('Authorization', `Bearer ${memberBToken}`)
        .send({ content: 'Auth endpoint is deployed now. You can continue.' });

      expect(res.status).toBe(201);
      commentBId = res.body.data.id;
      expect(res.body.data.authorId).toBe(memberBUserId);
      expect(res.body.data.author.name).toBe('Member Bob');
    });

    it('3. List comments: returns conversation ordered oldest to newest', async () => {
      const res = await request(app)
        .get(
          `/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/tasks/${testTaskId}/comments`
        )
        .set('Authorization', `Bearer ${memberAToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBe(2);
      expect(res.body.data[0].id).toBe(commentAId);
      expect(res.body.data[1].id).toBe(commentBId);
      expect(new Date(res.body.data[0].createdAt).getTime()).toBeLessThanOrEqual(
        new Date(res.body.data[1].createdAt).getTime()
      );
    });

    it('4. Empty comment rejected: 400 Bad Request', async () => {
      const res = await request(app)
        .post(
          `/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/tasks/${testTaskId}/comments`
        )
        .set('Authorization', `Bearer ${memberAToken}`)
        .send({ content: '' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('5. Whitespace-only comment rejected: 400 Bad Request', async () => {
      const res = await request(app)
        .post(
          `/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/tasks/${testTaskId}/comments`
        )
        .set('Authorization', `Bearer ${memberAToken}`)
        .send({ content: '     \n\t   ' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('6. Oversized comment rejected (> 5000 chars): 400 Bad Request', async () => {
      const longText = 'a'.repeat(5001);
      const res = await request(app)
        .post(
          `/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/tasks/${testTaskId}/comments`
        )
        .set('Authorization', `Bearer ${memberAToken}`)
        .send({ content: longText });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('7. Edit own comment: author can update comment content', async () => {
      const res = await request(app)
        .patch(
          `/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/tasks/${testTaskId}/comments/${commentAId}`
        )
        .set('Authorization', `Bearer ${memberAToken}`)
        .send({ content: 'The API integration is unblocked and verified.' });

      expect(res.status).toBe(200);
      expect(res.body.data.content).toBe('The API integration is unblocked and verified.');
      expect(res.body.data.authorId).toBe(memberAUserId);
    });

    it('8. Cannot edit another user comment: 403 Forbidden', async () => {
      const res = await request(app)
        .patch(
          `/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/tasks/${testTaskId}/comments/${commentAId}`
        )
        .set('Authorization', `Bearer ${memberBToken}`)
        .send({ content: 'Malicious modification of Alice comment' });

      expect(res.status).toBe(403);
    });

    it('9. Cannot delete another user comment as regular member: 403 Forbidden', async () => {
      const res = await request(app)
        .delete(
          `/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/tasks/${testTaskId}/comments/${commentAId}`
        )
        .set('Authorization', `Bearer ${memberBToken}`);

      expect(res.status).toBe(403);
    });

    it('10. Viewer cannot create comment: 403 Forbidden', async () => {
      const res = await request(app)
        .post(
          `/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/tasks/${testTaskId}/comments`
        )
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({ content: 'Viewer comment attempt' });

      expect(res.status).toBe(403);
    });

    it('11. Viewer can read comments: 200 OK', async () => {
      const res = await request(app)
        .get(
          `/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/tasks/${testTaskId}/comments`
        )
        .set('Authorization', `Bearer ${viewerToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBe(2);
    });

    it('12. Delete own comment: soft-deletes comment', async () => {
      const res = await request(app)
        .delete(
          `/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/tasks/${testTaskId}/comments/${commentBId}`
        )
        .set('Authorization', `Bearer ${memberBToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.success).toBe(true);
      expect(res.body.data.isDeleted).toBe(true);
    });

    it('13. Deleted comment behavior: masked content and isDeleted flag', async () => {
      const res = await request(app)
        .get(
          `/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/tasks/${testTaskId}/comments`
        )
        .set('Authorization', `Bearer ${memberAToken}`);

      expect(res.status).toBe(200);
      const deletedComment = res.body.data.find((c: any) => c.id === commentBId);
      expect(deletedComment).toBeDefined();
      expect(deletedComment.isDeleted).toBe(true);
      expect(deletedComment.deletedAt).not.toBeNull();
      expect(deletedComment.content).toBe('This comment was deleted.');
      expect(deletedComment.author.name).toBe('Member Bob');
    });

    it('14. Cannot edit a deleted comment: 400 Bad Request', async () => {
      const res = await request(app)
        .patch(
          `/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/tasks/${testTaskId}/comments/${commentBId}`
        )
        .set('Authorization', `Bearer ${memberBToken}`)
        .send({ content: 'Trying to restore by edit' });

      expect(res.status).toBe(400);
    });

    it('15. Admin/Owner can moderate and delete another user comment', async () => {
      const res = await request(app)
        .delete(
          `/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/tasks/${testTaskId}/comments/${commentAId}`
        )
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.isDeleted).toBe(true);
    });

    it('16. Cross-project comment access rejected: 404', async () => {
      const res = await request(app)
        .get(
          `/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/tasks/${foreignTaskId}/comments`
        )
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(404);
    });

    it('17. Cross-tenant comment access rejected: 403', async () => {
      const res = await request(app)
        .get(
          `/api/v1/organizations/${foreignOrgId}/projects/${foreignProjectId}/tasks/${foreignTaskId}/comments`
        )
        .set('Authorization', `Bearer ${memberAToken}`);

      expect(res.status).toBe(403);
    });
  });

  // ================================================================
  // ACTIVITY SYSTEM & EVENT GENERATION TESTS
  // ================================================================

  describe('Activity System & Event Generation', () => {
    let activityTaskId: string;

    it('18. Task creation generates TASK_CREATED activity', async () => {
      const res = await request(app)
        .post(`/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/tasks`)
        .set('Authorization', `Bearer ${memberAToken}`)
        .send({ title: 'Activity Audit Task', priority: TaskPriority.HIGH });

      expect(res.status).toBe(201);
      activityTaskId = res.body.data.id;

      const actRes = await request(app)
        .get(
          `/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/tasks/${activityTaskId}/activity`
        )
        .set('Authorization', `Bearer ${memberAToken}`);

      expect(actRes.status).toBe(200);
      expect(actRes.body.data.length).toBeGreaterThanOrEqual(1);

      const createdEvent = actRes.body.data.find(
        (a: any) => a.actionType === ActivityActionType.TASK_CREATED
      );
      expect(createdEvent).toBeDefined();
      expect(createdEvent.actorId).toBe(memberAUserId);
      expect(createdEvent.actor.name).toBe('Member Alice');
      expect(createdEvent.metadata.taskTitle).toBe('Activity Audit Task');
    });

    it('19. Task status change generates TASK_STATUS_CHANGED activity', async () => {
      const res = await request(app)
        .patch(
          `/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/tasks/${activityTaskId}/status`
        )
        .set('Authorization', `Bearer ${memberBToken}`)
        .send({ status: TaskStatus.IN_PROGRESS });

      expect(res.status).toBe(200);

      const actRes = await request(app)
        .get(
          `/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/tasks/${activityTaskId}/activity`
        )
        .set('Authorization', `Bearer ${memberBToken}`);

      expect(actRes.status).toBe(200);
      const statusEvent = actRes.body.data.find(
        (a: any) => a.actionType === ActivityActionType.TASK_STATUS_CHANGED
      );
      expect(statusEvent).toBeDefined();
      expect(statusEvent.actorId).toBe(memberBUserId);
      expect(statusEvent.actor.name).toBe('Member Bob');
      expect(statusEvent.oldValue).toBe(TaskStatus.TODO);
      expect(statusEvent.newValue).toBe(TaskStatus.IN_PROGRESS);
      expect(statusEvent.metadata.from).toBe(TaskStatus.TODO);
      expect(statusEvent.metadata.to).toBe(TaskStatus.IN_PROGRESS);
    });

    it('20. Task priority change generates TASK_PRIORITY_CHANGED activity', async () => {
      const res = await request(app)
        .patch(
          `/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/tasks/${activityTaskId}`
        )
        .set('Authorization', `Bearer ${memberAToken}`)
        .send({ priority: TaskPriority.URGENT });

      expect(res.status).toBe(200);

      const actRes = await request(app)
        .get(
          `/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/tasks/${activityTaskId}/activity`
        )
        .set('Authorization', `Bearer ${memberAToken}`);

      const prioEvent = actRes.body.data.find(
        (a: any) => a.actionType === ActivityActionType.TASK_PRIORITY_CHANGED
      );
      expect(prioEvent).toBeDefined();
      expect(prioEvent.actorId).toBe(memberAUserId);
      expect(prioEvent.oldValue).toBe(TaskPriority.HIGH);
      expect(prioEvent.newValue).toBe(TaskPriority.URGENT);
    });

    it('21. Task assignment generates TASK_ASSIGNED and TASK_UNASSIGNED activity', async () => {
      // Assign to Member B
      await request(app)
        .patch(
          `/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/tasks/${activityTaskId}`
        )
        .set('Authorization', `Bearer ${memberAToken}`)
        .send({ assigneeId: memberBUserId });

      // Unassign
      await request(app)
        .patch(
          `/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/tasks/${activityTaskId}`
        )
        .set('Authorization', `Bearer ${memberAToken}`)
        .send({ assigneeId: null });

      const actRes = await request(app)
        .get(
          `/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/tasks/${activityTaskId}/activity`
        )
        .set('Authorization', `Bearer ${memberAToken}`);

      const assignedEvent = actRes.body.data.find(
        (a: any) => a.actionType === ActivityActionType.TASK_ASSIGNED
      );
      const unassignedEvent = actRes.body.data.find(
        (a: any) => a.actionType === ActivityActionType.TASK_UNASSIGNED
      );

      expect(assignedEvent).toBeDefined();
      expect(assignedEvent.metadata.newAssigneeId).toBe(memberBUserId);

      expect(unassignedEvent).toBeDefined();
      expect(unassignedEvent.metadata.previousAssigneeId).toBe(memberBUserId);
    });

    it('22. Label change generates TASK_LABEL_ADDED and TASK_LABEL_REMOVED activity', async () => {
      // Add label
      await request(app)
        .post(
          `/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/tasks/${activityTaskId}/labels`
        )
        .set('Authorization', `Bearer ${memberAToken}`)
        .send({ labelId: testLabelId });

      // Remove label
      await request(app)
        .delete(
          `/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/tasks/${activityTaskId}/labels/${testLabelId}`
        )
        .set('Authorization', `Bearer ${memberAToken}`);

      const actRes = await request(app)
        .get(
          `/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/tasks/${activityTaskId}/activity`
        )
        .set('Authorization', `Bearer ${memberAToken}`);

      const labelAdded = actRes.body.data.find(
        (a: any) => a.actionType === ActivityActionType.TASK_LABEL_ADDED
      );
      const labelRemoved = actRes.body.data.find(
        (a: any) => a.actionType === ActivityActionType.TASK_LABEL_REMOVED
      );

      expect(labelAdded).toBeDefined();
      expect(labelAdded.metadata.labelId).toBe(testLabelId);
      expect(labelAdded.metadata.labelName).toBe('Backend');

      expect(labelRemoved).toBeDefined();
      expect(labelRemoved.metadata.labelId).toBe(testLabelId);
    });

    it('23. Milestone change generates TASK_MILESTONE_CHANGED activity', async () => {
      await request(app)
        .patch(
          `/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/tasks/${activityTaskId}`
        )
        .set('Authorization', `Bearer ${memberAToken}`)
        .send({ milestoneId: testMilestoneId });

      const actRes = await request(app)
        .get(
          `/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/tasks/${activityTaskId}/activity`
        )
        .set('Authorization', `Bearer ${memberAToken}`);

      const msEvent = actRes.body.data.find(
        (a: any) => a.actionType === ActivityActionType.TASK_MILESTONE_CHANGED
      );
      expect(msEvent).toBeDefined();
      expect(msEvent.metadata.newMilestoneId).toBe(testMilestoneId);
    });

    it('24. Dependency change generates TASK_DEPENDENCY_ADDED and TASK_DEPENDENCY_REMOVED', async () => {
      const depRes = await request(app)
        .post(
          `/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/tasks/${activityTaskId}/dependencies`
        )
        .set('Authorization', `Bearer ${memberAToken}`)
        .send({ targetTaskId, type: DependencyType.BLOCKS });

      expect(depRes.status).toBe(201);
      const depId = depRes.body.data.id;

      await request(app)
        .delete(
          `/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/tasks/${activityTaskId}/dependencies/${depId}`
        )
        .set('Authorization', `Bearer ${memberAToken}`);

      const actRes = await request(app)
        .get(
          `/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/tasks/${activityTaskId}/activity`
        )
        .set('Authorization', `Bearer ${memberAToken}`);

      const depAdded = actRes.body.data.find(
        (a: any) => a.actionType === ActivityActionType.TASK_DEPENDENCY_ADDED
      );
      const depRemoved = actRes.body.data.find(
        (a: any) => a.actionType === ActivityActionType.TASK_DEPENDENCY_REMOVED
      );

      expect(depAdded).toBeDefined();
      expect(depRemoved).toBeDefined();
    });

    it('25. Comment creation generates COMMENT_CREATED activity', async () => {
      const commRes = await request(app)
        .post(
          `/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/tasks/${activityTaskId}/comments`
        )
        .set('Authorization', `Bearer ${memberAToken}`)
        .send({ content: 'Testing comment activity creation' });

      expect(commRes.status).toBe(201);
      const newCommentId = commRes.body.data.id;

      const actRes = await request(app)
        .get(
          `/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/tasks/${activityTaskId}/activity`
        )
        .set('Authorization', `Bearer ${memberAToken}`);

      const commEvent = actRes.body.data.find(
        (a: any) => a.actionType === ActivityActionType.COMMENT_CREATED
      );
      expect(commEvent).toBeDefined();
      expect(commEvent.metadata.commentId).toBe(newCommentId);

      // Delete the comment to trigger COMMENT_DELETED
      await request(app)
        .delete(
          `/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/tasks/${activityTaskId}/comments/${newCommentId}`
        )
        .set('Authorization', `Bearer ${memberAToken}`);

      const actResAfterDel = await request(app)
        .get(
          `/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/tasks/${activityTaskId}/activity`
        )
        .set('Authorization', `Bearer ${memberAToken}`);

      const commDelEvent = actResAfterDel.body.data.find(
        (a: any) => a.actionType === ActivityActionType.COMMENT_DELETED
      );
      expect(commDelEvent).toBeDefined();
    });

    it('26. Milestone creation and completion generates activity', async () => {
      const msRes = await request(app)
        .post(`/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/milestones`)
        .set('Authorization', `Bearer ${memberAToken}`)
        .send({ title: 'Sprint Complete Milestone' });

      expect(msRes.status).toBe(201);
      const newMsId = msRes.body.data.id;

      // Complete milestone
      await request(app)
        .patch(
          `/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/milestones/${newMsId}`
        )
        .set('Authorization', `Bearer ${memberAToken}`)
        .send({ status: 'COMPLETED' });

      const projActRes = await request(app)
        .get(
          `/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/activity?filterType=MILESTONES`
        )
        .set('Authorization', `Bearer ${memberAToken}`);

      expect(projActRes.status).toBe(200);
      const msCreated = projActRes.body.data.find(
        (a: any) => a.actionType === ActivityActionType.MILESTONE_CREATED
      );
      const msCompleted = projActRes.body.data.find(
        (a: any) => a.actionType === ActivityActionType.MILESTONE_COMPLETED
      );

      expect(msCreated).toBeDefined();
      expect(msCompleted).toBeDefined();
    });

    it('27. Activity list ordering: newest first', async () => {
      const actRes = await request(app)
        .get(
          `/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/tasks/${activityTaskId}/activity`
        )
        .set('Authorization', `Bearer ${memberAToken}`);

      expect(actRes.status).toBe(200);
      const items = actRes.body.data;
      for (let i = 0; i < items.length - 1; i++) {
        expect(new Date(items[i].createdAt).getTime()).toBeGreaterThanOrEqual(
          new Date(items[i + 1].createdAt).getTime()
        );
      }
    });

    it('28. Project activity feed: returns all project events with actor & task summary', async () => {
      const res = await request(app)
        .get(`/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/activity`)
        .set('Authorization', `Bearer ${memberAToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);

      // Verify each event has actor info
      for (const act of res.body.data) {
        expect(act.actor).toBeDefined();
        expect(act.actionType).toBeDefined();
        expect(act.createdAt).toBeDefined();
      }
    });

    it('29. Project activity filtering: TASKS filter returns task actions only', async () => {
      const res = await request(app)
        .get(
          `/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/activity?filterType=TASKS`
        )
        .set('Authorization', `Bearer ${memberAToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      for (const act of res.body.data) {
        expect(act.actionType.startsWith('TASK_')).toBe(true);
      }
    });

    it('30. Viewer can view task and project activity: 200 OK', async () => {
      const taskActRes = await request(app)
        .get(
          `/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/tasks/${activityTaskId}/activity`
        )
        .set('Authorization', `Bearer ${viewerToken}`);
      expect(taskActRes.status).toBe(200);

      const projActRes = await request(app)
        .get(`/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/activity`)
        .set('Authorization', `Bearer ${viewerToken}`);
      expect(projActRes.status).toBe(200);
    });

    it('31. Cross-project and cross-tenant activity isolation: 403 / 404', async () => {
      // Member A trying to read foreign project activity
      const crossOrgRes = await request(app)
        .get(`/api/v1/organizations/${foreignOrgId}/projects/${foreignProjectId}/activity`)
        .set('Authorization', `Bearer ${memberAToken}`);
      expect(crossOrgRes.status).toBe(403);

      // Member A trying to read foreign task activity through own project
      const crossTaskRes = await request(app)
        .get(
          `/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/tasks/${foreignTaskId}/activity`
        )
        .set('Authorization', `Bearer ${memberAToken}`);
      expect(crossTaskRes.status).toBe(404);
    });

    it('32. Activity immutability: no public modification endpoints exist', async () => {
      const patchRes = await request(app)
        .patch(`/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/activity/some-id`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ actionType: 'HACKED' });
      expect(patchRes.status).toBe(404);

      const deleteRes = await request(app)
        .delete(`/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/activity/some-id`)
        .set('Authorization', `Bearer ${ownerToken}`);
      expect(deleteRes.status).toBe(404);
    });
  });
});
