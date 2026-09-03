import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  HelpCircle,
  CheckCircle2,
  Clock,
  Ban,
  Activity,
  ArrowRight,
  RefreshCw,
  Plus,
  Settings,
  Flag,
  Zap,
  ChevronRight,
  TrendingUp,
  AlertCircle,
} from 'lucide-react';
import {
  ProjectDashboardResponse,
  ProjectHealthState,
  RiskSeverity,
  TaskStatus,
  TaskPriority,
  MilestoneHealth,
} from '@taskflow/shared';
import { projectApi } from '../../lib/api';

interface ProjectDashboardViewProps {
  organizationId: string;
  projectId: string;
  onOpenTask: (taskId: string) => void;
  onNavigateTab: (tab: 'tasks' | 'milestones' | 'dependencies' | 'activity' | 'settings') => void;
  onCreateTask?: () => void;
}

const STATUS_COLORS: Record<TaskStatus, { bg: string; text: string; bar: string }> = {
  BACKLOG: { bg: 'bg-slate-500/10', text: 'text-slate-400', bar: 'bg-slate-500' },
  TODO: { bg: 'bg-blue-500/10', text: 'text-blue-400', bar: 'bg-blue-500' },
  IN_PROGRESS: { bg: 'bg-amber-500/10', text: 'text-amber-400', bar: 'bg-amber-500' },
  IN_REVIEW: { bg: 'bg-purple-500/10', text: 'text-purple-400', bar: 'bg-purple-500' },
  BLOCKED: { bg: 'bg-rose-500/10', text: 'text-rose-400', bar: 'bg-rose-500' },
  DONE: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', bar: 'bg-emerald-500' },
  CANCELLED: { bg: 'bg-zinc-500/10', text: 'text-zinc-400', bar: 'bg-zinc-500' },
};

const PRIORITY_COLORS: Record<TaskPriority, { bg: string; text: string; bar: string }> = {
  URGENT: { bg: 'bg-rose-500/15', text: 'text-rose-400', bar: 'bg-rose-500' },
  HIGH: { bg: 'bg-amber-500/15', text: 'text-amber-400', bar: 'bg-amber-500' },
  MEDIUM: { bg: 'bg-blue-500/15', text: 'text-blue-400', bar: 'bg-blue-500' },
  LOW: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', bar: 'bg-emerald-500' },
  NONE: { bg: 'bg-slate-500/15', text: 'text-slate-400', bar: 'bg-slate-500' },
};

const SEVERITY_BADGES: Record<RiskSeverity, { bg: string; border: string; text: string }> = {
  CRITICAL: {
    bg: 'bg-rose-950/60',
    border: 'border-rose-500/40',
    text: 'text-rose-300',
  },
  HIGH: {
    bg: 'bg-amber-950/60',
    border: 'border-amber-500/40',
    text: 'text-amber-300',
  },
  MEDIUM: {
    bg: 'bg-blue-950/60',
    border: 'border-blue-500/40',
    text: 'text-blue-300',
  },
  LOW: {
    bg: 'bg-slate-900/60',
    border: 'border-slate-700/60',
    text: 'text-slate-300',
  },
};

const MILESTONE_HEALTH_BADGES: Record<MilestoneHealth, { bg: string; text: string }> = {
  COMPLETED: { bg: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30', text: 'Completed' },
  ON_TRACK: { bg: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30', text: 'On Track' },
  AT_RISK: { bg: 'bg-amber-500/15 text-amber-300 border-amber-500/30', text: 'At Risk' },
  OVERDUE: { bg: 'bg-rose-500/15 text-rose-300 border-rose-500/30', text: 'Overdue' },
  NO_DATE: { bg: 'bg-slate-500/15 text-slate-400 border-slate-500/30', text: 'No Date' },
};

export const ProjectDashboardView: React.FC<ProjectDashboardViewProps> = ({
  organizationId,
  projectId,
  onOpenTask,
  onNavigateTab,
  onCreateTask,
}) => {
  const [data, setData] = useState<ProjectDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = useCallback(
    async (isManualRefresh = false) => {
      if (isManualRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      try {
        const res = await projectApi.getDashboard(organizationId, projectId);
        setData(res);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to load project dashboard');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [organizationId, projectId]
  );

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse p-2">
        {/* Header Skeleton */}
        <div className="h-16 rounded-2xl bg-taskflow-surface/40 border border-taskflow-border" />
        {/* Health Skeleton */}
        <div className="h-44 rounded-2xl bg-taskflow-surface/40 border border-taskflow-border" />
        {/* Metrics Grid Skeleton */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div
              key={i}
              className="h-24 rounded-xl bg-taskflow-surface/30 border border-taskflow-border/50"
            />
          ))}
        </div>
        {/* Panels Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-64 rounded-2xl bg-taskflow-surface/30 border border-taskflow-border/50" />
          <div className="h-64 rounded-2xl bg-taskflow-surface/30 border border-taskflow-border/50" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 glass-panel rounded-2xl border border-rose-500/30 bg-rose-500/10 text-center space-y-3">
        <AlertCircle className="w-8 h-8 text-rose-400 mx-auto" />
        <h3 className="text-sm font-bold text-white">Failed to Load Dashboard</h3>
        <p className="text-xs text-rose-300 max-w-md mx-auto">
          {error || 'Unable to retrieve project analytics and health metrics.'}
        </p>
        <button
          onClick={() => fetchDashboard(true)}
          className="px-4 py-2 rounded-xl bg-taskflow-surface border border-taskflow-border text-xs text-white hover:border-cyan-500 transition-colors cursor-pointer"
        >
          Try Again
        </button>
      </div>
    );
  }

  const {
    project,
    health,
    metrics,
    taskDistribution,
    priorityDistribution,
    risks,
    overdueTasks,
    blockedTasks,
    milestones,
    recentActivity,
  } = data;

  const getHealthBadge = (state: ProjectHealthState) => {
    switch (state) {
      case 'HEALTHY':
        return {
          icon: <ShieldCheck className="w-5 h-5 text-emerald-400" />,
          label: 'Healthy Execution',
          bg: 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.2)]',
        };
      case 'AT_RISK':
        return {
          icon: <AlertTriangle className="w-5 h-5 text-amber-400" />,
          label: 'At Delivery Risk',
          bg: 'bg-amber-500/10 border-amber-500/40 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.2)]',
        };
      case 'CRITICAL':
        return {
          icon: <ShieldAlert className="w-5 h-5 text-rose-400" />,
          label: 'Critical Condition',
          bg: 'bg-rose-500/10 border-rose-500/40 text-rose-300 shadow-[0_0_15px_rgba(244,63,94,0.25)]',
        };
      case 'NO_DATA':
        return {
          icon: <HelpCircle className="w-5 h-5 text-slate-400" />,
          label: 'No Activity Data',
          bg: 'bg-slate-500/10 border-slate-500/40 text-slate-300',
        };
    }
  };

  const healthBadge = getHealthBadge(health.state);

  return (
    <div className="space-y-6">
      {/* 1. PROJECT HEADER BAR */}
      <div className="glass-panel rounded-2xl border border-taskflow-border p-5 bg-taskflow-surface flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5 min-w-0">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white text-base shadow-sm shrink-0"
            style={{ backgroundColor: project.color || '#06b6d4' }}
          >
            {project.key.slice(0, 2).toUpperCase()}
          </div>

          <div className="min-w-0">
            <div className="flex items-center space-x-2">
              <h2 className="text-base font-bold text-white truncate tracking-tight">
                {project.name}
              </h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-950/80 text-cyan-300 border border-cyan-800/60 shrink-0">
                {project.key}
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-taskflow-bg border border-taskflow-border text-taskflow-muted uppercase shrink-0">
                {project.status}
              </span>
            </div>

            {project.description && (
              <p className="text-xs text-taskflow-muted truncate mt-0.5 max-w-xl">
                {project.description}
              </p>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2 shrink-0 self-end sm:self-center">
          <button
            onClick={() => fetchDashboard(true)}
            disabled={refreshing}
            className="p-2 rounded-xl bg-taskflow-bg border border-taskflow-border hover:border-cyan-500/40 text-taskflow-muted hover:text-white transition-all cursor-pointer"
            title="Refresh Dashboard"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-cyan-400' : ''}`} />
          </button>

          {onCreateTask && (
            <button
              onClick={onCreateTask}
              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white shadow-glow-cyan flex items-center space-x-1.5 transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Task</span>
            </button>
          )}

          <button
            onClick={() => onNavigateTab('settings')}
            className="p-2 rounded-xl bg-taskflow-bg border border-taskflow-border hover:border-cyan-500/40 text-taskflow-muted hover:text-white transition-all cursor-pointer"
            title="Project Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. HEALTH & EXECUTIVE SUMMARY HERO */}
      <div className="glass-panel rounded-2xl border border-taskflow-border p-6 bg-gradient-to-br from-taskflow-surface via-taskflow-surface/90 to-taskflow-bg space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-taskflow-border/50">
          <div className="space-y-1.5">
            <div className="flex items-center space-x-3">
              <span className="text-xs uppercase font-bold tracking-wider text-taskflow-muted">
                Executive Health Assessment
              </span>
              <div
                className={`flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold border ${healthBadge.bg}`}
              >
                {healthBadge.icon}
                <span>{healthBadge.label}</span>
              </div>
            </div>

            <p className="text-sm font-medium text-white leading-relaxed max-w-2xl">
              {health.executiveSummary}
            </p>
          </div>

          {/* Health Score Gauge */}
          <div className="flex items-center space-x-4 bg-taskflow-bg/80 border border-taskflow-border/80 px-4 py-3 rounded-xl shrink-0">
            <div>
              <span className="text-[10px] uppercase font-bold text-taskflow-muted">
                Health Score
              </span>
              <div className="flex items-baseline space-x-1">
                <span className="text-2xl font-extrabold text-white font-mono">{health.score}</span>
                <span className="text-xs text-taskflow-muted font-mono">/ 100</span>
              </div>
            </div>

            <div className="w-20 bg-taskflow-surface h-2.5 rounded-full overflow-hidden border border-taskflow-border">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  health.score >= 80
                    ? 'bg-emerald-500'
                    : health.score >= 50
                      ? 'bg-amber-500'
                      : 'bg-rose-500'
                }`}
                style={{ width: `${health.score}%` }}
              />
            </div>
          </div>
        </div>

        {/* Signals & Reasons Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-1">
          {/* Signal Badges */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-taskflow-muted font-medium">Signals:</span>
            <span
              className={`px-2 py-0.5 rounded-lg border font-mono ${
                health.signals.overdueTasks > 0
                  ? 'bg-rose-500/10 text-rose-300 border-rose-500/30'
                  : 'bg-taskflow-bg text-taskflow-muted border-taskflow-border'
              }`}
            >
              {health.signals.overdueTasks} Overdue
            </span>
            <span
              className={`px-2 py-0.5 rounded-lg border font-mono ${
                health.signals.blockedTasks > 0
                  ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                  : 'bg-taskflow-bg text-taskflow-muted border-taskflow-border'
              }`}
            >
              {health.signals.blockedTasks} Blocked
            </span>
            <span
              className={`px-2 py-0.5 rounded-lg border font-mono ${
                health.signals.atRiskMilestones > 0
                  ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                  : 'bg-taskflow-bg text-taskflow-muted border-taskflow-border'
              }`}
            >
              {health.signals.atRiskMilestones} Milestones at Risk
            </span>
            <span className="px-2 py-0.5 rounded-lg border bg-cyan-500/10 text-cyan-300 border-cyan-500/30 font-mono">
              {metrics.completionPercentage}% Complete
            </span>
          </div>

          {/* Detailed Reasons */}
          <div className="space-y-1">
            {health.reasons.map((reason, idx) => (
              <div key={idx} className="flex items-center space-x-1.5 text-taskflow-muted">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0" />
                <span className="truncate">{reason}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 3. KEY METRICS GRID (6 KPI Cards) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total Tasks */}
        <div
          onClick={() => onNavigateTab('tasks')}
          className="glass-panel p-4 rounded-xl border border-taskflow-border hover:border-cyan-500/40 bg-taskflow-surface cursor-pointer transition-all group"
        >
          <div className="flex items-center justify-between text-taskflow-muted group-hover:text-cyan-400">
            <span className="text-[10px] uppercase font-bold">Total Tasks</span>
            <Zap className="w-3.5 h-3.5" />
          </div>
          <p className="text-xl font-bold text-white font-mono mt-1">{metrics.totalTasks}</p>
          <span className="text-[10px] text-taskflow-muted mt-0.5 block truncate">
            {metrics.completedMilestones} of {metrics.totalMilestones} milestones done
          </span>
        </div>

        {/* Completed */}
        <div
          onClick={() => onNavigateTab('tasks')}
          className="glass-panel p-4 rounded-xl border border-taskflow-border hover:border-emerald-500/40 bg-taskflow-surface cursor-pointer transition-all group"
        >
          <div className="flex items-center justify-between text-taskflow-muted group-hover:text-emerald-400">
            <span className="text-[10px] uppercase font-bold">Completed</span>
            <CheckCircle2 className="w-3.5 h-3.5" />
          </div>
          <p className="text-xl font-bold text-emerald-400 font-mono mt-1">
            {metrics.completedTasks}
          </p>
          <span className="text-[10px] text-taskflow-muted mt-0.5 block truncate">
            Verified DONE
          </span>
        </div>

        {/* In Progress */}
        <div
          onClick={() => onNavigateTab('tasks')}
          className="glass-panel p-4 rounded-xl border border-taskflow-border hover:border-blue-500/40 bg-taskflow-surface cursor-pointer transition-all group"
        >
          <div className="flex items-center justify-between text-taskflow-muted group-hover:text-blue-400">
            <span className="text-[10px] uppercase font-bold">In Flight</span>
            <Activity className="w-3.5 h-3.5" />
          </div>
          <p className="text-xl font-bold text-blue-400 font-mono mt-1">
            {metrics.inProgressTasks}
          </p>
          <span className="text-[10px] text-taskflow-muted mt-0.5 block truncate">
            In progress & review
          </span>
        </div>

        {/* Overdue */}
        <div
          onClick={() => onNavigateTab('tasks')}
          className={`glass-panel p-4 rounded-xl border transition-all cursor-pointer group ${
            metrics.overdueTasks > 0
              ? 'border-rose-500/40 bg-rose-950/20'
              : 'border-taskflow-border hover:border-cyan-500/40 bg-taskflow-surface'
          }`}
        >
          <div className="flex items-center justify-between text-taskflow-muted group-hover:text-rose-400">
            <span className="text-[10px] uppercase font-bold">Overdue</span>
            <Clock className="w-3.5 h-3.5" />
          </div>
          <p
            className={`text-xl font-bold font-mono mt-1 ${metrics.overdueTasks > 0 ? 'text-rose-400' : 'text-white'}`}
          >
            {metrics.overdueTasks}
          </p>
          <span className="text-[10px] text-taskflow-muted mt-0.5 block truncate">
            Past due deadline
          </span>
        </div>

        {/* Blocked */}
        <div
          onClick={() => onNavigateTab('dependencies')}
          className={`glass-panel p-4 rounded-xl border transition-all cursor-pointer group ${
            metrics.blockedTasks > 0
              ? 'border-amber-500/40 bg-amber-950/20'
              : 'border-taskflow-border hover:border-cyan-500/40 bg-taskflow-surface'
          }`}
        >
          <div className="flex items-center justify-between text-taskflow-muted group-hover:text-amber-400">
            <span className="text-[10px] uppercase font-bold">Blocked</span>
            <Ban className="w-3.5 h-3.5" />
          </div>
          <p
            className={`text-xl font-bold font-mono mt-1 ${metrics.blockedTasks > 0 ? 'text-amber-400' : 'text-white'}`}
          >
            {metrics.blockedTasks}
          </p>
          <span className="text-[10px] text-taskflow-muted mt-0.5 block truncate">
            Pending upstream work
          </span>
        </div>

        {/* Progress % */}
        <div
          onClick={() => onNavigateTab('tasks')}
          className="glass-panel p-4 rounded-xl border border-taskflow-border hover:border-cyan-500/40 bg-taskflow-surface cursor-pointer transition-all group"
        >
          <div className="flex items-center justify-between text-taskflow-muted group-hover:text-cyan-400">
            <span className="text-[10px] uppercase font-bold">Completion</span>
            <TrendingUp className="w-3.5 h-3.5" />
          </div>
          <p className="text-xl font-bold text-cyan-300 font-mono mt-1">
            {metrics.completionPercentage}%
          </p>
          <span className="text-[10px] text-taskflow-muted mt-0.5 block truncate">
            Excl. cancelled tasks
          </span>
        </div>
      </div>

      {/* 4. WORK DISTRIBUTIONS (Status & Priority) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Distribution */}
        <div className="glass-panel rounded-2xl border border-taskflow-border p-5 bg-taskflow-surface space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Task Status Distribution
            </h3>
            <span className="text-[10px] text-taskflow-muted font-mono">
              {metrics.totalTasks} total tasks
            </span>
          </div>

          {/* Stacked Horizontal Bar */}
          {metrics.totalTasks > 0 ? (
            <div className="w-full h-3 rounded-full overflow-hidden flex bg-taskflow-bg border border-taskflow-border">
              {(Object.keys(taskDistribution) as TaskStatus[]).map(status => {
                const count = taskDistribution[status];
                if (count === 0) return null;
                const pct = (count / metrics.totalTasks) * 100;
                return (
                  <div
                    key={status}
                    style={{ width: `${pct}%` }}
                    className={`h-full ${STATUS_COLORS[status].bar} transition-all duration-300`}
                    title={`${status}: ${count} (${Math.round(pct)}%)`}
                  />
                );
              })}
            </div>
          ) : (
            <div className="h-3 rounded-full bg-taskflow-bg border border-taskflow-border" />
          )}

          {/* Legend Badges */}
          <div className="flex flex-wrap gap-2 pt-1 text-xs">
            {(Object.keys(taskDistribution) as TaskStatus[]).map(status => {
              const count = taskDistribution[status];
              const conf = STATUS_COLORS[status];
              return (
                <div
                  key={status}
                  className={`px-2.5 py-1 rounded-lg border border-taskflow-border/60 ${conf.bg} flex items-center space-x-1.5`}
                >
                  <span className={`w-2 h-2 rounded-full ${conf.bar}`} />
                  <span className={`font-semibold ${conf.text}`}>{status}</span>
                  <span className="font-mono text-white font-bold ml-1">{count}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Priority Distribution */}
        <div className="glass-panel rounded-2xl border border-taskflow-border p-5 bg-taskflow-surface space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Task Priority Breakdown
            </h3>
            <span className="text-[10px] text-taskflow-muted font-mono">5 priority tiers</span>
          </div>

          {/* Stacked Horizontal Bar */}
          {metrics.totalTasks > 0 ? (
            <div className="w-full h-3 rounded-full overflow-hidden flex bg-taskflow-bg border border-taskflow-border">
              {(Object.keys(priorityDistribution) as TaskPriority[]).map(p => {
                const count = priorityDistribution[p];
                if (count === 0) return null;
                const pct = (count / metrics.totalTasks) * 100;
                return (
                  <div
                    key={p}
                    style={{ width: `${pct}%` }}
                    className={`h-full ${PRIORITY_COLORS[p].bar} transition-all duration-300`}
                    title={`${p}: ${count} (${Math.round(pct)}%)`}
                  />
                );
              })}
            </div>
          ) : (
            <div className="h-3 rounded-full bg-taskflow-bg border border-taskflow-border" />
          )}

          {/* Legend Badges */}
          <div className="flex flex-wrap gap-2 pt-1 text-xs">
            {(Object.keys(priorityDistribution) as TaskPriority[]).map(p => {
              const count = priorityDistribution[p];
              const conf = PRIORITY_COLORS[p];
              return (
                <div
                  key={p}
                  className={`px-2.5 py-1 rounded-lg border border-taskflow-border/60 ${conf.bg} flex items-center space-x-1.5`}
                >
                  <span className={`w-2 h-2 rounded-full ${conf.bar}`} />
                  <span className={`font-semibold ${conf.text}`}>{p}</span>
                  <span className="font-mono text-white font-bold ml-1">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 5. DELIVERY RISKS ENGINE PANEL */}
      <div className="glass-panel rounded-2xl border border-taskflow-border p-6 bg-taskflow-surface space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-bold text-white tracking-tight">
              Delivery Risks & Impediments
            </h3>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-taskflow-bg border border-taskflow-border text-taskflow-muted">
              {risks.length} active
            </span>
          </div>

          <span className="text-xs text-taskflow-muted">Deterministic Risk Engine</span>
        </div>

        {risks.length === 0 ? (
          <div className="p-8 text-center rounded-xl bg-taskflow-bg/50 border border-taskflow-border/50 text-xs text-taskflow-muted space-y-2">
            <CheckCircle2 className="w-6 h-6 text-emerald-400 mx-auto" />
            <p className="font-semibold text-white">No delivery risks detected</p>
            <p>All work is currently on schedule with zero blockers and healthy milestones.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {risks.map(risk => {
              const badge = SEVERITY_BADGES[risk.severity];
              return (
                <div
                  key={risk.id}
                  className={`p-3.5 rounded-xl border ${badge.border} ${badge.bg} flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all hover:bg-taskflow-surface/80`}
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <span
                        className={`text-[9px] font-mono font-extrabold uppercase px-2 py-0.5 rounded border ${badge.border} ${badge.text}`}
                      >
                        {risk.severity}
                      </span>
                      <p className="text-xs font-bold text-white truncate">{risk.title}</p>
                    </div>
                    <p className="text-[11px] text-taskflow-muted leading-relaxed">
                      {risk.explanation}
                    </p>
                  </div>

                  {/* Action Link */}
                  <button
                    onClick={() => {
                      if (risk.entityType === 'task' && risk.entityId) {
                        onOpenTask(risk.entityId);
                      } else if (risk.entityType === 'milestone') {
                        onNavigateTab('milestones');
                      } else if (risk.entityType === 'dependency') {
                        onNavigateTab('dependencies');
                      }
                    }}
                    className="self-start sm:self-center px-3 py-1.5 rounded-lg bg-taskflow-surface border border-taskflow-border hover:border-cyan-500/40 text-xs text-cyan-300 font-semibold flex items-center space-x-1.5 shrink-0 transition-all cursor-pointer"
                  >
                    <span>{risk.actionLabel}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 6. OVERDUE WORK & BLOCKED WORK GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Overdue Work Panel */}
        <div className="glass-panel rounded-2xl border border-taskflow-border p-5 bg-taskflow-surface space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-rose-400" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Overdue Work Items ({overdueTasks.length})
              </h3>
            </div>
            <button
              onClick={() => onNavigateTab('tasks')}
              className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center space-x-1 cursor-pointer"
            >
              <span>View all</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {overdueTasks.length === 0 ? (
            <div className="p-6 text-center text-xs text-taskflow-muted rounded-xl bg-taskflow-bg/40 border border-taskflow-border/40">
              Zero overdue tasks. All work is within scheduled deadlines.
            </div>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {overdueTasks.map(t => (
                <div
                  key={t.id}
                  onClick={() => onOpenTask(t.id)}
                  className="p-3 rounded-xl bg-taskflow-bg/60 hover:bg-taskflow-bg border border-taskflow-border/60 hover:border-cyan-500/40 flex items-center justify-between gap-3 cursor-pointer transition-all"
                >
                  <div className="min-w-0">
                    <div className="flex items-center space-x-2">
                      {t.issueKey && (
                        <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-800/60">
                          {t.issueKey}
                        </span>
                      )}
                      <p className="text-xs font-semibold text-white truncate">{t.title}</p>
                    </div>
                    <div className="flex items-center space-x-2 mt-1 text-[10px] text-taskflow-muted">
                      <span className="text-rose-400 font-medium">
                        Due {t.dueDate ? new Date(t.dueDate).toLocaleDateString() : 'N/A'}
                      </span>
                      {t.assignee && <span>• Assigned to {t.assignee.name}</span>}
                    </div>
                  </div>

                  <span
                    className={`text-[9px] uppercase font-mono px-1.5 py-0.5 rounded border ${PRIORITY_COLORS[t.priority].bg} ${PRIORITY_COLORS[t.priority].text} shrink-0`}
                  >
                    {t.priority}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Blocked Work Panel */}
        <div className="glass-panel rounded-2xl border border-taskflow-border p-5 bg-taskflow-surface space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Ban className="w-4 h-4 text-amber-400" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Blocked Work Queue ({blockedTasks.length})
              </h3>
            </div>
            <button
              onClick={() => onNavigateTab('dependencies')}
              className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center space-x-1 cursor-pointer"
            >
              <span>Dependency Graph</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {blockedTasks.length === 0 ? (
            <div className="p-6 text-center text-xs text-taskflow-muted rounded-xl bg-taskflow-bg/40 border border-taskflow-border/40">
              Zero blocked tasks. Downstream work is uninhibited.
            </div>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {blockedTasks.map(t => {
                const primaryBlocker = t.blockingDependencies[0];
                return (
                  <div
                    key={t.id}
                    onClick={() => onOpenTask(t.id)}
                    className="p-3 rounded-xl bg-taskflow-bg/60 hover:bg-taskflow-bg border border-taskflow-border/60 hover:border-cyan-500/40 flex items-center justify-between gap-3 cursor-pointer transition-all"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center space-x-2">
                        {t.issueKey && (
                          <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-800/60">
                            {t.issueKey}
                          </span>
                        )}
                        <p className="text-xs font-semibold text-white truncate">{t.title}</p>
                      </div>
                      {primaryBlocker && (
                        <p className="text-[10px] text-amber-400/90 mt-1 truncate">
                          Blocked by {primaryBlocker.issueKey || primaryBlocker.title} (
                          {primaryBlocker.status})
                        </p>
                      )}
                    </div>

                    <span
                      className={`text-[9px] uppercase font-mono px-1.5 py-0.5 rounded border ${STATUS_COLORS[t.status].bg} ${STATUS_COLORS[t.status].text} shrink-0`}
                    >
                      {t.status}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 7. MILESTONE HEALTH & RECENT ACTIVITY */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Milestone Health Summary */}
        <div className="glass-panel rounded-2xl border border-taskflow-border p-5 bg-taskflow-surface space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Flag className="w-4 h-4 text-emerald-400" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Milestone Health & Roadmaps
              </h3>
            </div>
            <button
              onClick={() => onNavigateTab('milestones')}
              className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center space-x-1 cursor-pointer"
            >
              <span>Timeline View</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {milestones.length === 0 ? (
            <div className="p-6 text-center text-xs text-taskflow-muted rounded-xl bg-taskflow-bg/40 border border-taskflow-border/40">
              No milestones defined yet. Create milestones in the Milestones tab.
            </div>
          ) : (
            <div className="space-y-2.5 max-h-72 overflow-y-auto">
              {milestones.map(ms => {
                const badge = MILESTONE_HEALTH_BADGES[ms.health];
                return (
                  <div
                    key={ms.id}
                    onClick={() => onNavigateTab('milestones')}
                    className="p-3.5 rounded-xl bg-taskflow-bg/60 hover:bg-taskflow-bg border border-taskflow-border/60 hover:border-cyan-500/40 space-y-2 cursor-pointer transition-all"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-bold text-white truncate">{ms.title}</p>
                      <span
                        className={`text-[9px] font-semibold px-2 py-0.5 rounded-full border ${badge.bg} shrink-0`}
                      >
                        {badge.text}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-taskflow-muted">
                      <span>
                        Due {ms.dueDate ? new Date(ms.dueDate).toLocaleDateString() : 'No date'}
                      </span>
                      <span>
                        {ms.completedTaskCount} / {ms.taskCount} tasks ({ms.progress}%)
                      </span>
                    </div>

                    <div className="w-full bg-taskflow-surface h-1.5 rounded-full overflow-hidden border border-taskflow-border/60">
                      <div
                        className="bg-cyan-500 h-full rounded-full transition-all duration-300"
                        style={{ width: `${ms.progress}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent Project Activity */}
        <div className="glass-panel rounded-2xl border border-taskflow-border p-5 bg-taskflow-surface space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Activity className="w-4 h-4 text-cyan-400" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Recent Project Activity
              </h3>
            </div>
            <button
              onClick={() => onNavigateTab('activity')}
              className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center space-x-1 cursor-pointer"
            >
              <span>Full Audit Stream</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {recentActivity.length === 0 ? (
            <div className="p-6 text-center text-xs text-taskflow-muted rounded-xl bg-taskflow-bg/40 border border-taskflow-border/40">
              No recent activity in this project.
            </div>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {recentActivity.slice(0, 7).map(act => (
                <div
                  key={act.id}
                  className="p-2.5 rounded-xl bg-taskflow-bg/40 border border-taskflow-border/40 flex items-start space-x-3 text-xs"
                >
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-cyan-500 to-indigo-600 flex items-center justify-center text-[10px] font-bold text-white shrink-0 mt-0.5 overflow-hidden">
                    {act.actor?.avatarUrl ? (
                      <img
                        src={act.actor.avatarUrl}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      act.actor?.name?.charAt(0) || 'U'
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-white text-[11px] leading-snug">
                      <span className="font-semibold">{act.actor?.name || 'A team member'}</span>{' '}
                      <span className="text-taskflow-muted">
                        {act.actionType.replace(/_/g, ' ').toLowerCase()}
                      </span>{' '}
                      {act.task && (
                        <span
                          onClick={() => onOpenTask(act.task!.id)}
                          className="font-semibold text-cyan-300 hover:underline cursor-pointer"
                        >
                          {act.task.issueKey || act.task.title}
                        </span>
                      )}
                    </p>
                    <span className="text-[9px] text-taskflow-muted font-mono mt-0.5 block">
                      {new Date(act.createdAt).toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
