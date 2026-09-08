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
import { Badge } from '../ui/Badge';
import { Card } from '../ui/Card';

interface MilestoneCardProps {
  milestone: MilestoneListItem;
  onClick: (milestone: MilestoneListItem) => void;
  onStatusChange?: (milestoneId: string, status: MilestoneStatus) => Promise<void>;
  canEdit: boolean;
}

const HEALTH_CONFIG: Record<
  string,
  {
    icon: React.ElementType;
    label: string;
    variant: 'primary' | 'success' | 'warning' | 'danger' | 'default';
  }
> = {
  COMPLETED: {
    icon: CheckCircle2,
    label: 'Completed',
    variant: 'success',
  },
  OVERDUE: {
    icon: AlertTriangle,
    label: 'Overdue',
    variant: 'danger',
  },
  AT_RISK: {
    icon: Clock,
    label: 'At Risk',
    variant: 'warning',
  },
  ON_TRACK: {
    icon: BarChart3,
    label: 'On Track',
    variant: 'primary',
  },
  NO_DATE: {
    icon: XCircle,
    label: 'No Date',
    variant: 'default',
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
    <Card
      variant="interactive"
      padding="md"
      onClick={() => onClick(milestone)}
      role="button"
      aria-label={`Milestone: ${milestone.title}, ${health.label}`}
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && onClick(milestone)}
      className="group flex flex-col justify-between"
    >
      <div>
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <Badge variant={health.variant} size="sm" dot>
              <HealthIcon className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{health.label}</span>
            </Badge>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {canEdit && (
              <button
                onClick={handleStatusToggle}
                disabled={statusLoading}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors disabled:opacity-50 cursor-pointer"
                title={
                  milestone.status === MilestoneStatus.COMPLETED
                    ? 'Reopen milestone'
                    : 'Complete milestone'
                }
              >
                {statusLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-sky-400" />
                ) : (
                  <CheckCircle2
                    className={`w-4 h-4 ${milestone.status === MilestoneStatus.COMPLETED ? 'text-emerald-400' : ''}`}
                  />
                )}
              </button>
            )}
            <ChevronRight
              className="w-4 h-4 text-slate-500 group-hover:text-sky-400 group-hover:translate-x-0.5 transition-all"
              aria-hidden="true"
            />
          </div>
        </div>

        {/* Title */}
        <h3 className="font-extrabold text-base text-white font-display truncate group-hover:text-sky-300 transition-colors mb-1.5">
          {milestone.title}
        </h3>

        {/* Description */}
        {milestone.description && (
          <p className="text-xs text-slate-400 mb-3 line-clamp-2 leading-relaxed">
            {milestone.description}
          </p>
        )}

        {/* Dates */}
        <div className="flex items-center gap-2 text-xs text-slate-400 mb-3">
          <Calendar className="w-3.5 h-3.5 text-slate-500 shrink-0" aria-hidden="true" />
          <span className="font-medium">
            {milestone.startDate ? formatDate(milestone.startDate) : 'No start'} →{' '}
            {milestone.dueDate ? formatDate(milestone.dueDate) : 'No deadline'}
          </span>
        </div>
      </div>

      <div>
        {/* Progress Bar */}
        <div
          className="space-y-1.5 mb-3"
          role="progressbar"
          aria-valuenow={milestone.progress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Progress: ${milestone.progress}%`}
        >
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="text-slate-400">Completion Progress</span>
            <span
              className={`font-mono ${milestone.progress === 100 ? 'text-emerald-400' : 'text-slate-200'}`}
            >
              {milestone.progress}%
            </span>
          </div>
          <div className="h-2 bg-slate-800/80 rounded-full overflow-hidden border border-white/[0.05]">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                milestone.progress === 100
                  ? 'bg-emerald-400'
                  : healthKey === 'OVERDUE'
                    ? 'bg-rose-500'
                    : healthKey === 'AT_RISK'
                      ? 'bg-amber-400'
                      : 'bg-sky-400'
              }`}
              style={{ width: `${milestone.progress}%` }}
            />
          </div>
        </div>

        {/* Task stats */}
        <div className="flex items-center justify-between text-xs text-slate-400 pt-3 border-t border-white/[0.08]">
          <span className="font-medium">
            {milestone.completedTaskCount}/{milestone.taskCount} tasks done
          </span>
          {milestone.dueDate && (
            <span
              className={`font-medium ${
                healthKey === 'OVERDUE'
                  ? 'text-rose-400 font-semibold'
                  : healthKey === 'AT_RISK'
                    ? 'text-amber-400'
                    : 'text-slate-400'
              }`}
            >
              {daysLabel(milestone.dueDate)}
            </span>
          )}
        </div>
      </div>
    </Card>
  );
};
