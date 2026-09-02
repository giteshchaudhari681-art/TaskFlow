import React, { useState, useEffect, useCallback } from 'react';
import { Link2, Plus, X, AlertTriangle, Loader2, ShieldAlert, Search } from 'lucide-react';
import {
  TaskDependenciesResponse,
  TaskDependencyItem,
  DependencyType,
  TaskListItem,
  TaskStatus,
  TaskPriority,
} from '@taskflow/shared';
import { dependencyApi, taskApi } from '../../lib/api';

interface TaskDependenciesSectionProps {
  organizationId: string;
  projectId: string;
  taskId: string;
  canManage: boolean;
  onDependenciesChanged?: () => void;
  onSelectTask?: (taskId: string) => void;
}

export const TaskDependenciesSection: React.FC<TaskDependenciesSectionProps> = ({
  organizationId,
  projectId,
  taskId,
  canManage,
  onDependenciesChanged,
  onSelectTask,
}) => {
  const [data, setData] = useState<TaskDependenciesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Add dependency state
  const [isAdding, setIsAdding] = useState(false);
  const [depType, setDepType] = useState<DependencyType>(DependencyType.BLOCKS);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<TaskListItem[]>([]);
  const [selectedTargetTask, setSelectedTargetTask] = useState<TaskListItem | null>(null);
  const [searching, setSearching] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Deleting state
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadDependencies = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await dependencyApi.getTaskDependencies(organizationId, projectId, taskId);
      setData(res);
    } catch (err: unknown) {
      const apiErr = err as { message?: string };
      setError(apiErr.message || 'Failed to load task dependencies');
    } finally {
      setLoading(false);
    }
  }, [organizationId, projectId, taskId]);

  useEffect(() => {
    loadDependencies();
  }, [loadDependencies]);

  // Search tasks when user types
  useEffect(() => {
    if (!isAdding || !searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const tasks = await taskApi.listTasks(organizationId, projectId, {
          search: searchQuery.trim(),
        });
        // Filter out current task and tasks already in dependencies
        const linkedIds = new Set<string>();
        linkedIds.add(taskId);
        if (data) {
          data.blockedBy.forEach(d => linkedIds.add(d.task.id));
          data.blocks.forEach(d => linkedIds.add(d.task.id));
          data.related.forEach(d => linkedIds.add(d.task.id));
        }

        setSearchResults(tasks.filter(t => !linkedIds.has(t.id)));
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery, isAdding, organizationId, projectId, taskId, data]);

  const handleCreateDependency = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTargetTask) {
      setFormError('Please select a target task');
      return;
    }

    try {
      setSubmitting(true);
      setFormError(null);
      await dependencyApi.createDependency(organizationId, projectId, taskId, {
        targetTaskId: selectedTargetTask.id,
        type: depType,
      });

      setIsAdding(false);
      setSelectedTargetTask(null);
      setSearchQuery('');
      await loadDependencies();
      if (onDependenciesChanged) onDependenciesChanged();
    } catch (err: unknown) {
      const apiErr = err as { message?: string; error?: { message?: string } };
      setFormError(apiErr.error?.message || apiErr.message || 'Failed to create dependency');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteDependency = async (dependencyId: string) => {
    try {
      setDeletingId(dependencyId);
      await dependencyApi.deleteDependency(organizationId, projectId, taskId, dependencyId);
      await loadDependencies();
      if (onDependenciesChanged) onDependenciesChanged();
    } catch (err: unknown) {
      const apiErr = err as { message?: string };
      setError(apiErr.message || 'Failed to delete dependency');
    } finally {
      setDeletingId(null);
    }
  };

  const getStatusBadgeClass = (status: TaskStatus) => {
    switch (status) {
      case TaskStatus.DONE:
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case TaskStatus.IN_PROGRESS:
        return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30';
      case TaskStatus.IN_REVIEW:
        return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30';
      case TaskStatus.BLOCKED:
        return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  const getPriorityBadgeClass = (priority: TaskPriority) => {
    switch (priority) {
      case TaskPriority.URGENT:
        return 'text-rose-400';
      case TaskPriority.HIGH:
        return 'text-amber-400';
      case TaskPriority.MEDIUM:
        return 'text-cyan-400';
      default:
        return 'text-slate-400';
    }
  };

  const renderDependencyCard = (item: TaskDependencyItem, isBlocker: boolean) => {
    const isUnresolved =
      isBlocker &&
      item.task.status !== TaskStatus.DONE &&
      item.task.status !== TaskStatus.CANCELLED;

    return (
      <div
        key={item.id}
        className={`group flex items-center justify-between p-3 rounded-xl border transition-all ${
          isUnresolved
            ? 'bg-rose-950/20 border-rose-900/40 hover:border-rose-700/60'
            : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
        }`}
      >
        <div
          className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
          onClick={() => onSelectTask && onSelectTask(item.task.id)}
        >
          <span className="text-xs font-mono font-bold text-cyan-400 shrink-0">
            {item.task.issueKey}
          </span>
          <span className="text-xs text-slate-200 font-medium truncate">{item.task.title}</span>
          <span
            className={`px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-md border shrink-0 ${getStatusBadgeClass(
              item.task.status
            )}`}
          >
            {item.task.status.replace('_', ' ')}
          </span>
          <span
            className={`text-[10px] font-medium shrink-0 ${getPriorityBadgeClass(item.task.priority)}`}
          >
            {item.task.priority}
          </span>
          {isUnresolved && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-semibold bg-rose-500/20 text-rose-300 rounded border border-rose-500/30 shrink-0">
              <AlertTriangle className="w-3 h-3" />
              Unresolved
            </span>
          )}
        </div>

        {canManage && (
          <button
            type="button"
            onClick={() => handleDeleteDependency(item.id)}
            disabled={deletingId === item.id}
            className="p-1 text-slate-500 hover:text-rose-400 rounded transition-colors opacity-80 group-hover:opacity-100 ml-2"
            title="Remove dependency"
          >
            {deletingId === item.id ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <X className="w-3.5 h-3.5" />
            )}
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link2 className="w-4 h-4 text-cyan-400" />
          <h3 className="text-xs font-medium text-slate-400 uppercase tracking-wider">
            Dependencies
          </h3>
          {data && data.totalCount > 0 && (
            <span className="px-1.5 py-0.5 text-[10px] font-bold bg-slate-800 text-slate-300 rounded-full">
              {data.totalCount}
            </span>
          )}
          {data?.hasUnresolvedBlockers && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold bg-rose-500/20 text-rose-300 rounded-full border border-rose-500/30">
              <ShieldAlert className="w-3 h-3" />
              Blocked
            </span>
          )}
        </div>

        {canManage && !isAdding && (
          <button
            type="button"
            onClick={() => {
              setIsAdding(true);
              setFormError(null);
            }}
            className="inline-flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 transition-colors font-medium"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Dependency</span>
          </button>
        )}
      </div>

      {/* Error alert */}
      {error && (
        <div className="flex items-center gap-2 p-2.5 text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-xl">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Add Dependency Inline Form */}
      {isAdding && (
        <form
          onSubmit={handleCreateDependency}
          className="p-4 bg-slate-950 border border-cyan-500/30 rounded-xl space-y-3 shadow-lg shadow-cyan-950/20 animate-in fade-in duration-200"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-white">New Dependency</span>
            <button
              type="button"
              onClick={() => {
                setIsAdding(false);
                setSelectedTargetTask(null);
                setSearchQuery('');
                setFormError(null);
              }}
              className="text-slate-500 hover:text-slate-300"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {formError && (
            <div className="flex items-center gap-2 p-2 text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-1">
              <label className="block text-[10px] font-medium text-slate-400 uppercase tracking-wider mb-1">
                Relationship
              </label>
              <select
                value={depType}
                onChange={e => setDepType(e.target.value as DependencyType)}
                className="w-full px-2.5 py-1.5 text-xs bg-slate-900 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-cyan-500"
              >
                <option value={DependencyType.BLOCKS}>Blocks</option>
                <option value={DependencyType.BLOCKED_BY}>Blocked By</option>
                <option value={DependencyType.RELATES_TO}>Relates To</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[10px] font-medium text-slate-400 uppercase tracking-wider mb-1">
                Target Task
              </label>
              {selectedTargetTask ? (
                <div className="flex items-center justify-between px-3 py-1.5 bg-slate-900 border border-cyan-500/40 rounded-lg">
                  <div className="flex items-center gap-2 truncate">
                    <span className="text-xs font-mono font-bold text-cyan-400 shrink-0">
                      {selectedTargetTask.issueKey}
                    </span>
                    <span className="text-xs text-slate-200 truncate">
                      {selectedTargetTask.title}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedTargetTask(null)}
                    className="text-slate-400 hover:text-white ml-2"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-slate-500" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      placeholder="Search key or title..."
                      className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-900 border border-slate-800 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                    />
                    {searching && (
                      <Loader2 className="absolute right-2.5 top-2 w-3.5 h-3.5 animate-spin text-cyan-400" />
                    )}
                  </div>

                  {/* Autocomplete Dropdown */}
                  {searchQuery.trim() && searchResults.length > 0 && (
                    <div className="absolute left-0 right-0 top-full mt-1 max-h-48 overflow-y-auto bg-slate-900 border border-slate-800 rounded-lg shadow-xl z-20 divide-y divide-slate-800/60">
                      {searchResults.map(task => (
                        <button
                          key={task.id}
                          type="button"
                          onClick={() => {
                            setSelectedTargetTask(task);
                            setSearchQuery('');
                            setSearchResults([]);
                          }}
                          className="w-full flex items-center justify-between p-2 hover:bg-slate-800/80 text-left transition-colors"
                        >
                          <div className="flex items-center gap-2 truncate">
                            <span className="text-xs font-mono font-bold text-cyan-400 shrink-0">
                              {task.issueKey}
                            </span>
                            <span className="text-xs text-slate-200 truncate">{task.title}</span>
                          </div>
                          <span
                            className={`px-1.5 py-0.5 text-[9px] font-semibold uppercase rounded border shrink-0 ${getStatusBadgeClass(
                              task.status
                            )}`}
                          >
                            {task.status.replace('_', ' ')}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}

                  {searchQuery.trim() && !searching && searchResults.length === 0 && (
                    <div className="absolute left-0 right-0 top-full mt-1 p-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-500 text-center z-20">
                      No eligible tasks found
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => {
                setIsAdding(false);
                setSelectedTargetTask(null);
                setSearchQuery('');
                setFormError(null);
              }}
              className="px-3 py-1.5 text-xs text-slate-400 hover:text-white rounded-lg hover:bg-slate-850"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !selectedTargetTask}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 rounded-lg shadow-sm"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Connecting...</span>
                </>
              ) : (
                <span>Save Dependency</span>
              )}
            </button>
          </div>
        </form>
      )}

      {/* Loading state */}
      {loading ? (
        <div className="flex items-center justify-center p-6 text-slate-500">
          <Loader2 className="w-5 h-5 animate-spin text-cyan-400" />
        </div>
      ) : (
        <div className="space-y-4">
          {/* Blocked By List */}
          {data && data.blockedBy.length > 0 && (
            <div className="space-y-2">
              <span className="block text-[11px] font-semibold text-rose-400 uppercase tracking-wider">
                Blocked By ({data.blockedBy.length})
              </span>
              <div className="space-y-1.5">
                {data.blockedBy.map(item => renderDependencyCard(item, true))}
              </div>
            </div>
          )}

          {/* Blocks List */}
          {data && data.blocks.length > 0 && (
            <div className="space-y-2">
              <span className="block text-[11px] font-semibold text-cyan-400 uppercase tracking-wider">
                Blocks ({data.blocks.length})
              </span>
              <div className="space-y-1.5">
                {data.blocks.map(item => renderDependencyCard(item, false))}
              </div>
            </div>
          )}

          {/* Related Tasks List */}
          {data && data.related.length > 0 && (
            <div className="space-y-2">
              <span className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Related Tasks ({data.related.length})
              </span>
              <div className="space-y-1.5">
                {data.related.map(item => renderDependencyCard(item, false))}
              </div>
            </div>
          )}

          {/* Empty state */}
          {data && data.totalCount === 0 && !isAdding && (
            <div className="p-4 bg-slate-950/40 border border-slate-800/80 rounded-xl text-center text-xs text-slate-500 italic">
              No dependencies linked to this task
            </div>
          )}
        </div>
      )}
    </div>
  );
};
