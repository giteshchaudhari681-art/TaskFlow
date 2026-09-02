import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Search,
  Crown,
  Mail,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { OrganizationMemberItem, UserRole } from '@taskflow/shared';

export const MembersSettings: React.FC = () => {
  const { user, activeOrg } = useAuth();
  const [members, setMembers] = useState<OrganizationMemberItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Invite modal state
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<UserRole>(UserRole.MEMBER);

  // Remove confirmation modal state
  const [memberToRemove, setMemberToRemove] = useState<OrganizationMemberItem | null>(null);

  const isOwner = activeOrg?.role === UserRole.OWNER;
  const isAdmin = activeOrg?.role === UserRole.ADMIN;
  const canManage = isOwner || isAdmin;

  const fetchMembers = async () => {
    if (!activeOrg) return;
    try {
      setLoading(true);
      const data = await api.getMembers(activeOrg.organizationId);
      setMembers(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load workspace members';
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, [activeOrg]);

  const handleRoleChange = async (member: OrganizationMemberItem, newRole: UserRole) => {
    if (!activeOrg || member.role === newRole) return;

    setActionLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      await api.updateMemberRole(activeOrg.organizationId, member.userId, { role: newRole });
      setSuccessMsg(`Updated role for ${member.user.name} to ${newRole}`);
      await fetchMembers();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update member role';
      setErrorMsg(msg);
    } finally {
      setActionLoading(false);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeOrg || !inviteEmail.trim()) return;

    setActionLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const added = await api.addMember(activeOrg.organizationId, {
        email: inviteEmail.trim(),
        role: inviteRole,
      });

      setShowInviteModal(false);
      setInviteEmail('');
      setInviteRole(UserRole.MEMBER);
      setSuccessMsg(`Added ${added.user.name || inviteEmail} to the workspace as ${inviteRole}`);
      await fetchMembers();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to add member to workspace';
      setErrorMsg(msg);
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmRemove = async () => {
    if (!activeOrg || !memberToRemove) return;

    setActionLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      await api.removeMember(activeOrg.organizationId, memberToRemove.userId);
      setSuccessMsg(`Removed ${memberToRemove.user.name} from the workspace`);
      setMemberToRemove(null);
      await fetchMembers();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to remove member';
      setErrorMsg(msg);
    } finally {
      setActionLoading(false);
    }
  };

  const filteredMembers = members.filter(
    m =>
      m.user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const ownerCount = members.filter(m => m.role === UserRole.OWNER).length;

  if (!activeOrg) {
    return (
      <div className="py-12 text-center text-taskflow-muted">
        <p className="text-sm">No active organization selected.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-white">Workspace Members</h3>
          <p className="text-xs text-taskflow-muted mt-1">
            Manage organization team access, role assignments, and permission boundaries.
          </p>
        </div>

        {canManage && (
          <button
            type="button"
            onClick={() => setShowInviteModal(true)}
            className="py-2 px-4 rounded-lg bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white text-xs font-semibold shadow-glow-cyan transition-all flex items-center space-x-2 self-start sm:self-auto"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Invite Member</span>
          </button>
        )}
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

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-taskflow-muted absolute left-3 top-3" />
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Filter members by name or email..."
          className="w-full pl-9 pr-4 py-2 rounded-lg bg-taskflow-surface border border-taskflow-border text-white placeholder-taskflow-muted text-xs focus:outline-none focus:border-cyan-500 transition-colors"
        />
      </div>

      {/* Members Table / List */}
      <div className="glass-card rounded-xl border border-taskflow-border overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-taskflow-muted">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-cyan-400" />
            <p className="text-xs">Loading members directory...</p>
          </div>
        ) : filteredMembers.length === 0 ? (
          <div className="py-12 text-center text-taskflow-muted space-y-1">
            <Users className="w-8 h-8 mx-auto text-taskflow-muted/50" />
            <p className="text-xs text-white font-medium">No members found</p>
            <p className="text-[11px]">Try adjusting your search criteria.</p>
          </div>
        ) : (
          <div className="divide-y divide-taskflow-border/50">
            {filteredMembers.map(m => {
              const isCurrentUser = m.userId === user?.id;
              const isTargetOwner = m.role === UserRole.OWNER;
              const isSoleOwner = isTargetOwner && ownerCount <= 1;

              // Role edit permissions:
              // - User cannot edit own role
              // - ADMIN cannot edit an OWNER
              // - Only OWNER can promote to OWNER
              const canEditThisRole =
                canManage && !isCurrentUser && (isOwner || (isAdmin && !isTargetOwner));

              // Removal permissions:
              // - ADMIN cannot remove an OWNER
              // - Cannot remove sole OWNER
              const canRemoveThisMember =
                canManage && !isSoleOwner && (isOwner || (isAdmin && !isTargetOwner));

              return (
                <div
                  key={m.id}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-taskflow-surface/30 transition-colors"
                >
                  <div className="flex items-center space-x-3.5">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-cyan-500 p-0.5 flex-shrink-0">
                      <div className="w-full h-full bg-taskflow-surface rounded-[10px] overflow-hidden flex items-center justify-center">
                        {m.user.avatarUrl ? (
                          <img
                            src={m.user.avatarUrl}
                            alt={m.user.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-xs font-bold text-white uppercase">
                            {m.user.name.charAt(0)}
                          </span>
                        )}
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-semibold text-white">{m.user.name}</span>
                        {isCurrentUser && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-800/60 font-medium">
                            You
                          </span>
                        )}
                        {isTargetOwner && (
                          <span title="Organization Owner">
                            <Crown className="w-3.5 h-3.5 text-amber-400" />
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-taskflow-muted block mt-0.5">
                        {m.user.email}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end space-x-3">
                    <span className="text-[11px] text-taskflow-muted hidden md:inline">
                      Joined {new Date(m.joinedAt).toLocaleDateString()}
                    </span>

                    {/* Role selector or badge */}
                    {canEditThisRole ? (
                      <select
                        disabled={actionLoading}
                        value={m.role}
                        onChange={e => handleRoleChange(m, e.target.value as UserRole)}
                        className="text-xs px-2.5 py-1 rounded-lg bg-taskflow-surface border border-taskflow-border text-white focus:outline-none focus:border-cyan-500 transition-colors"
                      >
                        {isOwner && <option value={UserRole.OWNER}>OWNER</option>}
                        <option value={UserRole.ADMIN}>ADMIN</option>
                        <option value={UserRole.MEMBER}>MEMBER</option>
                        <option value={UserRole.GUEST}>GUEST</option>
                      </select>
                    ) : (
                      <span
                        className={`text-xs px-2.5 py-0.5 rounded-full font-medium border ${
                          m.role === UserRole.OWNER
                            ? 'bg-amber-950/70 border-amber-800/70 text-amber-300'
                            : m.role === UserRole.ADMIN
                              ? 'bg-indigo-950/70 border-indigo-800/70 text-indigo-300'
                              : 'bg-taskflow-surface border-taskflow-border text-taskflow-muted'
                        }`}
                      >
                        {m.role}
                      </span>
                    )}

                    {/* Remove button */}
                    {canRemoveThisMember ? (
                      <button
                        type="button"
                        disabled={actionLoading}
                        onClick={() => setMemberToRemove(m)}
                        title="Remove member"
                        className="p-1.5 rounded-lg text-taskflow-muted hover:text-rose-400 hover:bg-rose-950/30 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    ) : isSoleOwner ? (
                      <span className="text-[10px] text-amber-400/80 px-2 py-0.5 rounded bg-amber-950/30 border border-amber-900/40">
                        Sole Owner
                      </span>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Invite Member Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="glass-card max-w-md w-full p-6 rounded-2xl border border-taskflow-border shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <UserPlus className="w-4 h-4 text-cyan-400" />
                <h4 className="text-sm font-semibold text-white">Add Team Member</h4>
              </div>
              <button
                type="button"
                onClick={() => setShowInviteModal(false)}
                className="text-taskflow-muted hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-taskflow-muted">
              Add a registered TaskFlow user to{' '}
              <span className="text-white font-medium">{activeOrg.organizationName}</span> by
              entering their email address.
            </p>

            <form onSubmit={handleInvite} className="space-y-4 pt-1">
              <div>
                <label className="block text-xs font-medium text-taskflow-text-dim mb-1.5">
                  User Email Address *
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-taskflow-muted absolute left-3 top-3" />
                  <input
                    type="email"
                    required
                    value={inviteEmail}
                    onChange={e => setInviteEmail(e.target.value)}
                    placeholder="teammate@company.com"
                    className="w-full pl-9 pr-4 py-2 rounded-lg bg-taskflow-surface border border-taskflow-border text-white text-xs placeholder-taskflow-muted focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-taskflow-text-dim mb-1.5">
                  Workspace Role
                </label>
                <select
                  value={inviteRole}
                  onChange={e => setInviteRole(e.target.value as UserRole)}
                  className="w-full px-3 py-2 rounded-lg bg-taskflow-surface border border-taskflow-border text-white text-xs focus:outline-none focus:border-cyan-500"
                >
                  <option value={UserRole.MEMBER}>MEMBER (Standard execution access)</option>
                  <option value={UserRole.ADMIN}>ADMIN (Workspace administrator)</option>
                  <option value={UserRole.GUEST}>GUEST (Restricted observer access)</option>
                </select>
              </div>

              <div className="flex justify-end space-x-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="px-3.5 py-1.5 rounded-lg border border-taskflow-border text-taskflow-muted hover:text-white text-xs transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading || !inviteEmail.trim()}
                  className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white text-xs font-semibold shadow-glow-cyan transition-all disabled:opacity-50"
                >
                  {actionLoading ? 'Adding...' : 'Add Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Remove Member Confirmation Modal */}
      {memberToRemove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="glass-card max-w-sm w-full p-5 rounded-2xl border border-rose-900/60 shadow-2xl space-y-3">
            <div className="flex items-center space-x-2 text-rose-400">
              <AlertCircle className="w-5 h-5" />
              <h4 className="text-sm font-semibold text-white">Remove Member</h4>
            </div>

            <p className="text-xs text-taskflow-muted leading-relaxed">
              Are you sure you want to remove{' '}
              <span className="text-white font-medium">{memberToRemove.user.name}</span> (
              {memberToRemove.user.email}) from this workspace? They will immediately lose access to
              all projects and tasks in this organization.
            </p>

            <div className="flex justify-end space-x-2.5 pt-2">
              <button
                type="button"
                onClick={() => setMemberToRemove(null)}
                className="px-3 py-1.5 rounded-lg border border-taskflow-border text-taskflow-muted hover:text-white text-xs transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleConfirmRemove}
                className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition-all disabled:opacity-50"
              >
                {actionLoading ? 'Removing...' : 'Confirm Remove'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
