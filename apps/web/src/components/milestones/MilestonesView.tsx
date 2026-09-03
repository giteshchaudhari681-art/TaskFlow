import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  RefreshCw,
  AlertCircle,
  Milestone,
  CheckCircle2,
  AlertTriangle,
  BarChart3,
} from 'lucide-react';
import {
  MilestoneListItem,
  MilestoneDetail,
  MilestoneStatus,
  UpdateMilestonePayload,
  ProjectRole,
} from '@taskflow/shared';
import { milestoneApi } from '../../lib/api';
import { MilestoneCard } from './MilestoneCard';
import { CreateMilestoneModal } from './CreateMilestoneModal';
import { MilestoneDetailPanel } from './MilestoneDetailPanel';

interface MilestonesViewProps {
  organizationId: string;
  projectId: string;
  userRole: ProjectRole | undefined;
}

export const MilestonesView: React.FC<MilestonesViewProps> = ({
  organizationId,
  projectId,
  userRole,
}) => {
  const [milestones, setMilestones] = useState<MilestoneListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedMilestoneId, setSelectedMilestoneId] = useState<string | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailData, setDetailData] = useState<MilestoneDetail | null>(null);
  const [filterHealth, setFilterHealth] = useState<string>('ALL');

  const canEdit = userRole !== ProjectRole.VIEWER;

  const fetchMilestones = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await milestoneApi.list(organizationId, projectId);
      setMilestones(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load milestones');
    } finally {
      setLoading(false);
    }
  }, [organizationId, projectId]);

  useEffect(() => {
    fetchMilestones();
  }, [fetchMilestones]);

  const handleOpenDetail = async (milestone: MilestoneListItem) => {
    setSelectedMilestoneId(milestone.id);
    setDetailLoading(true);
    try {
      const detail = await milestoneApi.get(organizationId, projectId, milestone.id);
      setDetailData(detail);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load milestone details');
      setSelectedMilestoneId(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleCreate = async (data: {
    title: string;
    description?: string | null;
    startDate?: string | null;
    dueDate?: string | null;
    status?: MilestoneStatus;
    displayOrder?: number;
  }) => {
    const newMs = await milestoneApi.create(organizationId, projectId, data);
    setMilestones(prev => [newMs, ...prev]);
  };

  const handleUpdate = async (data: UpdateMilestonePayload) => {
    if (!selectedMilestoneId) return;
    const updated = await milestoneApi.update(organizationId, projectId, selectedMilestoneId, data);
    setMilestones(prev => prev.map(m => (m.id === selectedMilestoneId ? updated : m)));
    const detail = await milestoneApi.get(organizationId, projectId, selectedMilestoneId);
    setDetailData(detail);
  };

  const handleDelete = async () => {
    if (!selectedMilestoneId) return;
    await milestoneApi.delete(organizationId, projectId, selectedMilestoneId);
    setMilestones(prev => prev.filter(m => m.id !== selectedMilestoneId));
    setSelectedMilestoneId(null);
    setDetailData(null);
  };

  const handleStatusChange = async (milestoneId: string, status: MilestoneStatus) => {
    const updated = await milestoneApi.update(organizationId, projectId, milestoneId, { status });
    setMilestones(prev => prev.map(m => (m.id === milestoneId ? updated : m)));
    if (selectedMilestoneId === milestoneId && detailData) {
      setDetailData({
        ...detailData,
        status: updated.status,
        health: updated.health,
        progress: updated.progress,
      });
    }
  };

  const filteredMilestones =
    filterHealth === 'ALL' ? milestones : milestones.filter(m => m.health === filterHealth);

  const stats = {
    total: milestones.length,
    completed: milestones.filter(m => m.status === MilestoneStatus.COMPLETED).length,
    overdue: milestones.filter(m => m.health === 'OVERDUE').length,
    atRisk: milestones.filter(m => m.health === 'AT_RISK').length,
    onTrack: milestones.filter(m => m.health === 'ON_TRACK').length,
  };

  const FILTERS = [
    { key: 'ALL', label: 'All', count: stats.total },
    { key: 'COMPLETED', label: 'Completed', count: stats.completed },
    { key: 'OVERDUE', label: 'Overdue', count: stats.overdue },
    { key: 'AT_RISK', label: 'At Risk', count: stats.atRisk },
    { key: 'ON_TRACK', label: 'On Track', count: stats.onTrack },
  ];

  if (loading) {
    return (
      <div className="min-h-[300px] flex items-center justify-center">
        <div className="text-center space-y-3">
          <RefreshCw className="w-7 h-7 text-cyan-400 animate-spin mx-auto" />
          <p className="text-sm text-taskflow-muted">Loading milestones...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-white">Project Milestones</h2>
          <p className="text-xs text-taskflow-muted mt-0.5">
            {stats.total === 0
              ? 'No milestones yet'
              : `${stats.total} milestone${stats.total !== 1 ? 's' : ''} · ${stats.completed} completed`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchMilestones}
            className="p-2 rounded-xl text-taskflow-muted hover:text-white hover:bg-taskflow-surface border border-taskflow-border transition-colors"
            aria-label="Refresh milestones"
            title="Refresh"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          {canEdit && (
            <button
              onClick={() => setShowCreate(true)}
              id="create-milestone-btn"
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white shadow-glow-cyan flex items-center gap-1.5 transition-all cursor-pointer"
              aria-label="Create new milestone"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Milestone</span>
            </button>
          )}
        </div>
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

      {/* Stats Bar */}
      {milestones.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="glass-panel rounded-xl border border-taskflow-border p-3.5 bg-taskflow-surface/60">
            <div className="flex items-center gap-2">
              <Milestone className="w-4 h-4 text-cyan-400" aria-hidden="true" />
              <span className="text-xs font-semibold text-taskflow-muted">Total</span>
            </div>
            <p className="text-2xl font-bold text-white mt-1.5">{stats.total}</p>
          </div>
          <div className="glass-panel rounded-xl border border-emerald-500/20 p-3.5 bg-emerald-500/5">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" aria-hidden="true" />
              <span className="text-xs font-semibold text-emerald-500/60">Done</span>
            </div>
            <p className="text-2xl font-bold text-emerald-400 mt-1.5">{stats.completed}</p>
          </div>
          <div className="glass-panel rounded-xl border border-rose-500/20 p-3.5 bg-rose-500/5">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400" aria-hidden="true" />
              <span className="text-xs font-semibold text-rose-500/60">Overdue</span>
            </div>
            <p className="text-2xl font-bold text-rose-400 mt-1.5">{stats.overdue}</p>
          </div>
          <div className="glass-panel rounded-xl border border-cyan-500/20 p-3.5 bg-cyan-500/5">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-cyan-400" aria-hidden="true" />
              <span className="text-xs font-semibold text-cyan-500/60">On Track</span>
            </div>
            <p className="text-2xl font-bold text-cyan-400 mt-1.5">{stats.onTrack}</p>
          </div>
        </div>
      )}

      {/* Filters */}
      {milestones.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          {FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => setFilterHealth(f.key)}
              className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all border ${
                filterHealth === f.key
                  ? 'bg-taskflow-surface text-cyan-300 border-cyan-500/40 shadow-glow-cyan'
                  : 'text-taskflow-muted hover:text-white border-transparent hover:bg-taskflow-surface/50'
              }`}
              aria-pressed={filterHealth === f.key}
            >
              {f.label}
              <span className="ml-1.5 opacity-60">{f.count}</span>
            </button>
          ))}
        </div>
      )}

      {/* Milestone Grid */}
      {filteredMilestones.length === 0 && !loading ? (
        <div className="glass-panel rounded-2xl border border-taskflow-border p-12 text-center bg-taskflow-surface/30 space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-indigo-950/60 border border-indigo-800/60 text-indigo-400 flex items-center justify-center mx-auto">
            <Milestone className="w-7 h-7" aria-hidden="true" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-white">
              {filterHealth !== 'ALL'
                ? `No ${filterHealth.toLowerCase().replace('_', ' ')} milestones`
                : 'No milestones yet'}
            </h3>
            <p className="text-xs text-taskflow-muted leading-relaxed max-w-xs mx-auto">
              {filterHealth !== 'ALL'
                ? 'Try a different filter to see more milestones.'
                : 'Create your first milestone to start tracking project checkpoints and delivery targets.'}
            </p>
          </div>
          {canEdit && filterHealth === 'ALL' && (
            <button
              onClick={() => setShowCreate(true)}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-cyan-500 to-indigo-600 text-white shadow-glow-cyan flex items-center gap-1.5 mx-auto transition-all cursor-pointer"
              aria-label="Create your first milestone"
            >
              <Plus className="w-3.5 h-3.5" />
              Create First Milestone
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredMilestones.map(m => (
            <MilestoneCard
              key={m.id}
              milestone={m}
              onClick={handleOpenDetail}
              onStatusChange={handleStatusChange}
              canEdit={canEdit}
            />
          ))}
        </div>
      )}

      {/* Loading detail overlay */}
      {detailLoading && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/20 backdrop-blur-sm">
          <RefreshCw className="w-6 h-6 text-cyan-400 animate-spin" />
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <CreateMilestoneModal onClose={() => setShowCreate(false)} onSubmit={handleCreate} />
      )}

      {/* Detail Panel */}
      {selectedMilestoneId && detailData && (
        <MilestoneDetailPanel
          milestone={detailData}
          onClose={() => {
            setSelectedMilestoneId(null);
            setDetailData(null);
          }}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
          canEdit={canEdit}
        />
      )}
    </div>
  );
};
