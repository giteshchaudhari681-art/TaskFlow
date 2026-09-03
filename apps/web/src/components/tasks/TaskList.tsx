import React, { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  Calendar,
  CheckSquare,
  RefreshCw,
  Layers,
  Archive,
  Kanban,
  List as ListIcon,
  Link2,
} from 'lucide-react';
import {
  TaskListItem,
  TaskStatus,
  TaskPriority,
  ProjectMemberDetail,
  LabelItem,
} from '@taskflow/shared';
import { taskApi, labelApi } from '../../lib/api';
import { CreateTaskModal } from './CreateTaskModal';
import { TaskDetailDrawer } from './TaskDetailDrawer';
import { LabelBadge } from '../labels/LabelBadge';

interface TaskListProps {
  organizationId: string;
  projectId: string;
  projectKey: string;
  members: ProjectMemberDetail[];
  canManageTasks: boolean;
  viewMode?: 'board' | 'list';
  onViewModeChange?: (mode: 'board' | 'list') => void;
  initialSelectedTaskId?: string | null;
}

export const TaskList: React.FC<TaskListProps> = ({
  organizationId,
  projectId,
  projectKey,
  members,
  canManageTasks,
  viewMode = 'list',
  onViewModeChange,
  initialSelectedTaskId,
}) => {
  const [tasks, setTasks] = useState<TaskListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [assigneeFilter, setAssigneeFilter] = useState<string>('ALL');
  const [labelFilter, setLabelFilter] = useState<string>('ALL');
  const [showArchived, setShowArchived] = useState(false);
  const [projectLabels, setProjectLabels] = useState<LabelItem[]>([]);

  // Modals & Drawers
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(
    initialSelectedTaskId || null
  );

  useEffect(() => {
    labelApi
      .listLabels(organizationId, projectId)
      .then(setProjectLabels)
      .catch(() => {});
  }, [organizationId, projectId]);

  useEffect(() => {
    loadTasks();
  }, [projectId, statusFilter, priorityFilter, assigneeFilter, labelFilter, showArchived]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      loadTasks();
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const loadTasks = async () => {
    try {
      setLoading(true);
      setError(null);

      const filterParams: {
        status?: TaskStatus;
        priority?: TaskPriority;
        assigneeId?: string;
        search?: string;
        archived?: boolean;
        labelIds?: string[];
      } = {};

      if (statusFilter !== 'ALL') filterParams.status = statusFilter as TaskStatus;
      if (priorityFilter !== 'ALL') filterParams.priority = priorityFilter as TaskPriority;
      if (assigneeFilter !== 'ALL') filterParams.assigneeId = assigneeFilter;
      if (labelFilter !== 'ALL') filterParams.labelIds = [labelFilter];
      if (search.trim()) filterParams.search = search.trim();
      if (showArchived) filterParams.archived = true;

      const data = await taskApi.listTasks(organizationId, projectId, filterParams);
      setTasks(data);
    } catch (err: unknown) {
      const apiErr = err as { message?: string };
      setError(apiErr.message || 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  const getPriorityBadge = (priority: TaskPriority) => {
    switch (priority) {
      case TaskPriority.URGENT:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20 rounded-md">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
            Urgent
          </span>
        );
      case TaskPriority.HIGH:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-md">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            High
          </span>
        );
      case TaskPriority.MEDIUM:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded-md">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
            Medium
          </span>
        );
      case TaskPriority.LOW:
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-slate-800 text-slate-400 border border-slate-700 rounded-md">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
            Low
          </span>
        );
    }
  };

  const getStatusBadge = (status: TaskStatus) => {
    switch (status) {
      case TaskStatus.DONE:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full">
            <CheckCircle2 className="w-3 h-3" />
            Done
          </span>
        );
      case TaskStatus.IN_PROGRESS:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-full">
            <Clock className="w-3 h-3" />
            In Progress
          </span>
        );
      case TaskStatus.IN_REVIEW:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-full">
            <Layers className="w-3 h-3" />
            In Review
          </span>
        );
      case TaskStatus.BLOCKED:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-full">
            <AlertCircle className="w-3 h-3" />
            Blocked
          </span>
        );
      case TaskStatus.BACKLOG:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-semibold bg-slate-800 text-slate-400 border border-slate-700 rounded-full">
            Backlog
          </span>
        );
      case TaskStatus.CANCELLED:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-semibold bg-slate-800 text-slate-500 border border-slate-700 line-through rounded-full">
            Cancelled
          </span>
        );
      case TaskStatus.TODO:
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded-full">
            To Do
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Filter Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 p-4 bg-slate-900/60 border border-slate-800 rounded-2xl backdrop-blur-md">
        {/* Search input */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={`Search ${projectKey} tasks by key or title...`}
            className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:border-cyan-500 transition-colors"
          />
        </div>

        {/* Filters dropdown row */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-medium text-slate-300 focus:outline-none focus:border-cyan-500"
          >
            <option value="ALL">All Statuses</option>
            <option value={TaskStatus.TODO}>To Do</option>
            <option value={TaskStatus.IN_PROGRESS}>In Progress</option>
            <option value={TaskStatus.IN_REVIEW}>In Review</option>
            <option value={TaskStatus.DONE}>Done</option>
            <option value={TaskStatus.BACKLOG}>Backlog</option>
            <option value={TaskStatus.BLOCKED}>Blocked</option>
            <option value={TaskStatus.CANCELLED}>Cancelled</option>
          </select>

          {/* Priority filter */}
          <select
            value={priorityFilter}
            onChange={e => setPriorityFilter(e.target.value)}
            className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-medium text-slate-300 focus:outline-none focus:border-cyan-500"
          >
            <option value="ALL">All Priorities</option>
            <option value={TaskPriority.URGENT}>Urgent</option>
            <option value={TaskPriority.HIGH}>High</option>
            <option value={TaskPriority.MEDIUM}>Medium</option>
            <option value={TaskPriority.LOW}>Low</option>
          </select>

          {/* Assignee filter */}
          <select
            value={assigneeFilter}
            onChange={e => setAssigneeFilter(e.target.value)}
            className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-medium text-slate-300 focus:outline-none focus:border-cyan-500"
          >
            <option value="ALL">All Assignees</option>
            {members.map(m => (
              <option key={m.userId} value={m.userId}>
                {m.user.name}
              </option>
            ))}
          </select>

          {/* Label filter */}
          <select
            value={labelFilter}
            onChange={e => setLabelFilter(e.target.value)}
            className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-medium text-slate-300 focus:outline-none focus:border-cyan-500"
          >
            <option value="ALL">All Labels</option>
            {projectLabels.map(l => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>

          {/* Show Archived Toggle */}
          <button
            type="button"
            onClick={() => setShowArchived(!showArchived)}
            className={`px-3 py-2 rounded-xl text-xs font-medium border transition-colors flex items-center gap-1.5 ${
              showArchived
                ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
          >
            <Archive className="w-3.5 h-3.5" />
            <span>Archived</span>
          </button>

          {/* Refresh button */}
          <button
            onClick={loadTasks}
            title="Refresh tasks"
            className="p-2 bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white rounded-xl transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {/* View Mode Toggle */}
          {onViewModeChange && (
            <div className="flex items-center p-0.5 rounded-xl border border-slate-800 bg-slate-950">
              <button
                type="button"
                onClick={() => onViewModeChange('board')}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
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
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  viewMode === 'list'
                    ? 'bg-cyan-950 text-cyan-300 border border-cyan-800/60 shadow-sm'
                    : 'text-taskflow-muted hover:text-white'
                }`}
                title="List view"
              >
                <ListIcon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">List</span>
              </button>
            </div>
          )}

          {/* Create Task CTA */}
          {canManageTasks && (
            <button
              onClick={() => setIsCreateOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-medium text-xs rounded-xl transition-all shadow-lg shadow-cyan-500/20"
            >
              <Plus className="w-4 h-4" />
              <span>Create Task</span>
            </button>
          )}
        </div>
      </div>

      {/* Error display */}
      {error && (
        <div className="flex items-center justify-between p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
          <button onClick={loadTasks} className="underline hover:text-red-300 text-xs">
            Retry
          </button>
        </div>
      )}

      {/* Loading Skeletons */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map(n => (
            <div
              key={n}
              className="h-16 bg-slate-900/60 border border-slate-800/80 rounded-2xl animate-pulse"
            />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && tasks.length === 0 && (
        <div className="flex flex-col items-center justify-center p-12 text-center bg-slate-900/30 border border-dashed border-slate-800 rounded-2xl">
          <div className="p-3 bg-cyan-500/10 rounded-2xl mb-4 border border-cyan-500/20">
            <CheckSquare className="w-8 h-8 text-cyan-400" />
          </div>
          <h3 className="text-base font-semibold text-white mb-1">No tasks found</h3>
          <p className="text-sm text-slate-400 max-w-sm mb-6">
            {search || statusFilter !== 'ALL' || priorityFilter !== 'ALL'
              ? 'No tasks match the selected filters. Try clearing your filters.'
              : 'There are no tasks in this project yet. Create the first task to start tracking work.'}
          </p>
          {canManageTasks && (
            <button
              onClick={() => setIsCreateOpen(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-medium text-sm rounded-xl transition-all shadow-lg shadow-cyan-500/20"
            >
              <Plus className="w-4 h-4" />
              <span>Create First Task</span>
            </button>
          )}
        </div>
      )}

      {/* Tasks Table / Card List */}
      {!loading && tasks.length > 0 && (
        <div className="bg-slate-900/50 border border-slate-800/80 rounded-2xl overflow-hidden backdrop-blur-md shadow-xl">
          <div className="divide-y divide-slate-800/60">
            {tasks.map(task => (
              <div
                key={task.id}
                onClick={() => setSelectedTaskId(task.id)}
                className="group flex flex-col md:flex-row items-start md:items-center justify-between p-4 hover:bg-slate-850/80 cursor-pointer transition-all gap-3"
              >
                {/* Left: Key & Title */}
                <div className="flex items-start md:items-center gap-3.5 flex-1 min-w-0">
                  <span className="px-2.5 py-1 text-xs font-mono font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded-md shrink-0">
                    {task.issueKey}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-sm font-medium text-white group-hover:text-cyan-300 transition-colors truncate">
                      {task.title}
                    </h4>
                    {task.labels && task.labels.length > 0 && (
                      <div
                        className="flex flex-wrap items-center gap-1.5 mt-1.5"
                        onClick={e => e.stopPropagation()}
                      >
                        {task.labels.map(label => (
                          <LabelBadge key={label.id} label={label} size="xs" />
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right: Badges, Assignee, Subtasks, Due date */}
                <div className="flex flex-wrap items-center gap-3 shrink-0 self-end md:self-center">
                  {/* Status */}
                  {getStatusBadge(task.status)}

                  {/* Priority */}
                  {getPriorityBadge(task.priority)}

                  {/* Subtask pill */}
                  {task.subtaskCount > 0 && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-slate-800/80 text-slate-300 border border-slate-700/80 rounded-md">
                      <CheckSquare className="w-3 h-3 text-cyan-400" />
                      <span>
                        {task.completedSubtaskCount}/{task.subtaskCount}
                      </span>
                    </span>
                  )}

                  {/* Dependency pill */}
                  {task.dependencySummary && task.dependencySummary.totalDependencies > 0 && (
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-md border ${
                        task.dependencySummary.hasUnresolvedBlockers
                          ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                          : 'bg-slate-800/80 text-slate-300 border-slate-700/80'
                      }`}
                      title={
                        task.dependencySummary.hasUnresolvedBlockers
                          ? `Blocked by ${task.dependencySummary.blockedByCount} task(s)`
                          : `${task.dependencySummary.totalDependencies} linked dependencies`
                      }
                    >
                      <Link2 className="w-3 h-3 text-cyan-400" />
                      <span>
                        {task.dependencySummary.hasUnresolvedBlockers
                          ? `Blocked (${task.dependencySummary.blockedByCount})`
                          : task.dependencySummary.totalDependencies}
                      </span>
                    </span>
                  )}

                  {/* Due Date */}
                  {task.dueDate && (
                    <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                      <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                      <span>{new Date(task.dueDate).toLocaleDateString()}</span>
                    </span>
                  )}

                  {/* Assignee */}
                  <div className="flex items-center gap-1.5 pl-2 border-l border-slate-800">
                    {task.assignee ? (
                      <div className="flex items-center gap-1.5">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-cyan-500 to-blue-500 flex items-center justify-center text-xs font-bold text-white uppercase">
                          {task.assignee.name.charAt(0)}
                        </div>
                        <span className="text-xs text-slate-300 hidden sm:inline">
                          {task.assignee.name}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-500 italic">Unassigned</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create Task Modal */}
      <CreateTaskModal
        organizationId={organizationId}
        projectId={projectId}
        projectKey={projectKey}
        members={members}
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreated={loadTasks}
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
          onUpdated={loadTasks}
          onDeleted={loadTasks}
        />
      )}
    </div>
  );
};
