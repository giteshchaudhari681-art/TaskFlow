import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, AlertCircle, Milestone, Calendar, BarChart3 } from 'lucide-react';
import { ProjectTimelineResponse, TimelineMilestone } from '@taskflow/shared';
import { milestoneApi } from '../../lib/api';

interface TimelineViewProps {
  organizationId: string;
  projectId: string;
}

const HEALTH_BAR_CLASS: Record<string, string> = {
  COMPLETED: 'bg-emerald-500',
  OVERDUE: 'bg-rose-500',
  AT_RISK: 'bg-amber-500',
  ON_TRACK: 'bg-gradient-to-r from-cyan-500 to-indigo-500',
  NO_DATE: 'bg-taskflow-muted/40',
};

const HEALTH_TEXT: Record<string, string> = {
  COMPLETED: 'text-emerald-400',
  OVERDUE: 'text-rose-400',
  AT_RISK: 'text-amber-400',
  ON_TRACK: 'text-cyan-400',
  NO_DATE: 'text-taskflow-muted',
};

function formatMonth(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}

function formatShort(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getMonthHeaders(
  start: Date,
  end: Date
): Array<{ label: string; left: number; width: number }> {
  const totalMs = end.getTime() - start.getTime() + 1;
  const headers: Array<{ label: string; left: number; width: number }> = [];

  const cur = new Date(start.getFullYear(), start.getMonth(), 1);
  while (cur <= end) {
    const monthStart = cur.getTime() < start.getTime() ? start : cur;
    const nextMonth = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
    const monthEnd = nextMonth > end ? end : new Date(nextMonth.getTime() - 1);
    const left = ((monthStart.getTime() - start.getTime()) / totalMs) * 100;
    const width = ((monthEnd.getTime() - monthStart.getTime() + 1) / totalMs) * 100;
    headers.push({ label: formatMonth(cur), left, width });
    cur.setMonth(cur.getMonth() + 1);
  }
  return headers;
}

function getMilestoneBar(
  ms: TimelineMilestone,
  rangeStart: Date,
  rangeEnd: Date
): { left: number; width: number } | null {
  if (!ms.startDate && !ms.dueDate) return null;

  const totalMs = rangeEnd.getTime() - rangeStart.getTime() + 1;
  const start = ms.startDate ? new Date(ms.startDate) : new Date(ms.dueDate!);
  const end = ms.dueDate ? new Date(ms.dueDate) : new Date(ms.startDate!);

  const clampedStart = Math.max(start.getTime(), rangeStart.getTime());
  const clampedEnd = Math.min(end.getTime(), rangeEnd.getTime());

  const left = ((clampedStart - rangeStart.getTime()) / totalMs) * 100;
  const width = Math.max(((clampedEnd - clampedStart) / totalMs) * 100, 1.5);

  return { left, width };
}

export const TimelineView: React.FC<TimelineViewProps> = ({ organizationId, projectId }) => {
  const [timeline, setTimeline] = useState<ProjectTimelineResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTimeline = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await milestoneApi.getTimeline(organizationId, projectId);
      setTimeline(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load timeline');
    } finally {
      setLoading(false);
    }
  }, [organizationId, projectId]);

  useEffect(() => {
    fetchTimeline();
  }, [fetchTimeline]);

  if (loading) {
    return (
      <div className="min-h-[300px] flex items-center justify-center">
        <div className="text-center space-y-3">
          <RefreshCw className="w-7 h-7 text-cyan-400 animate-spin mx-auto" />
          <p className="text-sm text-taskflow-muted">Loading timeline...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2"
        role="alert"
      >
        <AlertCircle className="w-4 h-4 flex-shrink-0" />
        <span>{error}</span>
      </div>
    );
  }

  if (!timeline || timeline.milestones.length === 0) {
    return (
      <div className="glass-panel rounded-2xl border border-taskflow-border p-12 text-center bg-taskflow-surface/30 space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-indigo-950/60 border border-indigo-800/60 text-indigo-400 flex items-center justify-center mx-auto">
          <Milestone className="w-7 h-7" aria-hidden="true" />
        </div>
        <div className="space-y-1">
          <h3 className="text-base font-bold text-white">No Timeline Data</h3>
          <p className="text-xs text-taskflow-muted max-w-sm mx-auto leading-relaxed">
            Create milestones with start or due dates to visualize them on the project timeline.
          </p>
        </div>
      </div>
    );
  }

  const rangeStart = new Date(timeline.rangeStart);
  const rangeEnd = new Date(timeline.rangeEnd);

  // Extend range 5% on each side for breathing room
  const totalRange = rangeEnd.getTime() - rangeStart.getTime();
  const padMs = Math.max(totalRange * 0.05, 7 * 24 * 60 * 60 * 1000); // at least 7 days
  const displayStart = new Date(rangeStart.getTime() - padMs);
  const displayEnd = new Date(rangeEnd.getTime() + padMs);
  const todayOffset =
    ((new Date().getTime() - displayStart.getTime()) /
      (displayEnd.getTime() - displayStart.getTime())) *
    100;

  const monthHeaders = getMonthHeaders(displayStart, displayEnd);

  // Split milestones: those with dates and those without
  const milestonesWithDates = timeline.milestones.filter(m => m.startDate || m.dueDate);
  const milestonesNoDates = timeline.milestones.filter(m => !m.startDate && !m.dueDate);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-white">Project Timeline</h2>
          <p className="text-xs text-taskflow-muted mt-0.5">
            {formatShort(timeline.rangeStart)} → {formatShort(timeline.rangeEnd)} ·{' '}
            {timeline.milestones.length} milestone{timeline.milestones.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={fetchTimeline}
          className="p-2 rounded-xl text-taskflow-muted hover:text-white hover:bg-taskflow-surface border border-taskflow-border transition-colors"
          aria-label="Refresh timeline"
          title="Refresh"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs text-taskflow-muted">
        {[
          { key: 'COMPLETED', label: 'Completed' },
          { key: 'OVERDUE', label: 'Overdue' },
          { key: 'AT_RISK', label: 'At Risk' },
          { key: 'ON_TRACK', label: 'On Track' },
        ].map(({ key, label }) => (
          <div key={key} className="flex items-center gap-1.5">
            <div className={`w-3 h-1.5 rounded-full ${HEALTH_BAR_CLASS[key]}`} aria-hidden="true" />
            <span>{label}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5">
          <div className="w-0.5 h-3 bg-cyan-400 rounded-full" aria-hidden="true" />
          <span>Today</span>
        </div>
      </div>

      {/* Gantt */}
      <div className="glass-panel rounded-2xl border border-taskflow-border bg-taskflow-surface overflow-hidden">
        {/* Month header row */}
        <div className="relative h-8 border-b border-taskflow-border/60 bg-taskflow-bg/50 ml-48">
          {monthHeaders.map((month, i) => (
            <div
              key={i}
              className="absolute top-0 h-full flex items-center px-2 text-[10px] font-semibold text-taskflow-muted border-r border-taskflow-border/30"
              style={{ left: `${month.left}%`, width: `${month.width}%` }}
            >
              <Calendar className="w-2.5 h-2.5 mr-1 flex-shrink-0" aria-hidden="true" />
              {month.label}
            </div>
          ))}
          {/* Today line header indicator */}
          {todayOffset >= 0 && todayOffset <= 100 && (
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-cyan-400/40"
              style={{ left: `${todayOffset}%` }}
              aria-label="Today"
            />
          )}
        </div>

        {/* Milestone rows */}
        <div className="divide-y divide-taskflow-border/20">
          {milestonesWithDates.map((ms, idx) => {
            const bar = getMilestoneBar(ms, displayStart, displayEnd);
            const barClass = HEALTH_BAR_CLASS[ms.health as string] ?? 'bg-taskflow-muted/40';
            const textClass = HEALTH_TEXT[ms.health as string] ?? 'text-taskflow-muted';

            return (
              <div
                key={ms.id}
                className={`flex items-center min-h-[52px] ${idx % 2 === 0 ? 'bg-taskflow-surface' : 'bg-taskflow-bg/30'}`}
              >
                {/* Left label */}
                <div className="w-48 flex-shrink-0 px-4 py-2 border-r border-taskflow-border/30">
                  <p className="text-xs font-semibold text-white truncate">{ms.title}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className={`text-[10px] font-semibold ${textClass}`}>
                      {ms.health.replace('_', ' ')}
                    </span>
                    <span className="text-taskflow-muted/40">·</span>
                    <span className="text-[10px] text-taskflow-muted">{ms.progress}%</span>
                  </div>
                </div>

                {/* Bar track */}
                <div className="flex-1 relative h-full py-3 px-2">
                  {/* Today line */}
                  {todayOffset >= 0 && todayOffset <= 100 && (
                    <div
                      className="absolute top-0 bottom-0 w-0.5 bg-cyan-400/50 z-10"
                      style={{ left: `${todayOffset}%` }}
                      aria-hidden="true"
                    />
                  )}

                  {bar && (
                    <div
                      className={`absolute h-6 top-1/2 -translate-y-1/2 rounded-lg ${barClass} opacity-90 hover:opacity-100 transition-opacity flex items-center px-2 overflow-hidden`}
                      style={{ left: `${bar.left}%`, width: `${bar.width}%`, minWidth: '24px' }}
                      title={`${ms.title}: ${formatShort(ms.startDate)} → ${formatShort(ms.dueDate)}`}
                      role="img"
                      aria-label={`${ms.title}, ${ms.health}, ${ms.progress}% complete, ${formatShort(ms.startDate)} to ${formatShort(ms.dueDate)}`}
                    >
                      {bar.width > 8 && (
                        <span className="text-[10px] font-bold text-white/90 truncate select-none">
                          {ms.progress}%
                        </span>
                      )}
                    </div>
                  )}

                  {/* Date labels */}
                  {bar && (
                    <div
                      className="absolute -bottom-0.5 text-[9px] text-taskflow-muted flex gap-1"
                      style={{ left: `${bar.left}%` }}
                    >
                      {ms.startDate && <span>{formatShort(ms.startDate)}</span>}
                      {ms.startDate && ms.dueDate && <span>→</span>}
                      {ms.dueDate && <span>{formatShort(ms.dueDate)}</span>}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* No-date milestones footer */}
        {milestonesNoDates.length > 0 && (
          <div className="border-t border-taskflow-border/40 p-4">
            <p className="text-[10px] uppercase font-bold text-taskflow-muted mb-2">
              No Date Set ({milestonesNoDates.length})
            </p>
            <div className="flex flex-wrap gap-2">
              {milestonesNoDates.map(ms => (
                <span
                  key={ms.id}
                  className="px-2.5 py-1 rounded-lg bg-taskflow-bg text-xs text-taskflow-muted border border-taskflow-border"
                >
                  {ms.title}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {timeline.milestones.slice(0, 3).map(ms => (
          <div
            key={ms.id}
            className="glass-panel rounded-xl border border-taskflow-border p-4 bg-taskflow-surface/40 space-y-2"
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs font-semibold text-white truncate">{ms.title}</p>
              <span
                className={`text-[10px] font-bold flex-shrink-0 ${HEALTH_TEXT[ms.health as string] ?? 'text-taskflow-muted'}`}
              >
                {ms.health.replace('_', ' ')}
              </span>
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-taskflow-muted">Progress</span>
                <span className="font-bold text-white">{ms.progress}%</span>
              </div>
              <div className="h-1 bg-taskflow-bg rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${HEALTH_BAR_CLASS[ms.health as string] ?? 'bg-taskflow-muted/40'}`}
                  style={{ width: `${ms.progress}%` }}
                />
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-taskflow-muted">
              <BarChart3 className="w-3 h-3" aria-hidden="true" />
              <span>
                {ms.completedTaskCount}/{ms.taskCount} tasks
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
