import React, { useState } from 'react';
import { X, AlertCircle, Loader2, Calendar, AlignLeft } from 'lucide-react';
import { MilestoneStatus, CreateMilestonePayload } from '@taskflow/shared';

interface CreateMilestoneModalProps {
  onClose: () => void;
  onSubmit: (data: CreateMilestonePayload) => Promise<void>;
}

export const CreateMilestoneModal: React.FC<CreateMilestoneModalProps> = ({
  onClose,
  onSubmit,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [status, setStatus] = useState<MilestoneStatus>(MilestoneStatus.OPEN);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError('Milestone title is required.');
      return;
    }
    if (startDate && dueDate && new Date(startDate) > new Date(dueDate)) {
      setError('Start date must be on or before the due date.');
      return;
    }

    setLoading(true);
    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim() || null,
        startDate: startDate || null,
        dueDate: dueDate || null,
        status,
      });
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create milestone');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-lg glass-panel rounded-2xl border border-taskflow-border shadow-2xl p-6 bg-taskflow-surface space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-white">Create Milestone</h2>
            <p className="text-xs text-taskflow-muted mt-0.5">
              Define a project checkpoint or delivery target
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-taskflow-muted hover:text-white hover:bg-taskflow-bg transition-colors"
            aria-label="Close create milestone dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div
            className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2"
            role="alert"
          >
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-taskflow-text" htmlFor="ms-title">
              Title <span className="text-rose-400">*</span>
            </label>
            <input
              id="ms-title"
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Design Phase, Launch v1.0"
              maxLength={200}
              required
              className="w-full px-3.5 py-2 rounded-xl bg-taskflow-bg/80 border border-taskflow-border focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 text-sm text-white placeholder-taskflow-muted transition-all"
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label
              className="text-xs font-semibold text-taskflow-text flex items-center gap-1.5"
              htmlFor="ms-desc"
            >
              <AlignLeft className="w-3.5 h-3.5" aria-hidden="true" />
              Description
            </label>
            <textarea
              id="ms-desc"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="What does this milestone represent?"
              rows={2}
              maxLength={5000}
              className="w-full px-3.5 py-2 rounded-xl bg-taskflow-bg/80 border border-taskflow-border focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 text-sm text-white placeholder-taskflow-muted transition-all resize-none"
            />
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label
                className="text-xs font-semibold text-taskflow-text flex items-center gap-1.5"
                htmlFor="ms-start"
              >
                <Calendar className="w-3.5 h-3.5" aria-hidden="true" />
                Start Date
              </label>
              <input
                id="ms-start"
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-taskflow-bg/80 border border-taskflow-border focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 text-sm text-white transition-all"
              />
            </div>
            <div className="space-y-1.5">
              <label
                className="text-xs font-semibold text-taskflow-text flex items-center gap-1.5"
                htmlFor="ms-due"
              >
                <Calendar className="w-3.5 h-3.5" aria-hidden="true" />
                Due Date
              </label>
              <input
                id="ms-due"
                type="date"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                min={startDate || undefined}
                className="w-full px-3.5 py-2 rounded-xl bg-taskflow-bg/80 border border-taskflow-border focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 text-sm text-white transition-all"
              />
            </div>
          </div>

          {/* Status */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-taskflow-text" htmlFor="ms-status">
              Status
            </label>
            <select
              id="ms-status"
              value={status}
              onChange={e => setStatus(e.target.value as MilestoneStatus)}
              className="w-full px-3.5 py-2 rounded-xl bg-taskflow-bg/80 border border-taskflow-border focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 text-sm text-white transition-all cursor-pointer"
            >
              <option value={MilestoneStatus.OPEN}>Open</option>
              <option value={MilestoneStatus.COMPLETED}>Completed</option>
              <option value={MilestoneStatus.CLOSED}>Closed</option>
            </select>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-taskflow-muted hover:text-white bg-taskflow-surface border border-taskflow-border hover:bg-taskflow-bg transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !title.trim()}
              className="px-5 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white shadow-glow-cyan disabled:opacity-50 flex items-center gap-2 transition-all cursor-pointer"
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Create Milestone</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
