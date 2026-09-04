import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  RefreshCw,
  Filter,
  ChevronLeft,
  ChevronRight,
  Bot,
  User,
  Cpu,
  Sparkles,
  AlertTriangle,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { auditApi, projectApi } from '../../lib/api';
import { AuditEvent, AuditAction, AuditSource, ActorType, ProjectListItem } from '@taskflow/shared';

export const AuditLogSettings: React.FC = () => {
  const { activeOrg } = useAuth();
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Filter state
  const [selectedAction, setSelectedAction] = useState<string>('');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [fromFilter, setFromFilter] = useState<string>('');
  const [toFilter, setToFilter] = useState<string>('');
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);

  // Pagination state
  const [page, setPage] = useState(1);
  const [limit] = useState(25);
  const [totalPages, setTotalPages] = useState(1);
  const [totalEvents, setTotalEvents] = useState(0);

  // Load project directory for filter
  useEffect(() => {
    if (!activeOrg?.organizationId) return;
    projectApi
      .listProjects(activeOrg.organizationId)
      .then(res => setProjects(res))
      .catch(() => {});
  }, [activeOrg?.organizationId]);

  const fetchEvents = async () => {
    if (!activeOrg?.organizationId) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await auditApi.listAuditEvents(activeOrg.organizationId, {
        action: selectedAction ? (selectedAction as AuditAction) : undefined,
        projectId: selectedProjectId || undefined,
        from: fromFilter ? new Date(fromFilter).toISOString() : undefined,
        to: toFilter ? new Date(toFilter).toISOString() : undefined,
        page,
        limit,
      });
      setEvents(res.items || []);
      if (res.meta) {
        setTotalPages(res.meta.totalPages || 1);
        setTotalEvents(res.meta.total || 0);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load audit events';
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [activeOrg?.organizationId, selectedAction, selectedProjectId, page]);

  const handleApplyDateFilters = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchEvents();
  };

  const handleResetFilters = () => {
    setSelectedAction('');
    setSelectedProjectId('');
    setFromFilter('');
    setToFilter('');
    setPage(1);
  };

  // Helper to derive human-readable summaries from structured fields (PR25 Req 17)
  const formatEventSummary = (event: AuditEvent): string => {
    const actorName =
      event.actorUser?.name || (event.actorType === 'AI' ? 'AI Assistant' : 'System');
    const meta = (event.metadata as Record<string, any>) || {};

    switch (event.action) {
      case AuditAction.AUTH_LOGIN:
        return `${actorName} logged in successfully${meta.ipAddress ? ` from ${meta.ipAddress}` : ''}`;
      case AuditAction.AUTH_LOGOUT:
        return `${actorName} logged out and revoked active session`;
      case AuditAction.AUTH_REFRESH_REUSE_DETECTED:
        return `⚠️ Suspicious session reuse detected; all user sessions revoked`;
      case AuditAction.AUTH_PASSWORD_CHANGED:
        return `${actorName} changed password and invalidated all other remote sessions`;

      case AuditAction.ORGANIZATION_CREATED:
        return `Workspace provisioned: "${meta.name || event.organizationId}"`;
      case AuditAction.ORGANIZATION_MEMBER_INVITED:
        return `${actorName} invited ${meta.email || 'a new member'} as ${meta.role || 'MEMBER'}`;
      case AuditAction.ORGANIZATION_MEMBER_ROLE_CHANGED:
        return `${actorName} updated member role: ${meta.previousRole || 'ROLE'} → ${meta.newRole || 'ROLE'}`;
      case AuditAction.ORGANIZATION_MEMBER_REMOVED:
        return `${actorName} removed member from the workspace`;

      case AuditAction.PROJECT_CREATED:
        return `${actorName} created project "${meta.name || meta.key || 'Project'}"`;
      case AuditAction.PROJECT_UPDATED:
        return `${actorName} updated project settings`;
      case AuditAction.PROJECT_ARCHIVED:
        return `${actorName} archived project`;
      case AuditAction.PROJECT_MEMBER_ADDED:
        return `${actorName} added member to project as ${meta.role || 'MEMBER'}`;
      case AuditAction.PROJECT_MEMBER_ROLE_CHANGED:
        return `${actorName} updated project role: ${meta.previousRole || 'ROLE'} → ${meta.newRole || 'ROLE'}`;
      case AuditAction.PROJECT_MEMBER_REMOVED:
        return `${actorName} removed member from project`;

      case AuditAction.TASK_CREATED:
        return `${actorName} created task ${meta.issueKey ? `[${meta.issueKey}]` : ''} "${meta.title || ''}"`;
      case AuditAction.TASK_STATUS_CHANGED: {
        const fromStatus = meta.changes?.status?.from || meta.from || 'Status';
        const toStatus = meta.changes?.status?.to || meta.to || 'Status';
        return `${actorName} changed task status: ${fromStatus} → ${toStatus}`;
      }
      case AuditAction.TASK_ASSIGNED:
        return `${actorName} assigned task`;
      case AuditAction.TASK_UNASSIGNED:
        return `${actorName} unassigned task`;
      case AuditAction.TASK_ARCHIVED:
        return `${actorName} archived task`;
      case AuditAction.TASK_UPDATED: {
        const fields = meta.changes ? Object.keys(meta.changes).join(', ') : 'fields';
        return `${actorName} updated task (${fields})`;
      }

      case AuditAction.AI_ACTION_PROPOSED:
        return `AI proposed ${meta.proposalCount || 1} action(s) for human review`;
      case AuditAction.AI_ACTION_APPLIED: {
        const changes = meta.changes ? Object.keys(meta.changes).join(', ') : 'recommendations';
        return `${actorName} applied AI recommendation: ${changes}`;
      }
      case AuditAction.AI_ACTION_REJECTED:
        return `AI recommendation rejected: ${meta.reasonCode || 'Task state conflicted'}`;
      case AuditAction.AI_ANALYSIS_REQUESTED:
        return `${actorName} requested AI operations analysis`;

      case AuditAction.COMMENT_CREATED:
        return `${actorName} added a comment`;
      case AuditAction.COMMENT_UPDATED:
        return `${actorName} edited a comment`;
      case AuditAction.COMMENT_DELETED:
        return `${actorName} deleted a comment`;

      default:
        return `${actorName} performed ${event.action.toLowerCase().replace(/_/g, ' ')}`;
    }
  };

  const renderSourceBadge = (source: AuditSource) => {
    if (source === AuditSource.AI_ASSISTED) {
      return (
        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
          <Sparkles className="w-2.5 h-2.5 text-indigo-400" />
          <span>AI-Assisted</span>
        </span>
      );
    }
    if (source === AuditSource.AI) {
      return (
        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
          <Bot className="w-2.5 h-2.5 text-cyan-400" />
          <span>AI Advisory</span>
        </span>
      );
    }
    if (source === AuditSource.SYSTEM) {
      return (
        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">
          <Cpu className="w-2.5 h-2.5 text-amber-400" />
          <span>System</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-500/15 text-slate-300 border border-slate-500/30">
        <User className="w-2.5 h-2.5 text-slate-400" />
        <span>User</span>
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-taskflow-border pb-5">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
              <ShieldAlert className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white tracking-tight">
                Security & Audit Log
              </h2>
              <p className="text-xs text-taskflow-muted">
                Immutable, append-only historical audit trail of domain mutations and security
                events.
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={fetchEvents}
            disabled={loading}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-taskflow-surface border border-taskflow-border text-taskflow-muted hover:text-white transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="glass-card p-4 rounded-xl border border-taskflow-border space-y-3">
        <div className="flex items-center space-x-2 text-xs font-semibold text-taskflow-muted uppercase tracking-wider">
          <Filter className="w-3.5 h-3.5 text-cyan-400" />
          <span>Filter Audit Trail</span>
        </div>
        <form
          onSubmit={handleApplyDateFilters}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3"
        >
          {/* Action Filter */}
          <div>
            <label className="block text-[11px] font-medium text-taskflow-muted mb-1">
              Action Type
            </label>
            <select
              value={selectedAction}
              onChange={e => {
                setSelectedAction(e.target.value);
                setPage(1);
              }}
              className="w-full px-2.5 py-1.5 rounded-lg bg-taskflow-bg border border-taskflow-border text-xs text-white focus:border-cyan-500 focus:outline-none"
            >
              <option value="">All Actions</option>
              <optgroup label="Authentication & Security">
                <option value={AuditAction.AUTH_LOGIN}>Login</option>
                <option value={AuditAction.AUTH_LOGOUT}>Logout</option>
                <option value={AuditAction.AUTH_PASSWORD_CHANGED}>Password Changed</option>
                <option value={AuditAction.AUTH_REFRESH_REUSE_DETECTED}>
                  Token Reuse Detected
                </option>
              </optgroup>
              <optgroup label="AI Actions">
                <option value={AuditAction.AI_ACTION_PROPOSED}>AI Proposed</option>
                <option value={AuditAction.AI_ACTION_APPLIED}>AI Applied</option>
                <option value={AuditAction.AI_ACTION_REJECTED}>AI Rejected</option>
              </optgroup>
              <optgroup label="Task Operations">
                <option value={AuditAction.TASK_CREATED}>Task Created</option>
                <option value={AuditAction.TASK_UPDATED}>Task Updated</option>
                <option value={AuditAction.TASK_STATUS_CHANGED}>Status Changed</option>
                <option value={AuditAction.TASK_ASSIGNED}>Task Assigned</option>
                <option value={AuditAction.TASK_UNASSIGNED}>Task Unassigned</option>
                <option value={AuditAction.TASK_ARCHIVED}>Task Archived</option>
              </optgroup>
              <optgroup label="Workspace & Projects">
                <option value={AuditAction.ORGANIZATION_MEMBER_INVITED}>Member Invited</option>
                <option value={AuditAction.ORGANIZATION_MEMBER_ROLE_CHANGED}>
                  Member Role Changed
                </option>
                <option value={AuditAction.PROJECT_CREATED}>Project Created</option>
                <option value={AuditAction.PROJECT_UPDATED}>Project Updated</option>
                <option value={AuditAction.PROJECT_ARCHIVED}>Project Archived</option>
              </optgroup>
            </select>
          </div>

          {/* Project Filter */}
          <div>
            <label className="block text-[11px] font-medium text-taskflow-muted mb-1">
              Project
            </label>
            <select
              value={selectedProjectId}
              onChange={e => {
                setSelectedProjectId(e.target.value);
                setPage(1);
              }}
              className="w-full px-2.5 py-1.5 rounded-lg bg-taskflow-bg border border-taskflow-border text-xs text-white focus:border-cyan-500 focus:outline-none"
            >
              <option value="">All Projects</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.key})
                </option>
              ))}
            </select>
          </div>

          {/* Date From */}
          <div>
            <label className="block text-[11px] font-medium text-taskflow-muted mb-1">From</label>
            <input
              type="date"
              value={fromFilter}
              onChange={e => setFromFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg bg-taskflow-bg border border-taskflow-border text-xs text-white focus:border-cyan-500 focus:outline-none"
            />
          </div>

          {/* Date To & Buttons */}
          <div>
            <label className="block text-[11px] font-medium text-taskflow-muted mb-1">To</label>
            <div className="flex space-x-2">
              <input
                type="date"
                value={toFilter}
                onChange={e => setToFilter(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg bg-taskflow-bg border border-taskflow-border text-xs text-white focus:border-cyan-500 focus:outline-none"
              />
              <button
                type="submit"
                className="px-3 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-black font-semibold text-xs rounded-lg transition-colors"
              >
                Apply
              </button>
              {(selectedAction || selectedProjectId || fromFilter || toFilter) && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="px-2 py-1.5 text-taskflow-muted hover:text-white text-xs transition-colors"
                  title="Reset filters"
                >
                  Reset
                </button>
              )}
            </div>
          </div>
        </form>
      </div>

      {/* Error state */}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center space-x-3 text-xs text-red-300">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 text-red-400" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Table Container */}
      <div className="glass-card rounded-xl border border-taskflow-border overflow-hidden">
        {loading && events.length === 0 ? (
          <div className="p-12 text-center text-taskflow-muted text-xs flex flex-col items-center space-y-3">
            <RefreshCw className="w-6 h-6 animate-spin text-cyan-400" />
            <span>Loading audit log events...</span>
          </div>
        ) : events.length === 0 ? (
          <div className="p-12 text-center text-taskflow-muted text-xs flex flex-col items-center space-y-2">
            <ShieldAlert className="w-8 h-8 text-taskflow-muted opacity-40 mb-1" />
            <span className="font-medium text-white">No audit events found</span>
            <p className="text-[11px] max-w-sm">
              No audit events matched the selected filters. All workspace mutations and security
              events are logged here in real time.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-taskflow-surface/80 border-b border-taskflow-border text-[11px] text-taskflow-muted uppercase font-semibold">
                <tr>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Actor</th>
                  <th className="py-3 px-4">Event / Summary</th>
                  <th className="py-3 px-4">Resource</th>
                  <th className="py-3 px-4">Source</th>
                  <th className="py-3 px-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-taskflow-border/50">
                {events.map(event => {
                  const isExpanded = expandedEventId === event.id;
                  const dateFormatted = new Date(event.createdAt).toLocaleString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  });

                  return (
                    <React.Fragment key={event.id}>
                      <tr className="hover:bg-taskflow-surface/40 transition-colors">
                        <td className="py-3 px-4 font-mono text-[11px] text-taskflow-muted whitespace-nowrap">
                          {dateFormatted}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            {event.actorUser?.avatarUrl ? (
                              <img
                                src={event.actorUser.avatarUrl}
                                alt={event.actorUser.name}
                                className="w-5 h-5 rounded-full"
                              />
                            ) : event.actorType === ActorType.AI ? (
                              <div className="w-5 h-5 rounded-full bg-cyan-500/20 flex items-center justify-center">
                                <Bot className="w-3 h-3 text-cyan-400" />
                              </div>
                            ) : (
                              <div className="w-5 h-5 rounded-full bg-slate-700 flex items-center justify-center text-[10px] text-white">
                                {event.actorUser?.name ? event.actorUser.name[0] : 'S'}
                              </div>
                            )}
                            <span className="font-medium text-white">
                              {event.actorUser?.name ||
                                (event.actorType === ActorType.AI ? 'AI Service' : 'System')}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4 max-w-md">
                          <div className="space-y-0.5">
                            <div className="font-mono text-[10px] text-taskflow-muted uppercase tracking-wider">
                              {event.action}
                            </div>
                            <div className="text-white text-xs">{formatEventSummary(event)}</div>
                          </div>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="text-xs">
                            <span className="font-medium text-slate-300">{event.resourceType}</span>
                            {event.project && (
                              <div className="text-[10px] text-taskflow-muted">
                                in {event.project.name}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          {renderSourceBadge(event.source)}
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          {event.metadata ? (
                            <button
                              type="button"
                              onClick={() => setExpandedEventId(isExpanded ? null : event.id)}
                              className="text-[11px] text-cyan-400 hover:text-cyan-300 font-medium transition-colors"
                            >
                              {isExpanded ? 'Hide Payload' : 'View Payload'}
                            </button>
                          ) : (
                            <span className="text-taskflow-muted text-[11px]">—</span>
                          )}
                        </td>
                      </tr>
                      {isExpanded && event.metadata && (
                        <tr className="bg-taskflow-surface/30">
                          <td colSpan={6} className="p-4">
                            <div className="glass-card p-3 rounded-lg border border-taskflow-border text-left font-mono text-[11px] text-slate-300 max-h-48 overflow-y-auto">
                              <div className="text-taskflow-muted text-[10px] mb-1 flex items-center justify-between">
                                <span>SANITIZED AUDIT METADATA</span>
                                {event.requestId && (
                                  <span>Correlation Request ID: {event.requestId}</span>
                                )}
                              </div>
                              <pre>{JSON.stringify(event.metadata, null, 2)}</pre>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        <div className="p-4 border-t border-taskflow-border flex items-center justify-between text-xs text-taskflow-muted">
          <div>
            Showing {events.length} of {totalEvents} events (Page {page} of {totalPages})
          </div>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => setPage(prev => Math.max(1, prev - 1))}
              disabled={page <= 1 || loading}
              className="p-1.5 rounded-lg border border-taskflow-border bg-taskflow-surface text-taskflow-muted hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2 font-mono text-[11px]">
              {page} / {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
              disabled={page >= totalPages || loading}
              className="p-1.5 rounded-lg border border-taskflow-border bg-taskflow-surface text-taskflow-muted hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
