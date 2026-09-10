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
}

export const COLUMN_CONFIGS: Record<TaskStatus, ColumnConfig> = {
  [TaskStatus.BACKLOG]: {
    id: TaskStatus.BACKLOG,
    label: 'Backlog',
    dotColor: 'bg-slate-500',
    badgeBg: 'bg-[#1a1d26]',
    badgeText: 'text-slate-400',
  },
  [TaskStatus.TODO]: {
    id: TaskStatus.TODO,
    label: 'To Do',
    dotColor: 'bg-slate-300',
    badgeBg: 'bg-[#1a1d26]',
    badgeText: 'text-slate-300',
  },
  [TaskStatus.IN_PROGRESS]: {
    id: TaskStatus.IN_PROGRESS,
    label: 'In Progress',
    dotColor: 'bg-amber-400',
    badgeBg: 'bg-[#1a1d26]',
    badgeText: 'text-amber-300',
  },
  [TaskStatus.IN_REVIEW]: {
    id: TaskStatus.IN_REVIEW,
    label: 'In Review',
    dotColor: 'bg-violet-400',
    badgeBg: 'bg-[#1a1d26]',
    badgeText: 'text-taskflow-text',
  },
  [TaskStatus.BLOCKED]: {
    id: TaskStatus.BLOCKED,
    label: 'Blocked',
    dotColor: 'bg-rose-400',
    badgeBg: 'bg-[#1a1d26]',
    badgeText: 'text-rose-300',
  },
  [TaskStatus.DONE]: {
    id: TaskStatus.DONE,
    label: 'Done',
    dotColor: 'bg-emerald-500',
    badgeBg: 'bg-[#1a1d26]',
    badgeText: 'text-emerald-300',
  },
  [TaskStatus.CANCELLED]: {
    id: TaskStatus.CANCELLED,
    label: 'Cancelled',
    dotColor: 'bg-slate-600',
    badgeBg: 'bg-[#1a1d26]',
    badgeText: 'text-slate-500',
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
      className={`flex flex-col flex-shrink-0 w-72 max-w-[85vw] rounded-lg border transition-colors bg-[#12141a] min-h-[500px] ${
        isDragOver ? 'border-[#e05638] ring-1 ring-[#e05638]/30 bg-[#1a1512]' : 'border-[#1e2230]'
      }`}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-[#1e2230]">
        <div className="flex items-center space-x-2">
          <span className={`w-1.5 h-1.5 rounded-full ${config.dotColor}`} />
          <h3 className="text-[11px] font-semibold uppercase tracking-widest text-slate-300">
            {config.label}
          </h3>
          <span className="px-1.5 py-px rounded text-[10px] font-mono font-medium bg-[#1a1d26] text-slate-500 border border-[#252b3a]">
            {tasks.length}
          </span>
        </div>

        {canCreate && (
          <button
            type="button"
            onClick={() => onAddTask(status)}
            title={`Add task to ${config.label}`}
            className="p-1 rounded hover:bg-[#1e2230] text-slate-500 hover:text-slate-200 transition-colors cursor-pointer"
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
            className={`h-24 rounded border border-dashed flex flex-col items-center justify-center p-3 text-center transition-colors ${
              isDragOver
                ? 'border-[#e05638]/50 bg-[#1a1512] text-[#e05638]'
                : 'border-[#1e2230] text-slate-600'
            }`}
          >
            <p className="text-xs">No tasks in {config.label.toLowerCase()}</p>
            {canCreate && (
              <button
                type="button"
                onClick={() => onAddTask(status)}
                className="mt-1.5 text-[11px] text-[#e05638] hover:text-[#f06848] hover:underline inline-flex items-center cursor-pointer"
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
