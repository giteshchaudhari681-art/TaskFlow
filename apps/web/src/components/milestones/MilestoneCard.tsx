import React, { useState } from 'react';
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  Calendar,
  BarChart3,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import { MilestoneListItem, MilestoneStatus } from '@taskflow/shared';

interface MilestoneCardProps {
  milestone: MilestoneListItem;
  onClick: (milestone: MilestoneListItem) => void;
  onStatusChange?: (milestoneId: string, status: MilestoneStatus) => Promise<void>;
  canEdit: boolean;
}

const HEALTH_CONFIG: Record<
  string,
  { icon: React.ElementType; label: string; color: string; bg: string; border: string }
> = {
  COMPLETED: {
    icon: CheckCircle2,
    label: 'Completed',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
  },
  OVERDUE: {
    icon: AlertTriangle,
    label: 'Overdue',
    color: 'text-rose-400',
    bg: 'bg-rose-500/10',
    border: 'border-rose-500/30',
  },
  AT_RISK: {
    icon: Clock,
    label: 'At Risk',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
  },
  ON_TRACK: {
    icon: BarChart3,
    label: 'On Track',
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/10',
    border: 'border-cyan-500/30',
  },
  NO_DATE: {
    icon: XCircle,
    label: 'No Date',
    color: 'text-taskflow-muted',
    bg: 'bg-taskflow-surface',
    border: 'border-taskflow-border',
  },
};

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function daysLabel(dueDate: string | null): string {
  if (!dueDate) return '';
  const now = new Date();
  const due = new Date(dueDate);
  const diff = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diff < 0) return `${Math.abs(diff)} day${Math.abs(diff) !== 1 ? 's' : ''} overdue`;
  if (diff === 0) return 'Due today';
  return `Due in ${diff} day${diff !== 1 ? 's' : ''}`;
}

export const MilestoneCard: React.FC<MilestoneCardProps> = ({
  milestone,
  onClick,
  onStatusChange,
  canEdit,
}) => {
  const [statusLoading, setStatusLoading] = useState(false);
  const healthKey = milestone.health as string;
  const health = HEALTH_CONFIG[healthKey] ?? HEALTH_CONFIG.NO_DATE;
  const HealthIcon = health.icon;

  const handleStatusToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!canEdit || !onStatusChange) return;
    setStatusLoading(true);
    const nextStatus =
      milestone.status === MilestoneStatus.COMPLETED
        ? MilestoneStatus.OPEN
        : MilestoneStatus.COMPLETED;
    try {
      await onStatusChange(milestone.id, nextStatus);
    } finally {
      setStatusLoading(false);
    }
  };

  return (
    <div
      className={`group glass-panel rounded-2xl border p-5 bg-taskflow-surface cursor-pointer hover:border-cyan-500/40 hover:shadow-glow-cyan transition-all duration-200 ${health.border}`}
      onClick={() => onClick(milestone)}
      role="button"
      aria-label={`Milestone: ${milestone.title}, ${health.label}`}
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && onClick(milestone)}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className={`p-1.5 rounded-lg ${health.bg} flex-shrink-0`}>
            <HealthIcon className={`w-3.5 h-3.5 ${health.color}`} aria-hidden="true" />
          </div>
          <h3 className="font-semibold text-sm text-white truncate group-hover:text-cyan-100 transition-colors">
            {milestone.title}
          </h3>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span
            className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${health.color} ${health.bg} ${health.border}`}
            aria-label={`Status: ${health.label}`}
          >
            {health.label}
          </span>
          {canEdit && (
            <button
              onClick={handleStatusToggle}
              disabled={statusLoading}
              title={
                milestone.status === MilestoneStatus.COMPLETED
                  ? 'Reopen milestone'
                  : 'Mark complete'
              }
              className="p-1 rounded-lg text-taskflow-muted hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors focus:outline-none focus:ring-1 focus:ring-emerald-500"
              aria-label={
                milestone.status === MilestoneStatus.COMPLETED
                  ? 'Reopen milestone'
                  : 'Mark milestone as complete'
              }
            >
              {statusLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <CheckCircle2
                  className={`w-3.5 h-3.5 ${milestone.status === MilestoneStatus.COMPLETED ? 'text-emerald-400' : ''}`}
                />
              )}
            </button>
          )}
          <ChevronRight
            className="w-3.5 h-3.5 text-taskflow-muted group-hover:text-white transition-colors"
            aria-hidden="true"
          />
        </div>
      </div>

      {/* Description */}
      {milestone.description && (
        <p className="text-xs text-taskflow-muted mb-3 line-clamp-2 leading-relaxed">
          {milestone.description}
        </p>
      )}

      {/* Dates */}
      <div className="flex items-center gap-2 text-xs text-taskflow-muted mb-3">
        <Calendar className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
        <span>
          {milestone.startDate ? formatDate(milestone.startDate) : 'No start'} →{' '}
          {milestone.dueDate ? formatDate(milestone.dueDate) : 'No deadline'}
        </span>
      </div>

      {/* Progress Bar */}
      <div
        className="space-y-1.5 mb-3"
        role="progressbar"
        aria-valuenow={milestone.progress}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Progress: ${milestone.progress}%`}
      >
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-taskflow-muted">Progress</span>
          <span
            className={`font-bold ${milestone.progress === 100 ? 'text-emerald-400' : 'text-white'}`}
          >
            {milestone.progress}%
          </span>
        </div>
        <div className="h-1.5 bg-taskflow-bg rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              milestone.progress === 100
                ? 'bg-emerald-500'
                : healthKey === 'OVERDUE'
                  ? 'bg-rose-500'
                  : healthKey === 'AT_RISK'
                    ? 'bg-amber-500'
                    : 'bg-gradient-to-r from-cyan-500 to-indigo-500'
            }`}
            style={{ width: `${milestone.progress}%` }}
          />
        </div>
      </div>

      {/* Task stats */}
      <div className="flex items-center justify-between text-[11px] text-taskflow-muted pt-2 border-t border-taskflow-border/40">
        <span>
          {milestone.completedTaskCount}/{milestone.taskCount} tasks done
          {milestone.taskCount === 0 && (
            <span className="ml-1 text-taskflow-muted/60">(no tasks)</span>
          )}
        </span>
        {milestone.dueDate && (
          <span
            className={
              healthKey === 'OVERDUE'
                ? 'text-rose-400 font-semibold'
                : healthKey === 'AT_RISK'
                  ? 'text-amber-400'
                  : ''
            }
          >
            {daysLabel(milestone.dueDate)}
          </span>
        )}
      </div>
    </div>
  );
};
