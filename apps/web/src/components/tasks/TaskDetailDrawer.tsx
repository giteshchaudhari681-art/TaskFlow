import React, { useState, useEffect } from 'react';
import {
  X,
  Calendar,
  User,
  Flag,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Trash2,
  Archive,
  Save,
  CheckSquare,
  Square,
  Tag,
} from 'lucide-react';
import {
  TaskDetail,
  TaskStatus,
  TaskPriority,
  ProjectMemberDetail,
  SubtaskItem,
  LabelItem,
} from '@taskflow/shared';
import { taskApi, labelApi } from '../../lib/api';
import { LabelBadge } from '../labels/LabelBadge';
import { LabelPickerPopover } from '../labels/LabelPickerPopover';
import { TaskDependenciesSection } from '../dependencies/TaskDependenciesSection';

interface TaskDetailDrawerProps {
  organizationId: string;
  projectId: string;
  taskId: string;
  projectKey: string;
  members: ProjectMemberDetail[];
  isOpen: boolean;
  onClose: () => void;
  onUpdated: () => void;
  onDeleted?: () => void;
}

export const TaskDetailDrawer: React.FC<TaskDetailDrawerProps> = ({
  organizationId,
  projectId,
  taskId,
  projectKey,
  members,
  isOpen,
  onClose,
  onUpdated,
  onDeleted,
}) => {
  const [task, setTask] = useState<TaskDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<TaskStatus>(TaskStatus.TODO);
  const [priority, setPriority] = useState<TaskPriority>(TaskPriority.MEDIUM);
  const [assigneeId, setAssigneeId] = useState<string>('');
  const [dueDate, setDueDate] = useState<string>('');

  // Subtask creation state
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [isAddingSubtask, setIsAddingSubtask] = useState(false);

  // Label states
  const [projectLabels, setProjectLabels] = useState<LabelItem[]>([]);
  const [isLabelPickerOpen, setIsLabelPickerOpen] = useState(false);

  useEffect(() => {
    if (isOpen && taskId) {
      loadTask();
      loadLabels();
    }
  }, [isOpen, taskId]);

  const loadLabels = async () => {
    try {
      const data = await labelApi.listLabels(organizationId, projectId);
      setProjectLabels(data);
    } catch {
      // Ignore label list error
    }
  };

  const loadTask = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await taskApi.getTask(organizationId, projectId, taskId);
      setTask(data);
      setTitle(data.title);
      setDescription(data.description || '');
      setStatus(data.status);
      setPriority(data.priority);
      setAssigneeId(data.assigneeId || '');
      setDueDate(data.dueDate ? data.dueDate.split('T')[0] : '');
    } catch (err: unknown) {
      const apiErr = err as { message?: string };
      setError(apiErr.message || 'Failed to load task');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!title.trim()) {
      setError('Title cannot be empty');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setSuccessMsg(null);

      const updated = await taskApi.updateTask(organizationId, projectId, taskId, {
        title: title.trim(),
        description: description.trim() || null,
        status,
        priority,
        assigneeId: assigneeId || null,
        dueDate: dueDate ? new Date(dueDate).toISOString() : null,
      });

      setTask(updated);
      setSuccessMsg('Task updated successfully');
      onUpdated();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: unknown) {
      const apiErr = err as { message?: string };
      setError(apiErr.message || 'Failed to update task');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleSubtask = async (subtask: SubtaskItem) => {
    if (!task) return;

    // Optimistic UI update
    const updatedSubtasks = task.subtasks.map(s =>
      s.id === subtask.id ? { ...s, isCompleted: !s.isCompleted } : s
    );
    setTask({ ...task, subtasks: updatedSubtasks });

    try {
      await taskApi.updateSubtask(organizationId, projectId, taskId, subtask.id, {
        isCompleted: !subtask.isCompleted,
      });
      onUpdated();
    } catch (err: unknown) {
      // Revert on error
      loadTask();
      const apiErr = err as { message?: string };
      setError(apiErr.message || 'Failed to update subtask');
    }
  };

  const handleAddSubtask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubtaskTitle.trim() || !task) return;

    try {
      setIsAddingSubtask(true);
      const newSubtask = await taskApi.createSubtask(organizationId, projectId, taskId, {
        title: newSubtaskTitle.trim(),
      });
      setTask({
        ...task,
        subtasks: [...task.subtasks, newSubtask],
      });
      setNewSubtaskTitle('');
      onUpdated();
    } catch (err: unknown) {
      const apiErr = err as { message?: string };
      setError(apiErr.message || 'Failed to create subtask');
    } finally {
      setIsAddingSubtask(false);
    }
  };

  const handleDeleteSubtask = async (subtaskId: string) => {
    if (!task) return;

    const previousSubtasks = [...task.subtasks];
    setTask({
      ...task,
      subtasks: task.subtasks.filter(s => s.id !== subtaskId),
    });

    try {
      await taskApi.deleteSubtask(organizationId, projectId, taskId, subtaskId);
      onUpdated();
    } catch (err: unknown) {
      setTask({ ...task, subtasks: previousSubtasks });
      const apiErr = err as { message?: string };
      setError(apiErr.message || 'Failed to delete subtask');
    }
  };

  const handleArchive = async () => {
    if (!confirm('Are you sure you want to archive this task?')) return;
    try {
      setSaving(true);
      await taskApi.archiveTask(organizationId, projectId, taskId);
      onUpdated();
      onClose();
    } catch (err: unknown) {
      const apiErr = err as { message?: string };
      setError(apiErr.message || 'Failed to archive task');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (
      !confirm(
        'Are you sure you want to permanently delete this task? This action cannot be undone.'
      )
    )
      return;
    try {
      setSaving(true);
      await taskApi.deleteTask(organizationId, projectId, taskId);
      if (onDeleted) onDeleted();
      else onUpdated();
      onClose();
    } catch (err: unknown) {
      const apiErr = err as { message?: string };
      setError(apiErr.message || 'Failed to delete task');
    } finally {
      setSaving(false);
    }
  };

  const completedSubtaskCount = task?.subtasks.filter(s => s.isCompleted).length || 0;
  const totalSubtasks = task?.subtasks.length || 0;
  const progressPercent =
    totalSubtasks > 0 ? Math.round((completedSubtaskCount / totalSubtasks) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-2xl h-full bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-300">
        {/* Drawer Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/80 backdrop-blur-md shrink-0">
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 text-sm font-mono font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 rounded-lg">
              {task?.issueKey || projectKey}
            </span>
            {task?.archivedAt && (
              <span className="px-2 py-0.5 text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-md">
                Archived
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Drawer Body */}
        {loading ? (
          <div className="flex-1 flex items-center justify-center p-12 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {error && (
              <div className="flex items-center gap-2 p-3 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {successMsg && (
              <div className="flex items-center gap-2 p-3 text-sm text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Title Input */}
            <div>
              <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1.5">
                Task Title
              </label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Task title"
                className="w-full text-lg font-semibold px-3.5 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors"
              />
            </div>

            {/* Status & Priority Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1.5">
                  Status
                </label>
                <select
                  value={status}
                  onChange={e => setStatus(e.target.value as TaskStatus)}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-cyan-500 text-sm"
                >
                  <option value={TaskStatus.TODO}>To Do</option>
                  <option value={TaskStatus.IN_PROGRESS}>In Progress</option>
                  <option value={TaskStatus.IN_REVIEW}>In Review</option>
                  <option value={TaskStatus.DONE}>Done</option>
                  <option value={TaskStatus.BACKLOG}>Backlog</option>
                  <option value={TaskStatus.BLOCKED}>Blocked</option>
                  <option value={TaskStatus.CANCELLED}>Cancelled</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Flag className="w-3.5 h-3.5 text-amber-400" />
                  Priority
                </label>
                <select
                  value={priority}
                  onChange={e => setPriority(e.target.value as TaskPriority)}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-cyan-500 text-sm"
                >
                  <option value={TaskPriority.LOW}>Low</option>
                  <option value={TaskPriority.MEDIUM}>Medium</option>
                  <option value={TaskPriority.HIGH}>High</option>
                  <option value={TaskPriority.URGENT}>Urgent</option>
                </select>
              </div>
            </div>

            {/* Assignee & Due Date Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-cyan-400" />
                  Assignee
                </label>
                <select
                  value={assigneeId}
                  onChange={e => setAssigneeId(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-cyan-500 text-sm"
                >
                  <option value="">Unassigned</option>
                  {members.map(m => (
                    <option key={m.userId} value={m.userId}>
                      {m.user.name} ({m.role})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                  Due Date
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={e => setDueDate(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-cyan-500 text-sm"
                />
              </div>
            </div>

            {/* Labels Section */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-cyan-400" />
                  Labels
                </label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsLabelPickerOpen(!isLabelPickerOpen)}
                    className="inline-flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 transition-colors font-medium"
                  >
                    <span>+ Add Label</span>
                  </button>

                  <LabelPickerPopover
                    isOpen={isLabelPickerOpen}
                    onClose={() => setIsLabelPickerOpen(false)}
                    labels={projectLabels}
                    selectedLabelIds={task?.labels?.map(l => l.id) || []}
                    onToggleLabel={async labelId => {
                      const isAssigned = task?.labels?.some(l => l.id === labelId);
                      try {
                        let updated: TaskDetail;
                        if (isAssigned) {
                          updated = await taskApi.removeLabel(
                            organizationId,
                            projectId,
                            taskId,
                            labelId
                          );
                        } else {
                          updated = await taskApi.assignLabel(
                            organizationId,
                            projectId,
                            taskId,
                            labelId
                          );
                        }
                        setTask(updated);
                        onUpdated();
                      } catch (err: unknown) {
                        const apiErr = err as { message?: string };
                        setError(apiErr.message || 'Failed to update label');
                      }
                    }}
                    onCreateLabel={async (name, color) => {
                      try {
                        const created = await labelApi.createLabel(organizationId, projectId, {
                          name,
                          color,
                        });
                        setProjectLabels(prev => [...prev, created]);
                        return created;
                      } catch (err: unknown) {
                        const apiErr = err as { message?: string };
                        setError(apiErr.message || 'Failed to create label');
                        return null;
                      }
                    }}
                    canCreateLabel={true}
                  />
                </div>
              </div>

              {/* Attached Label Badges */}
              <div className="flex flex-wrap items-center gap-2 min-h-[36px] p-2.5 bg-slate-950/60 border border-slate-800 rounded-xl">
                {task?.labels && task.labels.length > 0 ? (
                  task.labels.map(label => (
                    <LabelBadge
                      key={label.id}
                      label={label}
                      size="sm"
                      onRemove={async () => {
                        try {
                          const updated = await taskApi.removeLabel(
                            organizationId,
                            projectId,
                            taskId,
                            label.id
                          );
                          setTask(updated);
                          onUpdated();
                        } catch (err: unknown) {
                          const apiErr = err as { message?: string };
                          setError(apiErr.message || 'Failed to remove label');
                        }
                      }}
                    />
                  ))
                ) : (
                  <span className="text-xs text-slate-500 italic">No labels attached</span>
                )}
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1.5">
                Description
              </label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Add more detailed context or acceptance criteria..."
                rows={4}
                className="w-full px-3.5 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 text-sm resize-none"
              />
            </div>

            {/* Subtasks Section */}
            <div className="pt-4 border-t border-slate-800">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <CheckSquare className="w-4 h-4 text-cyan-400" />
                  <h3 className="text-sm font-semibold text-white">Subtasks</h3>
                  <span className="text-xs text-slate-400">
                    ({completedSubtaskCount}/{totalSubtasks})
                  </span>
                </div>
                {totalSubtasks > 0 && (
                  <span className="text-xs font-medium text-cyan-400">{progressPercent}%</span>
                )}
              </div>

              {/* Progress bar */}
              {totalSubtasks > 0 && (
                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden mb-4">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              )}

              {/* Subtask items */}
              <div className="space-y-2 mb-3">
                {task?.subtasks.map(subtask => (
                  <div
                    key={subtask.id}
                    className="group flex items-center justify-between p-2.5 bg-slate-950/60 border border-slate-800/80 rounded-xl hover:border-slate-700 transition-all"
                  >
                    <button
                      type="button"
                      onClick={() => handleToggleSubtask(subtask)}
                      className="flex items-center gap-3 text-left flex-1"
                    >
                      {subtask.isCompleted ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-500 shrink-0 group-hover:text-slate-400" />
                      )}
                      <span
                        className={`text-sm ${
                          subtask.isCompleted
                            ? 'line-through text-slate-500'
                            : 'text-slate-200 group-hover:text-white'
                        }`}
                      >
                        {subtask.title}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteSubtask(subtask.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-red-400 transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Add subtask inline input */}
              <form onSubmit={handleAddSubtask} className="flex items-center gap-2">
                <input
                  type="text"
                  value={newSubtaskTitle}
                  onChange={e => setNewSubtaskTitle(e.target.value)}
                  placeholder="+ Add a subtask..."
                  className="flex-1 px-3 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
                <button
                  type="submit"
                  disabled={isAddingSubtask || !newSubtaskTitle.trim()}
                  className="px-3 py-1.5 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
                >
                  {isAddingSubtask ? 'Adding...' : 'Add'}
                </button>
              </form>
            </div>

            {/* Task Dependencies Section */}
            <div className="pt-4 border-t border-slate-800">
              <TaskDependenciesSection
                organizationId={organizationId}
                projectId={projectId}
                taskId={taskId}
                canManage={true}
                onDependenciesChanged={() => {
                  loadTask();
                  onUpdated();
                }}
              />
            </div>

            {/* Metadata Footer */}
            <div className="pt-4 border-t border-slate-800 space-y-2 text-xs text-slate-500">
              <div className="flex justify-between">
                <span>Reporter</span>
                <span className="text-slate-400">{task?.reporter?.name || 'Unknown'}</span>
              </div>
              <div className="flex justify-between">
                <span>Created</span>
                <span className="text-slate-400">
                  {task?.createdAt ? new Date(task.createdAt).toLocaleString() : '—'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Last Updated</span>
                <span className="text-slate-400">
                  {task?.updatedAt ? new Date(task.updatedAt).toLocaleString() : '—'}
                </span>
              </div>
              {task?.completedAt && (
                <div className="flex justify-between">
                  <span>Completed At</span>
                  <span className="text-emerald-400">
                    {new Date(task.completedAt).toLocaleString()}
                  </span>
                </div>
              )}
            </div>

            {/* Danger Zone */}
            <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
              <button
                type="button"
                onClick={handleArchive}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-amber-400/80 hover:text-amber-300 hover:bg-amber-500/10 rounded-lg transition-colors"
              >
                <Archive className="w-3.5 h-3.5" />
                <span>{task?.archivedAt ? 'Archived' : 'Archive Task'}</span>
              </button>

              <button
                type="button"
                onClick={handleDelete}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-400/80 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Task</span>
              </button>
            </div>
          </div>
        )}

        {/* Drawer Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-900/80 backdrop-blur-md flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-white transition-colors"
          >
            Close
          </button>
          <button
            type="button"
            onClick={() => handleSave()}
            disabled={saving || !title.trim()}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-sm font-medium rounded-xl shadow-lg shadow-cyan-500/20 disabled:opacity-50 transition-all"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save Changes</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
