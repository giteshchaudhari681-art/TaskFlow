import React, { useState, useEffect } from 'react';
import { X, Sparkles, AlertCircle, RefreshCw, Layers } from 'lucide-react';
import { ProjectStatus } from '@taskflow/shared';
import { createProjectSchema } from '@taskflow/validation';
import { projectApi } from '../../lib/api';

interface CreateProjectModalProps {
  organizationId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (projectId: string) => void;
}

const PRESET_COLORS = [
  { label: 'Cyan', value: '#06b6d4' },
  { label: 'Indigo', value: '#6366f1' },
  { label: 'Emerald', value: '#10b981' },
  { label: 'Amber', value: '#f59e0b' },
  { label: 'Rose', value: '#f43f5e' },
  { label: 'Purple', value: '#a855f7' },
  { label: 'Sky', value: '#0284c7' },
];

export const CreateProjectModal: React.FC<CreateProjectModalProps> = ({
  organizationId,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [name, setName] = useState('');
  const [key, setKey] = useState('');
  const [keyTouched, setKeyTouched] = useState(false);
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<ProjectStatus>(ProjectStatus.PLANNING);
  const [color, setColor] = useState('#06b6d4');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-generate suggested key from name if user hasn't manually edited key
  useEffect(() => {
    if (!keyTouched && name) {
      const words = name.trim().split(/\s+/).filter(Boolean);
      let suggested = '';
      if (words.length === 1) {
        suggested = words[0].slice(0, 4).toUpperCase();
      } else {
        suggested = words
          .slice(0, 4)
          .map(w => w[0])
          .join('')
          .toUpperCase();
      }
      // sanitize to alphanumeric only
      suggested = suggested.replace(/[^A-Z0-9]/g, '');
      if (suggested.length >= 2) {
        setKey(suggested);
      }
    }
  }, [name, keyTouched]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const payload = {
      name: name.trim(),
      key: key.trim().toUpperCase(),
      description: description.trim() || undefined,
      status,
      color,
    };

    const validation = createProjectSchema.safeParse(payload);
    if (!validation.success) {
      const firstIssue = validation.error.issues[0];
      setError(firstIssue?.message || 'Please check project input fields');
      return;
    }

    setLoading(true);
    try {
      const project = await projectApi.createProject(organizationId, payload);
      onSuccess(project.id);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create project';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-lg glass-panel rounded-2xl border border-taskflow-border shadow-2xl p-6 bg-taskflow-surface text-taskflow-text">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-taskflow-border/80">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-indigo-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">Create New Project</h2>
              <p className="text-xs text-taskflow-muted">
                Initialize an isolated project workspace in your organization
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="p-1.5 rounded-lg text-taskflow-muted hover:text-white hover:bg-taskflow-border/40 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-start space-x-2.5">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {/* Project Name & Key grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2 space-y-1.5">
              <label className="text-xs font-semibold text-taskflow-text flex items-center justify-between">
                <span>Project Name *</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Core Engine Platform"
                required
                className="w-full px-3.5 py-2 rounded-xl bg-taskflow-bg/80 border border-taskflow-border focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 text-sm text-white placeholder-taskflow-muted transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-taskflow-text flex items-center justify-between">
                <span>Key *</span>
                <span className="text-[10px] text-taskflow-muted uppercase">2-10 chars</span>
              </label>
              <input
                type="text"
                value={key}
                onChange={e => {
                  setKeyTouched(true);
                  setKey(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''));
                }}
                placeholder="CORE"
                maxLength={10}
                required
                className="w-full px-3.5 py-2 rounded-xl bg-taskflow-bg/80 border border-taskflow-border focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 text-sm font-mono text-cyan-300 placeholder-taskflow-muted uppercase transition-all"
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-taskflow-text">
              Description <span className="text-taskflow-muted font-normal">(Optional)</span>
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Brief summary of project objectives, scope, and target outcomes..."
              rows={3}
              maxLength={500}
              className="w-full px-3.5 py-2 rounded-xl bg-taskflow-bg/80 border border-taskflow-border focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 text-sm text-white placeholder-taskflow-muted transition-all resize-none"
            />
          </div>

          {/* Status & Visual Color Identity */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-taskflow-text">Initial Status</label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value as ProjectStatus)}
                className="w-full px-3.5 py-2 rounded-xl bg-taskflow-bg/80 border border-taskflow-border focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 text-sm text-white transition-all cursor-pointer"
              >
                <option value={ProjectStatus.PLANNING}>Planning</option>
                <option value={ProjectStatus.ACTIVE}>Active</option>
                <option value={ProjectStatus.PAUSED}>Paused</option>
                <option value={ProjectStatus.COMPLETED}>Completed</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-taskflow-text">Visual Identity</label>
              <div className="flex items-center space-x-2 py-1">
                {PRESET_COLORS.map(c => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setColor(c.value)}
                    title={c.label}
                    className={`w-6 h-6 rounded-full transition-transform ${
                      color === c.value
                        ? 'ring-2 ring-white scale-110 shadow-lg'
                        : 'hover:scale-105 opacity-80'
                    }`}
                    style={{ backgroundColor: c.value }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Project Creator Notice */}
          <div className="p-3 rounded-xl bg-cyan-950/30 border border-cyan-800/40 text-[11px] text-cyan-300 flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>You will automatically become the initial project LEAD upon creation.</span>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-taskflow-border/80">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-taskflow-muted hover:text-white hover:bg-taskflow-border/40 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim() || !key.trim()}
              className="px-5 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white shadow-glow-cyan disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 transition-all"
            >
              {loading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
              <span>{loading ? 'Creating...' : 'Create Project'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
