import React, { useState, useEffect } from 'react';
import {
  CheckSquare,
  AlertCircle,
  Clock,
  ShieldAlert,
  Loader2,
  CheckCircle2,
  Search,
  RefreshCw,
  FolderKanban,
  Flag,
  Calendar,
  ExternalLink,
} from 'lucide-react';
import {
  MyWorkItem,
  MyWorkSummary,
  MyWorkFilter,
  TaskStatus,
  TaskPriority,
} from '@taskflow/shared';
import { workApi, taskApi } from '../../lib/api';

interface MyWorkViewProps {
  onOpenTask: (projectId: string, taskId: string) => void;
}

export const MyWorkView: React.FC<MyWorkViewProps> = ({ onOpenTask }) => {
  const [items, setItems] = useState<MyWorkItem[]>([]);
  const [summary, setSummary] = useState<MyWorkSummary | null>(null);
  const [activeFilter, setActiveFilter] = useState<MyWorkFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);

  const fetchWorkQueue = async (filter = activeFilter, search = searchQuery) => {
    setLoading(true);
    try {
      const res = await workApi.getMyWork({
        filter,
        search: search.trim() || undefined,
      });
      setItems(res.items);
      setSummary(res.summary);
    } catch {
      // Best-effort
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkQueue(activeFilter, searchQuery);
  }, [activeFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchWorkQueue(activeFilter, searchQuery);
  };

  const handleStatusChange = async (
    item: MyWorkItem,
    newStatus: TaskStatus,
    e: React.ChangeEvent<HTMLSelectElement>
  ) => {
    e.stopPropagation();
    if (item.status === newStatus || updatingTaskId) return;
    setUpdatingTaskId(item.id);
    try {
      await taskApi.updateTaskStatus(
        item.project.organizationId,
        item.projectId,
        item.id,
        newStatus
      );
      // Re-fetch work queue to dynamically update metrics and ordering
      await fetchWorkQueue(activeFilter, searchQuery);
    } catch {
      // Best-effort
    } finally {
      setUpdatingTaskId(null);
    }
  };

  const formatDueDate = (iso?: string | null) => {
    if (!iso) return null;
    const date = new Date(iso);
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  const renderDueDateBadge = (item: MyWorkItem) => {
    if (!item.dueDate) return null;
    const label = formatDueDate(item.dueDate);

    switch (item.dueDateCategory) {
      case 'OVERDUE':
        return (
          <span className="flex items-center space-x-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-950/80 text-rose-400 border border-rose-800/60 shadow-[0_0_8px_rgba(244,63,94,0.2)]">
            <AlertCircle className="w-3 h-3" />
            <span>Overdue ({label})</span>
          </span>
        );
      case 'DUE_TODAY':
        return (
          <span className="flex items-center space-x-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-950/80 text-amber-300 border border-amber-800/60 shadow-[0_0_8px_rgba(245,158,11,0.2)]">
            <Clock className="w-3 h-3" />
            <span>Due Today</span>
          </span>
        );
      case 'DUE_SOON':
        return (
          <span className="flex items-center space-x-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-yellow-950/60 text-yellow-300 border border-yellow-800/50">
            <Clock className="w-3 h-3" />
            <span>Due Soon ({label})</span>
          </span>
        );
      default:
        return (
          <span className="flex items-center space-x-1 px-2 py-0.5 rounded-full text-[11px] text-taskflow-muted bg-taskflow-surface border border-taskflow-border">
            <Calendar className="w-3 h-3" />
            <span>{label}</span>
          </span>
        );
    }
  };

  const renderPriorityBadge = (priority: TaskPriority) => {
    switch (priority) {
      case TaskPriority.URGENT:
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-950/80 text-rose-300 border border-rose-800/60 uppercase tracking-wide">
            Urgent
          </span>
        );
      case TaskPriority.HIGH:
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-orange-950/80 text-orange-300 border border-orange-800/60 uppercase tracking-wide">
            High
          </span>
        );
      case TaskPriority.MEDIUM:
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-cyan-950/80 text-cyan-300 border border-cyan-800/60 uppercase tracking-wide">
            Medium
          </span>
        );
      case TaskPriority.LOW:
        return (
          <span className="px-2 py-0.5 rounded text-[10px] text-taskflow-muted bg-taskflow-surface border border-taskflow-border uppercase tracking-wide">
            Low
          </span>
        );
      default:
        return null;
    }
  };

  const filters = [
    { id: 'all' as MyWorkFilter, label: 'All Assigned', count: summary?.totalAssigned },
    { id: 'overdue' as MyWorkFilter, label: 'Overdue', count: summary?.overdueCount, alert: true },
    { id: 'due_today' as MyWorkFilter, label: 'Due Today', count: undefined },
    { id: 'due_soon' as MyWorkFilter, label: 'Due Soon', count: summary?.dueSoonCount },
    {
      id: 'blocked' as MyWorkFilter,
      label: 'Blocked',
      count: summary?.blockedCount,
      warning: true,
    },
    { id: 'in_progress' as MyWorkFilter, label: 'In Progress', count: summary?.inProgressCount },
    { id: 'completed' as MyWorkFilter, label: 'Completed', count: summary?.completedRecentlyCount },
  ];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-indigo-600 p-0.5 shadow-glow-cyan flex items-center justify-center">
              <div className="w-full h-full bg-taskflow-surface rounded-[10px] flex items-center justify-center">
                <CheckSquare className="w-5 h-5 text-cyan-400" />
              </div>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">Personal Work Queue</h1>
              <p className="text-xs text-taskflow-muted">
                Your execution cockpit: prioritized tasks, upcoming deadlines, and blocked
                dependencies.
              </p>
            </div>
          </div>
        </div>

        {/* Search and Refresh */}
        <div className="flex items-center space-x-3">
          <form onSubmit={handleSearchSubmit} className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-taskflow-muted" />
            <input
              type="text"
              placeholder="Search your assigned tasks..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 rounded-lg bg-taskflow-surface border border-taskflow-border text-xs text-white placeholder-taskflow-muted focus:outline-none focus:border-cyan-500/50 w-52 sm:w-64"
            />
          </form>

          <button
            type="button"
            onClick={() => fetchWorkQueue(activeFilter, searchQuery)}
            disabled={loading}
            className="p-2 rounded-lg bg-taskflow-surface hover:bg-taskflow-card-hover border border-taskflow-border text-taskflow-muted hover:text-white transition-colors disabled:opacity-50"
            title="Refresh Work Queue"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Summary Metrics Grid */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Total Assigned */}
          <div
            onClick={() => setActiveFilter('all')}
            className={`glass-card p-3 rounded-xl border transition-all cursor-pointer ${
              activeFilter === 'all'
                ? 'border-cyan-500/50 bg-cyan-950/20 shadow-glow-cyan'
                : 'border-taskflow-border hover:border-taskflow-border/80'
            }`}
          >
            <div className="flex items-center justify-between text-taskflow-muted mb-1">
              <span className="text-[11px] font-medium">Assigned</span>
              <CheckSquare className="w-3.5 h-3.5 text-cyan-400" />
            </div>
            <p className="text-xl font-bold text-white">{summary.totalAssigned}</p>
          </div>

          {/* Overdue */}
          <div
            onClick={() => setActiveFilter('overdue')}
            className={`glass-card p-3 rounded-xl border transition-all cursor-pointer ${
              activeFilter === 'overdue'
                ? 'border-rose-500/50 bg-rose-950/20 shadow-[0_0_12px_rgba(244,63,94,0.3)]'
                : summary.overdueCount > 0
                  ? 'border-rose-800/40 bg-rose-950/10 hover:border-rose-700/60'
                  : 'border-taskflow-border hover:border-taskflow-border/80'
            }`}
          >
            <div className="flex items-center justify-between text-taskflow-muted mb-1">
              <span className="text-[11px] font-medium text-rose-400">Overdue</span>
              <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
            </div>
            <p className="text-xl font-bold text-rose-300">{summary.overdueCount}</p>
          </div>

          {/* Due Soon */}
          <div
            onClick={() => setActiveFilter('due_soon')}
            className={`glass-card p-3 rounded-xl border transition-all cursor-pointer ${
              activeFilter === 'due_soon'
                ? 'border-amber-500/50 bg-amber-950/20 shadow-[0_0_12px_rgba(245,158,11,0.3)]'
                : 'border-taskflow-border hover:border-taskflow-border/80'
            }`}
          >
            <div className="flex items-center justify-between text-taskflow-muted mb-1">
              <span className="text-[11px] font-medium text-amber-400">Due Soon</span>
              <Clock className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <p className="text-xl font-bold text-amber-300">{summary.dueSoonCount}</p>
          </div>

          {/* Blocked */}
          <div
            onClick={() => setActiveFilter('blocked')}
            className={`glass-card p-3 rounded-xl border transition-all cursor-pointer ${
              activeFilter === 'blocked'
                ? 'border-rose-500/50 bg-rose-950/20 shadow-[0_0_12px_rgba(244,63,94,0.3)]'
                : summary.blockedCount > 0
                  ? 'border-rose-900/40 bg-rose-950/10'
                  : 'border-taskflow-border hover:border-taskflow-border/80'
            }`}
          >
            <div className="flex items-center justify-between text-taskflow-muted mb-1">
              <span className="text-[11px] font-medium text-rose-400">Blocked</span>
              <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
            </div>
            <p className="text-xl font-bold text-rose-300">{summary.blockedCount}</p>
          </div>

          {/* In Progress */}
          <div
            onClick={() => setActiveFilter('in_progress')}
            className={`glass-card p-3 rounded-xl border transition-all cursor-pointer ${
              activeFilter === 'in_progress'
                ? 'border-indigo-500/50 bg-indigo-950/20 shadow-glow-cyan'
                : 'border-taskflow-border hover:border-taskflow-border/80'
            }`}
          >
            <div className="flex items-center justify-between text-taskflow-muted mb-1">
              <span className="text-[11px] font-medium text-indigo-400">In Progress</span>
              <Loader2 className="w-3.5 h-3.5 text-indigo-400" />
            </div>
            <p className="text-xl font-bold text-indigo-300">{summary.inProgressCount}</p>
          </div>

          {/* Completed */}
          <div
            onClick={() => setActiveFilter('completed')}
            className={`glass-card p-3 rounded-xl border transition-all cursor-pointer ${
              activeFilter === 'completed'
                ? 'border-emerald-500/50 bg-emerald-950/20 shadow-[0_0_12px_rgba(52,211,153,0.2)]'
                : 'border-taskflow-border hover:border-taskflow-border/80'
            }`}
          >
            <div className="flex items-center justify-between text-taskflow-muted mb-1">
              <span className="text-[11px] font-medium text-emerald-400">Done Recently</span>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <p className="text-xl font-bold text-emerald-300">{summary.completedRecentlyCount}</p>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-2 border-b border-taskflow-border">
        {filters.map(f => {
          const isActive = activeFilter === f.id;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => setActiveFilter(f.id)}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? 'bg-taskflow-surface text-cyan-300 border border-cyan-500/40 shadow-glow-cyan'
                  : 'text-taskflow-muted hover:text-white hover:bg-taskflow-surface/50 border border-transparent'
              }`}
            >
              <span>{f.label}</span>
              {f.count !== undefined && (
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    isActive
                      ? 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                      : f.alert && f.count > 0
                        ? 'bg-rose-950 text-rose-400 border border-rose-800'
                        : f.warning && f.count > 0
                          ? 'bg-amber-950 text-amber-400 border border-amber-800'
                          : 'bg-taskflow-surface text-taskflow-muted'
                  }`}
                >
                  {f.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Work Item List */}
      <div className="space-y-3">
        {loading ? (
          <div className="glass-card p-12 text-center text-taskflow-muted space-y-3 rounded-xl border border-taskflow-border">
            <div className="w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs">Loading personal work queue...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="glass-card p-12 text-center text-taskflow-muted space-y-3 rounded-xl border border-taskflow-border">
            <div className="w-12 h-12 rounded-full bg-taskflow-surface mx-auto flex items-center justify-center text-taskflow-muted">
              <CheckSquare className="w-6 h-6 opacity-40 text-cyan-400" />
            </div>
            <p className="text-sm font-semibold text-white">No tasks in this queue</p>
            <p className="text-xs text-taskflow-muted max-w-sm mx-auto">
              {activeFilter === 'overdue'
                ? 'Great job! You have zero overdue tasks.'
                : activeFilter === 'blocked'
                  ? 'None of your assigned tasks are blocked by dependencies.'
                  : 'No assigned work matches your selected filter criteria.'}
            </p>
          </div>
        ) : (
          items.map(item => (
            <div
              key={item.id}
              onClick={() => onOpenTask(item.projectId, item.id)}
              className="glass-card p-4 rounded-xl border border-taskflow-border hover:border-cyan-500/40 transition-all cursor-pointer group space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                {/* Issue Key, Title, Project */}
                <div className="flex items-start sm:items-center space-x-3">
                  <span className="font-mono text-xs font-bold text-cyan-400 px-2 py-0.5 rounded bg-cyan-950/80 border border-cyan-800/60">
                    {item.issueKey || `#${item.taskNumber}`}
                  </span>
                  <span className="text-sm font-medium text-white group-hover:text-cyan-300 transition-colors">
                    {item.title}
                  </span>
                </div>

                {/* Deadlines & Priority */}
                <div className="flex items-center space-x-2 flex-wrap">
                  {renderPriorityBadge(item.priority)}
                  {renderDueDateBadge(item)}

                  {/* Status Changer */}
                  <select
                    value={item.status}
                    onClick={e => e.stopPropagation()}
                    onChange={e => handleStatusChange(item, e.target.value as TaskStatus, e)}
                    disabled={updatingTaskId === item.id}
                    className="px-2.5 py-1 rounded-lg text-xs font-medium bg-taskflow-surface border border-taskflow-border text-taskflow-text hover:border-cyan-500/40 focus:outline-none cursor-pointer"
                  >
                    <option value={TaskStatus.BACKLOG}>Backlog</option>
                    <option value={TaskStatus.TODO}>To Do</option>
                    <option value={TaskStatus.IN_PROGRESS}>In Progress</option>
                    <option value={TaskStatus.IN_REVIEW}>In Review</option>
                    <option value={TaskStatus.BLOCKED}>Blocked</option>
                    <option value={TaskStatus.DONE}>Done</option>
                    <option value={TaskStatus.CANCELLED}>Cancelled</option>
                  </select>

                  <button
                    type="button"
                    onClick={e => {
                      e.stopPropagation();
                      onOpenTask(item.projectId, item.id);
                    }}
                    className="p-1 text-taskflow-muted group-hover:text-white transition-colors"
                    title="Open task drawer"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Sub-row: Project, Milestone, Blocked Predecessors */}
              <div className="flex items-center justify-between pt-1 border-t border-taskflow-border/40 text-xs text-taskflow-muted flex-wrap gap-2">
                <div className="flex items-center space-x-4">
                  {/* Project name */}
                  <span className="flex items-center space-x-1.5">
                    <FolderKanban className="w-3.5 h-3.5 text-indigo-400" />
                    <span>{item.project.name}</span>
                  </span>

                  {/* Milestone */}
                  {item.milestone && (
                    <span className="flex items-center space-x-1.5">
                      <Flag className="w-3.5 h-3.5 text-cyan-400" />
                      <span>{item.milestone.title}</span>
                    </span>
                  )}
                </div>

                {/* Blocked Banner */}
                {item.isBlocked && item.blockingDependencies.length > 0 && (
                  <div className="flex items-center space-x-1.5 text-[11px] font-semibold text-rose-400 bg-rose-950/60 px-2 py-0.5 rounded-md border border-rose-800/60">
                    <ShieldAlert className="w-3 h-3" />
                    <span>
                      Blocked by{' '}
                      {item.blockingDependencies
                        .map(b => b.predecessorKey || b.predecessorTitle)
                        .join(', ')}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
