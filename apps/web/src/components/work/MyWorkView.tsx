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
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Badge } from '../ui/Badge';
import { Card } from '../ui/Card';
import { EmptyState } from '../ui/EmptyState';
import { Skeleton } from '../ui/Skeleton';

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
          <Badge variant="danger" size="sm" dot>
            Overdue ({label})
          </Badge>
        );
      case 'DUE_TODAY':
        return (
          <Badge variant="warning" size="sm" dot>
            Due Today
          </Badge>
        );
      case 'DUE_SOON':
        return (
          <Badge variant="warning" size="sm">
            Due Soon ({label})
          </Badge>
        );
      default:
        return (
          <Badge variant="default" size="sm">
            {label}
          </Badge>
        );
    }
  };

  const renderPriorityBadge = (priority: TaskPriority) => {
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
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-white/[0.08]">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 p-0.5 shadow-glow-cyan flex items-center justify-center shrink-0">
            <div className="w-full h-full bg-[#0b0f17] rounded-[10px] flex items-center justify-center">
              <CheckSquare className="w-5 h-5 text-sky-400" />
            </div>
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white font-display tracking-tight">
              Personal Work Queue
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
              Your execution cockpit: prioritized tasks, upcoming deadlines, and blocked
              dependencies.
            </p>
          </div>
        </div>

        {/* Search and Refresh */}
        <div className="flex items-center space-x-3">
          <form onSubmit={handleSearchSubmit} className="w-52 sm:w-64">
            <Input
              type="text"
              placeholder="Search assigned tasks..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              leftIcon={<Search className="w-4 h-4" />}
            />
          </form>

          <Button
            variant="glass"
            size="icon"
            onClick={() => fetchWorkQueue(activeFilter, searchQuery)}
            disabled={loading}
            title="Refresh Work Queue"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-sky-400' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Summary Metrics Grid */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <Card
            variant="interactive"
            padding="sm"
            onClick={() => setActiveFilter('all')}
            className={
              activeFilter === 'all' ? 'border-sky-500/50 bg-sky-950/20 shadow-glow-cyan' : ''
            }
          >
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-[11px] font-bold font-display uppercase tracking-wider">
                Assigned
              </span>
              <CheckSquare className="w-3.5 h-3.5 text-sky-400" />
            </div>
            <p className="text-xl sm:text-2xl font-extrabold text-white font-display">
              {summary.totalAssigned}
            </p>
          </Card>

          <Card
            variant="interactive"
            padding="sm"
            onClick={() => setActiveFilter('overdue')}
            className={
              activeFilter === 'overdue' ? 'border-rose-500/50 bg-rose-950/20 shadow-glow-cyan' : ''
            }
          >
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-[11px] font-bold font-display uppercase tracking-wider text-rose-400">
                Overdue
              </span>
              <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
            </div>
            <p className="text-xl sm:text-2xl font-extrabold text-rose-300 font-display">
              {summary.overdueCount}
            </p>
          </Card>

          <Card
            variant="interactive"
            padding="sm"
            onClick={() => setActiveFilter('due_soon')}
            className={activeFilter === 'due_soon' ? 'border-amber-500/50 bg-amber-950/20' : ''}
          >
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-[11px] font-bold font-display uppercase tracking-wider text-amber-400">
                Due Soon
              </span>
              <Clock className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <p className="text-xl sm:text-2xl font-extrabold text-amber-300 font-display">
              {summary.dueSoonCount}
            </p>
          </Card>

          <Card
            variant="interactive"
            padding="sm"
            onClick={() => setActiveFilter('blocked')}
            className={activeFilter === 'blocked' ? 'border-rose-500/50 bg-rose-950/20' : ''}
          >
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-[11px] font-bold font-display uppercase tracking-wider text-rose-400">
                Blocked
              </span>
              <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
            </div>
            <p className="text-xl sm:text-2xl font-extrabold text-rose-300 font-display">
              {summary.blockedCount}
            </p>
          </Card>

          <Card
            variant="interactive"
            padding="sm"
            onClick={() => setActiveFilter('in_progress')}
            className={
              activeFilter === 'in_progress' ? 'border-indigo-500/50 bg-indigo-950/20' : ''
            }
          >
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-[11px] font-bold font-display uppercase tracking-wider text-indigo-400">
                In Progress
              </span>
              <Loader2 className="w-3.5 h-3.5 text-indigo-400" />
            </div>
            <p className="text-xl sm:text-2xl font-extrabold text-indigo-300 font-display">
              {summary.inProgressCount}
            </p>
          </Card>

          <Card
            variant="interactive"
            padding="sm"
            onClick={() => setActiveFilter('completed')}
            className={
              activeFilter === 'completed' ? 'border-emerald-500/50 bg-emerald-950/20' : ''
            }
          >
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-[11px] font-bold font-display uppercase tracking-wider text-emerald-400">
                Done Recently
              </span>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <p className="text-xl sm:text-2xl font-extrabold text-emerald-300 font-display">
              {summary.completedRecentlyCount}
            </p>
          </Card>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center space-x-1.5 overflow-x-auto pb-2 border-b border-white/[0.08] scrollbar-none">
        {filters.map(f => {
          const isActive = activeFilter === f.id;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => setActiveFilter(f.id)}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold font-display whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? 'bg-slate-800 text-sky-400 border border-sky-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50 border border-transparent'
              }`}
            >
              <span>{f.label}</span>
              {f.count !== undefined && (
                <span
                  className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono font-bold ${
                    isActive
                      ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                      : f.alert && f.count > 0
                        ? 'bg-rose-950/80 text-rose-300 border border-rose-800/60'
                        : f.warning && f.count > 0
                          ? 'bg-amber-950/80 text-amber-300 border border-amber-800/60'
                          : 'bg-slate-800 text-slate-400'
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
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <Card key={i} className="p-4 space-y-2">
                <Skeleton className="w-1/3 h-5" />
                <Skeleton className="w-full h-4" />
              </Card>
            ))}
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={<CheckSquare className="w-6 h-6" />}
            title="No tasks in this queue"
            description={
              activeFilter === 'overdue'
                ? 'Great job! You have zero overdue tasks.'
                : activeFilter === 'blocked'
                  ? 'None of your assigned tasks are blocked by dependencies.'
                  : 'No assigned work matches your selected filter criteria.'
            }
          />
        ) : (
          items.map(item => (
            <Card
              key={item.id}
              variant="interactive"
              padding="sm"
              onClick={() => onOpenTask(item.projectId, item.id)}
              className="group space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                {/* Issue Key, Title, Project */}
                <div className="flex items-start sm:items-center space-x-3">
                  <span className="font-mono text-xs font-bold text-sky-400 px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700">
                    {item.issueKey || `#${item.taskNumber}`}
                  </span>
                  <span className="text-sm font-bold text-white group-hover:text-sky-300 transition-colors font-display">
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
                    className="px-3 py-1 rounded-lg text-xs font-semibold bg-slate-900 border border-white/[0.08] text-slate-200 hover:border-sky-500/40 focus:outline-none cursor-pointer"
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
                    className="p-1.5 text-slate-400 group-hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                    title="Open task details"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Sub-row: Project, Milestone, Blocked Predecessors */}
              <div className="flex items-center justify-between pt-2 border-t border-white/[0.08] text-xs text-slate-400 flex-wrap gap-2">
                <div className="flex items-center space-x-4">
                  <span className="flex items-center space-x-1.5 font-medium">
                    <FolderKanban className="w-3.5 h-3.5 text-indigo-400" />
                    <span>{item.project.name}</span>
                  </span>

                  {item.milestone && (
                    <span className="flex items-center space-x-1.5 font-medium">
                      <Flag className="w-3.5 h-3.5 text-sky-400" />
                      <span>{item.milestone.title}</span>
                    </span>
                  )}
                </div>

                {/* Blocked Banner */}
                {item.isBlocked && item.blockingDependencies.length > 0 && (
                  <div className="flex items-center space-x-1.5 text-[11px] font-semibold text-rose-300 bg-rose-950/60 px-2.5 py-0.5 rounded-md border border-rose-800/60">
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>
                      Blocked by{' '}
                      {item.blockingDependencies
                        .map(b => b.predecessorKey || b.predecessorTitle)
                        .join(', ')}
                    </span>
                  </div>
                )}
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};
