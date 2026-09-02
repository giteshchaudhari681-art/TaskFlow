import React, { useState, useEffect, useCallback } from 'react';
import { Tag, Plus, Edit2, Trash2, Search, Loader2, AlertCircle, X, Check } from 'lucide-react';
import { LabelItem, LABEL_COLORS, ProjectRole } from '@taskflow/shared';
import { labelApi } from '../../lib/api';
import { LabelBadge, getLabelColors } from './LabelBadge';

interface ProjectLabelsSettingsProps {
  organizationId: string;
  projectId: string;
  currentUserRole?: ProjectRole;
  isOrgAdmin?: boolean;
}

export const ProjectLabelsSettings: React.FC<ProjectLabelsSettingsProps> = ({
  organizationId,
  projectId,
  currentUserRole,
  isOrgAdmin = false,
}) => {
  const [labels, setLabels] = useState<LabelItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingLabel, setEditingLabel] = useState<LabelItem | null>(null);
  const [deletingLabel, setDeletingLabel] = useState<LabelItem | null>(null);

  // Form states
  const [formName, setFormName] = useState('');
  const [formColor, setFormColor] = useState<string>('cyan');
  const [formDescription, setFormDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const canManageLabels =
    isOrgAdmin || currentUserRole === ProjectRole.LEAD || currentUserRole === ProjectRole.ADMIN;

  const fetchLabels = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await labelApi.listLabels(organizationId, projectId);
      setLabels(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load project labels');
    } finally {
      setIsLoading(false);
    }
  }, [organizationId, projectId]);

  useEffect(() => {
    fetchLabels();
  }, [fetchLabels]);

  const openCreateModal = () => {
    setFormName('');
    setFormColor('cyan');
    setFormDescription('');
    setFormError(null);
    setIsCreateModalOpen(true);
  };

  const openEditModal = (label: LabelItem) => {
    setEditingLabel(label);
    setFormName(label.name);
    setFormColor(label.color);
    setFormDescription(label.description || '');
    setFormError(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setFormError('Label name is required');
      return;
    }

    try {
      setIsSaving(true);
      setFormError(null);

      if (editingLabel) {
        const updated = await labelApi.updateLabel(organizationId, projectId, editingLabel.id, {
          name: formName.trim(),
          color: formColor,
          description: formDescription.trim() || null,
        });
        setLabels(prev => prev.map(l => (l.id === updated.id ? updated : l)));
        setEditingLabel(null);
      } else {
        const created = await labelApi.createLabel(organizationId, projectId, {
          name: formName.trim(),
          color: formColor,
          description: formDescription.trim() || null,
        });
        setLabels(prev => [...prev, created]);
        setIsCreateModalOpen(false);
      }
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Failed to save label');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingLabel) return;
    try {
      setIsSaving(true);
      await labelApi.deleteLabel(organizationId, projectId, deletingLabel.id);
      setLabels(prev => prev.filter(l => l.id !== deletingLabel.id));
      setDeletingLabel(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete label');
    } finally {
      setIsSaving(false);
    }
  };

  const filteredLabels = labels.filter(label =>
    label.name.toLowerCase().includes(search.trim().toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
        <div>
          <h2 className="text-lg font-semibold text-zinc-100 flex items-center gap-2">
            <Tag className="w-5 h-5 text-cyan-400" />
            Project Labels & Tags
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Categorize, organize, and filter tasks across your execution boards and lists.
          </p>
        </div>

        {canManageLabels && (
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-medium text-xs transition-colors shadow-lg shadow-cyan-500/10 shrink-0"
          >
            <Plus className="w-4 h-4" />
            New Label
          </button>
        )}
      </div>

      {/* Search Toolbar */}
      <div className="flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search project labels..."
            className="w-full pl-9 pr-3 py-1.5 bg-zinc-900/80 border border-zinc-800 rounded-md text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-cyan-500/50"
          />
        </div>
        <div className="text-xs text-zinc-500">
          {labels.length} {labels.length === 1 ? 'label' : 'labels'} configured
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
          <button
            type="button"
            onClick={fetchLabels}
            className="ml-auto underline hover:text-rose-200"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading Skeleton */}
      {isLoading ? (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-14 bg-zinc-900/50 border border-zinc-800/60 rounded-lg animate-pulse"
            />
          ))}
        </div>
      ) : filteredLabels.length === 0 ? (
        /* Empty State */
        <div className="p-8 text-center border border-zinc-800/80 rounded-xl bg-zinc-900/30 flex flex-col items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-zinc-800/50 flex items-center justify-center text-zinc-500 mb-3">
            <Tag className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-medium text-zinc-200">No labels found</h3>
          <p className="text-xs text-zinc-500 mt-1 max-w-sm">
            {search
              ? 'No labels match your search query.'
              : 'Labels make it easy to organize, prioritize, and filter tasks on your Kanban board.'}
          </p>
          {canManageLabels && !search && (
            <button
              type="button"
              onClick={openCreateModal}
              className="mt-4 px-3 py-1.5 rounded-md bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-200 font-medium transition-colors"
            >
              Create first label
            </button>
          )}
        </div>
      ) : (
        /* Labels Table */
        <div className="border border-zinc-800/80 rounded-lg overflow-hidden bg-zinc-900/20">
          <table className="w-full text-left text-xs text-zinc-300">
            <thead className="bg-zinc-900/60 border-b border-zinc-800 text-zinc-400 uppercase tracking-wider font-medium text-[11px]">
              <tr>
                <th className="px-4 py-3">Label</th>
                <th className="px-4 py-3 hidden md:table-cell">Description</th>
                <th className="px-4 py-3 text-center">Tasks</th>
                {canManageLabels && <th className="px-4 py-3 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {filteredLabels.map(label => (
                <tr key={label.id} className="hover:bg-zinc-800/30 transition-colors">
                  <td className="px-4 py-3 font-medium">
                    <LabelBadge label={label} size="sm" />
                  </td>
                  <td className="px-4 py-3 text-zinc-400 hidden md:table-cell truncate max-w-xs">
                    {label.description || <span className="text-zinc-600">—</span>}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-zinc-800 text-zinc-300 border border-zinc-700">
                      {label.taskCount ?? 0}
                    </span>
                  </td>
                  {canManageLabels && (
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => openEditModal(label)}
                          className="p-1 rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
                          title="Edit label"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingLabel(label)}
                          className="p-1 rounded text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                          title="Delete label"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create / Edit Modal */}
      {(isCreateModalOpen || editingLabel) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
                <Tag className="w-4 h-4 text-cyan-400" />
                {editingLabel ? 'Edit Label' : 'Create New Label'}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setIsCreateModalOpen(false);
                  setEditingLabel(null);
                }}
                className="text-zinc-500 hover:text-zinc-300"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-4">
              {formError && (
                <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 rounded-md text-rose-300 text-xs">
                  {formError}
                </div>
              )}

              {/* Name */}
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                  Label Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  placeholder="e.g. Frontend, Bug, High Priority"
                  className="w-full px-3 py-2 bg-zinc-950/60 border border-zinc-800 rounded-lg text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-cyan-500"
                  maxLength={50}
                  autoFocus
                />
              </div>

              {/* Color Palette */}
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                  Color Token
                </label>
                <div className="grid grid-cols-8 gap-2 p-2.5 bg-zinc-950/40 rounded-lg border border-zinc-800">
                  {LABEL_COLORS.map(colorToken => {
                    const colors = getLabelColors(colorToken);
                    const isSelected = formColor === colorToken;
                    return (
                      <button
                        key={colorToken}
                        type="button"
                        onClick={() => setFormColor(colorToken)}
                        title={colorToken}
                        className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                          colors.dot
                        } ${
                          isSelected
                            ? 'ring-2 ring-white ring-offset-2 ring-offset-zinc-900 scale-110'
                            : 'opacity-70 hover:opacity-100 hover:scale-105'
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5 text-zinc-950 stroke-[3]" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                  Description <span className="text-zinc-500 font-normal">(Optional)</span>
                </label>
                <textarea
                  value={formDescription}
                  onChange={e => setFormDescription(e.target.value)}
                  placeholder="Explain when this label should be used..."
                  className="w-full px-3 py-2 bg-zinc-950/60 border border-zinc-800 rounded-lg text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-cyan-500 resize-none h-16"
                  maxLength={200}
                />
              </div>

              {/* Preview */}
              <div>
                <span className="block text-[11px] font-medium text-zinc-500 mb-1">Preview</span>
                <div className="p-3 bg-zinc-950/40 rounded-lg border border-zinc-800/80 flex items-center gap-2">
                  <LabelBadge
                    label={{ name: formName.trim() || 'Label Preview', color: formColor }}
                    size="sm"
                  />
                </div>
              </div>

              {/* Form Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2 border-t border-zinc-800/60">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreateModalOpen(false);
                    setEditingLabel(null);
                  }}
                  className="px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving || !formName.trim()}
                  className="px-4 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-medium text-xs transition-colors disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {editingLabel ? 'Save Changes' : 'Create Label'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingLabel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-xl p-5 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-rose-400">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <h3 className="text-sm font-semibold text-zinc-100">Delete Label?</h3>
            </div>
            <p className="text-xs text-zinc-400">
              Are you sure you want to delete{' '}
              <strong className="text-zinc-200">&quot;{deletingLabel.name}&quot;</strong>? This will
              disassociate it from all{' '}
              <strong className="text-zinc-200">{deletingLabel.taskCount ?? 0} tasks</strong>. Tasks
              will <strong className="text-zinc-200">not</strong> be deleted.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => setDeletingLabel(null)}
                className="px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isSaving}
                className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-medium text-xs transition-colors disabled:opacity-50 flex items-center gap-1.5"
              >
                {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Delete Label
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
