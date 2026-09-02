import React, { useState } from 'react';
import { Calendar, CheckSquare, AlertCircle, MoreHorizontal, ChevronRight } from 'lucide-react';
import { TaskListItem, TaskStatus, TaskPriority } from '@taskflow/shared';

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
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-rose-950/80 text-rose-300 border border-rose-800/80">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse mr-1" />
            Urgent
          </span>
        );
      case TaskPriority.HIGH:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-950/80 text-amber-300 border border-amber-800/80">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mr-1" />
            High
          </span>
        );
      case TaskPriority.MEDIUM:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider bg-cyan-950/60 text-cyan-300 border border-cyan-800/60">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 mr-1" />
            Medium
          </span>
        );
      case TaskPriority.LOW:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider bg-slate-900/80 text-slate-400 border border-slate-700/60">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mr-1" />
            Low
          </span>
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
      className={`group relative rounded-xl border p-3.5 bg-taskflow-surface/80 hover:bg-taskflow-surface hover:border-cyan-500/40 transition-all duration-200 cursor-pointer shadow-sm hover:shadow-glow-cyan/20 ${
        isDragging
          ? 'opacity-40 scale-[0.98] border-cyan-500/60 ring-2 ring-cyan-500/30 shadow-2xl'
          : 'border-taskflow-border'
      }`}
    >
      {/* Top row: Issue key & priority */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center space-x-1.5">
          <span className="px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-cyan-950/60 text-cyan-300 border border-cyan-800/60">
            {task.issueKey}
          </span>
        </div>

        <div className="flex items-center space-x-1.5">
          {getPriorityBadge(task.priority)}

          {/* Accessible Quick Move Menu for Keyboard/Screen-reader */}
          {canMove && onStatusChange && (
            <div className="relative" onClick={e => e.stopPropagation()}>
              <button
                type="button"
                onClick={() => setShowQuickMove(!showQuickMove)}
                title="Move task to another column"
                aria-label="Move task"
                className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-taskflow-surface-hover text-taskflow-muted hover:text-white transition-opacity"
              >
                <MoreHorizontal className="w-3.5 h-3.5" />
              </button>

              {showQuickMove && (
                <div className="absolute right-0 top-6 z-30 w-44 rounded-xl bg-taskflow-surface border border-taskflow-border shadow-2xl p-1.5 space-y-0.5 text-xs animate-in fade-in zoom-in-95">
                  <div className="px-2 py-1 text-[10px] font-bold text-taskflow-muted uppercase tracking-wider border-b border-taskflow-border mb-1">
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
                      className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-left transition-colors ${
                        task.status === s
                          ? 'text-cyan-400 bg-cyan-950/40 font-semibold'
                          : 'text-gray-300 hover:text-white hover:bg-taskflow-surface-hover'
                      }`}
                    >
                      <span className="capitalize">{s.replace('_', ' ').toLowerCase()}</span>
                      {task.status !== s && (
                        <ChevronRight className="w-3 h-3 text-taskflow-muted" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Title */}
      <h4 className="text-sm font-semibold text-white group-hover:text-cyan-200 transition-colors line-clamp-2 leading-snug mb-3">
        {task.title}
      </h4>

      {/* Bottom row: Subtasks, Due Date, and Assignee */}
      <div className="flex items-center justify-between pt-2 border-t border-taskflow-border/50 text-xs text-taskflow-muted">
        <div className="flex items-center space-x-2.5">
          {/* Subtask count */}
          {task.subtaskCount > 0 && (
            <span
              className="flex items-center text-[11px] font-medium text-taskflow-muted"
              title={`${task.completedSubtaskCount}/${task.subtaskCount} subtasks completed`}
            >
              <CheckSquare className="w-3.5 h-3.5 mr-1 text-cyan-400" />
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
                isOverdue ? 'text-rose-400 font-semibold' : 'text-taskflow-muted'
              }`}
              title={`Due ${new Date(task.dueDate).toLocaleDateString()}`}
            >
              {isOverdue ? (
                <AlertCircle className="w-3.5 h-3.5 mr-1" />
              ) : (
                <Calendar className="w-3.5 h-3.5 mr-1" />
              )}
              <span>
                {new Date(task.dueDate).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
            </span>
          )}
        </div>

        {/* Assignee Avatar */}
        <div>
          {task.assignee ? (
            <div
              className="w-6 h-6 rounded-full bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center text-[10px] font-bold text-white shadow-sm ring-1 ring-cyan-500/40"
              title={`Assigned to ${task.assignee.name}`}
            >
              {task.assignee.name.charAt(0).toUpperCase()}
            </div>
          ) : (
            <div
              className="w-6 h-6 rounded-full border border-dashed border-taskflow-border flex items-center justify-center text-[9px] text-taskflow-muted"
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
