import { projectDashboardRepository } from '../repositories/projectDashboard.repository.js';
import { projectRepository } from '../repositories/project.repository.js';
import { taskRepository } from '../repositories/task.repository.js';
import { dependencyRepository } from '../repositories/dependency.repository.js';
import { commentRepository } from '../repositories/comment.repository.js';
import type { AIAnalysisContextPayload } from '../integrations/ai/aiClient.js';
import { TaskStatus } from '@prisma/client';
import { calculateCanonicalCompletion, evaluateProjectHealth } from './projectHealth.rules.js';

export class AIContextBuilder {
  /**
   * Constructs sanitized, AI-relevant domain context for a project.
   */
  async buildProjectContext(projectId: string): Promise<AIAnalysisContextPayload> {
    const data = await projectDashboardRepository.getProjectDashboardData(projectId);

    if (!data.project) {
      throw new Error(`Project ${projectId} not found for AI context generation`);
    }

    const { project, tasks, milestones } = data;
    const now = new Date();

    // 1. Calculate deterministic metric signals
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === TaskStatus.DONE).length;
    const cancelledTasks = tasks.filter(t => t.status === TaskStatus.CANCELLED).length;
    const eligibleTasks = Math.max(0, totalTasks - cancelledTasks);

    const inFlightTasks = tasks.filter(
      t => t.status === TaskStatus.IN_PROGRESS || t.status === TaskStatus.IN_REVIEW
    ).length;

    const overdueTasks = tasks.filter(
      t =>
        t.status !== TaskStatus.DONE &&
        t.status !== TaskStatus.CANCELLED &&
        t.dueDate &&
        new Date(t.dueDate) < now
    ).length;

    const urgentOverdueTasks = tasks.filter(
      t =>
        t.status !== TaskStatus.DONE &&
        t.status !== TaskStatus.CANCELLED &&
        t.dueDate &&
        new Date(t.dueDate) < now &&
        (t.priority === 'URGENT' || t.priority === 'HIGH')
    ).length;

    // Blocked tasks: active tasks that have unresolved BLOCKS dependencies
    const blockedTasks = tasks.filter(t => {
      if (t.status === TaskStatus.DONE || t.status === TaskStatus.CANCELLED) return false;
      return t.dependenciesAsSuccessor?.some(
        dep => dep.type === 'BLOCKS' && dep.predecessor?.status !== TaskStatus.DONE
      );
    }).length;

    const overdueMilestones = milestones.filter(
      m => m.status !== 'COMPLETED' && m.dueDate && new Date(m.dueDate) < now
    ).length;

    const completionPercentage = calculateCanonicalCompletion(
      completedTasks,
      totalTasks,
      cancelledTasks
    );

    // 2. Evaluate authoritative deterministic health
    const healthSignals = {
      completionPercentage,
      urgentOverdueTasks,
      overdueTasks,
      blockedTasks,
      overdueMilestones,
      atRiskMilestones: 0,
    };
    const healthEval = evaluateProjectHealth(
      healthSignals,
      totalTasks,
      eligibleTasks,
      milestones.length
    );

    // 3. Assemble deterministic delivery risks
    const deliveryRisks: Array<{ type: string; severity: string; message: string }> = [];
    if (urgentOverdueTasks > 0) {
      deliveryRisks.push({
        type: 'OVERDUE_URGENT_TASK',
        severity: 'CRITICAL',
        message: `${urgentOverdueTasks} urgent or high-priority task${urgentOverdueTasks > 1 ? 's are' : ' is'} overdue`,
      });
    }
    if (blockedTasks > 0) {
      deliveryRisks.push({
        type: 'UNRESOLVED_BLOCKER',
        severity: blockedTasks >= 4 ? 'CRITICAL' : 'HIGH',
        message: `${blockedTasks} task${blockedTasks > 1 ? 's have' : ' has'} active unresolved dependency blockers`,
      });
    }
    if (overdueMilestones > 0) {
      deliveryRisks.push({
        type: 'OVERDUE_MILESTONE',
        severity: 'HIGH',
        message: `${overdueMilestones} milestone${overdueMilestones > 1 ? 's are' : ' is'} past target due date`,
      });
    }
    if (overdueTasks > urgentOverdueTasks) {
      const regularOverdue = overdueTasks - urgentOverdueTasks;
      deliveryRisks.push({
        type: 'OVERDUE_TASKS',
        severity: 'MEDIUM',
        message: `${regularOverdue} task${regularOverdue > 1 ? 's are' : ' is'} past due date`,
      });
    }

    // 4. Sanitize and structure milestones (up to 20)
    const sanitizedMilestones = milestones.slice(0, 20).map(m => {
      const milestoneTasks = tasks.filter(t => t.milestoneId === m.id);
      const mTotal = milestoneTasks.length;
      const mDone = milestoneTasks.filter(t => t.status === TaskStatus.DONE).length;
      const progress = mTotal > 0 ? Math.round((mDone / mTotal) * 100) : 0;

      return {
        milestone_id: m.id,
        title: m.title,
        status: m.status,
        due_date: m.dueDate ? m.dueDate.toISOString() : null,
        progress_percentage: progress,
      };
    });

    // 5. Sanitize and structure tasks (up to 50 active/recent)
    const sanitizedTasks = tasks.slice(0, 50).map(t => ({
      task_id: t.id,
      issue_key: t.issueKey || `${project.key}-${t.taskNumber}`,
      title: t.title,
      status: t.status,
      priority: t.priority,
      due_date: t.dueDate ? t.dueDate.toISOString() : null,
      assignee: t.assignee ? t.assignee.name : null,
      description: t.description ? t.description.slice(0, 500) : null,
    }));

    return {
      project: {
        project_id: project.id,
        project_key: project.key,
        project_name: project.name,
        project_status: project.status,
        description: project.description,
      },
      metrics: {
        total_tasks: totalTasks,
        completed_tasks: completedTasks,
        in_flight_tasks: inFlightTasks,
        overdue_tasks: overdueTasks,
        blocked_tasks: blockedTasks,
        completion_percentage: completionPercentage,
      },
      health: {
        state: healthEval.state,
        score: healthEval.score,
        reasons: healthEval.reasons,
      },
      delivery_risks: deliveryRisks,
      milestones: sanitizedMilestones,
      tasks: sanitizedTasks,
    };
  }

  /**
   * Constructs sanitized, AI-relevant domain context for a single targeted task.
   */
  async buildTaskContext(projectId: string, taskId: string): Promise<AIAnalysisContextPayload> {
    const task = await taskRepository.findById(taskId, projectId);
    if (!task) {
      throw new Error(`Task ${taskId} not found in project ${projectId} for AI context generation`);
    }

    // 1. Fetch dependencies for this task
    const deps = await dependencyRepository.findByTaskId(taskId, projectId);
    const sanitizedDeps = deps.map(d => {
      const isPredecessor = d.predecessorId === taskId;
      const related = isPredecessor ? d.successor : d.predecessor;
      let relationship = 'RELATES_TO';
      if (d.type === 'BLOCKS') {
        relationship = isPredecessor ? 'BLOCKED_SUCCESSOR' : 'BLOCKING_PREDECESSOR';
      }
      return {
        task_id: related.id,
        issue_key: related.issueKey || `TASK-${related.taskNumber}`,
        title: related.title,
        status: related.status,
        relationship,
      };
    });

    // 2. Fetch recent bounded comments (up to 5)
    const rawComments = await commentRepository.listByTask(taskId, { limit: 5 });
    const sanitizedComments = rawComments.map(c => ({
      author: c.author?.name || 'Team Member',
      content: c.content.slice(0, 300),
      created_at: c.createdAt.toISOString(),
    }));

    // 3. Subtasks (up to 20)
    const sanitizedSubtasks = (task.subtasks || []).slice(0, 20).map(st => ({
      id: st.id,
      title: st.title,
      status: st.isCompleted ? 'DONE' : 'TODO',
      is_completed: st.isCompleted,
    }));

    // 4. Labels
    const labels = (task.labels || []).map(l => l.name);

    // 5. Eligible assignees for task assignment (up to 20 project members)
    const members = await projectRepository.listMembers(projectId);
    const eligibleAssignees = (members || []).slice(0, 20).map(m => ({
      id: m.user.id,
      display_name: m.user.name,
    }));

    // 6. Parent project context and health snapshot
    const projectData = await projectDashboardRepository.getProjectDashboardData(projectId);
    const parentProject = projectData.project
      ? {
          project_id: projectData.project.id,
          project_key: projectData.project.key,
          project_name: projectData.project.name,
          project_status: projectData.project.status,
        }
      : undefined;

    const totalTasks = projectData.tasks.length;
    const completedTasks = projectData.tasks.filter(t => t.status === TaskStatus.DONE).length;
    const cancelledTasks = projectData.tasks.filter(t => t.status === TaskStatus.CANCELLED).length;
    const eligibleTasks = Math.max(0, totalTasks - cancelledTasks);
    const now = new Date();
    const urgentOverdueTasks = projectData.tasks.filter(
      t =>
        t.status !== TaskStatus.DONE &&
        t.status !== TaskStatus.CANCELLED &&
        t.dueDate &&
        new Date(t.dueDate) < now &&
        (t.priority === 'URGENT' || t.priority === 'HIGH')
    ).length;
    const overdueTasks = projectData.tasks.filter(
      t =>
        t.status !== TaskStatus.DONE &&
        t.status !== TaskStatus.CANCELLED &&
        t.dueDate &&
        new Date(t.dueDate) < now
    ).length;
    const blockedTasks = projectData.tasks.filter(t => {
      if (t.status === TaskStatus.DONE || t.status === TaskStatus.CANCELLED) return false;
      return t.dependenciesAsSuccessor?.some(
        dep => dep.type === 'BLOCKS' && dep.predecessor?.status !== TaskStatus.DONE
      );
    }).length;
    const overdueMilestones = projectData.milestones.filter(
      m => m.status !== 'COMPLETED' && m.dueDate && new Date(m.dueDate) < now
    ).length;
    const completionPercentage = calculateCanonicalCompletion(
      completedTasks,
      totalTasks,
      cancelledTasks
    );
    const healthEval = evaluateProjectHealth(
      {
        completionPercentage,
        urgentOverdueTasks,
        overdueTasks,
        blockedTasks,
        overdueMilestones,
        atRiskMilestones: 0,
      },
      totalTasks,
      eligibleTasks,
      projectData.milestones.length
    );

    return {
      project: parentProject,
      target_task: {
        task_id: task.id,
        issue_key: task.issueKey || `${task.project.key}-${task.taskNumber}`,
        title: task.title,
        status: task.status,
        priority: task.priority,
        due_date: task.dueDate ? task.dueDate.toISOString() : null,
        created_at: task.createdAt ? task.createdAt.toISOString() : null,
        assignee: task.assignee?.name || null,
        labels,
        description: task.description ? task.description.slice(0, 800) : null,
        subtasks: sanitizedSubtasks,
        dependencies: sanitizedDeps,
        recent_comments: sanitizedComments,
        eligible_assignees: eligibleAssignees,
        parent_project: parentProject,
      },
      health: {
        state: healthEval.state,
        score: healthEval.score,
        reasons: healthEval.reasons,
      },
    };
  }
}

export const aiContextBuilder = new AIContextBuilder();
