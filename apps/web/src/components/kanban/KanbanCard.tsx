import React, { useState } from 'react';
import {
  Calendar,
  CheckSquare,
  AlertCircle,
  MoreHorizontal,
  ChevronRight,
  Link2,
} from 'lucide-react';
import { TaskListItem, TaskStatus, TaskPriority } from '@taskflow/shared';
import { LabelBadge } from '../labels/LabelBadge';
import { Badge } from '../ui/Badge';

interface KanbanCardProps {
  task: TaskListItem;
  canMove: boolean;
  onCardClick: (task: TaskListItem) => void;
  onStatusChange?: (taskId: string, newStatus: TaskStatus) => void;
}

export const KanbanCard: React.FC<KanbanCardProps> = ({
  task,
  canMove,
  onCardClick,
  onStatusChange,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [showQuickMove, setShowQuickMove] = useState(false);

  const getPriorityBadge = (priority: TaskPriority) => {
    switch (priority) {
      case TaskPriority.URGENT:
        return (
          <Badge variant="danger" size="sm" dot>
            Urgent
          </Badge>
        );
      case TaskPriority.HIGH:
        return (
          <Badge variant="warning" size="sm" dot>
            High
          </Badge>
        );
      case TaskPriority.MEDIUM:
        return (
          <Badge variant="primary" size="sm" dot>
            Medium
          </Badge>
        );
      case TaskPriority.LOW:
        return (
          <Badge variant="default" size="sm">
            Low
          </Badge>
        );
      default:
        return null;
    }
  };

  const isOverdue =
    task.dueDate &&
    new Date(task.dueDate) < new Date() &&
    task.status !== TaskStatus.DONE &&
    task.status !== TaskStatus.CANCELLED;

  const handleDragStart = (e: React.DragEvent) => {
    if (!canMove) return;
    setIsDragging(true);
    e.dataTransfer.setData('text/plain', task.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  return (
    <div
      draggable={canMove}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onClick={() => onCardClick(task)}
      className={`group relative rounded-xl border p-4 bg-slate-900/80 backdrop-blur-md hover:bg-slate-800/80 transition-all duration-200 cursor-pointer shadow-sm hover:shadow-elevation-2 hover:border-white/20 hover:-translate-y-0.5 ${
        isDragging
          ? 'opacity-60 scale-[0.98] border-sky-500 ring-2 ring-sky-500/40 shadow-glow-cyan'
          : 'border-white/[0.08]'
      }`}
    >
      {/* Top row: Issue key & priority */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center space-x-2">
          <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-slate-800 border border-slate-700/80 text-slate-300">
            {task.issueKey}
          </span>
        </div>

        <div className="flex items-center space-x-1.5">
          {getPriorityBadge(task.priority)}

          {/* Quick Move Dropdown */}
          {canMove && onStatusChange && (
            <div className="relative" onClick={e => e.stopPropagation()}>
              <button
                type="button"
                onClick={() => setShowQuickMove(!showQuickMove)}
                title="Move task to another column"
                aria-label="Move task"
                className="opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-slate-700 text-slate-400 hover:text-white transition-opacity cursor-pointer"
              >
                <MoreHorizontal className="w-3.5 h-3.5" />
              </button>

              {showQuickMove && (
                <div className="absolute right-0 top-6 z-30 w-44 rounded-xl bg-slate-900 border border-white/10 shadow-elevation-3 p-1.5 space-y-0.5 text-xs animate-slide-up">
                  <div className="px-2 py-1 text-[10px] font-bold text-slate-400 font-display uppercase tracking-wider border-b border-white/[0.08] mb-1">
                    Move to Column
                  </div>
                  {Object.values(TaskStatus).map(s => (
                    <button
                      key={s}
                      type="button"
                      disabled={task.status === s}
                      onClick={() => {
                        setShowQuickMove(false);
                        onStatusChange(task.id, s);
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-xs transition-colors cursor-pointer ${
                        task.status === s
                          ? 'text-sky-400 bg-slate-800 font-semibold'
                          : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                      }`}
                    >
                      <span className="capitalize">{s.replace('_', ' ').toLowerCase()}</span>
                      {task.status !== s && <ChevronRight className="w-3 h-3 text-slate-500" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Title */}
      <h4 className="text-xs sm:text-sm font-semibold text-slate-100 group-hover:text-white transition-colors line-clamp-2 leading-snug mb-2 font-display">
        {task.title}
      </h4>

      {/* Labels */}
      {task.labels && task.labels.length > 0 && (
        <div className="flex flex-wrap items-center gap-1 mb-3" onClick={e => e.stopPropagation()}>
          {task.labels.slice(0, 3).map(label => (
            <LabelBadge key={label.id} label={label} size="xs" />
          ))}
          {task.labels.length > 3 && (
            <span
              className="text-[9px] font-mono font-medium px-1.5 py-0.5 rounded-md bg-slate-800 text-slate-400 border border-slate-700"
              title={task.labels
                .slice(3)
                .map(l => l.name)
                .join(', ')}
            >
              +{task.labels.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Bottom row: Subtasks, Due Date, and Assignee */}
      <div className="flex items-center justify-between pt-2.5 border-t border-white/[0.08] text-xs text-slate-400">
        <div className="flex items-center space-x-3">
          {/* Subtask count */}
          {task.subtaskCount > 0 && (
            <span
              className="flex items-center text-[11px] font-medium text-slate-300"
              title={`${task.completedSubtaskCount}/${task.subtaskCount} subtasks completed`}
            >
              <CheckSquare className="w-3.5 h-3.5 mr-1 text-slate-500" />
              <span>
                {task.completedSubtaskCount > 0
                  ? `${task.completedSubtaskCount}/${task.subtaskCount}`
                  : task.subtaskCount}
              </span>
            </span>
          )}

          {/* Due date */}
          {task.dueDate && (
            <span
              className={`flex items-center text-[11px] font-medium ${
                isOverdue ? 'text-rose-400 font-semibold' : 'text-slate-400'
              }`}
              title={`Due ${new Date(task.dueDate).toLocaleDateString()}`}
            >
              {isOverdue ? (
                <AlertCircle className="w-3.5 h-3.5 mr-1" />
              ) : (
                <Calendar className="w-3.5 h-3.5 mr-1 text-slate-500" />
              )}
              <span>
                {new Date(task.dueDate).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
            </span>
          )}

          {/* Dependency indicator */}
          {task.dependencySummary && task.dependencySummary.totalDependencies > 0 && (
            <span
              className={`flex items-center text-[11px] font-medium ${
                task.dependencySummary.hasUnresolvedBlockers
                  ? 'text-rose-400 font-semibold'
                  : 'text-slate-400'
              }`}
              title={
                task.dependencySummary.hasUnresolvedBlockers
                  ? `Blocked by ${task.dependencySummary.blockedByCount} task(s)`
                  : `${task.dependencySummary.totalDependencies} linked dependencies`
              }
            >
              <Link2 className="w-3.5 h-3.5 mr-1 text-slate-500" />
              <span>
                {task.dependencySummary.hasUnresolvedBlockers
                  ? `Blocked (${task.dependencySummary.blockedByCount})`
                  : task.dependencySummary.totalDependencies}
              </span>
            </span>
          )}
        </div>

        {/* Assignee Avatar */}
        <div>
          {task.assignee ? (
            <div
              className="w-6 h-6 rounded-full bg-gradient-to-tr from-sky-500 to-indigo-600 border border-white/20 flex items-center justify-center text-[10px] font-bold text-white shadow-sm"
              title={`Assigned to ${task.assignee.name}`}
            >
              {task.assignee.name.charAt(0).toUpperCase()}
            </div>
          ) : (
            <div
              className="w-6 h-6 rounded-full border border-dashed border-slate-700 flex items-center justify-center text-[10px] text-slate-500"
              title="Unassigned"
            >
              -
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
