import React, { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  Users,
  AlertCircle,
  FolderPlus,
  ArrowRight,
  Shield,
  Activity,
  CheckCircle2,
  Clock,
  PauseCircle,
  Archive,
} from 'lucide-react';
import { ProjectListItem, ProjectStatus } from '@taskflow/shared';
import { projectApi } from '../../lib/api';
import { CreateProjectModal } from './CreateProjectModal';

interface ProjectsListProps {
  organizationId: string;
  organizationName: string;
  onSelectProject: (projectId: string) => void;
}

const STATUS_CONFIG: Record<
  ProjectStatus,
  {
    label: string;
    bg: string;
    text: string;
    border: string;
    icon: React.FC<{ className?: string }>;
  }
> = {
  [ProjectStatus.PLANNING]: {
    label: 'Planning',
    bg: 'bg-indigo-950/60',
    text: 'text-indigo-400',
    border: 'border-indigo-800/50',
    icon: Clock,
  },
  [ProjectStatus.ACTIVE]: {
    label: 'Active',
    bg: 'bg-emerald-950/60',
    text: 'text-emerald-400',
    border: 'border-emerald-800/50',
    icon: Activity,
  },
  [ProjectStatus.PAUSED]: {
    label: 'Paused',
    bg: 'bg-amber-950/60',
    text: 'text-amber-400',
    border: 'border-amber-800/50',
    icon: PauseCircle,
  },
  [ProjectStatus.COMPLETED]: {
    label: 'Completed',
    bg: 'bg-cyan-950/60',
    text: 'text-cyan-400',
    border: 'border-cyan-800/50',
    icon: CheckCircle2,
  },
  [ProjectStatus.ARCHIVED]: {
    label: 'Archived',
    bg: 'bg-rose-950/60',
    text: 'text-rose-400',
    border: 'border-rose-800/50',
    icon: Archive,
  },
};

export const ProjectsList: React.FC<ProjectsListProps> = ({
  organizationId,
  organizationName,
  onSelectProject,
}) => {
  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [createModalOpen, setCreateModalOpen] = useState(false);

  const fetchProjects = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await projectApi.listProjects(organizationId, {
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        search: searchQuery.trim() || undefined,
      });
      setProjects(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load projects';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [organizationId, statusFilter]);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchProjects();
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-taskflow-border/80">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold text-white tracking-tight">Projects</h1>
            <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-taskflow-surface border border-taskflow-border text-cyan-400">
              {projects.length} {projects.length === 1 ? 'Project' : 'Projects'}
            </span>
          </div>
          <p className="text-xs text-taskflow-muted mt-1">
            Workspace initiatives, execution pipelines, and project telemetry for {organizationName}
          </p>
        </div>

        <button
          onClick={() => setCreateModalOpen(true)}
          className="px-4 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white shadow-glow-cyan flex items-center justify-center space-x-2 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New Project</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-taskflow-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search projects by name or key..."
            className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-taskflow-surface border border-taskflow-border focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 text-xs text-white placeholder-taskflow-muted transition-all"
          />
        </div>

        {/* Status Filter Chips */}
        <div className="flex items-center space-x-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 scrollbar-none">
          {['ALL', 'ACTIVE', 'PLANNING', 'PAUSED', 'COMPLETED', 'ARCHIVED'].map(status => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                statusFilter === status
                  ? 'bg-taskflow-surface text-cyan-300 border border-cyan-500/40 shadow-glow-cyan'
                  : 'text-taskflow-muted hover:text-white hover:bg-taskflow-surface/50 border border-transparent'
              }`}
            >
              {status.charAt(0) + status.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center space-x-2.5">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div
              key={i}
              className="glass-panel p-5 rounded-2xl border border-taskflow-border/60 bg-taskflow-surface/50 animate-pulse space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="w-16 h-5 bg-taskflow-border/80 rounded-md" />
                <div className="w-20 h-5 bg-taskflow-border/80 rounded-full" />
              </div>
              <div className="space-y-2">
                <div className="w-3/4 h-5 bg-taskflow-border/80 rounded-md" />
                <div className="w-full h-3 bg-taskflow-border/50 rounded-md" />
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-taskflow-border/40">
                <div className="w-16 h-4 bg-taskflow-border/60 rounded-md" />
                <div className="w-20 h-4 bg-taskflow-border/60 rounded-md" />
              </div>
            </div>
          ))}
        </div>
      ) : projects.length === 0 ? (
        /* Empty State */
        <div className="glass-panel rounded-2xl border border-taskflow-border p-12 text-center bg-taskflow-surface/30">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-indigo-500/20 border border-cyan-500/30 text-cyan-400 flex items-center justify-center mx-auto mb-4">
            <FolderPlus className="w-7 h-7" />
          </div>
          <h3 className="text-base font-semibold text-white">No projects found</h3>
          <p className="text-xs text-taskflow-muted max-w-sm mx-auto mt-1.5">
            {searchQuery || statusFilter !== 'ALL'
              ? 'No projects match your current filters. Try changing your search query or status filter.'
              : 'Get started by creating your first project workspace in this organization.'}
          </p>
          <button
            onClick={() => setCreateModalOpen(true)}
            className="mt-5 px-4 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white shadow-glow-cyan inline-flex items-center space-x-2 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create First Project</span>
          </button>
        </div>
      ) : (
        /* Project Cards Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map(project => {
            const statusConfig =
              STATUS_CONFIG[project.status] || STATUS_CONFIG[ProjectStatus.PLANNING];
            const StatusIcon = statusConfig.icon;

            return (
              <div
                key={project.id}
                onClick={() => onSelectProject(project.id)}
                className="group glass-panel rounded-2xl border border-taskflow-border hover:border-cyan-500/50 p-5 bg-taskflow-surface hover:bg-taskflow-surface/90 transition-all cursor-pointer flex flex-col justify-between hover:shadow-glow-cyan"
              >
                <div>
                  {/* Top Bar: Key & Status Pill */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center space-x-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: project.color || '#06b6d4' }}
                      />
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-taskflow-bg border border-taskflow-border text-cyan-300 uppercase">
                        {project.key}
                      </span>
                    </div>

                    <span
                      className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${statusConfig.bg} ${statusConfig.text} ${statusConfig.border}`}
                    >
                      <StatusIcon className="w-3 h-3" />
                      <span>{statusConfig.label}</span>
                    </span>
                  </div>

                  {/* Name & Description */}
                  <h3 className="text-base font-bold text-white group-hover:text-cyan-300 transition-colors tracking-tight line-clamp-1">
                    {project.name}
                  </h3>
                  <p className="text-xs text-taskflow-muted mt-1.5 line-clamp-2 min-h-[2rem]">
                    {project.description || 'No description provided.'}
                  </p>
                </div>

                {/* Footer Telemetry */}
                <div className="pt-4 mt-4 border-t border-taskflow-border/60 flex items-center justify-between text-xs text-taskflow-muted">
                  <div className="flex items-center space-x-3">
                    <span className="flex items-center space-x-1" title="Active Project Members">
                      <Users className="w-3.5 h-3.5 text-taskflow-muted" />
                      <span>{project.memberCount}</span>
                    </span>

                    {project.userRole && (
                      <span className="flex items-center space-x-1 text-[10px] font-semibold px-2 py-0.5 rounded bg-taskflow-bg border border-taskflow-border text-indigo-300">
                        <Shield className="w-2.5 h-2.5 mr-0.5" />
                        {project.userRole}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center space-x-1 text-cyan-400 group-hover:translate-x-0.5 transition-transform text-[11px] font-medium">
                    <span>Open</span>
                    <ArrowRight className="w-3 h-3" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Project Modal */}
      <CreateProjectModal
        organizationId={organizationId}
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSuccess={newProjectId => {
          fetchProjects();
          onSelectProject(newProjectId);
        }}
      />
    </div>
  );
};
