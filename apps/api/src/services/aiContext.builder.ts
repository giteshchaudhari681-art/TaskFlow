import { projectDashboardRepository } from '../repositories/projectDashboard.repository.js';
import type { AIAnalysisContextPayload } from '../integrations/ai/aiClient.js';
import { TaskStatus } from '@prisma/client';

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
    const inFlightTasks = tasks.filter(
      t => t.status === TaskStatus.IN_PROGRESS || t.status === TaskStatus.IN_REVIEW
    ).length;
    const overdueTasks = tasks.filter(
      t => t.status !== TaskStatus.DONE && t.dueDate && new Date(t.dueDate) < now
    ).length;

    // Blocked tasks: active tasks that have unresolved BLOCKS dependencies
    const blockedTasks = tasks.filter(t => {
      if (t.status === TaskStatus.DONE) return false;
      return t.dependenciesAsSuccessor?.some(
        dep => dep.type === 'BLOCKS' && dep.predecessor?.status !== TaskStatus.DONE
      );
    }).length;

    const completionPercentage =
      totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    // 2. Sanitize and structure milestones (up to 20)
    const sanitizedMilestones = milestones.slice(0, 20).map(m => {
      // Calculate milestone progress based on associated tasks if any
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

    // 3. Sanitize and structure tasks (up to 50 active/recent)
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
      milestones: sanitizedMilestones,
      tasks: sanitizedTasks,
    };
  }
}

export const aiContextBuilder = new AIContextBuilder();
