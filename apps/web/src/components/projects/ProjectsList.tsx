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
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Badge } from '../ui/Badge';
import { Card } from '../ui/Card';
import { EmptyState } from '../ui/EmptyState';
import { Skeleton } from '../ui/Skeleton';

interface ProjectsListProps {
  organizationId: string;
  organizationName: string;
  onSelectProject: (projectId: string) => void;
}

const STATUS_CONFIG: Record<
  ProjectStatus,
  {
    label: string;
    variant: 'indigo' | 'success' | 'warning' | 'primary' | 'danger';
    icon: React.FC<{ className?: string }>;
  }
> = {
  [ProjectStatus.PLANNING]: {
    label: 'Planning',
    variant: 'indigo',
    icon: Clock,
  },
  [ProjectStatus.ACTIVE]: {
    label: 'Active',
    variant: 'success',
    icon: Activity,
  },
  [ProjectStatus.PAUSED]: {
    label: 'Paused',
    variant: 'warning',
    icon: PauseCircle,
  },
  [ProjectStatus.COMPLETED]: {
    label: 'Completed',
    variant: 'primary',
    icon: CheckCircle2,
  },
  [ProjectStatus.ARCHIVED]: {
    label: 'Archived',
    variant: 'danger',
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

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchProjects();
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-white/[0.08]">
        <div>
          <div className="flex items-center space-x-2.5">
            <h1 className="text-xl sm:text-2xl font-extrabold text-white font-display tracking-tight">
              Projects
            </h1>
            <Badge variant="primary" size="md">
              {projects.length} {projects.length === 1 ? 'Project' : 'Projects'}
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Workspace initiatives, execution pipelines, and project telemetry for {organizationName}
          </p>
        </div>

        <Button
          variant="primary"
          size="md"
          onClick={() => setCreateModalOpen(true)}
          leftIcon={<Plus className="w-4 h-4" />}
        >
          New Project
        </Button>
      </div>

      {/* Portfolio Command Telemetry Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-2">
        <div className="p-4 rounded-2xl bg-gradient-to-b from-slate-900/90 to-slate-900/50 border border-white/[0.08] shadow-md">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest block mb-1">
            Total Initiatives
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-black text-white">{projects.length}</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400">
              Workspace
            </span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-gradient-to-b from-slate-900/90 to-slate-900/50 border border-white/[0.08] shadow-md">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest block mb-1">
            Active Projects
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-black text-emerald-400">
              {projects.filter(p => p.status === ProjectStatus.ACTIVE).length}
            </span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400">
              Execution
            </span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-gradient-to-b from-slate-900/90 to-slate-900/50 border border-white/[0.08] shadow-md">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest block mb-1">
            Planning & Paused
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-black text-amber-400">
              {
                projects.filter(
                  p => p.status === ProjectStatus.PLANNING || p.status === ProjectStatus.PAUSED
                ).length
              }
            </span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400">
              Queue
            </span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-gradient-to-b from-slate-900/90 to-slate-900/50 border border-white/[0.08] shadow-md">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest block mb-1">
            Total Members
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-black text-violet-400">
              {projects.reduce((acc, p) => acc + (p.memberCount || 0), 0)}
            </span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-400">
              Collaborators
            </span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="w-full md:w-80">
          <Input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search projects by name or key..."
            leftIcon={<Search className="w-4 h-4" />}
          />
        </div>

        {/* Status Filter Chips */}
        <div className="flex items-center space-x-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 scrollbar-none">
          {['ALL', 'ACTIVE', 'PLANNING', 'PAUSED', 'COMPLETED', 'ARCHIVED'].map(status => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold font-display transition-all whitespace-nowrap cursor-pointer ${
                statusFilter === status
                  ? 'bg-slate-800 text-sky-400 border border-sky-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent'
              }`}
            >
              {status.charAt(0) + status.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs flex items-center space-x-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <Card key={i} className="space-y-4">
              <div className="flex items-center justify-between">
                <Skeleton className="w-16 h-5" />
                <Skeleton className="w-20 h-5" />
              </div>
              <div className="space-y-2">
                <Skeleton className="w-3/4 h-6" />
                <Skeleton className="w-full h-10" />
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-white/[0.08]">
                <Skeleton className="w-16 h-4" />
                <Skeleton className="w-12 h-4" />
              </div>
            </Card>
          ))}
        </div>
      ) : projects.length === 0 ? (
        /* Empty State */
        <EmptyState
          icon={<FolderPlus className="w-6 h-6" />}
          title="No projects found"
          description={
            searchQuery || statusFilter !== 'ALL'
              ? 'No projects match your current filters. Try changing your search query or status filter.'
              : 'Get started by creating your first project workspace in this organization.'
          }
          actionLabel="Create First Project"
          onAction={() => setCreateModalOpen(true)}
        />
      ) : (
        /* Project Cards Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map(project => {
            const statusConfig =
              STATUS_CONFIG[project.status] || STATUS_CONFIG[ProjectStatus.PLANNING];
            const StatusIcon = statusConfig.icon;

            return (
              <Card
                key={project.id}
                variant="interactive"
                padding="md"
                onClick={() => onSelectProject(project.id)}
                className="group flex flex-col justify-between"
              >
                <div>
                  {/* Top Bar: Key & Status Pill */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center space-x-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                        style={{ backgroundColor: project.color || '#38bdf8' }}
                      />
                      <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700 text-slate-300 uppercase">
                        {project.key}
                      </span>
                    </div>

                    <Badge variant={statusConfig.variant} size="sm" dot>
                      <StatusIcon className="w-3 h-3" />
                      <span>{statusConfig.label}</span>
                    </Badge>
                  </div>

                  {/* Name & Description */}
                  <h3 className="text-base font-bold text-white group-hover:text-sky-300 font-display transition-colors tracking-tight line-clamp-1">
                    {project.name}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1.5 line-clamp-2 min-h-[2.25rem] leading-relaxed">
                    {project.description || 'No description provided for this project.'}
                  </p>
                </div>

                {/* Footer Telemetry */}
                <div className="pt-3.5 mt-4 border-t border-white/[0.08] flex items-center justify-between text-xs text-slate-400">
                  <div className="flex items-center space-x-3">
                    <span className="flex items-center space-x-1.5" title="Active Project Members">
                      <Users className="w-3.5 h-3.5 text-slate-500" />
                      <span className="font-semibold text-slate-300">{project.memberCount}</span>
                    </span>

                    {project.userRole && (
                      <span className="flex items-center space-x-1 text-[10px] font-mono font-medium px-2 py-0.5 rounded-md bg-slate-800/80 border border-slate-700/60 text-slate-300">
                        <Shield className="w-3 h-3 mr-0.5 text-indigo-400" />
                        {project.userRole}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center space-x-1 text-sky-400 group-hover:text-sky-300 text-xs font-semibold font-display">
                    <span>Open</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </Card>
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
