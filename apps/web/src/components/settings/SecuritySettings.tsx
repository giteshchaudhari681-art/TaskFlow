import React, { useState } from 'react';
import {
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  KeyRound,
} from 'lucide-react';
import { api } from '../../lib/api';

export const SecuritySettings: React.FC = () => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Password entropy checks
  const hasMinLength = newPassword.length >= 8;
  const hasUppercase = /[A-Z]/.test(newPassword);
  const hasLowercase = /[a-z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const isMatch = newPassword === confirmPassword && newPassword.length > 0;
  const isValidNewPassword = hasMinLength && hasUppercase && hasLowercase && hasNumber;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) {
      setErrorMsg('Please fill in all password fields');
      return;
    }

    if (!isValidNewPassword) {
      setErrorMsg('New password does not meet the security criteria');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('New password and confirmation do not match');
      return;
    }

    if (newPassword === currentPassword) {
      setErrorMsg('New password cannot be identical to current password');
      return;
    }

    setSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await api.changePassword({
        currentPassword,
        newPassword,
      });

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setSuccessMsg(
        res.message || 'Password changed successfully. All other device sessions were revoked.'
      );
      setTimeout(() => setSuccessMsg(null), 6000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to change password';
      setErrorMsg(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-white">Security & Password</h3>
        <p className="text-xs text-taskflow-muted mt-1">
          Manage your authentication credentials and session security policies.
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

      {/* Session notice */}
      <div className="p-4 rounded-xl bg-cyan-950/40 border border-cyan-800/50 text-cyan-300 text-xs flex items-start space-x-3">
        <ShieldCheck className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-white">Active Device Session Guard</span>
          <p className="text-taskflow-muted mt-0.5 leading-relaxed">
            Changing your password triggers immediate revocation of all other active sessions across
            your remote devices, safeguarding your engineering workspace against unauthorized
            access.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="glass-card p-5 rounded-xl border border-taskflow-border space-y-4">
          <div>
            <label className="block text-xs font-medium text-taskflow-text-dim mb-1.5">
              Current Password *
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-taskflow-muted absolute left-3 top-3" />
              <input
                type={showCurrent ? 'text' : 'password'}
                required
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-9 pr-10 py-2.5 rounded-lg bg-taskflow-surface border border-taskflow-border text-white placeholder-taskflow-muted text-sm focus:outline-none focus:border-cyan-500 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute right-3 top-2.5 text-taskflow-muted hover:text-white transition-colors"
              >
                {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-taskflow-text-dim mb-1.5">
              New Password *
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-taskflow-muted absolute left-3 top-3" />
              <input
                type={showNew ? 'text' : 'password'}
                required
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-9 pr-10 py-2.5 rounded-lg bg-taskflow-surface border border-taskflow-border text-white placeholder-taskflow-muted text-sm focus:outline-none focus:border-cyan-500 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-3 top-2.5 text-taskflow-muted hover:text-white transition-colors"
              >
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-taskflow-text-dim mb-1.5">
              Confirm New Password *
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-taskflow-muted absolute left-3 top-3" />
              <input
                type={showNew ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-9 pr-4 py-2.5 rounded-lg bg-taskflow-surface border border-taskflow-border text-white placeholder-taskflow-muted text-sm focus:outline-none focus:border-cyan-500 transition-colors"
              />
            </div>
          </div>

          {/* Password Entropy Indicators */}
          <div className="pt-2 border-t border-taskflow-border/60">
            <span className="text-[11px] uppercase tracking-wider text-taskflow-muted block mb-2 font-medium">
              Password Requirements
            </span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div
                className={`flex items-center space-x-1.5 ${hasMinLength ? 'text-emerald-400' : 'text-taskflow-muted'}`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>8+ Characters</span>
              </div>
              <div
                className={`flex items-center space-x-1.5 ${hasUppercase ? 'text-emerald-400' : 'text-taskflow-muted'}`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Uppercase Letter</span>
              </div>
              <div
                className={`flex items-center space-x-1.5 ${hasLowercase ? 'text-emerald-400' : 'text-taskflow-muted'}`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Lowercase Letter</span>
              </div>
              <div
                className={`flex items-center space-x-1.5 ${hasNumber ? 'text-emerald-400' : 'text-taskflow-muted'}`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Number (0-9)</span>
              </div>
              {confirmPassword.length > 0 && (
                <div
                  className={`col-span-2 flex items-center space-x-1.5 ${isMatch ? 'text-emerald-400' : 'text-rose-400'}`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Passwords match</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving || !isValidNewPassword || !isMatch || !currentPassword}
            className="py-2.5 px-5 rounded-lg bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white text-sm font-semibold shadow-glow-cyan transition-all flex items-center space-x-2 disabled:opacity-40"
          >
            {saving ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Updating password...</span>
              </>
            ) : (
              <>
                <Lock className="w-4 h-4" />
                <span>Update Password</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
