import React, { useState } from 'react';
import { Lock, Mail, Eye, EyeOff, LogIn, AlertCircle, Sparkles, UserCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface LoginPageProps {
  onSwitchToRegister: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onSwitchToRegister }) => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in both email and password');
      return;
    }

    setError(null);
    setLoading(true);
    try {
      await login({ email, password });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid login credentials';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // Development convenience demo account autofill
  const handleQuickFill = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('TaskFlow2026!Dev');
    setError(null);
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="glass-card rounded-2xl p-8 border border-taskflow-border shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-12 -mt-12 w-40 h-40 rounded-full bg-cyan-500/10 blur-2xl pointer-events-none" />

        <div className="text-center mb-6">
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-cyan-950/60 border border-cyan-800/50 text-cyan-400 text-xs font-medium mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Secure Operations Portal</span>
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Sign in to TaskFlow</h2>
          <p className="text-xs text-taskflow-muted mt-1.5">
            Enter your credentials to access your engineering workspace
          </p>
        </div>

        {error && (
          <div className="mb-5 p-3.5 rounded-lg bg-rose-950/50 border border-rose-800/60 text-rose-300 text-xs flex items-start space-x-2.5">
            <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-taskflow-text-dim mb-1.5">
              Work Email
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-taskflow-muted absolute left-3 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="alex.chen@taskflow.dev"
                className="w-full pl-9 pr-4 py-2.5 rounded-lg bg-taskflow-surface border border-taskflow-border text-white placeholder-taskflow-muted text-sm focus:outline-none focus:border-cyan-500 transition-colors"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-medium text-taskflow-text-dim">Password</label>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-taskflow-muted absolute left-3 top-3" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-9 pr-10 py-2.5 rounded-lg bg-taskflow-surface border border-taskflow-border text-white placeholder-taskflow-muted text-sm focus:outline-none focus:border-cyan-500 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-taskflow-muted hover:text-white transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 rounded-lg bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white text-sm font-semibold shadow-glow-cyan transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
          >
            {loading ? (
              <span>Signing in...</span>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                <span>Sign In</span>
              </>
            )}
          </button>
        </form>

        {/* Development Seed Quick Fill Helpers */}
        <div className="mt-6 pt-5 border-t border-taskflow-border/60">
          <span className="text-[11px] uppercase tracking-wider text-taskflow-muted block mb-2 font-medium">
            Demo Accounts (Development Seed)
          </span>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleQuickFill('alex.chen@taskflow.dev')}
              className="px-2.5 py-1.5 rounded bg-taskflow-surface hover:bg-taskflow-card-hover border border-taskflow-border text-xs text-taskflow-muted hover:text-cyan-300 transition-colors flex items-center space-x-1.5 text-left"
            >
              <UserCheck className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
              <span className="truncate">Alex (Owner)</span>
            </button>
            <button
              type="button"
              onClick={() => handleQuickFill('sam.miller@taskflow.dev')}
              className="px-2.5 py-1.5 rounded bg-taskflow-surface hover:bg-taskflow-card-hover border border-taskflow-border text-xs text-taskflow-muted hover:text-indigo-300 transition-colors flex items-center space-x-1.5 text-left"
            >
              <UserCheck className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
              <span className="truncate">Sam (Admin)</span>
            </button>
          </div>
        </div>

        <div className="text-center mt-5 text-xs text-taskflow-muted">
          Don&apos;t have an account?{' '}
          <button
            onClick={onSwitchToRegister}
            className="text-cyan-400 hover:text-cyan-300 font-medium transition-colors"
          >
            Create Workspace
          </button>
        </div>
      </div>
    </div>
  );
};
