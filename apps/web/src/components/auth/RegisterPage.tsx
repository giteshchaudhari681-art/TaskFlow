import React, { useState } from 'react';
import {
  Lock,
  Mail,
  User,
  Building2,
  Eye,
  EyeOff,
  UserPlus,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface RegisterPageProps {
  onSwitchToLogin: () => void;
}

export const RegisterPage: React.FC<RegisterPageProps> = ({ onSwitchToLogin }) => {
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) {
      setError('Please fill in all required fields');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setError(null);
    setLoading(true);
    try {
      await register({
        name,
        email,
        password,
        organizationName: organizationName.trim() || undefined,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Registration failed';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="glass-card rounded-2xl p-8 border border-taskflow-border shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-12 -mt-12 w-40 h-40 rounded-full bg-indigo-500/10 blur-2xl pointer-events-none" />

        <div className="text-center mb-6">
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-indigo-950/60 border border-indigo-800/50 text-indigo-400 text-xs font-medium mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Create Engineering Workspace</span>
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">
            Get Started with TaskFlow
          </h2>
          <p className="text-xs text-taskflow-muted mt-1.5">
            Provision your team tenant and launch your operations hub
          </p>
        </div>

        {error && (
          <div className="mb-5 p-3.5 rounded-lg bg-rose-950/50 border border-rose-800/60 text-rose-300 text-xs flex items-start space-x-2.5">
            <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-xs font-medium text-taskflow-text-dim mb-1">
              Full Name *
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-taskflow-muted absolute left-3 top-3" />
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Elena Rostova"
                className="w-full pl-9 pr-4 py-2 rounded-lg bg-taskflow-surface border border-taskflow-border text-white placeholder-taskflow-muted text-sm focus:outline-none focus:border-cyan-500 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-taskflow-text-dim mb-1">
              Work Email *
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-taskflow-muted absolute left-3 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="elena@acme-engineering.com"
                className="w-full pl-9 pr-4 py-2 rounded-lg bg-taskflow-surface border border-taskflow-border text-white placeholder-taskflow-muted text-sm focus:outline-none focus:border-cyan-500 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-taskflow-text-dim mb-1">
              Workspace / Organization Name (Optional)
            </label>
            <div className="relative">
              <Building2 className="w-4 h-4 text-taskflow-muted absolute left-3 top-3" />
              <input
                type="text"
                value={organizationName}
                onChange={e => setOrganizationName(e.target.value)}
                placeholder="Acme Systems"
                className="w-full pl-9 pr-4 py-2 rounded-lg bg-taskflow-surface border border-taskflow-border text-white placeholder-taskflow-muted text-sm focus:outline-none focus:border-cyan-500 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-taskflow-text-dim mb-1">
              Password * (Min 8 chars, 1 uppercase, 1 lowercase, 1 number)
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-taskflow-muted absolute left-3 top-3" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-9 pr-10 py-2 rounded-lg bg-taskflow-surface border border-taskflow-border text-white placeholder-taskflow-muted text-sm focus:outline-none focus:border-cyan-500 transition-colors"
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
            className="w-full py-2.5 px-4 rounded-lg bg-gradient-to-r from-indigo-600 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white text-sm font-semibold shadow-glow-cyan transition-all flex items-center justify-center space-x-2 disabled:opacity-50 mt-2"
          >
            {loading ? (
              <span>Creating workspace...</span>
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                <span>Create Workspace (Owner)</span>
              </>
            )}
          </button>
        </form>

        <div className="text-center mt-5 text-xs text-taskflow-muted">
          Already have an account?{' '}
          <button
            onClick={onSwitchToLogin}
            className="text-cyan-400 hover:text-cyan-300 font-medium transition-colors"
          >
            Sign in
          </button>
        </div>
      </div>
    </div>
  );
};
