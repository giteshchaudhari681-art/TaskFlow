import React, { useState, useEffect } from 'react';
import { User, Mail, Save, CheckCircle2, AlertCircle, Image, RefreshCw } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { UserProfile } from '@taskflow/shared';

const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
];

export const ProfileSettings: React.FC = () => {
  const { user, updateUser } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [name, setName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const data = await api.getProfile();
        setProfile(data);
        setName(data.name);
        setAvatarUrl(data.avatarUrl || '');
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to load profile';
        setErrorMsg(msg);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('Name cannot be empty');
      return;
    }

    setSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const updated = await api.updateProfile({
        name: name.trim(),
        avatarUrl: avatarUrl.trim() || null,
      });

      setProfile(updated);
      updateUser({ name: updated.name, avatarUrl: updated.avatarUrl });
      setSuccessMsg('Profile details updated successfully');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update profile';
      setErrorMsg(msg);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="py-12 text-center text-taskflow-muted">
        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-cyan-400" />
        <p className="text-sm">Loading user profile details...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-white">Personal Profile</h3>
        <p className="text-xs text-taskflow-muted mt-1">
          Manage your personal account details, avatar identity, and display information.
        </p>
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

      <form onSubmit={handleSave} className="space-y-5">
        {/* Avatar Selection Card */}
        <div className="glass-card p-5 rounded-xl border border-taskflow-border space-y-4">
          <label className="block text-xs font-semibold text-taskflow-text-dim uppercase tracking-wider">
            Profile Avatar
          </label>
          <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-3 sm:space-y-0 sm:space-x-5">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-600 to-cyan-500 p-0.5 shadow-glow-cyan flex-shrink-0">
              <div className="w-full h-full bg-taskflow-surface rounded-[14px] overflow-hidden flex items-center justify-center">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt="Avatar preview"
                    className="w-full h-full object-cover"
                    onError={() => setAvatarUrl('')}
                  />
                ) : (
                  <span className="text-xl font-bold text-white uppercase">
                    {name.charAt(0) || user?.name.charAt(0) || 'U'}
                  </span>
                )}
              </div>
            </div>

            <div className="flex-1 space-y-2 w-full">
              <span className="text-xs text-taskflow-muted block">Choose a preset avatar:</span>
              <div className="flex items-center space-x-2">
                {PRESET_AVATARS.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setAvatarUrl(preset)}
                    className={`w-9 h-9 rounded-xl overflow-hidden border-2 transition-all ${
                      avatarUrl === preset
                        ? 'border-cyan-400 scale-105 shadow-glow-cyan'
                        : 'border-taskflow-border hover:border-taskflow-text-dim'
                    }`}
                  >
                    <img
                      src={preset}
                      alt={`Preset ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
                {avatarUrl && (
                  <button
                    type="button"
                    onClick={() => setAvatarUrl('')}
                    className="px-2.5 py-1 text-xs rounded-lg border border-taskflow-border text-taskflow-muted hover:text-white transition-colors"
                  >
                    Reset
                  </button>
                )}
              </div>

              <div className="relative mt-2">
                <Image className="w-3.5 h-3.5 text-taskflow-muted absolute left-3 top-2.5" />
                <input
                  type="url"
                  value={avatarUrl}
                  onChange={e => setAvatarUrl(e.target.value)}
                  placeholder="Or enter custom image URL (https://...)"
                  className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-taskflow-surface border border-taskflow-border text-white text-xs placeholder-taskflow-muted focus:outline-none focus:border-cyan-500 transition-colors"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Identity Information */}
        <div className="glass-card p-5 rounded-xl border border-taskflow-border space-y-4">
          <div>
            <label className="block text-xs font-medium text-taskflow-text-dim mb-1.5">
              Full Name *
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-taskflow-muted absolute left-3 top-3" />
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Alex Chen"
                className="w-full pl-9 pr-4 py-2.5 rounded-lg bg-taskflow-surface border border-taskflow-border text-white placeholder-taskflow-muted text-sm focus:outline-none focus:border-cyan-500 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-taskflow-text-dim mb-1.5">
              Email Address (Immutable)
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-taskflow-muted absolute left-3 top-3" />
              <input
                type="email"
                disabled
                value={profile?.email || ''}
                className="w-full pl-9 pr-4 py-2.5 rounded-lg bg-taskflow-surface/50 border border-taskflow-border/50 text-taskflow-muted text-sm cursor-not-allowed"
              />
            </div>
            <span className="text-[11px] text-taskflow-muted mt-1 block">
              Primary login email managed by organizational tenant security policy.
            </span>
          </div>

          <div className="pt-2 border-t border-taskflow-border/60 grid grid-cols-2 gap-4 text-xs text-taskflow-muted">
            <div>
              <span className="block text-[11px] uppercase tracking-wider font-semibold">
                User ID
              </span>
              <span className="font-mono text-white text-[11px] truncate block mt-0.5">
                {profile?.id}
              </span>
            </div>
            <div>
              <span className="block text-[11px] uppercase tracking-wider font-semibold">
                Member Since
              </span>
              <span className="text-white text-xs block mt-0.5">
                {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : 'N/A'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="py-2.5 px-5 rounded-lg bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white text-sm font-semibold shadow-glow-cyan transition-all flex items-center space-x-2 disabled:opacity-50"
          >
            {saving ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Saving changes...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save Profile Changes</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
