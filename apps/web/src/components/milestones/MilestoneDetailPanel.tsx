import React, { useState } from 'react';
import {
  X,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Clock,
  BarChart3,
  XCircle,
  Loader2,
  AlertCircle,
  Trash2,
  Edit3,
  Save,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  MilestoneDetail,
  MilestoneStatus,
  MilestoneTaskItem,
  UpdateMilestonePayload,
} from '@taskflow/shared';

interface MilestoneDetailPanelProps {
  milestone: MilestoneDetail;
  onClose: () => void;
  onUpdate: (data: UpdateMilestonePayload) => Promise<void>;
  onDelete: () => Promise<void>;
  canEdit: boolean;
}

const HEALTH_CONFIG: Record<string, { icon: React.ElementType; label: string; color: string }> = {
  COMPLETED: { icon: CheckCircle2, label: 'Completed', color: 'text-emerald-400' },
  OVERDUE: { icon: AlertTriangle, label: 'Overdue', color: 'text-rose-400' },
  AT_RISK: { icon: Clock, label: 'At Risk', color: 'text-amber-400' },
  ON_TRACK: { icon: BarChart3, label: 'On Track', color: 'text-cyan-400' },
  NO_DATE: { icon: XCircle, label: 'No Date', color: 'text-taskflow-muted' },
};

const STATUS_COLORS: Record<string, string> = {
  TODO: 'bg-taskflow-surface text-taskflow-muted',
  BACKLOG: 'bg-taskflow-surface text-taskflow-muted',
  IN_PROGRESS: 'bg-blue-500/20 text-blue-300',
  IN_REVIEW: 'bg-indigo-500/20 text-indigo-300',
  BLOCKED: 'bg-rose-500/20 text-rose-300',
  DONE: 'bg-emerald-500/20 text-emerald-300',
  CANCELLED: 'bg-taskflow-surface text-taskflow-muted line-through',
};

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function toDateInput(iso: string | null): string {
  if (!iso) return '';
  return iso.slice(0, 10);
}

export const MilestoneDetailPanel: React.FC<MilestoneDetailPanelProps> = ({
  milestone,
  onClose,
  onUpdate,
  onDelete,
  canEdit,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(milestone.title);
  const [description, setDescription] = useState(milestone.description ?? '');
  const [startDate, setStartDate] = useState(toDateInput(milestone.startDate));
  const [dueDate, setDueDate] = useState(toDateInput(milestone.dueDate));
  const [status, setStatus] = useState<MilestoneStatus>(milestone.status);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [showAllTasks, setShowAllTasks] = useState(false);

  const health = HEALTH_CONFIG[milestone.health as string] ?? HEALTH_CONFIG.NO_DATE;
  const HealthIcon = health.icon;
  const displayedTasks = showAllTasks ? milestone.tasks : milestone.tasks.slice(0, 5);

  const handleSave = async () => {
    setEditError(null);
    if (!title.trim()) {
      setEditError('Title is required');
      return;
    }
    if (startDate && dueDate && new Date(startDate) > new Date(dueDate)) {
      setEditError('Start date must be on or before due date');
      return;
    }
    setSaving(true);
    try {
      await onUpdate({
        title: title.trim(),
        description: description.trim() || null,
        startDate: startDate || null,
        dueDate: dueDate || null,
        status,
      });
      setIsEditing(false);
    } catch (err: unknown) {
      setEditError(err instanceof Error ? err.message : 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await onDelete();
      onClose();
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-end p-4 bg-black/50 backdrop-blur-sm animate-fadeIn"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-lg h-full max-h-[calc(100vh-2rem)] overflow-y-auto glass-panel rounded-2xl border border-taskflow-border shadow-2xl bg-taskflow-surface flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 p-6 border-b border-taskflow-border/60 sticky top-0 bg-taskflow-surface z-10">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className={`p-1.5 rounded-lg bg-taskflow-bg`}>
              <HealthIcon className={`w-4 h-4 ${health.color}`} aria-hidden="true" />
            </div>
            <div className="min-w-0">
              {isEditing ? (
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="w-full bg-transparent border-b border-cyan-500 text-sm font-bold text-white focus:outline-none pb-0.5"
                  aria-label="Milestone title"
                />
              ) : (
                <h2 className="text-sm font-bold text-white truncate">{milestone.title}</h2>
              )}
              <span className={`text-[11px] font-semibold ${health.color}`}>{health.label}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {canEdit && !isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="p-1.5 rounded-lg text-taskflow-muted hover:text-cyan-400 hover:bg-taskflow-bg transition-colors"
                aria-label="Edit milestone"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
            )}
            {isEditing && (
              <button
                onClick={handleSave}
                disabled={saving}
                className="p-1.5 rounded-lg text-taskflow-muted hover:text-emerald-400 hover:bg-taskflow-bg transition-colors"
                aria-label="Save milestone edits"
              >
                {saving ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-taskflow-muted hover:text-white hover:bg-taskflow-bg transition-colors"
              aria-label="Close milestone panel"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 p-6 space-y-5 overflow-y-auto">
          {editError && (
            <div
              className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2"
              role="alert"
            >
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{editError}</span>
            </div>
          )}

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase font-bold text-taskflow-muted tracking-wider">
              Description
            </label>
            {isEditing ? (
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={2}
                placeholder="Add a description..."
                className="w-full px-3 py-2 rounded-xl bg-taskflow-bg/80 border border-taskflow-border focus:border-cyan-500 focus:outline-none text-xs text-white resize-none transition-all"
                aria-label="Milestone description"
              />
            ) : (
              <p className="text-xs text-taskflow-text leading-relaxed">
                {milestone.description || (
                  <span className="text-taskflow-muted/60 italic">No description</span>
                )}
              </p>
            )}
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-bold text-taskflow-muted tracking-wider flex items-center gap-1.5">
                <Calendar className="w-3 h-3" aria-hidden="true" />
                Start Date
              </label>
              {isEditing ? (
                <input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl bg-taskflow-bg border border-taskflow-border focus:border-cyan-500 focus:outline-none text-xs text-white transition-all"
                />
              ) : (
                <p className="text-xs text-white">{formatDate(milestone.startDate)}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-bold text-taskflow-muted tracking-wider flex items-center gap-1.5">
                <Calendar className="w-3 h-3" aria-hidden="true" />
                Due Date
              </label>
              {isEditing ? (
                <input
                  type="date"
                  value={dueDate}
                  onChange={e => setDueDate(e.target.value)}
                  min={startDate || undefined}
                  className="w-full px-3 py-1.5 rounded-xl bg-taskflow-bg border border-taskflow-border focus:border-cyan-500 focus:outline-none text-xs text-white transition-all"
                />
              ) : (
                <p
                  className={`text-xs ${milestone.health === 'OVERDUE' ? 'text-rose-400 font-semibold' : 'text-white'}`}
                >
                  {formatDate(milestone.dueDate)}
                </p>
              )}
            </div>
          </div>

          {/* Status */}
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase font-bold text-taskflow-muted tracking-wider">
              Status
            </label>
            {isEditing ? (
              <select
                value={status}
                onChange={e => setStatus(e.target.value as MilestoneStatus)}
                className="w-full px-3 py-1.5 rounded-xl bg-taskflow-bg border border-taskflow-border focus:border-cyan-500 focus:outline-none text-xs text-white cursor-pointer transition-all"
              >
                <option value={MilestoneStatus.OPEN}>Open</option>
                <option value={MilestoneStatus.COMPLETED}>Completed</option>
                <option value={MilestoneStatus.CLOSED}>Closed</option>
              </select>
            ) : (
              <span className="text-xs font-semibold text-white">{milestone.status}</span>
            )}
          </div>

          {/* Progress */}
          <div className="glass-panel rounded-xl border border-taskflow-border p-4 bg-taskflow-bg/40 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-taskflow-muted uppercase tracking-wider text-[10px]">
                Progress
              </span>
              <span
                className={`font-bold text-base ${milestone.progress === 100 ? 'text-emerald-400' : 'text-white'}`}
              >
                {milestone.progress}%
              </span>
            </div>
            <div
              className="h-2 bg-taskflow-surface rounded-full overflow-hidden"
              role="progressbar"
              aria-valuenow={milestone.progress}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className={`h-full rounded-full transition-all duration-700 ${milestone.progress === 100 ? 'bg-emerald-500' : 'bg-gradient-to-r from-cyan-500 to-indigo-500'}`}
                style={{ width: `${milestone.progress}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-taskflow-muted">
              <span>
                {milestone.completedTaskCount} of {milestone.taskCount} tasks complete
              </span>
              {milestone.taskCount === 0 && (
                <span className="text-amber-400">No tasks assigned</span>
              )}
            </div>
          </div>

          {/* Tasks */}
          <div className="space-y-2">
            <div className="text-[10px] uppercase font-bold text-taskflow-muted tracking-wider flex items-center justify-between">
              <span>Tasks ({milestone.tasks.length})</span>
            </div>
            {milestone.tasks.length === 0 ? (
              <p className="text-xs text-taskflow-muted/60 italic py-2">
                No tasks assigned to this milestone yet.
              </p>
            ) : (
              <div className="space-y-1.5">
                {displayedTasks.map((task: MilestoneTaskItem) => (
                  <div
                    key={task.id}
                    className="flex items-center gap-2.5 p-2.5 rounded-xl bg-taskflow-bg/60 border border-taskflow-border/40 hover:border-taskflow-border transition-colors"
                  >
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${STATUS_COLORS[task.status] ?? 'bg-taskflow-surface text-taskflow-muted'}`}
                    >
                      {task.status.replace('_', ' ')}
                    </span>
                    <span className="font-mono text-[10px] text-taskflow-muted flex-shrink-0">
                      {task.issueKey}
                    </span>
                    <span className="text-xs text-white truncate flex-1">{task.title}</span>
                    {task.assignee && (
                      <div
                        className="w-5 h-5 rounded-full bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0"
                        title={task.assignee.name}
                        aria-label={`Assigned to ${task.assignee.name}`}
                      >
                        {task.assignee.name.charAt(0)}
                      </div>
                    )}
                  </div>
                ))}
                {milestone.tasks.length > 5 && (
                  <button
                    onClick={() => setShowAllTasks(!showAllTasks)}
                    className="flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 transition-colors py-1"
                    aria-expanded={showAllTasks}
                    aria-label={
                      showAllTasks ? 'Show fewer tasks' : `Show all ${milestone.tasks.length} tasks`
                    }
                  >
                    {showAllTasks ? (
                      <ChevronUp className="w-3 h-3" />
                    ) : (
                      <ChevronDown className="w-3 h-3" />
                    )}
                    {showAllTasks ? 'Show less' : `Show all ${milestone.tasks.length} tasks`}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Delete zone */}
          {canEdit && (
            <div className="glass-panel rounded-xl border border-rose-500/20 p-4 bg-rose-500/5 space-y-2.5">
              <p className="text-[11px] font-semibold text-rose-400">Danger Zone</p>
              <p className="text-[11px] text-taskflow-muted leading-relaxed">
                Deleting this milestone will NOT delete its tasks. Tasks will be unassigned from
                this milestone.
              </p>
              {!confirmDelete ? (
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="px-3 py-1.5 rounded-lg text-[11px] font-semibold text-rose-400 border border-rose-500/30 hover:bg-rose-500/10 transition-colors flex items-center gap-1.5"
                >
                  <Trash2 className="w-3 h-3" />
                  Delete Milestone
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="px-3 py-1.5 rounded-lg text-[11px] font-semibold text-white bg-rose-600 hover:bg-rose-500 transition-colors flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {deleting ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Trash2 className="w-3 h-3" />
                    )}
                    Confirm Delete
                  </button>
                  <button
                    onClick={() => setConfirmDelete(false)}
                    className="px-3 py-1.5 rounded-lg text-[11px] font-semibold text-taskflow-muted hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
