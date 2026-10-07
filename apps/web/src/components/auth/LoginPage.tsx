import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  LogIn,
  AlertCircle,
  UserCheck,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { AuthLayout } from './AuthLayout';

interface LoginPageProps {
  onSwitchToRegister: () => void;
  onBackToTaskFlow: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onSwitchToRegister, onBackToTaskFlow }) => {
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

  const leftPanel = (
    <div className="h-full flex flex-col relative z-10">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#E85D22] mb-4">
          Workspace access
        </p>
        <h2 className="font-display text-3xl font-medium text-[#f3ede4] leading-[1.1] mb-3">
          Execute with a complete picture of the work.
        </h2>
        <p className="text-sm text-[#9c948a] leading-relaxed mb-8 max-w-[280px]">
          Sign in to your TaskFlow workspace. Delivery, dependencies, and administration stay in one
          place.
        </p>
        <div className="space-y-3.5 text-xs text-[#b7afa5]">
          {[
            'Deterministic dependency tracking',
            'AI-powered delivery intelligence',
            'Role-based access and audit history',
            'One workspace for execution',
          ].map((benefit, i) => (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + i * 0.1 }}
              key={i}
              className="flex items-center gap-2.5"
            >
              <CheckCircle2 className="w-4 h-4 text-[#E85D22] shrink-0" />
              <span>{benefit}</span>
            </motion.div>
          ))}
        </div>
      </div>

      <div className="mt-12 relative flex-1 flex items-end justify-center pointer-events-none">
        {/* Abstract Product Visualization */}
        <div className="relative w-full max-w-[280px]">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.6 }}
            className="absolute -top-16 -right-4 w-[240px] opacity-60 scale-95"
          >
            <motion.div
              animate={{ y: [-3, 3, -3], rotate: [0, 0.5, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
              className="bg-[#1a1714] border border-[#292929] rounded-lg p-3 shadow-2xl"
            >
              <div className="flex gap-2 mb-2">
                <div className="w-8 h-2 bg-[#292929] rounded-sm" />
                <div className="w-16 h-2 bg-[#292929] rounded-sm" />
              </div>
              <div className="w-full h-8 bg-[#292929] rounded-sm mb-2" />
              <div className="w-3/4 h-8 bg-[#292929] rounded-sm" />
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.6 }}
            className="relative z-10 w-full group"
          >
            <motion.div
              animate={{ y: [0, -4, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
              className="bg-[#1c1916] border border-[#3a342c] rounded-xl p-4 shadow-[0_12px_32px_rgba(0,0,0,0.5)] transition-transform duration-300 group-hover:-translate-y-1 group-hover:scale-[1.015] group-hover:shadow-[0_20px_40px_rgba(0,0,0,0.6)]"
            >
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-4 h-4 text-[#c45c26]" />
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#b7afa5]">
                  AI Insight
                </span>
              </div>
              <p className="text-sm font-medium text-[#f3ede4] mb-1">3 tasks at risk</p>
              <p className="text-xs text-[#9c948a] mb-3">
                These tasks may delay your project by 2-4 days.
              </p>
              <div className="flex items-center text-xs text-[#E85D22] font-medium gap-1">
                Review now <ArrowRight className="w-3 h-3" />
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </div>
  );

  return (
    <AuthLayout leftPanelContent={leftPanel} onBackToTaskFlow={onBackToTaskFlow}>
      <motion.div
        initial={{ opacity: 0, x: 60, rotateY: -15, scale: 0.9, filter: 'blur(10px)' }}
        animate={{ opacity: 1, x: 0, rotateY: 0, scale: 1, filter: 'blur(0px)' }}
        transition={{ type: 'spring', stiffness: 100, damping: 20, delay: 0.3 }}
        className="w-full max-w-[360px] mx-auto perspective-[1000px]"
      >
        <div className="mb-8">
          <h2 className="font-display text-3xl font-medium text-[#f3ede4] mb-2">Sign in</h2>
          <p className="text-sm text-[#9c948a]">Use your workspace credentials</p>
        </div>

        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0, y: -10 }}
              animate={{ opacity: 1, height: 'auto', y: 0 }}
              exit={{ opacity: 0, height: 0, y: -10 }}
              className="mb-6 overflow-hidden"
            >
              <div className="p-3 bg-[#3a1a1a]/40 border border-[#c44a4a]/40 rounded-lg text-[#e07a7a] text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{error}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={handleSubmit} className="space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Input
              label="Work Email"
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="alex.chen@taskflow.dev"
              leftIcon={<Mail className="w-4 h-4" />}
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Input
              label="Password"
              type={showPassword ? 'text' : 'password'}
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••••••"
              leftIcon={<Lock className="w-4 h-4" />}
              rightIcon={
                <motion.button
                  whileHover={{ opacity: 1 }}
                  whileTap={{ scale: 0.92 }}
                  initial={{ opacity: 0.7 }}
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-[#7d756c] hover:text-[#f3ede4] transition-colors focus:outline-none"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </motion.button>
              }
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="pt-2"
          >
            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={loading}
              className="w-full"
              leftIcon={<LogIn className="w-4 h-4" />}
            >
              {loading ? 'Signing in...' : 'Sign in to workspace'}
            </Button>
          </motion.div>
        </form>

        {import.meta.env.VITE_ENABLE_DEMO_ACCOUNTS === 'true' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-8 pt-6 border-t border-[#292929]"
          >
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#9c948a] block mb-3">
              Demo accounts
            </span>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleQuickFill('alex.chen@taskflow.dev')}
                className="group p-3 border border-[#292929] rounded-lg bg-[#111111]/50 hover:bg-[#161616] hover:border-[#E85D22]/50 transition-all flex items-center gap-3 text-left"
              >
                <div className="w-8 h-8 rounded-full bg-[#E85D22]/10 flex items-center justify-center group-hover:bg-[#E85D22]/20 transition-colors">
                  <UserCheck className="w-4 h-4 text-[#E85D22]" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-[#f3ede4]">Alex</span>
                  <span className="text-[10px] text-[#7d756c] uppercase tracking-wider">Owner</span>
                </div>
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill('sam.miller@taskflow.dev')}
                className="group p-3 border border-[#292929] rounded-lg bg-[#111111]/50 hover:bg-[#161616] hover:border-[#E85D22]/50 transition-all flex items-center gap-3 text-left"
              >
                <div className="w-8 h-8 rounded-full bg-[#292929] flex items-center justify-center group-hover:bg-[#3a342c] transition-colors">
                  <UserCheck className="w-4 h-4 text-[#9c948a] group-hover:text-[#f3ede4]" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-[#f3ede4]">Sam</span>
                  <span className="text-[10px] text-[#7d756c] uppercase tracking-wider">Admin</span>
                </div>
              </button>
            </div>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-center mt-8 text-xs text-[#9c948a]"
        >
          Don&apos;t have an account?{' '}
          <button
            type="button"
            onClick={onSwitchToRegister}
            className="text-[#E85D22] hover:text-[#f3ede4] font-medium transition-colors"
          >
            Create workspace
          </button>
        </motion.div>
      </motion.div>
    </AuthLayout>
  );
};
