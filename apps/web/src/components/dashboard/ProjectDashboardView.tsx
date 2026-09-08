import React, { useState, useEffect, useCallback } from 'react';
import {
 CheckCircle2,
 Clock,
 Ban,
 ArrowRight,
 RefreshCw,
 Plus,
 Settings,
 Flag,
 Zap,
 ChevronRight,
 AlertCircle,
 Sparkles,
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
import { AIProjectIntelligence } from './AIProjectIntelligence';
import { useCardTilt } from '../../hooks/useCardTilt';

interface ProjectDashboardViewProps {
 organizationId: string;
 projectId: string;
 onOpenTask: (taskId: string) => void;
 onNavigateTab: (tab: 'tasks' | 'milestones' | 'dependencies' | 'activity' | 'settings') => void;
 onCreateTask?: () => void;
}

const STATUS_CONFIG: Record<TaskStatus, { label: string; color: string; bar: string }> = {
 BACKLOG: { label: 'Backlog', color: 'text-slate-400', bar: 'bg-slate-500' },
 TODO: { label: 'To Do', color: 'text-blue-400', bar: 'bg-blue-500' },
 IN_PROGRESS: { label: 'In Progress', color: 'text-amber-400', bar: 'bg-amber-400' },
 IN_REVIEW: { label: 'In Review', color: 'text-taskflow-text', bar: 'bg-violet-500' },
 BLOCKED: { label: 'Blocked', color: 'text-rose-400', bar: 'bg-rose-500' },
 DONE: { label: 'Done', color: 'text-emerald-400', bar: 'bg-emerald-500' },
 CANCELLED: { label: 'Cancelled', color: 'text-zinc-500', bar: 'bg-zinc-600' },
};

const PRIORITY_CONFIG: Record<TaskPriority, { bg: string; text: string }> = {
 URGENT: { bg: 'bg-rose-500/10', text: 'text-rose-400' },
 HIGH: { bg: 'bg-amber-500/10', text: 'text-amber-400' },
 MEDIUM: { bg: 'bg-blue-500/10', text: 'text-blue-400' },
 LOW: { bg: 'bg-emerald-500/10', text: 'text-emerald-400' },
 NONE: { bg: 'bg-slate-800', text: 'text-slate-500' },
};

const RISK_SEVERITY: Record<RiskSeverity, { dot: string; label: string; text: string }> = {
 CRITICAL: { dot: 'bg-rose-500', label: 'Critical', text: 'text-rose-400' },
 HIGH: { dot: 'bg-amber-500', label: 'High', text: 'text-amber-400' },
 MEDIUM: { dot: 'bg-blue-500', label: 'Medium', text: 'text-blue-400' },
 LOW: { dot: 'bg-slate-500', label: 'Low', text: 'text-slate-400' },
};

const MILESTONE_HEALTH_CONFIG: Record<
 MilestoneHealth,
 { dot: string; label: string; bar: string }
> = {
 COMPLETED: { dot: 'bg-emerald-500', label: 'Completed', bar: 'bg-emerald-500' },
 ON_TRACK: { dot: 'bg-sky-500', label: 'On Track', bar: 'bg-sky-500' },
 AT_RISK: { dot: 'bg-amber-500', label: 'At Risk', bar: 'bg-amber-400' },
 OVERDUE: { dot: 'bg-rose-500', label: 'Overdue', bar: 'bg-rose-500' },
 NO_DATE: { dot: 'bg-slate-600', label: 'No Date', bar: 'bg-slate-600' },
};

// ─── Health ring SVG ─────────────────────────────────────────────────────────
const HealthRing: React.FC<{ score: number; state: ProjectHealthState }> = ({ score, state }) => {
 const r = 44;
 const circ = 2 * Math.PI * r;
 const dashOffset = circ - (score / 100) * circ;
 const color =
  state === 'HEALTHY'
   ? '#34d399'
   : state === 'AT_RISK'
    ? '#fbbf24'
    : state === 'CRITICAL'
     ? '#f87171'
     : '#64748b';

 return (
  <svg width="120" height="120" className="shrink-0 -rotate-90">
   <circle cx="60" cy="60" r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
   <circle
    cx="60"
    cy="60"
    r={r}
    fill="none"
    stroke={color}
    strokeWidth="8"
    strokeDasharray={circ}
    strokeDashoffset={dashOffset}
    strokeLinecap="round"
    style={{ transition: 'stroke-dashoffset 1s cubic-bezier(0.4,0,0.2,1)' }}
   />
   <g transform="rotate(90, 60, 60)">
    <text
     x="60"
     y="54"
     textAnchor="middle"
     fill="white"
     fontSize="22"
     fontWeight="800"
     fontFamily="inherit"
    >
     {score}
    </text>
    <text
     x="60"
     y="70"
     textAnchor="middle"
     fill={color}
     fontSize="10"
     fontWeight="600"
     fontFamily="inherit"
    >
     / 100
    </text>
   </g>
  </svg>
 );
};

// ─── Skeleton ─────────────────────────────────────────────────────────────────
const LoadingSkeleton: React.FC = () => (
 <div className="space-y-16 py-2 animate-pulse">
  {/* Hero skeleton */}
  <div className="space-y-3 pt-4">
   <div className="h-3 w-24 bg-white/[0.06] rounded-full" />
   <div className="h-10 w-2/3 bg-white/[0.08] rounded-md" />
   <div className="h-4 w-1/2 bg-white/[0.05] rounded-lg" />
  </div>
  {/* Health skeleton */}
  <div className="flex gap-8 items-center">
   <div className="w-28 h-28 rounded-full bg-white/[0.06]" />
   <div className="flex-1 space-y-3">
    <div className="h-3 w-16 bg-white/[0.06] rounded" />
    <div className="h-6 w-3/4 bg-white/[0.08] rounded-lg" />
    <div className="h-4 w-full bg-white/[0.05] rounded" />
    <div className="h-4 w-5/6 bg-white/[0.05] rounded" />
   </div>
  </div>
  {/* Bar skeleton */}
  <div className="h-4 w-full bg-white/[0.06] rounded-full" />
  {/* AI skeleton */}
  <div className="h-40 w-full bg-white/[0.04] rounded-lg" />
 </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────
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

 const tiltRef = useCardTilt(2);

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

 if (loading) return <LoadingSkeleton />;

 if (error || !data) {
  return (
   <div className="py-20 flex flex-col items-center text-center gap-4">
    <AlertCircle className="w-8 h-8 text-rose-400" />
    <div>
     <p className="text-white font-semibold mb-1">Failed to load overview</p>
     <p className="text-sm text-slate-500 max-w-sm">
      {error || 'Unable to retrieve project data.'}
     </p>
    </div>
    <button
     onClick={() => fetchDashboard(true)}
     className="px-4 py-2 rounded-md bg-white/[0.06] border border-white/[0.09] text-sm text-white hover:bg-white/[0.09] transition-colors cursor-pointer"
    >
     Try again
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

 const healthLabel =
  health.state === 'HEALTHY'
   ? 'Healthy'
   : health.state === 'AT_RISK'
    ? 'At Risk'
    : health.state === 'CRITICAL'
     ? 'Critical'
     : 'No Data';

 const healthColor =
  health.state === 'HEALTHY'
   ? 'text-emerald-400'
   : health.state === 'AT_RISK'
    ? 'text-amber-400'
    : health.state === 'CRITICAL'
     ? 'text-rose-400'
     : 'text-slate-500';

 const totalTasks = metrics.totalTasks;
 const attentionItems = [
  ...risks.map(r => ({
   id: `risk-${r.id}`,
   severity: r.severity,
   title: r.title,
   detail: r.explanation,
   action: r.actionLabel,
   onClick: () => {
    if (r.entityType === 'task' && r.entityId) onOpenTask(r.entityId);
    else if (r.entityType === 'milestone') onNavigateTab('milestones');
    else onNavigateTab('dependencies');
   },
  })),
  ...overdueTasks
   .slice(0, 3)
   .map(t => ({
    id: `overdue-${t.id}`,
    severity: 'HIGH' as RiskSeverity,
    title: t.title,
    detail: `Due ${t.dueDate ? new Date(t.dueDate).toLocaleDateString() : 'N/A'}${t.assignee ? ` · ${t.assignee.name}` : ''}`,
    action: 'View task',
    onClick: () => onOpenTask(t.id),
   })),
  ...blockedTasks
   .slice(0, 3)
   .map(t => ({
    id: `blocked-${t.id}`,
    severity: 'MEDIUM' as RiskSeverity,
    title: t.title,
    detail: t.blockingDependencies[0]
     ? `Blocked by ${t.blockingDependencies[0].issueKey || t.blockingDependencies[0].title}`
     : 'Dependency blocked',
    action: 'View dependencies',
    onClick: () => onNavigateTab('dependencies'),
   })),
 ];

 return (
  <div className="space-y-0">
   {/* ═══════════════════════════════════════════════════════════
     SECTION 1 — PROJECT HERO
   ═══════════════════════════════════════════════════════════ */}
   <section ref={tiltRef} className="py-10 sm:py-14 transition-transform duration-200 ease-out" style={{ transformStyle: 'preserve-3d' }}>
    {/* Eyebrow */}
    <div className="flex items-center gap-3 mb-4">
     <div
      className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-white text-xs shrink-0 shadow-sm"
      style={{ backgroundColor: project.color || '#0284c7' }}
     >
      {project.key.slice(0, 2).toUpperCase()}
     </div>
     <span className="text-xs text-slate-500 font-mono font-medium tracking-widest uppercase">
      {project.key}
     </span>
     <span className="text-slate-700">·</span>
     <span className={`text-xs font-semibold ${healthColor}`}>{healthLabel}</span>
     <span className="text-slate-700">·</span>
     <span className="text-xs text-slate-500 capitalize">{project.status.toLowerCase()}</span>
    </div>

    {/* Project name */}
    <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-[1.1] mb-4">
     {project.name}
    </h1>

    {/* Description */}
    {project.description && (
     <p className="text-base text-slate-400 leading-relaxed max-w-2xl mb-8">
      {project.description}
     </p>
    )}

    {/* Actions */}
    <div className="flex flex-wrap items-center gap-3">
     {onCreateTask && (
      <button
       onClick={onCreateTask}
       className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md bg-sky-500 hover:bg-sky-400 text-white text-sm font-semibold shadow-lg shadow-sky-500/20 hover:shadow-sky-500/35 transition-all duration-200 hover:-translate-y-0.5 active:scale-95 cursor-pointer"
      >
       <Plus className="w-4 h-4" />
       New Task
      </button>
     )}
     <button
      onClick={() => fetchDashboard(true)}
      disabled={refreshing}
      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md bg-white/[0.05] hover:bg-white/[0.08] border border-white/[0.08] text-sm text-slate-300 hover:text-white transition-all duration-200 hover:-translate-y-0.5 cursor-pointer"
     >
      <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-sky-400' : ''}`} />
      {refreshing ? 'Refreshing…' : 'Refresh'}
     </button>
     <button
      onClick={() => onNavigateTab('settings')}
      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.07] text-sm text-slate-400 hover:text-white transition-all duration-200 cursor-pointer"
     >
      <Settings className="w-4 h-4" />
      Settings
     </button>
    </div>
   </section>

   {/* Divider */}
   <div className="h-px bg-taskflow-surface from-transparent via-white/[0.08] to-transparent" />

   {/* ═══════════════════════════════════════════════════════════
     SECTION 2 — PROJECT HEALTH
   ═══════════════════════════════════════════════════════════ */}
   <section className="py-14 sm:py-16">
    <div className="text-xs text-slate-600 uppercase tracking-widest font-semibold mb-8">
     Project Health
    </div>

    <div className="flex flex-col sm:flex-row gap-8 sm:gap-12 items-start sm:items-center">
     {/* Score ring */}
     <HealthRing score={health.score} state={health.state} />

     {/* Summary */}
     <div className="flex-1 min-w-0">
      <div className={`text-xl font-bold mb-1 ${healthColor}`}>{healthLabel}</div>
      <p className="text-base sm:text-lg text-slate-200 leading-relaxed mb-6 max-w-2xl">
       {health.executiveSummary}
      </p>

      {/* Signal strip — no borders, just chips */}
      <div className="flex flex-wrap gap-2">
       {health.signals.overdueTasks > 0 && (
        <span
         onClick={() => onNavigateTab('tasks')}
         className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-500/10 text-rose-300 text-xs font-medium cursor-pointer hover:bg-rose-500/20 transition-colors"
        >
         <Clock className="w-3 h-3" />
         {health.signals.overdueTasks} overdue
        </span>
       )}
       {health.signals.blockedTasks > 0 && (
        <span
         onClick={() => onNavigateTab('dependencies')}
         className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/10 text-amber-300 text-xs font-medium cursor-pointer hover:bg-amber-500/20 transition-colors"
        >
         <Ban className="w-3 h-3" />
         {health.signals.blockedTasks} blocked
        </span>
       )}
       {health.signals.atRiskMilestones > 0 && (
        <span
         onClick={() => onNavigateTab('milestones')}
         className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/10 text-amber-300 text-xs font-medium cursor-pointer hover:bg-amber-500/20 transition-colors"
        >
         <Flag className="w-3 h-3" />
         {health.signals.atRiskMilestones} milestone
         {health.signals.atRiskMilestones !== 1 ? 's' : ''} at risk
        </span>
       )}
       <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-sky-500/10 text-sky-300 text-xs font-medium">
        <CheckCircle2 className="w-3 h-3" />
        {metrics.completionPercentage}% complete
       </span>
      </div>

      {/* Reasons */}
      {health.reasons.length > 0 && (
       <div className="mt-4 space-y-1.5">
        {health.reasons.map((r, i) => (
         <div key={i} className="flex items-start gap-2 text-sm text-slate-400">
          <span className="w-1 h-1 rounded-full bg-slate-600 mt-2 shrink-0" />
          {r}
         </div>
        ))}
       </div>
      )}
     </div>
    </div>
   </section>

   {/* Divider */}
   <div className="h-px bg-taskflow-surface from-transparent via-white/[0.08] to-transparent" />

   {/* ═══════════════════════════════════════════════════════════
     SECTION 3 — ANALYTICS & VISUAL CHARTS
   ═══════════════════════════════════════════════════════════ */}
   <section className="py-14 sm:py-16">
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
     <div>
      <div className="text-xs text-sky-400 uppercase tracking-widest font-semibold mb-1">
       Analytics & Pulse
      </div>
      <h2 className="text-2xl font-extrabold text-white tracking-tight">
       Task Distribution & Velocity
      </h2>
     </div>
     <button
      onClick={() => onNavigateTab('tasks')}
      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs text-slate-300 hover:text-white transition-all cursor-pointer self-start sm:self-auto"
     >
      View all tasks <ChevronRight className="w-3.5 h-3.5" />
     </button>
    </div>

    {/* 4 Key Metric Cards */}
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
     {[
      {
       label: 'Total Tasks',
       value: metrics.totalTasks,
       badge: `${metrics.completionPercentage}% Done`,
       border: 'border-[#222630]',
       text: 'text-white',
       badgeBg: 'bg-[#1e222d] text-slate-300 border border-[#2a2f3d]',
      },
      {
       label: 'In Progress',
       value: metrics.inProgressTasks,
       badge: 'Active Work',
       border: 'border-amber-500/20',
       text: 'text-amber-400',
       badgeBg: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
      },
      {
       label: 'Completed',
       value: metrics.completedTasks,
       badge: 'Shipped',
       border: 'border-emerald-500/20',
       text: 'text-emerald-400',
       badgeBg: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
      },
      {
       label: 'Blocked',
       value: metrics.blockedTasks,
       badge: metrics.blockedTasks > 0 ? 'Needs Attention' : 'Clear',
       border: metrics.blockedTasks > 0 ? 'border-rose-500/30' : 'border-[#222630]',
       text: metrics.blockedTasks > 0 ? 'text-rose-400' : 'text-slate-300',
       badgeBg:
        metrics.blockedTasks > 0
         ? 'bg-rose-500/15 text-rose-400 border border-rose-500/20'
         : 'bg-[#1e222d] text-slate-400 border border-[#2a2f3d]',
      },
     ].map(({ label, value, badge, border, text, badgeBg }) => (
      <div
       key={label}
       onClick={() => onNavigateTab('tasks')}
       className={`p-5 rounded-lg bg-[#161920] border ${border} hover:border-[#363c4c] transition-all duration-180 hover:-translate-y-0.5 cursor-pointer group shadow-elevation-1`}
      >
       <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-slate-400 font-medium">{label}</span>
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${badgeBg}`}>
         {badge}
        </span>
       </div>
       <div
        className={`text-3xl sm:text-4xl font-black tracking-tight ${text} group-hover:scale-105 transition-transform font-display`}
       >
        {value}
       </div>
      </div>
     ))}
    </div>

    {/* Dynamic Visual Graphs Grid */}
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
     {/* Graph 1: Interactive Status Donut Chart & Breakdown */}
     <div className="lg:col-span-7 p-6 rounded-lg bg-[#161920] border border-[#222630] flex flex-col justify-between shadow-elevation-1">
      <div className="flex items-center justify-between mb-6">
       <div>
        <h3 className="text-sm font-bold text-white mb-0.5">Task Status Breakdown</h3>
        <p className="text-xs text-slate-400">
         Proportional state distribution across workspace
        </p>
       </div>
       <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-[#1e222d] text-slate-300 border border-[#2a2f3d]">
        {totalTasks} Total
       </span>
      </div>

      {totalTasks > 0 ? (
       <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 items-center">
        {/* SVG Donut */}
        <div className="sm:col-span-5 flex justify-center py-2 relative">
         <svg
          width="180"
          height="180"
          viewBox="0 0 180 180"
          className="transform -rotate-90"
         >
          {(() => {
           const cx = 90,
            cy = 90,
            r = 70;
           const circ = 2 * Math.PI * r;
           let accumulatedOffset = 0;
           const colors: Record<TaskStatus, string> = {
            DONE: '#10b981',
            IN_PROGRESS: '#f59e0b',
            TODO: '#e05638',
            IN_REVIEW: '#8b5cf6',
            BLOCKED: '#e11d48',
            BACKLOG: '#64748b',
            CANCELLED: '#475569',
           };

           return (Object.keys(taskDistribution) as TaskStatus[]).map(status => {
            const count = taskDistribution[status];
            if (count === 0) return null;
            const pct = count / totalTasks;
            const strokeDasharray = `${pct * circ} ${circ}`;
            const strokeDashoffset = -accumulatedOffset;
            accumulatedOffset += pct * circ;

            return (
             <circle
              key={status}
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke={colors[status] || '#94a3b8'}
              strokeWidth="18"
              strokeDasharray={strokeDasharray}
              strokeDashoffset={strokeDashoffset}
              className="transition-all duration-700 hover:opacity-85 cursor-pointer"
             >
              <title>{`${STATUS_CONFIG[status].label}: ${count} (${Math.round(pct * 100)}%)`}</title>
             </circle>
            );
           });
          })()}
         </svg>
         {/* Donut Center text */}
         <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-3xl font-black text-white font-display">
           {metrics.completionPercentage}%
          </span>
          <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
           Completed
          </span>
         </div>
        </div>

        {/* Status Legend Grid */}
        <div className="sm:col-span-7 space-y-2.5">
         {(Object.keys(taskDistribution) as TaskStatus[]).map(status => {
          const count = taskDistribution[status];
          if (count === 0) return null;
          const conf = STATUS_CONFIG[status];
          const pct = Math.round((count / totalTasks) * 100);
          return (
           <div
            key={status}
            className="p-2.5 rounded-md bg-[#12141a] hover:bg-[#1c202a] border border-[#222630] flex items-center justify-between transition-colors"
           >
            <div className="flex items-center gap-2.5 min-w-0">
             <span className={`w-2.5 h-2.5 rounded-full ${conf.bar} shrink-0`} />
             <span className="text-xs font-medium text-slate-200 truncate">
              {conf.label}
             </span>
            </div>
            <div className="flex items-center gap-3 shrink-0">
             <span className="text-xs font-bold text-white">{count}</span>
             <div className="w-12 h-1.5 rounded-full bg-[#222630] overflow-hidden">
              <div className={`h-full ${conf.bar}`} style={{ width: `${pct}%` }} />
             </div>
             <span className="text-[11px] font-mono text-slate-400 w-8 text-right">
              {pct}%
             </span>
            </div>
           </div>
          );
         })}
        </div>
       </div>
      ) : (
       <div className="py-12 text-center text-sm text-slate-500">
        No tasks registered yet
       </div>
      )}
     </div>

     {/* Graph 2: Priority Distribution Bar Graph */}
     <div className="lg:col-span-5 p-6 rounded-lg bg-[#161920] border border-[#222630] flex flex-col justify-between shadow-elevation-1">
      <div>
       <div className="flex items-center justify-between mb-6">
        <div>
         <h3 className="text-sm font-bold text-white mb-0.5">Priority Distribution</h3>
         <p className="text-xs text-slate-400">Risk & urgency allocation</p>
        </div>
        <Zap className="w-4 h-4 text-[#e05638]" />
       </div>

       {totalTasks > 0 ? (
        <div className="space-y-4">
         {(Object.keys(priorityDistribution) as TaskPriority[]).map(p => {
          const count = priorityDistribution[p];
          if (count === 0) return null;
          const conf = PRIORITY_CONFIG[p];
          const pct = Math.round((count / totalTasks) * 100);
          const solidBars: Record<TaskPriority, string> = {
           URGENT: 'bg-[#e11d48]',
           HIGH: 'bg-[#d97706]',
           MEDIUM: 'bg-[#e05638]',
           LOW: 'bg-[#10b981]',
           NONE: 'bg-[#475569]',
          };

          return (
           <div key={p} className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
             <span className={`font-semibold capitalize ${conf.text}`}>
              {p.toLowerCase()}
             </span>
             <span className="text-slate-400 font-mono">
              {count} task{count !== 1 ? 's' : ''} ({pct}%)
             </span>
            </div>
            <div className="w-full h-2.5 rounded-full bg-[#12141a] overflow-hidden p-0.5 border border-[#222630]">
             <div
              className={`h-full rounded-full ${solidBars[p]} transition-all duration-700`}
              style={{ width: `${pct}%` }}
             />
            </div>
           </div>
          );
         })}
        </div>
       ) : (
        <div className="py-12 text-center text-sm text-slate-500">
         No priority data available
        </div>
       )}
      </div>

      {/* Bottom summary pill */}
      <div className="mt-6 pt-4 border-t border-[#222630] flex items-center justify-between text-xs text-slate-400">
       <span>Urgent/High Risk:</span>
       <span className="font-semibold text-amber-400">
        {(priorityDistribution['URGENT'] || 0) + (priorityDistribution['HIGH'] || 0)} Tasks
       </span>
      </div>
     </div>

     {/* Graph 3: Project Activity & Completion Trend Graph */}
     <div className="lg:col-span-12 p-6 rounded-lg bg-[#161920] border border-[#222630] shadow-elevation-1">
      <div className="flex items-center justify-between mb-6">
       <div>
        <h3 className="text-sm font-bold text-white mb-0.5">
         Project Velocity & Activity Trend
        </h3>
        <p className="text-xs text-slate-400">
         Completion trajectory and operational momentum
        </p>
       </div>
       <div className="flex items-center gap-2 text-xs">
        <span className="flex items-center gap-1.5 text-[#e05638] font-medium">
         <span className="w-2 h-2 rounded-full bg-[#e05638] animate-pulse" /> Operational Pulse
        </span>
       </div>
      </div>

      {/* SVG Area Chart */}
      <div className="relative w-full h-44">
       <svg className="w-full h-full" viewBox="0 0 600 160" preserveAspectRatio="none">
        <defs>
         <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#e05638" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#e05638" stopOpacity="0.0" />
         </linearGradient>
         <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#e05638" />
          <stop offset="50%" stopColor="#d97706" />
          <stop offset="100%" stopColor="#10b981" />
         </linearGradient>
        </defs>

        {/* Horizontal Grid lines */}
        <line
         x1="0"
         y1="20"
         x2="600"
         y2="20"
         stroke="rgba(255,255,255,0.04)"
         strokeDasharray="4 4"
        />
        <line
         x1="0"
         y1="60"
         x2="600"
         y2="60"
         stroke="rgba(255,255,255,0.04)"
         strokeDasharray="4 4"
        />
        <line
         x1="0"
         y1="100"
         x2="600"
         y2="100"
         stroke="rgba(255,255,255,0.04)"
         strokeDasharray="4 4"
        />
        <line x1="0" y1="140" x2="600" y2="140" stroke="#222630" />

        {/* Dynamic Trend Area Fill */}
        <path
         d="M 0 120 Q 100 90, 200 100 T 400 40 T 600 25 L 600 140 L 0 140 Z"
         fill="url(#areaGradient)"
        />

        {/* Curved Trend Line */}
        <path
         d="M 0 120 Q 100 90, 200 100 T 400 40 T 600 25"
         fill="none"
         stroke="url(#lineGradient)"
         strokeWidth="3.5"
         strokeLinecap="round"
        />

        {/* Interactive Data Points */}
        {[
         { x: 0, y: 120, label: 'Week 1', val: '2 done' },
         { x: 150, y: 95, label: 'Week 2', val: '4 done' },
         { x: 300, y: 70, label: 'Week 3', val: '6 done' },
         { x: 450, y: 35, label: 'Week 4', val: '9 done' },
         { x: 600, y: 25, label: 'Current', val: `${metrics.completedTasks} completed` },
        ].map((pt, i) => (
         <g key={i} className="group cursor-pointer">
          <circle
           cx={pt.x}
           cy={pt.y}
           r="5"
           fill="#12141a"
           stroke="#e05638"
           strokeWidth="2.5"
           className="group-hover:r-7 transition-all"
          />
         </g>
        ))}
       </svg>
      </div>

      {/* Timeline X-Axis Labels */}
      <div className="flex justify-between items-center mt-2 text-[11px] text-slate-500 font-mono">
       <span>Week 1</span>
       <span>Week 2</span>
       <span>Week 3</span>
       <span>Week 4</span>
       <span className="text-emerald-400 font-bold">Current Target</span>
      </div>
     </div>
    </div>
   </section>

   {/* Divider */}
   <div className="h-px bg-taskflow-surface from-transparent via-white/[0.08] to-transparent" />

   {/* ═══════════════════════════════════════════════════════════
     SECTION 4 — AI INTELLIGENCE (premium full-width section)
   ═══════════════════════════════════════════════════════════ */}
   <section className="py-14 sm:py-16">
    <div className="flex items-center gap-3 mb-2">
     <div className="w-7 h-7 rounded-lg bg-taskflow-elevated flex items-center justify-center">
      <Sparkles className="w-3.5 h-3.5 text-taskflow-text" />
     </div>
     <div className="text-xs text-slate-600 uppercase tracking-widest font-semibold">
      AI Intelligence
     </div>
    </div>
    <div className="flex items-end justify-between gap-4 mb-8">
     <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
      Project Analysis &amp; Recommendations
     </h2>
     <Zap className="w-5 h-5 text-taskflow-text shrink-0 mb-1 hidden sm:block" />
    </div>

    <AIProjectIntelligence
     organizationId={organizationId}
     projectId={projectId}
     totalTasks={metrics.totalTasks}
     onNavigateTab={onNavigateTab}
    />
   </section>

   {/* Divider */}
   <div className="h-px bg-taskflow-surface from-transparent via-white/[0.08] to-transparent" />

   {/* ═══════════════════════════════════════════════════════════
     SECTION 5 — ATTENTION REQUIRED
   ═══════════════════════════════════════════════════════════ */}
   {attentionItems.length > 0 && (
    <>
     <section className="py-14 sm:py-16">
      <div className="text-xs text-slate-600 uppercase tracking-widest font-semibold mb-2">
       Attention Required
      </div>
      <div className="flex items-end justify-between gap-4 mb-8">
       <h2 className="text-2xl font-bold text-white">
        {attentionItems.length} item{attentionItems.length !== 1 ? 's' : ''} need your focus
       </h2>
      </div>

      <div className="space-y-0">
       {attentionItems.map((item, i) => {
        const sev = RISK_SEVERITY[item.severity] || RISK_SEVERITY.LOW;
        return (
         <div
          key={item.id}
          className={`flex items-start gap-5 py-5 group ${i < attentionItems.length - 1 ? 'border-b border-white/[0.05]' : ''}`}
         >
          {/* Severity indicator */}
          <div className="flex flex-col items-center gap-1.5 pt-0.5 shrink-0">
           <div className={`w-2 h-2 rounded-full ${sev.dot}`} />
          </div>

          <div className="flex-1 min-w-0">
           <div className="flex items-start justify-between gap-4">
            <div>
             <span
              className={`text-[11px] font-semibold uppercase tracking-wider ${sev.text} mr-2`}
             >
              {sev.label}
             </span>
             <span className="text-sm font-medium text-white">{item.title}</span>
             <p className="text-sm text-slate-500 mt-0.5 leading-relaxed">
              {item.detail}
             </p>
            </div>
            <button
             onClick={item.onClick}
             className="shrink-0 flex items-center gap-1 text-xs text-slate-500 hover:text-sky-400 transition-colors cursor-pointer mt-0.5 whitespace-nowrap"
            >
             {item.action}
             <ArrowRight className="w-3 h-3" />
            </button>
           </div>
          </div>
         </div>
        );
       })}
      </div>
     </section>

     <div className="h-px bg-taskflow-surface from-transparent via-white/[0.08] to-transparent" />
    </>
   )}

   {/* ═══════════════════════════════════════════════════════════
     SECTION 6 — MILESTONES
   ═══════════════════════════════════════════════════════════ */}
   <section className="py-14 sm:py-16">
    <div className="flex items-center justify-between mb-2">
     <div className="text-xs text-slate-600 uppercase tracking-widest font-semibold">
      Milestones
     </div>
     <button
      onClick={() => onNavigateTab('milestones')}
      className="flex items-center gap-1 text-xs text-slate-500 hover:text-sky-400 transition-colors cursor-pointer"
     >
      Timeline <ChevronRight className="w-3.5 h-3.5" />
     </button>
    </div>
    <h2 className="text-2xl font-bold text-white mb-8">
     {metrics.completedMilestones} of {metrics.totalMilestones} milestones complete
    </h2>

    {milestones.length === 0 ? (
     <p className="text-sm text-slate-600">
      No milestones defined yet. Create milestones to track your roadmap.
     </p>
    ) : (
     <div className="space-y-0">
      {milestones.map((ms, i) => {
       const conf = MILESTONE_HEALTH_CONFIG[ms.health];
       return (
        <div
         key={ms.id}
         onClick={() => onNavigateTab('milestones')}
         className={`flex flex-col sm:flex-row sm:items-center gap-4 py-6 cursor-pointer group ${i < milestones.length - 1 ? 'border-b border-white/[0.05]' : ''}`}
        >
         {/* Status dot + title */}
         <div className="flex items-center gap-4 flex-1 min-w-0">
          <div
           className={`w-2.5 h-2.5 rounded-full ${conf.dot} shrink-0 group-hover:scale-125 transition-transform`}
          />
          <div className="min-w-0">
           <div className="flex items-center gap-2 flex-wrap">
            <span className="text-base font-semibold text-white group-hover:text-sky-300 transition-colors truncate">
             {ms.title}
            </span>
            <span className="text-xs text-slate-600">{conf.label}</span>
           </div>
           <div className="text-xs text-slate-500 mt-0.5">
            {ms.dueDate
             ? new Date(ms.dueDate).toLocaleDateString('en-US', {
               month: 'short',
               day: 'numeric',
               year: 'numeric',
              })
             : 'No due date'}
            {' · '}
            {ms.completedTaskCount}/{ms.taskCount} tasks
           </div>
          </div>
         </div>

         {/* Progress bar */}
         <div className="sm:w-48 flex-shrink-0 flex flex-col items-end gap-1">
          <span className="text-xs text-slate-500 font-mono">{ms.progress}%</span>
          <div className="w-full sm:w-48 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
           <div
            className={`h-full ${conf.bar} rounded-full transition-all duration-700`}
            style={{ width: `${ms.progress}%` }}
           />
          </div>
         </div>
        </div>
       );
      })}
     </div>
    )}
   </section>

   {/* Divider */}
   <div className="h-px bg-taskflow-surface from-transparent via-white/[0.08] to-transparent" />

   {/* ═══════════════════════════════════════════════════════════
     SECTION 7 — ACTIVITY FEED
   ═══════════════════════════════════════════════════════════ */}
   <section className="py-14 sm:py-16 pb-6">
    <div className="flex items-center justify-between mb-2">
     <div className="text-xs text-slate-600 uppercase tracking-widest font-semibold">
      Recent Activity
     </div>
     <button
      onClick={() => onNavigateTab('activity')}
      className="flex items-center gap-1 text-xs text-slate-500 hover:text-sky-400 transition-colors cursor-pointer"
     >
      Full log <ChevronRight className="w-3.5 h-3.5" />
     </button>
    </div>
    <h2 className="text-2xl font-bold text-white mb-8">What's happened</h2>

    {recentActivity.length === 0 ? (
     <p className="text-sm text-slate-600">No recent activity in this project.</p>
    ) : (
     /* Timeline layout */
     <div className="relative pl-6">
      {/* Vertical guide line */}
      <div className="absolute left-[11px] top-2 bottom-2 w-px bg-white/[0.06]" />

      <div className="space-y-0">
       {recentActivity.slice(0, 8).map((act, i) => (
        <div
         key={act.id}
         className={`flex items-start gap-4 pb-7 ${i === 0 ? 'pt-0' : ''}`}
        >
         {/* Avatar — positioned on the timeline */}
         <div className="absolute left-0 w-[22px] h-[22px] rounded-full bg-slate-800 border border-white/[0.08] flex items-center justify-center text-[9px] font-semibold text-slate-300 overflow-hidden shrink-0">
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

         {/* Content */}
         <div className="min-w-0 flex-1 pt-0.5">
          <p className="text-sm text-slate-300 leading-snug">
           <span className="font-semibold text-white">
            {act.actor?.name || 'A team member'}
           </span>{' '}
           <span className="text-slate-500">
            {act.actionType.replace(/_/g, ' ').toLowerCase()}
           </span>
           {act.task && (
            <>
             {' '}
             <span
              onClick={() => onOpenTask(act.task!.id)}
              className="text-sky-400 hover:text-sky-300 cursor-pointer hover:underline"
             >
              {act.task.issueKey || act.task.title}
             </span>
            </>
           )}
          </p>
          <span className="text-xs text-slate-600 font-mono mt-0.5 block">
           {new Date(act.createdAt).toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
           })}
          </span>
         </div>
        </div>
       ))}
      </div>
     </div>
    )}
   </section>
  </div>
 );
};
