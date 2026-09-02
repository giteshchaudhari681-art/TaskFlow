import {
  PrismaClient,
  UserRole,
  ProjectRole,
  ProjectStatus,
  MilestoneStatus,
  ObjectiveStatus,
  TaskStatus,
  TaskPriority,
  DependencyType,
  RiskLevel,
  RecommendationStatus,
  ActivityActionType,
} from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting deterministic TaskFlow development seed...');

  // Safe development purge (in reverse dependency order)
  await prisma.aIRecommendation.deleteMany();
  await prisma.projectInsight.deleteMany();
  await prisma.plannerItem.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.activity.deleteMany();
  await prisma.attachment.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.discussion.deleteMany();
  await prisma.taskLabel.deleteMany();
  await prisma.label.deleteMany();
  await prisma.subtask.deleteMany();
  await prisma.taskDependency.deleteMany();
  await prisma.task.deleteMany();
  await prisma.milestone.deleteMany();
  await prisma.objective.deleteMany();
  await prisma.projectMember.deleteMany();
  await prisma.project.deleteMany();
  await prisma.organizationMember.deleteMany();
  await prisma.organization.deleteMany();
  await prisma.user.deleteMany();

  // 1. Create Organization (Tenant)
  const org = await prisma.organization.create({
    data: {
      name: 'TaskFlow Technologies',
      slug: 'taskflow-hq',
      logoUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150',
    },
  });
  console.log(`✅ Seeded Organization: ${org.name} (${org.slug})`);

  // 2. Create Users with hashed development credentials
  const defaultPasswordHash = await bcrypt.hash('TaskFlow2026!Dev', 10);

  const owner = await prisma.user.create({
    data: {
      email: 'alex.chen@taskflow.dev',
      name: 'Alex Chen',
      passwordHash: defaultPasswordHash,
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    },
  });

  const lead = await prisma.user.create({
    data: {
      email: 'sam.miller@taskflow.dev',
      name: 'Sam Miller',
      passwordHash: defaultPasswordHash,
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    },
  });

  const engineer = await prisma.user.create({
    data: {
      email: 'jordan.taylor@taskflow.dev',
      name: 'Jordan Taylor',
      passwordHash: defaultPasswordHash,
      avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
    },
  });
  console.log('✅ Seeded Users: Alex Chen, Sam Miller, Jordan Taylor');

  // 3. Organization Memberships
  await prisma.organizationMember.createMany({
    data: [
      { organizationId: org.id, userId: owner.id, role: UserRole.OWNER },
      { organizationId: org.id, userId: lead.id, role: UserRole.ADMIN },
      { organizationId: org.id, userId: engineer.id, role: UserRole.MEMBER },
    ],
  });

  // 4. Labels
  const bugLabel = await prisma.label.create({
    data: { organizationId: org.id, name: 'Bug', colorHex: '#ef4444' },
  });
  const coreLabel = await prisma.label.create({
    data: { organizationId: org.id, name: 'Core Engine', colorHex: '#6366f1' },
  });
  const aiLabel = await prisma.label.create({
    data: { organizationId: org.id, name: 'AI Ops', colorHex: '#38bdf8' },
  });

  // 5. Project
  const project = await prisma.project.create({
    data: {
      organizationId: org.id,
      name: 'Project Operations Core',
      key: 'OPS',
      description:
        'Core operational execution engine, dependency graphs, and risk radar telemetry.',
      status: ProjectStatus.ACTIVE,
    },
  });
  console.log(`✅ Seeded Project: ${project.name} [${project.key}]`);

  // 6. Project Memberships
  await prisma.projectMember.createMany({
    data: [
      { projectId: project.id, userId: owner.id, role: ProjectRole.LEAD },
      { projectId: project.id, userId: lead.id, role: ProjectRole.LEAD },
      { projectId: project.id, userId: engineer.id, role: ProjectRole.MEMBER },
    ],
  });

  // 7. Objective & Milestone
  const objective = await prisma.objective.create({
    data: {
      projectId: project.id,
      title: 'Achieve Sub-10ms Graph Traversal Latency',
      description:
        'Optimize topological sort and DAG cycle detection for enterprise scale task networks.',
      status: ObjectiveStatus.ACTIVE,
      targetDate: new Date('2026-10-31'),
    },
  });

  const milestone = await prisma.milestone.create({
    data: {
      projectId: project.id,
      title: 'v1.0 Operations Engine Release',
      description:
        'First production-grade milestone delivering deterministic dependencies and health radar.',
      dueDate: new Date('2026-11-15'),
      status: MilestoneStatus.OPEN,
      progressPercent: 35,
    },
  });

  // 8. Tasks (Demonstrating DAG Dependencies)
  const task1 = await prisma.task.create({
    data: {
      projectId: project.id,
      taskNumber: 1,
      title: 'Implement Adjacency List Dependency Engine',
      description:
        'Design directed acyclic graph data structure with fast cycle detection heuristics.',
      status: TaskStatus.DONE,
      priority: TaskPriority.HIGH,
      assigneeId: lead.id,
      reporterId: owner.id,
      milestoneId: milestone.id,
      objectiveId: objective.id,
      estimateHours: 16,
    },
  });

  const task2 = await prisma.task.create({
    data: {
      projectId: project.id,
      taskNumber: 2,
      title: 'Critical Path Analyzer & Cascading Delay Forecaster',
      description:
        'Compute longest dependency chain through active milestones and alert downstream assignees.',
      status: TaskStatus.IN_PROGRESS,
      priority: TaskPriority.URGENT,
      assigneeId: engineer.id,
      reporterId: lead.id,
      milestoneId: milestone.id,
      objectiveId: objective.id,
      estimateHours: 24,
    },
  });

  const task3 = await prisma.task.create({
    data: {
      projectId: project.id,
      taskNumber: 3,
      title: 'Socket.IO Real-Time Presence & Event Broadcaster',
      description: 'Push dependency mutations and state changes to connected project rooms.',
      status: TaskStatus.TODO,
      priority: TaskPriority.MEDIUM,
      assigneeId: engineer.id,
      reporterId: owner.id,
      milestoneId: milestone.id,
      estimateHours: 12,
    },
  });
  console.log('✅ Seeded Tasks: OPS-1, OPS-2, OPS-3');

  // 9. Task Dependency (Task 2 is BLOCKED BY Task 1)
  await prisma.taskDependency.create({
    data: {
      predecessorId: task1.id,
      successorId: task2.id,
      type: DependencyType.BLOCKS,
    },
  });

  // 10. Subtasks on Task 2
  await prisma.subtask.createMany({
    data: [
      {
        taskId: task2.id,
        title: 'Implement topological sort queue',
        isCompleted: true,
        order: 1,
        assigneeId: engineer.id,
      },
      {
        taskId: task2.id,
        title: 'Calculate slack time per dependency node',
        isCompleted: false,
        order: 2,
        assigneeId: engineer.id,
      },
      {
        taskId: task2.id,
        title: 'Benchmark traversal on 10,000 nodes',
        isCompleted: false,
        order: 3,
        assigneeId: engineer.id,
      },
    ],
  });

  // 11. Task Labels
  await prisma.taskLabel.createMany({
    data: [
      { taskId: task1.id, labelId: coreLabel.id },
      { taskId: task2.id, labelId: coreLabel.id },
      { taskId: task2.id, labelId: aiLabel.id },
      { taskId: task3.id, labelId: coreLabel.id },
    ],
  });

  // 12. Discussion & Comment
  const discussion = await prisma.discussion.create({
    data: {
      projectId: project.id,
      authorId: owner.id,
      title: 'RFC: Cycle Detection Strategy in Multi-Parent Dependencies',
      content:
        'Should we reject circular links synchronously at API ingress or return conflict warnings with DAG paths?',
    },
  });

  await prisma.comment.create({
    data: {
      discussionId: discussion.id,
      authorId: lead.id,
      content:
        'Synchronous validation with Tarjan DFS algorithm ensures data integrity before commit.',
    },
  });

  // 13. Audit Activity
  await prisma.activity.create({
    data: {
      projectId: project.id,
      taskId: task1.id,
      actorId: lead.id,
      actionType: ActivityActionType.STATUS_CHANGED,
      fieldChanged: 'status',
      oldValue: 'IN_PROGRESS',
      newValue: 'DONE',
    },
  });

  // 14. Notification & PlannerItem
  await prisma.notification.create({
    data: {
      userId: engineer.id,
      title: 'Task Unblocked',
      message: 'Task OPS-1 has been completed. You are now unblocked to work on OPS-2.',
      linkUrl: `/projects/${project.id}/tasks/${task2.id}`,
    },
  });

  await prisma.plannerItem.create({
    data: {
      userId: engineer.id,
      taskId: task2.id,
      date: new Date(),
      order: 1,
      notes: 'Focus on Slack Time calculation algorithm before lunch.',
    },
  });

  // 15. ProjectInsight & AIRecommendation
  await prisma.projectInsight.create({
    data: {
      projectId: project.id,
      riskLevel: RiskLevel.HIGH,
      title: 'Critical Path Velocity Bottleneck',
      summary:
        'Task OPS-2 is on the critical path for Milestone v1.0. Any delay over 48 hours will push release date.',
      recommendedAction: 'Reassign auxiliary subtasks or compress testing pipeline.',
      metadata: { criticalPathLength: 4, slackHours: 2 },
    },
  });

  await prisma.aIRecommendation.create({
    data: {
      projectId: project.id,
      type: 'WORKLOAD_OPTIMIZATION',
      title: 'Balance Workload for Jordan Taylor',
      suggestion:
        'Reassign Task OPS-3 to Sam Miller to preserve uninterrupted focus on the critical path task OPS-2.',
      impactScore: 8.5,
      status: RecommendationStatus.ACTIVE,
      metadata: { targetEngineer: 'Jordan Taylor', suggestedAssignee: 'Sam Miller' },
    },
  });

  console.log('✨ TaskFlow database seed successfully completed!');
}

main()
  .catch(e => {
    console.error('❌ Seed execution failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
