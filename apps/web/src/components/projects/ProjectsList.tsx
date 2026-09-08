import React, { useState, useEffect } from 'react';
import {
 Plus,
 Search,
 Users,
 AlertCircle,
 FolderPlus,
 ArrowRight,
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
   <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 pb-6 border-b border-[#2e2924]">
    <div>
     <p className="tf-kicker mb-2">{organizationName}</p>
     <h1 className="tf-page-title">Projects</h1>
     <p className="text-sm text-[#9c948a] mt-2">
      {projects.length} {projects.length === 1 ? 'project' : 'projects'} in this workspace
     </p>
    </div>
    <Button
     variant="primary"
     size="md"
     onClick={() => setCreateModalOpen(true)}
     leftIcon={<Plus className="w-4 h-4" />}
    >
     New project
    </Button>
   </div>

   <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 py-2">
    <div>
     <span className="tf-kicker block mb-2">Total</span>
     <span className="tf-metric">{projects.length}</span>
    </div>
    <div>
     <span className="tf-kicker block mb-2">Active</span>
     <span className="tf-metric">
      {projects.filter(p => p.status === ProjectStatus.ACTIVE).length}
     </span>
    </div>
    <div>
     <span className="tf-kicker block mb-2">Planning / paused</span>
     <span className="tf-metric">
      {
       projects.filter(
        p => p.status === ProjectStatus.PLANNING || p.status === ProjectStatus.PAUSED
       ).length
      }
     </span>
    </div>
    <div>
     <span className="tf-kicker block mb-2">Members</span>
     <span className="tf-metric">
      {projects.reduce((acc, p) => acc + (p.memberCount || 0), 0)}
     </span>
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
    <div className="flex items-center space-x-1 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 scrollbar-none">
     {['ALL', 'ACTIVE', 'PLANNING', 'PAUSED', 'COMPLETED', 'ARCHIVED'].map(status => (
      <button
       key={status}
       onClick={() => setStatusFilter(status)}
       className={`px-3 py-1.5 rounded text-xs font-medium transition-all whitespace-nowrap cursor-pointer ${
        statusFilter === status
         ? 'bg-[#1e2230] text-[#e05638] border border-[#e05638]/30'
         : 'text-slate-500 hover:text-slate-300 hover:bg-[#161920] border border-transparent'
       }`}
      >
       {status.charAt(0) + status.slice(1).toLowerCase()}
      </button>
     ))}
    </div>
   </div>

   {/* Error Alert */}
   {error && (
    <div className="p-4 rounded-md bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs flex items-center space-x-2.5">
     <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
     <span>{error}</span>
    </div>
   )}

   {/* Loading Skeleton */}
   {loading ? (
    <div className="space-y-0">
     {[1, 2, 3].map(i => (
      <div key={i} className="h-12 border-b border-[#2e2924] flex items-center">
       <Skeleton className="w-2/3 h-4" />
      </div>
     ))}
    </div>
   ) : projects.length === 0 ? (
    <EmptyState
     icon={<FolderPlus className="w-6 h-6" />}
     title="No projects found"
     description={
      searchQuery || statusFilter !== 'ALL'
       ? 'No projects match your current filters. Try changing your search query or status filter.'
       : 'Create the first project in this workspace.'
     }
     actionLabel="Create first project"
     onAction={() => setCreateModalOpen(true)}
    />
   ) : (
    <div className="overflow-x-auto">
     <div className="hidden md:grid grid-cols-12 gap-3 py-2 text-[11px] uppercase tracking-[0.12em] text-[#7d756c] border-b border-[#2e2924]">
      <div className="col-span-5">Project</div>
      <div className="col-span-2">Status</div>
      <div className="col-span-2">Role</div>
      <div className="col-span-2">Members</div>
      <div className="col-span-1 text-right" />
     </div>
     {projects.map(project => {
      const statusConfig =
       STATUS_CONFIG[project.status] || STATUS_CONFIG[ProjectStatus.PLANNING];
      return (
       <button
        key={project.id}
        type="button"
        onClick={() => onSelectProject(project.id)}
        className="w-full text-left grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-3 py-3.5 border-b border-[#2e2924] hover:bg-[#1c1916] transition-colors"
       >
        <div className="md:col-span-5 min-w-0">
         <div className="flex items-center gap-2 mb-0.5">
          <span
           className="w-1.5 h-1.5 rounded-full shrink-0"
           style={{ backgroundColor: project.color || '#c45c26' }}
          />
          <span className="font-mono text-[10px] text-[#9c948a]">{project.key}</span>
         </div>
         <div className="font-display text-[1.05rem] text-[#f3ede4] truncate">
          {project.name}
         </div>
        </div>
        <div className="md:col-span-2 flex items-center">
         <Badge variant={statusConfig.variant} size="sm">
          {statusConfig.label}
         </Badge>
        </div>
        <div className="md:col-span-2 flex items-center text-xs text-[#9c948a]">
         {project.userRole || '—'}
        </div>
        <div className="md:col-span-2 flex items-center gap-1.5 text-xs text-[#9c948a]">
         <Users className="w-3.5 h-3.5" />
         {project.memberCount}
        </div>
        <div className="md:col-span-1 flex items-center justify-end text-[#7d756c]">
         <ArrowRight className="w-4 h-4" />
        </div>
       </button>
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
