import React, { useState } from 'react';
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  LogIn,
  AlertCircle,
  Sparkles,
  UserCheck,
  CheckCircle2,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

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

  const handleQuickFill = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('TaskFlow2026!Dev');
    setError(null);
  };

  return (
    <div className="w-full max-w-4xl mx-auto my-4 sm:my-8 grid grid-cols-1 md:grid-cols-12 rounded-2xl bg-slate-900/90 backdrop-blur-xl border border-white/[0.08] shadow-elevation-4 overflow-hidden">
      {/* Left Feature Showcase Banner (SaaS / Editorial Hybrid) */}
      <div className="md:col-span-5 bg-gradient-to-b from-slate-950 via-slate-900 to-indigo-950 p-6 sm:p-8 flex flex-col justify-between relative overflow-hidden border-b md:border-b-0 md:border-r border-white/[0.08]">
        <div className="absolute -top-16 -left-16 w-48 h-48 bg-sky-500/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-16 -right-16 w-48 h-48 bg-indigo-500/20 rounded-full blur-3xl" />

        <div className="relative z-10 space-y-6">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-400 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Operations Platform</span>
          </div>

          <div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white font-display tracking-tight leading-tight">
              Execute Projects with Precision.
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-2 leading-relaxed">
              TaskFlow powers high-fidelity engineering delivery, automated Gantt roadmaps, and DAG
              dependency intelligence.
            </p>
          </div>

          <div className="space-y-3 pt-2">
            <div className="flex items-center space-x-3 text-xs text-slate-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Deterministic DAG dependency graph tracking</span>
            </div>
            <div className="flex items-center space-x-3 text-xs text-slate-300">
              <Zap className="w-4 h-4 text-sky-400 shrink-0" />
              <span>Real-time WebSocket task telemetry</span>
            </div>
            <div className="flex items-center space-x-3 text-xs text-slate-300">
              <ShieldCheck className="w-4 h-4 text-purple-400 shrink-0" />
              <span>Enterprise multi-tenant role RBAC</span>
            </div>
          </div>
        </div>

        <div className="relative z-10 pt-8 border-t border-white/[0.08] mt-6">
          <p className="text-[11px] font-mono text-slate-500 uppercase tracking-wider">
            Version 1.0 • Enterprise Edition
          </p>
        </div>
      </div>

      {/* Right Login Form Container */}
      <div className="md:col-span-7 p-6 sm:p-10 flex flex-col justify-center bg-[#0b0f17]/90 relative">
        <div className="mb-6">
          <h2 className="text-xl sm:text-2xl font-bold text-white font-display tracking-tight">
            Sign in to TaskFlow
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Enter your credentials to access your workspace session
          </p>
        </div>

        {error && (
          <div className="mb-5 p-3.5 rounded-lg bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs flex items-start space-x-2.5">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Work Email"
            type="email"
            required
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="alex.chen@taskflow.dev"
            leftIcon={<Mail className="w-4 h-4" />}
          />

          <Input
            label="Password"
            type={showPassword ? 'text' : 'password'}
            required
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="••••••••••••"
            leftIcon={<Lock className="w-4 h-4" />}
            rightIcon={
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-slate-500 hover:text-white transition-colors cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            }
          />

          <Button
            type="submit"
            variant="primary"
            size="lg"
            isLoading={loading}
            className="w-full mt-2"
            leftIcon={<LogIn className="w-4 h-4" />}
          >
            Sign In to Workspace
          </Button>
        </form>

        {/* Demo Quick Fill Shortcuts */}
        <div className="mt-6 pt-5 border-t border-white/[0.08]">
          <span className="text-[10px] uppercase font-mono tracking-wider text-slate-500 block mb-2.5">
            Quick Fill Demo Accounts (Development)
          </span>
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => handleQuickFill('alex.chen@taskflow.dev')}
              className="px-3 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-white/[0.08] hover:border-sky-500/30 text-xs text-slate-300 hover:text-white transition-all flex items-center space-x-2 text-left cursor-pointer"
            >
              <UserCheck className="w-3.5 h-3.5 text-sky-400 shrink-0" />
              <span className="truncate font-medium">Alex (Owner)</span>
            </button>
            <button
              type="button"
              onClick={() => handleQuickFill('sam.miller@taskflow.dev')}
              className="px-3 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-white/[0.08] hover:border-indigo-500/30 text-xs text-slate-300 hover:text-white transition-all flex items-center space-x-2 text-left cursor-pointer"
            >
              <UserCheck className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              <span className="truncate font-medium">Sam (Admin)</span>
            </button>
          </div>
        </div>

        <div className="text-center mt-6 text-xs text-slate-400">
          Don&apos;t have an account?{' '}
          <button
            onClick={onSwitchToRegister}
            className="text-sky-400 hover:text-sky-300 font-semibold transition-colors cursor-pointer underline underline-offset-4"
          >
            Create New Workspace
          </button>
        </div>
      </div>
    </div>
  );
};
