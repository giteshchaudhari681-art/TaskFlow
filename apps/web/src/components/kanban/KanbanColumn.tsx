import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { TaskListItem, TaskStatus } from '@taskflow/shared';
import { KanbanCard } from './KanbanCard';

export interface ColumnConfig {
  id: TaskStatus;
  label: string;
  dotColor: string;
  badgeBg: string;
  badgeText: string;
  borderColor: string;
  glowColor: string;
}

export const COLUMN_CONFIGS: Record<TaskStatus, ColumnConfig> = {
  [TaskStatus.BACKLOG]: {
    id: TaskStatus.BACKLOG,
    label: 'Backlog',
    dotColor: 'bg-slate-400',
    badgeBg: 'bg-slate-900/60',
    badgeText: 'text-slate-300',
    borderColor: 'border-slate-800/80',
    glowColor: 'shadow-[0_0_15px_rgba(148,163,184,0.15)]',
  },
  [TaskStatus.TODO]: {
    id: TaskStatus.TODO,
    label: 'To Do',
    dotColor: 'bg-cyan-400',
    badgeBg: 'bg-cyan-950/60',
    badgeText: 'text-cyan-300',
    borderColor: 'border-cyan-800/80',
    glowColor: 'shadow-[0_0_15px_rgba(6,182,212,0.15)]',
  },
  [TaskStatus.IN_PROGRESS]: {
    id: TaskStatus.IN_PROGRESS,
    label: 'In Progress',
    dotColor: 'bg-blue-400',
    badgeBg: 'bg-blue-950/60',
    badgeText: 'text-blue-300',
    borderColor: 'border-blue-800/80',
    glowColor: 'shadow-[0_0_15px_rgba(59,130,246,0.15)]',
  },
  [TaskStatus.IN_REVIEW]: {
    id: TaskStatus.IN_REVIEW,
    label: 'In Review',
    dotColor: 'bg-purple-400',
    badgeBg: 'bg-purple-950/60',
    badgeText: 'text-purple-300',
    borderColor: 'border-purple-800/80',
    glowColor: 'shadow-[0_0_15px_rgba(168,85,247,0.15)]',
  },
  [TaskStatus.BLOCKED]: {
    id: TaskStatus.BLOCKED,
    label: 'Blocked',
    dotColor: 'bg-rose-400',
    badgeBg: 'bg-rose-950/60',
    badgeText: 'text-rose-300',
    borderColor: 'border-rose-800/80',
    glowColor: 'shadow-[0_0_15px_rgba(244,63,94,0.15)]',
  },
  [TaskStatus.DONE]: {
    id: TaskStatus.DONE,
    label: 'Done',
    dotColor: 'bg-emerald-400',
    badgeBg: 'bg-emerald-950/60',
    badgeText: 'text-emerald-300',
    borderColor: 'border-emerald-800/80',
    glowColor: 'shadow-[0_0_15px_rgba(52,211,153,0.15)]',
  },
  [TaskStatus.CANCELLED]: {
    id: TaskStatus.CANCELLED,
    label: 'Cancelled',
    dotColor: 'bg-slate-500',
    badgeBg: 'bg-slate-900/60',
    badgeText: 'text-slate-400',
    borderColor: 'border-slate-800/80',
    glowColor: 'shadow-[0_0_15px_rgba(100,116,139,0.15)]',
  },
};

interface KanbanColumnProps {
  status: TaskStatus;
  tasks: TaskListItem[];
  canMove: boolean;
  canCreate: boolean;
  onCardClick: (task: TaskListItem) => void;
  onAddTask: (status: TaskStatus) => void;
  onDropTask: (taskId: string, targetStatus: TaskStatus) => void;
  onStatusChange?: (taskId: string, newStatus: TaskStatus) => void;
}

export const KanbanColumn: React.FC<KanbanColumnProps> = ({
  status,
  tasks,
  canMove,
  canCreate,
  onCardClick,
  onAddTask,
  onDropTask,
  onStatusChange,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const config = COLUMN_CONFIGS[status] || COLUMN_CONFIGS[TaskStatus.TODO];

  const handleDragOver = (e: React.DragEvent) => {
    if (!canMove) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (!isDragOver) setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Only set false if leaving column container
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragOver(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    if (!canMove) return;
    e.preventDefault();
    setIsDragOver(false);
    const taskId = e.dataTransfer.getData('text/plain');
    if (taskId) {
      onDropTask(taskId, status);
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`flex flex-col flex-shrink-0 w-72 max-w-[85vw] rounded-lg border transition-colors bg-[#111827]/80 min-h-[500px] ${
        isDragOver ? 'border-sky-500 ring-1 ring-sky-500/50 bg-sky-950/20' : 'border-slate-800'
      }`}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between p-3 border-b border-slate-800">
        <div className="flex items-center space-x-2">
          <span className={`w-2 h-2 rounded-full ${config.dotColor}`} />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-200">
            {config.label}
          </h3>
          <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-medium bg-slate-800 text-slate-400 border border-slate-700">
            {tasks.length}
          </span>
        </div>

        {canCreate && (
          <button
            type="button"
            onClick={() => onAddTask(status)}
            title={`Add task to ${config.label}`}
            className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Cards Container */}
      <div className="flex-1 p-2 space-y-2 overflow-y-auto max-h-[calc(100vh-300px)] scrollbar-thin">
        {tasks.map(task => (
          <KanbanCard
            key={task.id}
            task={task}
            canMove={canMove}
            onCardClick={onCardClick}
            onStatusChange={onStatusChange}
          />
        ))}

        {tasks.length === 0 && (
          <div
            className={`h-28 rounded-md border border-dashed flex flex-col items-center justify-center p-3 text-center transition-colors ${
              isDragOver
                ? 'border-sky-500 bg-sky-950/30 text-sky-300'
                : 'border-slate-800/80 text-slate-500'
            }`}
          >
            <p className="text-xs">No tasks in {config.label.toLowerCase()}</p>
            {canCreate && (
              <button
                type="button"
                onClick={() => onAddTask(status)}
                className="mt-1.5 text-[11px] text-sky-400 hover:text-sky-300 hover:underline inline-flex items-center cursor-pointer"
              >
                <Plus className="w-3 h-3 mr-1" />
                Add task
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
