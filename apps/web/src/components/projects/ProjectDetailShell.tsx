import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Users,
  Settings,
  Activity,
  CheckCircle2,
  Archive,
  RefreshCw,
  AlertCircle,
  Plus,
  Trash2,
  Sparkles,
  Kanban,
  Milestone,
  Tag,
  GitFork,
} from 'lucide-react';
import {
  ProjectDetail,
  ProjectRole,
  ProjectStatus,
  ProjectMemberDetail,
  OrganizationMemberItem,
} from '@taskflow/shared';
import { updateProjectSchema } from '@taskflow/validation';
import { projectApi, orgApi } from '../../lib/api';
import { TaskList } from '../tasks/TaskList';
import { KanbanBoard } from '../kanban/KanbanBoard';
import { ProjectLabelsSettings } from '../labels/ProjectLabelsSettings';
import { DependencyGraphView } from '../dependencies/DependencyGraphView';
import { MilestonesView } from '../milestones/MilestonesView';
import { TimelineView } from '../milestones/TimelineView';

interface ProjectDetailShellProps {
  organizationId: string;
  projectId: string;
  onBack: () => void;
}

type ProjectTab =
  'overview' | 'members' | 'settings' | 'tasks' | 'labels' | 'dependencies' | 'timeline';

const PRESET_COLORS = [
  { label: 'Cyan', value: '#06b6d4' },
  { label: 'Indigo', value: '#6366f1' },
  { label: 'Emerald', value: '#10b981' },
  { label: 'Amber', value: '#f59e0b' },
  { label: 'Rose', value: '#f43f5e' },
  { label: 'Purple', value: '#a855f7' },
  { label: 'Sky', value: '#0284c7' },
];

export const ProjectDetailShell: React.FC<ProjectDetailShellProps> = ({
  organizationId,
  projectId,
  onBack,
}) => {
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [activeTab, setActiveTab] = useState<ProjectTab>('overview');
  const [taskViewMode, setTaskViewMode] = useState<'board' | 'list'>('board');
  const [milestoneSubTab, setMilestoneSubTab] = useState<'milestones' | 'timeline'>('milestones');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Settings tab form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<ProjectStatus>(ProjectStatus.PLANNING);
  const [color, setColor] = useState('#06b6d4');
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsSuccess, setSettingsSuccess] = useState<string | null>(null);
  const [settingsError, setSettingsError] = useState<string | null>(null);

  // Members tab state
  const [members, setMembers] = useState<ProjectMemberDetail[]>([]);
  const [orgMembers, setOrgMembers] = useState<OrganizationMemberItem[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [memberSearch, setMemberSearch] = useState('');
  const [addMemberModalOpen, setAddMemberModalOpen] = useState(false);
  const [selectedOrgUserId, setSelectedOrgUserId] = useState('');
  const [selectedProjectRole, setSelectedProjectRole] = useState<ProjectRole>(ProjectRole.MEMBER);
  const [memberActionLoading, setMemberActionLoading] = useState(false);
  const [memberError, setMemberError] = useState<string | null>(null);
  const [memberSuccess, setMemberSuccess] = useState<string | null>(null);

  // Remove confirmation modal
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);

  const fetchProjectDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await projectApi.getProject(organizationId, projectId);
      setProject(data);
      setName(data.name);
      setDescription(data.description || '');
      setStatus(data.status);
      setColor(data.color || '#06b6d4');
      if (data.members) setMembers(data.members);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load project';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const fetchMembersData = async () => {
    setMembersLoading(true);
    try {
      const [projMembers, allOrgMembers] = await Promise.all([
        projectApi.getMembers(organizationId, projectId),
        orgApi.getMembers(organizationId),
      ]);
      setMembers(projMembers);
      setOrgMembers(allOrgMembers);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load members';
      setMemberError(msg);
    } finally {
      setMembersLoading(false);
    }
  };

  useEffect(() => {
    fetchProjectDetails();
  }, [organizationId, projectId]);

  useEffect(() => {
    if (activeTab === 'members') {
      fetchMembersData();
    }
  }, [activeTab]);

  const handleUpdateSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsError(null);
    setSettingsSuccess(null);

    const payload = {
      name: name.trim(),
      description: description.trim() || undefined,
      status,
      color,
    };

    const validation = updateProjectSchema.safeParse(payload);
    if (!validation.success) {
      setSettingsError(validation.error.issues[0]?.message || 'Invalid settings input');
      return;
    }

    setSettingsLoading(true);
    try {
      const updated = await projectApi.updateProject(organizationId, projectId, payload);
      setProject(updated);
      setSettingsSuccess('Project settings successfully updated');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update settings';
      setSettingsError(msg);
    } finally {
      setSettingsLoading(false);
    }
  };

  const handleToggleArchive = async () => {
    if (!project) return;
    setSettingsLoading(true);
    setSettingsError(null);
    setSettingsSuccess(null);
    try {
      if (project.status === ProjectStatus.ARCHIVED) {
        const unarchived = await projectApi.unarchiveProject(organizationId, projectId);
        setProject(unarchived);
        setStatus(unarchived.status);
        setSettingsSuccess('Project unarchived and set to ACTIVE status');
      } else {
        const archived = await projectApi.archiveProject(organizationId, projectId);
        setProject(archived);
        setStatus(ProjectStatus.ARCHIVED);
        setSettingsSuccess('Project moved to ARCHIVED status');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to alter archive status';
      setSettingsError(msg);
    } finally {
      setSettingsLoading(false);
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrgUserId) return;
    setMemberError(null);
    setMemberSuccess(null);
    setMemberActionLoading(true);

    try {
      await projectApi.addMember(organizationId, projectId, {
        userId: selectedOrgUserId,
        role: selectedProjectRole,
      });
      setMemberSuccess('Member successfully added to project');
      setAddMemberModalOpen(false);
      setSelectedOrgUserId('');
      fetchMembersData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to add member';
      setMemberError(msg);
    } finally {
      setMemberActionLoading(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: ProjectRole) => {
    setMemberError(null);
    setMemberSuccess(null);
    try {
      await projectApi.updateMemberRole(organizationId, projectId, userId, newRole);
      setMemberSuccess('Member role updated');
      fetchMembersData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update member role';
      setMemberError(msg);
    }
  };

  const handleConfirmRemove = async () => {
    if (!removingMemberId) return;
    setMemberError(null);
    setMemberSuccess(null);
    setMemberActionLoading(true);
    try {
      await projectApi.removeMember(organizationId, projectId, removingMemberId);
      setMemberSuccess('Member removed from project');
      setRemovingMemberId(null);
      fetchMembersData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to remove member';
      setMemberError(msg);
    } finally {
      setMemberActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="text-center space-y-3">
          <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin mx-auto" />
          <p className="text-sm text-taskflow-muted">Loading project telemetry...</p>
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="glass-panel rounded-2xl border border-rose-500/30 p-8 text-center bg-rose-500/5">
        <AlertCircle className="w-8 h-8 text-rose-400 mx-auto mb-3" />
        <h3 className="text-base font-bold text-white">Project Not Found</h3>
        <p className="text-xs text-rose-300 mt-1">{error || 'This project does not exist.'}</p>
        <button
          onClick={onBack}
          className="mt-4 px-4 py-2 rounded-xl text-xs font-semibold bg-taskflow-surface border border-taskflow-border text-white hover:bg-taskflow-surface/80 transition-colors"
        >
          Return to Projects
        </button>
      </div>
    );
  }

  // Available organization members not yet in this project
  const existingMemberUserIds = new Set(members.map(m => m.userId));
  const availableOrgMembers = orgMembers.filter(om => !existingMemberUserIds.has(om.user.id));

  // Filter project members by search
  const filteredMembers = members.filter(
    m =>
      m.user.name.toLowerCase().includes(memberSearch.toLowerCase()) ||
      m.user.email.toLowerCase().includes(memberSearch.toLowerCase()) ||
      m.role.toLowerCase().includes(memberSearch.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Back Button & Project Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-taskflow-border/80">
        <div className="flex items-center space-x-3">
          <button
            onClick={onBack}
            className="p-2 rounded-xl bg-taskflow-surface hover:bg-taskflow-surface/80 border border-taskflow-border text-taskflow-muted hover:text-white transition-colors cursor-pointer"
            title="Back to Projects"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div>
            <div className="flex items-center space-x-2">
              <span
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: project.color || '#06b6d4' }}
              />
              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-taskflow-surface border border-taskflow-border text-cyan-300 uppercase">
                {project.key}
              </span>
              <h1 className="text-xl font-bold text-white tracking-tight">{project.name}</h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold border bg-taskflow-surface border-taskflow-border text-taskflow-muted uppercase">
                {project.status}
              </span>
            </div>
            <p className="text-xs text-taskflow-muted mt-0.5">
              Created on {new Date(project.createdAt).toLocaleDateString()} • {project.memberCount}{' '}
              {project.memberCount === 1 ? 'Member' : 'Members'}
            </p>
          </div>
        </div>

        {/* Sub Navigation Tabs */}
        <div className="flex items-center space-x-1 overflow-x-auto pb-1 md:pb-0">
          {(
            [
              { id: 'overview', label: 'Overview', icon: Activity },
              { id: 'tasks', label: 'Board & Tasks', icon: Kanban },
              { id: 'labels', label: 'Labels', icon: Tag },
              { id: 'dependencies', label: 'Dependencies', icon: GitFork },
              { id: 'timeline', label: 'Milestones', icon: Milestone },
              { id: 'members', label: 'Members', icon: Users },
              { id: 'settings', label: 'Settings', icon: Settings },
            ] as const
          ).map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-taskflow-surface text-cyan-300 border border-cyan-500/40 shadow-glow-cyan'
                    : 'text-taskflow-muted hover:text-white hover:bg-taskflow-surface/50 border border-transparent'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Overview Card */}
            <div className="glass-panel rounded-2xl border border-taskflow-border p-6 bg-taskflow-surface space-y-4">
              <h2 className="text-sm font-bold text-white tracking-tight uppercase text-taskflow-muted">
                Project Scope & Objectives
              </h2>
              <p className="text-sm text-taskflow-text leading-relaxed">
                {project.description ||
                  'No description provided for this project. Navigate to Settings to outline core scope, objectives, and milestones.'}
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-taskflow-border/60">
                <div className="p-3 rounded-xl bg-taskflow-bg/60 border border-taskflow-border/60">
                  <span className="text-[10px] uppercase font-bold text-taskflow-muted">Key</span>
                  <p className="text-sm font-mono font-bold text-cyan-300 mt-0.5">{project.key}</p>
                </div>
                <div className="p-3 rounded-xl bg-taskflow-bg/60 border border-taskflow-border/60">
                  <span className="text-[10px] uppercase font-bold text-taskflow-muted">
                    Status
                  </span>
                  <p className="text-sm font-semibold text-white mt-0.5">{project.status}</p>
                </div>
                <div className="p-3 rounded-xl bg-taskflow-bg/60 border border-taskflow-border/60">
                  <span className="text-[10px] uppercase font-bold text-taskflow-muted">Team</span>
                  <p className="text-sm font-semibold text-white mt-0.5">
                    {project.memberCount} Members
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-taskflow-bg/60 border border-taskflow-border/60">
                  <span className="text-[10px] uppercase font-bold text-taskflow-muted">
                    Updated
                  </span>
                  <p className="text-xs font-semibold text-white mt-1">
                    {new Date(project.updatedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>

            {/* Upcoming Features Preview Banner */}
            <div className="glass-panel rounded-2xl border border-cyan-500/20 p-6 bg-gradient-to-br from-cyan-950/30 to-indigo-950/30 space-y-3">
              <div className="flex items-center space-x-2 text-cyan-400">
                <Sparkles className="w-5 h-5" />
                <h3 className="text-sm font-bold tracking-tight">
                  PR 5 Foundation Active — PR 6 Execution Engine Coming Next
                </h3>
              </div>
              <p className="text-xs text-taskflow-muted leading-relaxed">
                PR 5 establishes the project entity, role-based authorization, and team roster. The
                next milestone (PR 6) introduces the live Task Lifecycle, Kanban views, sprint
                planning, and dependency graphs directly under this project umbrella.
              </p>
            </div>
          </div>

          {/* Members Sidebar Preview */}
          <div className="space-y-6">
            <div className="glass-panel rounded-2xl border border-taskflow-border p-6 bg-taskflow-surface space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white tracking-tight">Project Team</h3>
                <button
                  onClick={() => setActiveTab('members')}
                  className="text-xs text-cyan-400 hover:text-cyan-300 font-medium"
                >
                  View all ({project.members?.length || project.memberCount})
                </button>
              </div>

              <div className="space-y-3">
                {project.members && project.members.length > 0 ? (
                  project.members.slice(0, 5).map(m => (
                    <div key={m.id} className="flex items-center justify-between">
                      <div className="flex items-center space-x-2.5">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center text-[10px] font-bold text-white overflow-hidden">
                          {m.user.avatarUrl ? (
                            <img
                              src={m.user.avatarUrl}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            m.user.name.charAt(0)
                          )}
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-white">{m.user.name}</p>
                          <p className="text-[10px] text-taskflow-muted">{m.user.email}</p>
                        </div>
                      </div>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-taskflow-bg border border-taskflow-border text-cyan-300">
                        {m.role}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-taskflow-muted">No members assigned.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: TASKS & KANBAN */}
      {activeTab === 'tasks' &&
        (taskViewMode === 'board' ? (
          <KanbanBoard
            organizationId={organizationId}
            projectId={projectId}
            projectKey={project.key}
            members={members}
            canManageTasks={project?.userRole !== ProjectRole.VIEWER}
            viewMode={taskViewMode}
            onViewModeChange={setTaskViewMode}
          />
        ) : (
          <TaskList
            organizationId={organizationId}
            projectId={projectId}
            projectKey={project.key}
            members={members}
            canManageTasks={project?.userRole !== ProjectRole.VIEWER}
            viewMode={taskViewMode}
            onViewModeChange={setTaskViewMode}
          />
        ))}

      {/* TAB 3: LABELS */}
      {activeTab === 'labels' && (
        <div className="glass-panel rounded-2xl border border-taskflow-border p-6 bg-taskflow-surface/30">
          <ProjectLabelsSettings
            organizationId={organizationId}
            projectId={projectId}
            currentUserRole={project.userRole}
          />
        </div>
      )}

      {/* TAB 4: DEPENDENCIES GRAPH */}
      {activeTab === 'dependencies' && (
        <div className="glass-panel rounded-2xl border border-taskflow-border p-6 bg-taskflow-surface/30">
          <DependencyGraphView
            organizationId={organizationId}
            projectId={projectId}
            projectKey={project.key}
          />
        </div>
      )}

      {/* TAB 5: MILESTONES & TIMELINE */}
      {activeTab === 'timeline' && (
        <div className="space-y-6">
          {/* Sub-tab switcher */}
          <div className="flex items-center gap-1 border-b border-taskflow-border/60 pb-3">
            {(['milestones', 'timeline'] as const).map(subTab => (
              <button
                key={subTab}
                onClick={() => setMilestoneSubTab(subTab)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
                  milestoneSubTab === subTab
                    ? 'bg-taskflow-surface text-cyan-300 border-cyan-500/40'
                    : 'text-taskflow-muted hover:text-white border-transparent hover:bg-taskflow-surface/50'
                }`}
              >
                {subTab.charAt(0).toUpperCase() + subTab.slice(1)}
              </button>
            ))}
          </div>

          {milestoneSubTab === 'milestones' ? (
            <MilestonesView
              organizationId={organizationId}
              projectId={projectId}
              userRole={project.userRole}
            />
          ) : (
            <TimelineView organizationId={organizationId} projectId={projectId} />
          )}
        </div>
      )}

      {/* TAB 4: MEMBERS */}
      {activeTab === 'members' && (
        <div className="space-y-4">
          {/* Members Action Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative w-full sm:w-72">
              <input
                type="text"
                value={memberSearch}
                onChange={e => setMemberSearch(e.target.value)}
                placeholder="Filter members..."
                className="w-full px-3.5 py-2 rounded-xl bg-taskflow-surface border border-taskflow-border focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 text-xs text-white placeholder-taskflow-muted transition-all"
              />
            </div>

            <button
              onClick={() => setAddMemberModalOpen(true)}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white shadow-glow-cyan flex items-center justify-center space-x-2 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Member</span>
            </button>
          </div>

          {memberError && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{memberError}</span>
            </div>
          )}

          {memberSuccess && (
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{memberSuccess}</span>
            </div>
          )}

          {/* Members Table */}
          <div className="glass-panel rounded-2xl border border-taskflow-border overflow-hidden bg-taskflow-surface">
            {membersLoading ? (
              <div className="p-8 text-center text-xs text-taskflow-muted">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-cyan-400" />
                Loading members...
              </div>
            ) : filteredMembers.length === 0 ? (
              <div className="p-8 text-center text-xs text-taskflow-muted">
                No matching members found.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-taskflow-border/80 bg-taskflow-bg/50 text-[11px] uppercase tracking-wider text-taskflow-muted">
                      <th className="py-3 px-4 font-semibold">User</th>
                      <th className="py-3 px-4 font-semibold">Project Role</th>
                      <th className="py-3 px-4 font-semibold">Joined Date</th>
                      <th className="py-3 px-4 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-taskflow-border/40 text-xs">
                    {filteredMembers.map(m => (
                      <tr key={m.id} className="hover:bg-taskflow-bg/40 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center text-xs font-bold text-white overflow-hidden">
                              {m.user.avatarUrl ? (
                                <img
                                  src={m.user.avatarUrl}
                                  alt=""
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                m.user.name.charAt(0)
                              )}
                            </div>
                            <div>
                              <p className="font-semibold text-white">{m.user.name}</p>
                              <p className="text-[11px] text-taskflow-muted">{m.user.email}</p>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <select
                            value={m.role}
                            onChange={e =>
                              handleRoleChange(m.userId, e.target.value as ProjectRole)
                            }
                            className="px-2.5 py-1 rounded-lg bg-taskflow-bg border border-taskflow-border text-xs text-white focus:outline-none focus:border-cyan-500 cursor-pointer font-semibold"
                          >
                            <option value={ProjectRole.LEAD}>LEAD</option>
                            <option value={ProjectRole.ADMIN}>ADMIN</option>
                            <option value={ProjectRole.MEMBER}>MEMBER</option>
                            <option value={ProjectRole.VIEWER}>VIEWER</option>
                          </select>
                        </td>

                        <td className="py-3.5 px-4 text-taskflow-muted">
                          {new Date(m.joinedAt).toLocaleDateString()}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => setRemovingMemberId(m.userId)}
                            className="p-1.5 rounded-lg text-taskflow-muted hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                            title="Remove member from project"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 5: SETTINGS */}
      {activeTab === 'settings' && (
        <div className="max-w-2xl space-y-6">
          <form
            onSubmit={handleUpdateSettings}
            className="glass-panel rounded-2xl border border-taskflow-border p-6 bg-taskflow-surface space-y-4"
          >
            <h2 className="text-base font-bold text-white tracking-tight">Project Configuration</h2>
            <p className="text-xs text-taskflow-muted">
              Update project metadata, status, and visual appearance
            </p>

            {settingsError && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{settingsError}</span>
              </div>
            )}

            {settingsSuccess && (
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{settingsSuccess}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-taskflow-text">
                Project Key (Protected)
              </label>
              <input
                type="text"
                value={project.key}
                disabled
                className="w-full px-3.5 py-2 rounded-xl bg-taskflow-bg/40 border border-taskflow-border text-sm font-mono text-cyan-300 opacity-70 cursor-not-allowed uppercase"
              />
              <p className="text-[10px] text-taskflow-muted">
                Project keys are immutable after creation to protect URL routing and task
                references.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-taskflow-text">Project Name</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                className="w-full px-3.5 py-2 rounded-xl bg-taskflow-bg/80 border border-taskflow-border focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 text-sm text-white transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-taskflow-text">Description</label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={3}
                className="w-full px-3.5 py-2 rounded-xl bg-taskflow-bg/80 border border-taskflow-border focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 text-sm text-white transition-all resize-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-taskflow-text">Status</label>
                <select
                  value={status}
                  onChange={e => setStatus(e.target.value as ProjectStatus)}
                  className="w-full px-3.5 py-2 rounded-xl bg-taskflow-bg/80 border border-taskflow-border focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 text-sm text-white transition-all cursor-pointer"
                >
                  <option value={ProjectStatus.PLANNING}>Planning</option>
                  <option value={ProjectStatus.ACTIVE}>Active</option>
                  <option value={ProjectStatus.PAUSED}>Paused</option>
                  <option value={ProjectStatus.COMPLETED}>Completed</option>
                  <option value={ProjectStatus.ARCHIVED}>Archived</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-taskflow-text">Visual Color</label>
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

            <div className="pt-4 flex justify-end">
              <button
                type="submit"
                disabled={settingsLoading}
                className="px-5 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white shadow-glow-cyan disabled:opacity-50 flex items-center space-x-2 transition-all cursor-pointer"
              >
                {settingsLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>Save Changes</span>
              </button>
            </div>
          </form>

          {/* Danger Zone: Archive / Unarchive */}
          <div className="glass-panel rounded-2xl border border-rose-500/30 p-6 bg-rose-500/5 space-y-3">
            <h3 className="text-sm font-bold text-rose-400 flex items-center space-x-2">
              <Archive className="w-4 h-4" />
              <span>Project Lifecycle Archive</span>
            </h3>
            <p className="text-xs text-taskflow-muted leading-relaxed">
              Archiving sets this project to read-only status and hides it from default active
              listings. All task relations and member histories are safely preserved.
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={handleToggleArchive}
                disabled={settingsLoading}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 transition-all cursor-pointer"
              >
                {project.status === ProjectStatus.ARCHIVED
                  ? 'Unarchive Project'
                  : 'Archive Project'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Member Modal */}
      {addMemberModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md glass-panel rounded-2xl border border-taskflow-border shadow-2xl p-6 bg-taskflow-surface text-taskflow-text space-y-4">
            <h3 className="text-base font-bold text-white">Add Team Member to Project</h3>
            <p className="text-xs text-taskflow-muted">
              Select an existing organization member to grant project access
            </p>

            <form onSubmit={handleAddMember} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-taskflow-text">Select Member</label>
                {availableOrgMembers.length === 0 ? (
                  <p className="text-xs text-amber-400 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                    All organization members are already assigned to this project.
                  </p>
                ) : (
                  <select
                    value={selectedOrgUserId}
                    onChange={e => setSelectedOrgUserId(e.target.value)}
                    required
                    className="w-full px-3.5 py-2 rounded-xl bg-taskflow-bg border border-taskflow-border text-sm text-white focus:outline-none focus:border-cyan-500 cursor-pointer"
                  >
                    <option value="">Choose an organization member...</option>
                    {availableOrgMembers.map(m => (
                      <option key={m.user.id} value={m.user.id}>
                        {m.user.name} ({m.user.email}) — Org {m.role}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-taskflow-text">Project Role</label>
                <select
                  value={selectedProjectRole}
                  onChange={e => setSelectedProjectRole(e.target.value as ProjectRole)}
                  className="w-full px-3.5 py-2 rounded-xl bg-taskflow-bg border border-taskflow-border text-sm text-white focus:outline-none focus:border-cyan-500 cursor-pointer"
                >
                  <option value={ProjectRole.MEMBER}>MEMBER (Contributor)</option>
                  <option value={ProjectRole.ADMIN}>ADMIN (Project Administrator)</option>
                  <option value={ProjectRole.VIEWER}>VIEWER (Read-Only)</option>
                  <option value={ProjectRole.LEAD}>LEAD (Project Owner)</option>
                </select>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setAddMemberModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-taskflow-muted hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={memberActionLoading || !selectedOrgUserId}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-cyan-500 to-indigo-600 text-white shadow-glow-cyan disabled:opacity-50"
                >
                  {memberActionLoading ? 'Adding...' : 'Add to Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Remove Member Confirmation Modal */}
      {removingMemberId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-sm glass-panel rounded-2xl border border-rose-500/30 shadow-2xl p-6 bg-taskflow-surface text-taskflow-text space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white">Remove Project Member?</h3>
            <p className="text-xs text-taskflow-muted">
              This will revoke the user's access to this specific project. Sole project leads cannot
              be removed.
            </p>

            <div className="flex items-center justify-center space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setRemovingMemberId(null)}
                disabled={memberActionLoading}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-taskflow-muted hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRemove}
                disabled={memberActionLoading}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-500 hover:bg-rose-600 text-white shadow-lg shadow-rose-500/30"
              >
                {memberActionLoading ? 'Removing...' : 'Confirm Remove'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
