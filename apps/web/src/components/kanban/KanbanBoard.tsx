import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Plus,
  Search,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Kanban,
  List,
  ArrowUpDown,
  Archive,
  Layers,
} from 'lucide-react';
import {
  TaskListItem,
  TaskStatus,
  TaskPriority,
  ProjectMemberDetail,
  LabelItem,
} from '@taskflow/shared';
import { taskApi, labelApi } from '../../lib/api';
import { KanbanColumn } from './KanbanColumn';
import { CreateTaskModal } from '../tasks/CreateTaskModal';
import { TaskDetailDrawer } from '../tasks/TaskDetailDrawer';

interface KanbanBoardProps {
  organizationId: string;
  projectId: string;
  projectKey: string;
  members: ProjectMemberDetail[];
  canManageTasks: boolean;
  viewMode?: 'board' | 'list';
  onViewModeChange?: (mode: 'board' | 'list') => void;
}

type SortOption = 'number_desc' | 'number_asc' | 'priority_desc' | 'due_date' | 'created_desc';

const PRIORITY_WEIGHT: Record<TaskPriority, number> = {
  [TaskPriority.URGENT]: 4,
  [TaskPriority.HIGH]: 3,
  [TaskPriority.MEDIUM]: 2,
  [TaskPriority.LOW]: 1,
  [TaskPriority.NONE]: 0,
};

const KANBAN_STATUSES: TaskStatus[] = [
  TaskStatus.BACKLOG,
  TaskStatus.TODO,
  TaskStatus.IN_PROGRESS,
  TaskStatus.IN_REVIEW,
  TaskStatus.BLOCKED,
  TaskStatus.DONE,
  TaskStatus.CANCELLED,
];

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  organizationId,
  projectId,
  projectKey,
  members,
  canManageTasks,
  viewMode = 'board',
  onViewModeChange,
}) => {
  const [tasks, setTasks] = useState<TaskListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Filters & Sorting state
  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [assigneeFilter, setAssigneeFilter] = useState<string>('ALL');
  const [labelFilter, setLabelFilter] = useState<string>('ALL');
  const [projectLabels, setProjectLabels] = useState<LabelItem[]>([]);
  const [sortBy, setSortBy] = useState<SortOption>('number_desc');
  const [showArchived, setShowArchived] = useState(false);

  // Modals & Drawer state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createModalInitialStatus, setCreateModalInitialStatus] = useState<TaskStatus>(
    TaskStatus.TODO
  );
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await taskApi.listTasks(organizationId, projectId, {
        search: search.trim() || undefined,
        priority: priorityFilter !== 'ALL' ? (priorityFilter as TaskPriority) : undefined,
        assigneeId:
          assigneeFilter !== 'ALL'
            ? assigneeFilter === 'UNASSIGNED'
              ? undefined
              : assigneeFilter
            : undefined,
        labelIds: labelFilter !== 'ALL' ? [labelFilter] : undefined,
        archived: showArchived,
      });
      setTasks(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load tasks';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [
    organizationId,
    projectId,
    search,
    priorityFilter,
    assigneeFilter,
    labelFilter,
    showArchived,
  ]);

  useEffect(() => {
    labelApi
      .listLabels(organizationId, projectId)
      .then(setProjectLabels)
      .catch(() => {});
  }, [organizationId, projectId]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Toast auto-dismiss
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Optimistic status update with rollback
  const handleDropTask = async (taskId: string, targetStatus: TaskStatus) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task || task.status === targetStatus) return;

    const previousTasks = [...tasks];

    // 1. Optimistic local update
    setTasks(prev => prev.map(t => (t.id === taskId ? { ...t, status: targetStatus } : t)));

    // 2. Server mutation
    try {
      await taskApi.updateTaskStatus(organizationId, projectId, taskId, targetStatus);
      setToast({
        type: 'success',
        message: `Task ${task.issueKey || task.title} moved to ${targetStatus.replace('_', ' ').toLowerCase()}`,
      });
    } catch (err: unknown) {
      // 3. Rollback on failure
      setTasks(previousTasks);
      const msg = err instanceof Error ? err.message : 'Failed to update task status';
      setToast({
        type: 'error',
        message: `Could not move task: ${msg}`,
      });
    }
  };

  // Filter & sort tasks into columns
  const columnTasksMap = useMemo(() => {
    const map: Record<TaskStatus, TaskListItem[]> = {
      [TaskStatus.BACKLOG]: [],
      [TaskStatus.TODO]: [],
      [TaskStatus.IN_PROGRESS]: [],
      [TaskStatus.IN_REVIEW]: [],
      [TaskStatus.BLOCKED]: [],
      [TaskStatus.DONE]: [],
      [TaskStatus.CANCELLED]: [],
    };

    // Client-side assignee filtering for 'UNASSIGNED'
    const filtered = tasks.filter(t => {
      if (assigneeFilter === 'UNASSIGNED') {
        return !t.assigneeId;
      }
      return true;
    });

    // Group into columns
    filtered.forEach(t => {
      if (map[t.status]) {
        map[t.status].push(t);
      } else {
        map[TaskStatus.TODO].push(t);
      }
    });

    // Sort within each column
    Object.keys(map).forEach(s => {
      const statusKey = s as TaskStatus;
      map[statusKey].sort((a, b) => {
        switch (sortBy) {
          case 'number_desc':
            return b.taskNumber - a.taskNumber;
          case 'number_asc':
            return a.taskNumber - b.taskNumber;
          case 'priority_desc':
            return PRIORITY_WEIGHT[b.priority] - PRIORITY_WEIGHT[a.priority];
          case 'due_date': {
            if (!a.dueDate && !b.dueDate) return 0;
            if (!a.dueDate) return 1;
            if (!b.dueDate) return -1;
            return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
          }
          case 'created_desc':
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          default:
            return 0;
        }
      });
    });

    return map;
  }, [tasks, assigneeFilter, sortBy]);

  const openCreateForStatus = (status: TaskStatus) => {
    setCreateModalInitialStatus(status);
    setIsCreateModalOpen(true);
  };

  const handleClearFilters = () => {
    setSearch('');
    setPriorityFilter('ALL');
    setAssigneeFilter('ALL');
    setLabelFilter('ALL');
    setShowArchived(false);
  };

  const hasActiveFilters =
    search.trim() !== '' ||
    priorityFilter !== 'ALL' ||
    assigneeFilter !== 'ALL' ||
    labelFilter !== 'ALL' ||
    showArchived;

  return (
    <div className="space-y-4">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center space-x-2.5 px-4 py-3 rounded-xl border shadow-2xl text-xs font-medium backdrop-blur-md animate-in fade-in slide-in-from-bottom-3 ${
            toast.type === 'success'
              ? 'bg-emerald-950/90 border-emerald-700/80 text-emerald-200'
              : 'bg-rose-950/90 border-rose-700/80 text-rose-200'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-400" />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Top Toolbar: Search, Filters, Sort, View Switcher, CTA */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl border border-taskflow-border bg-taskflow-surface/60 backdrop-blur-md shadow-sm">
        {/* Left: Search & Filter Dropdowns */}
        <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
          {/* Search */}
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-taskflow-muted" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search key, title..."
              className="w-full pl-9 pr-3 py-1.5 rounded-lg text-xs bg-taskflow-surface border border-taskflow-border text-white placeholder-taskflow-muted focus:outline-none focus:border-cyan-500 transition-colors"
            />
          </div>

          {/* Priority filter */}
          <div className="relative">
            <select
              value={priorityFilter}
              onChange={e => setPriorityFilter(e.target.value)}
              className="px-3 py-1.5 rounded-lg text-xs bg-taskflow-surface border border-taskflow-border text-white focus:outline-none focus:border-cyan-500 cursor-pointer"
            >
              <option value="ALL">All Priorities</option>
              {Object.values(TaskPriority).map(p => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          {/* Assignee filter */}
          <div className="relative">
            <select
              value={assigneeFilter}
              onChange={e => setAssigneeFilter(e.target.value)}
              className="px-3 py-1.5 rounded-lg text-xs bg-taskflow-surface border border-taskflow-border text-white focus:outline-none focus:border-cyan-500 cursor-pointer max-w-[150px] truncate"
            >
              <option value="ALL">All Assignees</option>
              <option value="UNASSIGNED">Unassigned</option>
              {members.map(m => (
                <option key={m.userId} value={m.userId}>
                  {m.user.name}
                </option>
              ))}
            </select>
          </div>

          {/* Label filter */}
          <div className="relative">
            <select
              value={labelFilter}
              onChange={e => setLabelFilter(e.target.value)}
              className="px-3 py-1.5 rounded-lg text-xs bg-taskflow-surface border border-taskflow-border text-white focus:outline-none focus:border-cyan-500 cursor-pointer max-w-[150px] truncate"
            >
              <option value="ALL">All Labels</option>
              {projectLabels.map(l => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>

          {/* Sort selector */}
          <div className="flex items-center space-x-1.5">
            <ArrowUpDown className="w-3.5 h-3.5 text-taskflow-muted" />
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as SortOption)}
              className="px-2.5 py-1.5 rounded-lg text-xs bg-taskflow-surface border border-taskflow-border text-white focus:outline-none focus:border-cyan-500 cursor-pointer"
            >
              <option value="number_desc">Key (Newest first)</option>
              <option value="number_asc">Key (Oldest first)</option>
              <option value="priority_desc">Priority (High to Low)</option>
              <option value="due_date">Due Date</option>
              <option value="created_desc">Created Date</option>
            </select>
          </div>

          {/* Archived Toggle */}
          <button
            type="button"
            onClick={() => setShowArchived(!showArchived)}
            className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              showArchived
                ? 'bg-cyan-950/60 text-cyan-300 border-cyan-800/80 shadow-glow-cyan'
                : 'bg-taskflow-surface text-taskflow-muted border-taskflow-border hover:text-white'
            }`}
          >
            <Archive className="w-3 h-3" />
            <span>Archived</span>
          </button>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleClearFilters}
              className="text-xs text-cyan-400 hover:text-cyan-300 underline ml-1"
            >
              Clear
            </button>
          )}
        </div>

        {/* Right: View Switcher & Create Task Button */}
        <div className="flex items-center space-x-2.5">
          {/* View Mode Toggle: Board vs List */}
          {onViewModeChange && (
            <div className="flex items-center p-0.5 rounded-lg border border-taskflow-border bg-taskflow-surface/80">
              <button
                type="button"
                onClick={() => onViewModeChange('board')}
                className={`flex items-center space-x-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  viewMode === 'board'
                    ? 'bg-cyan-950 text-cyan-300 border border-cyan-800/60 shadow-sm'
                    : 'text-taskflow-muted hover:text-white'
                }`}
                title="Board view"
              >
                <Kanban className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Board</span>
              </button>
              <button
                type="button"
                onClick={() => onViewModeChange('list')}
                className={`flex items-center space-x-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  viewMode === 'list'
                    ? 'bg-cyan-950 text-cyan-300 border border-cyan-800/60 shadow-sm'
                    : 'text-taskflow-muted hover:text-white'
                }`}
                title="List view"
              >
                <List className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">List</span>
              </button>
            </div>
          )}

          {/* Refresh */}
          <button
            type="button"
            onClick={fetchTasks}
            disabled={loading}
            title="Refresh board"
            className="p-1.5 rounded-lg border border-taskflow-border bg-taskflow-surface text-taskflow-muted hover:text-white hover:bg-taskflow-surface-hover transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>

          {/* Create Task Button */}
          {canManageTasks && (
            <button
              type="button"
              onClick={() => openCreateForStatus(TaskStatus.TODO)}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-black bg-cyan-400 hover:bg-cyan-300 transition-all shadow-glow-cyan"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Task</span>
            </button>
          )}
        </div>
      </div>

      {/* Error state banner */}
      {error && (
        <div className="p-4 rounded-xl border border-rose-800/80 bg-rose-950/40 text-rose-300 text-xs flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={fetchTasks}
            className="px-2.5 py-1 rounded bg-rose-900/60 text-white hover:bg-rose-900 transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading Skeletons */}
      {loading && tasks.length === 0 && (
        <div className="flex space-x-4 overflow-x-auto pb-4">
          {[1, 2, 3, 4, 5].map(i => (
            <div
              key={i}
              className="w-80 flex-shrink-0 rounded-2xl border border-taskflow-border bg-taskflow-surface/30 p-4 space-y-3"
            >
              <div className="h-5 w-24 bg-taskflow-surface/60 rounded animate-pulse" />
              <div className="h-28 rounded-xl bg-taskflow-surface/50 animate-pulse" />
              <div className="h-28 rounded-xl bg-taskflow-surface/50 animate-pulse" />
            </div>
          ))}
        </div>
      )}

      {/* Kanban Columns Horizontal Canvas */}
      {!loading && tasks.length === 0 && !hasActiveFilters && (
        <div className="glass-panel rounded-2xl border border-taskflow-border p-12 text-center bg-taskflow-surface/30 space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-cyan-950/60 border border-cyan-800/60 text-cyan-400 flex items-center justify-center mx-auto shadow-glow-cyan">
            <Layers className="w-8 h-8" />
          </div>
          <div className="max-w-md mx-auto space-y-1.5">
            <h3 className="text-lg font-bold text-white">No tasks yet</h3>
            <p className="text-xs text-taskflow-muted leading-relaxed">
              Start project execution by creating your first task. Organize tasks visually into
              Backlog, Todo, In Progress, Review, and Done.
            </p>
          </div>
          {canManageTasks && (
            <button
              type="button"
              onClick={() => openCreateForStatus(TaskStatus.TODO)}
              className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold text-black bg-cyan-400 hover:bg-cyan-300 transition-all shadow-glow-cyan"
            >
              <Plus className="w-4 h-4" />
              <span>Create First Task</span>
            </button>
          )}
        </div>
      )}

      {(tasks.length > 0 || hasActiveFilters) && (
        <div className="flex space-x-4 overflow-x-auto pb-6 scrollbar-thin">
          {KANBAN_STATUSES.map(status => (
            <KanbanColumn
              key={status}
              status={status}
              tasks={columnTasksMap[status] || []}
              canMove={canManageTasks}
              canCreate={canManageTasks}
              onCardClick={task => setSelectedTaskId(task.id)}
              onAddTask={openCreateForStatus}
              onDropTask={handleDropTask}
              onStatusChange={handleDropTask}
            />
          ))}
        </div>
      )}

      {/* Create Task Modal */}
      <CreateTaskModal
        organizationId={organizationId}
        projectId={projectId}
        projectKey={projectKey}
        members={members}
        isOpen={isCreateModalOpen}
        initialStatus={createModalInitialStatus}
        onClose={() => setIsCreateModalOpen(false)}
        onCreated={() => {
          setIsCreateModalOpen(false);
          fetchTasks();
        }}
      />

      {/* Task Detail Drawer */}
      {selectedTaskId && (
        <TaskDetailDrawer
          organizationId={organizationId}
          projectId={projectId}
          taskId={selectedTaskId}
          projectKey={projectKey}
          members={members}
          isOpen={!!selectedTaskId}
          onClose={() => setSelectedTaskId(null)}
          onUpdated={fetchTasks}
          onDeleted={() => {
            setSelectedTaskId(null);
            fetchTasks();
          }}
        />
      )}
    </div>
  );
};
