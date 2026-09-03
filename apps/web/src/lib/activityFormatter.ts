import { ActivityActionType, ActivityItem } from '@taskflow/shared';

export interface FormattedActivity {
  title: string;
  actionDescription: string;
  targetDescription?: string;
  timeAgo: string;
  actionType: ActivityActionType;
}

export const formatRelativeTime = (dateInput: string | Date): string => {
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 30) return 'just now';
  if (diffInSeconds < 60) return `${diffInSeconds}s ago`;

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays === 1) return 'yesterday';
  if (diffInDays < 7) return `${diffInDays}d ago`;

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
};

export const formatActivityEvent = (activity: ActivityItem): FormattedActivity => {
  const meta = activity.metadata || {};
  const timeAgo = formatRelativeTime(activity.createdAt);
  const taskRef =
    activity.task?.issueKey || (activity.task?.taskNumber ? `#${activity.task.taskNumber}` : '');
  const actorName = activity.actor?.name || 'Someone';

  switch (activity.actionType) {
    case ActivityActionType.TASK_CREATED:
      return {
        title: actorName,
        actionDescription: `created task ${taskRef}`,
        targetDescription: activity.task?.title || meta.taskTitle,
        timeAgo,
        actionType: activity.actionType,
      };

    case ActivityActionType.TASK_STATUS_CHANGED: {
      const from = meta.from || activity.oldValue || 'unknown';
      const to = meta.to || activity.newValue || 'unknown';
      return {
        title: actorName,
        actionDescription: `moved ${taskRef} from ${from} to ${to}`,
        targetDescription: activity.task?.title || meta.taskTitle,
        timeAgo,
        actionType: activity.actionType,
      };
    }

    case ActivityActionType.TASK_PRIORITY_CHANGED: {
      const from = meta.from || activity.oldValue;
      const to = meta.to || activity.newValue;
      return {
        title: actorName,
        actionDescription: `changed priority of ${taskRef} from ${from} to ${to}`,
        targetDescription: activity.task?.title || meta.taskTitle,
        timeAgo,
        actionType: activity.actionType,
      };
    }

    case ActivityActionType.TASK_ASSIGNED:
      return {
        title: actorName,
        actionDescription: `assigned ${taskRef}`,
        targetDescription: activity.task?.title || meta.taskTitle,
        timeAgo,
        actionType: activity.actionType,
      };

    case ActivityActionType.TASK_UNASSIGNED:
      return {
        title: actorName,
        actionDescription: `unassigned ${taskRef}`,
        targetDescription: activity.task?.title || meta.taskTitle,
        timeAgo,
        actionType: activity.actionType,
      };

    case ActivityActionType.TASK_LABEL_ADDED:
      return {
        title: actorName,
        actionDescription: `added label "${meta.labelName || 'label'}" to ${taskRef}`,
        targetDescription: activity.task?.title || meta.taskTitle,
        timeAgo,
        actionType: activity.actionType,
      };

    case ActivityActionType.TASK_LABEL_REMOVED:
      return {
        title: actorName,
        actionDescription: `removed label "${meta.labelName || 'label'}" from ${taskRef}`,
        targetDescription: activity.task?.title || meta.taskTitle,
        timeAgo,
        actionType: activity.actionType,
      };

    case ActivityActionType.TASK_MILESTONE_CHANGED:
      return {
        title: actorName,
        actionDescription: `updated milestone for ${taskRef}`,
        targetDescription: activity.task?.title || meta.taskTitle,
        timeAgo,
        actionType: activity.actionType,
      };

    case ActivityActionType.TASK_DEPENDENCY_ADDED:
      return {
        title: actorName,
        actionDescription: `added dependency on ${meta.targetIssueKey || 'task'} for ${taskRef}`,
        targetDescription: activity.task?.title || meta.taskTitle,
        timeAgo,
        actionType: activity.actionType,
      };

    case ActivityActionType.TASK_DEPENDENCY_REMOVED:
      return {
        title: actorName,
        actionDescription: `removed dependency on ${taskRef}`,
        targetDescription: activity.task?.title || meta.taskTitle,
        timeAgo,
        actionType: activity.actionType,
      };

    case ActivityActionType.COMMENT_CREATED:
      return {
        title: actorName,
        actionDescription: `commented on ${taskRef}`,
        targetDescription: activity.task?.title || meta.taskTitle,
        timeAgo,
        actionType: activity.actionType,
      };

    case ActivityActionType.COMMENT_DELETED:
      return {
        title: actorName,
        actionDescription: `deleted a comment on ${taskRef}`,
        targetDescription: activity.task?.title || meta.taskTitle,
        timeAgo,
        actionType: activity.actionType,
      };

    case ActivityActionType.MILESTONE_CREATED:
      return {
        title: actorName,
        actionDescription: `created milestone "${meta.milestoneTitle || 'Milestone'}"`,
        timeAgo,
        actionType: activity.actionType,
      };

    case ActivityActionType.MILESTONE_UPDATED:
      return {
        title: actorName,
        actionDescription: `updated milestone "${meta.milestoneTitle || 'Milestone'}"`,
        timeAgo,
        actionType: activity.actionType,
      };

    case ActivityActionType.MILESTONE_COMPLETED:
      return {
        title: actorName,
        actionDescription: `completed milestone "${meta.milestoneTitle || 'Milestone'}"`,
        timeAgo,
        actionType: activity.actionType,
      };

    case ActivityActionType.TASK_UPDATED:
    default:
      return {
        title: actorName,
        actionDescription: `updated ${taskRef}`,
        targetDescription: activity.task?.title || meta.taskTitle,
        timeAgo,
        actionType: activity.actionType,
      };
  }
};
