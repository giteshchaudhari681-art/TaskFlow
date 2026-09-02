import React, { useState, useEffect } from 'react';
import {
  Building2,
  Save,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Shield,
  Users,
  FolderGit2,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { OrganizationDetails, UserRole } from '@taskflow/shared';

export const WorkspaceSettings: React.FC = () => {
  const { activeOrg, refreshUser } = useAuth();
  const [workspace, setWorkspace] = useState<OrganizationDetails | null>(null);
  const [name, setName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isAuthorized = activeOrg?.role === UserRole.OWNER || activeOrg?.role === UserRole.ADMIN;

  useEffect(() => {
    const fetchWorkspace = async () => {
      if (!activeOrg) return;
      try {
        setLoading(true);
        const data = await api.getWorkspace(activeOrg.organizationId);
        setWorkspace(data);
        setName(data.name);
        setLogoUrl(data.logoUrl || '');
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to load workspace settings';
        setErrorMsg(msg);
      } finally {
        setLoading(false);
      }
    };

    fetchWorkspace();
  }, [activeOrg]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeOrg || !isAuthorized) return;
    if (!name.trim()) {
      setErrorMsg('Workspace name cannot be empty');
      return;
    }

    setSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const updated = await api.updateWorkspace(activeOrg.organizationId, {
        name: name.trim(),
        logoUrl: logoUrl.trim() || null,
      });

      setWorkspace(updated);
      await refreshUser();
      setSuccessMsg('Workspace metadata updated successfully');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update workspace';
      setErrorMsg(msg);
    } finally {
      setSaving(false);
    }
  };

  if (!activeOrg) {
    return (
      <div className="py-12 text-center text-taskflow-muted">
        <p className="text-sm">No active organization selected.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="py-12 text-center text-taskflow-muted">
        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-cyan-400" />
        <p className="text-sm">Loading workspace settings...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h3 className="text-lg font-semibold text-white">Workspace Configuration</h3>
          <p className="text-xs text-taskflow-muted mt-1">
            Configure metadata, identity branding, and tenant details for this organization.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-xs text-taskflow-muted">Your Role:</span>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-950/80 border border-indigo-700/60 text-indigo-300">
            {activeOrg.role}
          </span>
        </div>
      </div>

      {successMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-950/50 border border-emerald-800/60 text-emerald-300 text-xs flex items-center space-x-2.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-rose-950/50 border border-rose-800/60 text-rose-300 text-xs flex items-center space-x-2.5">
          <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {!isAuthorized && (
        <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-800/50 text-amber-300 text-xs flex items-center space-x-2.5">
          <Shield className="w-4 h-4 text-amber-400 flex-shrink-0" />
          <span>
            Read-only view: You have {activeOrg.role} access. Only workspace Owners and
            Administrators can update organization settings.
          </span>
        </div>
      )}

      {/* Telemetry overview */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="glass-card p-4 rounded-xl border border-taskflow-border">
          <div className="flex items-center space-x-2 text-taskflow-muted text-xs">
            <Users className="w-4 h-4 text-cyan-400" />
            <span>Total Members</span>
          </div>
          <div className="text-2xl font-bold text-white mt-1">{workspace?.memberCount ?? 1}</div>
        </div>

        <div className="glass-card p-4 rounded-xl border border-taskflow-border">
          <div className="flex items-center space-x-2 text-taskflow-muted text-xs">
            <FolderGit2 className="w-4 h-4 text-indigo-400" />
            <span>Active Projects</span>
          </div>
          <div className="text-2xl font-bold text-white mt-1">{workspace?.projectCount ?? 0}</div>
        </div>

        <div className="glass-card p-4 rounded-xl border border-taskflow-border col-span-2 sm:col-span-1">
          <div className="flex items-center space-x-2 text-taskflow-muted text-xs">
            <Building2 className="w-4 h-4 text-violet-400" />
            <span>Tenant Status</span>
          </div>
          <div className="text-sm font-semibold text-emerald-400 mt-2 flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Production Active</span>
          </div>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-5">
        <div className="glass-card p-5 rounded-xl border border-taskflow-border space-y-4">
          <div>
            <label className="block text-xs font-medium text-taskflow-text-dim mb-1.5">
              Workspace Display Name *
            </label>
            <div className="relative">
              <Building2 className="w-4 h-4 text-taskflow-muted absolute left-3 top-3" />
              <input
                type="text"
                required
                disabled={!isAuthorized}
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Acme Operations HQ"
                className="w-full pl-9 pr-4 py-2.5 rounded-lg bg-taskflow-surface border border-taskflow-border text-white placeholder-taskflow-muted text-sm focus:outline-none focus:border-cyan-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-taskflow-text-dim mb-1.5">
              Workspace Slug (Tenant Identifier)
            </label>
            <div className="relative">
              <span className="text-taskflow-muted text-xs font-mono absolute left-3 top-3">
                /org/
              </span>
              <input
                type="text"
                disabled
                value={workspace?.slug || ''}
                className="w-full pl-12 pr-4 py-2.5 rounded-lg bg-taskflow-surface/50 border border-taskflow-border/50 text-taskflow-muted font-mono text-xs cursor-not-allowed"
              />
            </div>
            <span className="text-[11px] text-taskflow-muted mt-1 block">
              Unique organization routing identifier used for multi-tenant isolation.
            </span>
          </div>

          <div className="pt-2 border-t border-taskflow-border/60 grid grid-cols-2 gap-4 text-xs text-taskflow-muted">
            <div>
              <span className="block text-[11px] uppercase tracking-wider font-semibold">
                Workspace ID
              </span>
              <span className="font-mono text-white text-[11px] truncate block mt-0.5">
                {workspace?.id}
              </span>
            </div>
            <div>
              <span className="block text-[11px] uppercase tracking-wider font-semibold">
                Created Date
              </span>
              <span className="text-white text-xs block mt-0.5">
                {workspace?.createdAt ? new Date(workspace.createdAt).toLocaleDateString() : 'N/A'}
              </span>
            </div>
          </div>
        </div>

        {isAuthorized && (
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="py-2.5 px-5 rounded-lg bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white text-sm font-semibold shadow-glow-cyan transition-all flex items-center space-x-2 disabled:opacity-50"
            >
              {saving ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Saving settings...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save Workspace</span>
                </>
              )}
            </button>
          </div>
        )}
      </form>
    </div>
  );
};
