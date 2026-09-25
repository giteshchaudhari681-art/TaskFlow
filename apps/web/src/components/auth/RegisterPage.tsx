import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Lock,
  Mail,
  User,
  Building2,
  Eye,
  EyeOff,
  UserPlus,
  AlertCircle,
  CheckCircle2,
  Workflow,
  Sparkles,
  ShieldCheck,
  Circle,
  Check,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { AuthLayout } from './AuthLayout';

interface RegisterPageProps {
  onSwitchToLogin: () => void;
}

const PasswordRequirement: React.FC<{ label: string; met: boolean }> = ({ label, met }) => {
  return (
    <div className="flex items-center gap-2">
      <div className="relative flex items-center justify-center w-3.5 h-3.5">
        <AnimatePresence mode="wait">
          {met ? (
            <motion.div
              key="met"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <Check className="w-3.5 h-3.5 text-[#E85D22]" />
            </motion.div>
          ) : (
            <motion.div
              key="unmet"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <Circle className="w-2.5 h-2.5 text-[#4a4339] fill-transparent" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <span
        className={`text-xs transition-colors duration-300 ${met ? 'text-[#f3ede4]' : 'text-[#7d756c]'}`}
      >
        {label}
      </span>
    </div>
  );
};

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

  const reqLength = password.length >= 8;
  const reqUpper = /[A-Z]/.test(password);
  const reqLower = /[a-z]/.test(password);
  const reqNumber = /[0-9]/.test(password);

  const leftPanel = (
    <div className="h-full flex flex-col relative z-10">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#E85D22] mb-4">
          Workspace Provisioning
        </p>
        <h2 className="font-display text-3xl font-medium text-[#f3ede4] leading-[1.1] mb-3">
          Create your<br />operations hub.
        </h2>
        <p className="text-sm text-[#9c948a] leading-relaxed mb-8 max-w-[280px]">
          Launch your TaskFlow workspace, invite your team, and organize complex work in one place.
        </p>
        <div className="space-y-3.5 text-xs text-[#b7afa5]">
          {[
            { text: 'Full owner permissions & RBAC controls', icon: ShieldCheck },
            { text: 'Project and milestone management', icon: Workflow },
            { text: 'AI-powered project intelligence', icon: Sparkles },
            { text: 'Secure multi-tenant workspace', icon: CheckCircle2 },
          ].map((item, i) => (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + i * 0.1 }}
              key={i}
              className="flex items-center gap-2.5"
            >
              <item.icon className="w-4 h-4 text-[#E85D22] shrink-0" />
              <span>{item.text}</span>
            </motion.div>
          ))}
        </div>
      </div>

      <div className="mt-12 relative flex-1 flex items-end justify-center pointer-events-none">
        {/* Abstract Workspace Visualization */}
        <div className="relative w-full max-w-[280px]">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.6 }}
            className="absolute -top-12 -left-4 w-[240px] bg-[#1a1714] border border-[#292929] rounded-lg p-3 shadow-2xl opacity-60 scale-95"
          >
            <div className="w-full h-8 bg-[#292929] rounded-sm mb-2" />
            <div className="w-2/3 h-8 bg-[#292929] rounded-sm" />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.6 }}
            className="relative z-10 w-full bg-[#1c1916] border border-[#3a342c] rounded-xl p-4 shadow-[0_12px_32px_rgba(0,0,0,0.5)]"
          >
            <div className="flex items-center gap-2 mb-3">
              <Building2 className="w-4 h-4 text-[#c45c26]" />
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#b7afa5]">
                New Workspace
              </span>
            </div>
            <div className="flex items-center justify-between mt-4 border-t border-[#292929] pt-3">
              <div className="flex -space-x-2">
                <div className="w-6 h-6 rounded-full bg-[#292929] border border-[#1c1916]" />
                <div className="w-6 h-6 rounded-full bg-[#3a342c] border border-[#1c1916]" />
                <div className="w-6 h-6 rounded-full bg-[#4a4339] border border-[#1c1916]" />
              </div>
              <div className="text-[10px] text-[#9c948a] font-medium">Ready to invite</div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );

  return (
    <AuthLayout leftPanelContent={leftPanel} onBackToTaskFlow={() => (window.location.hash = '#/')}>
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="w-full max-w-[380px] mx-auto"
      >
        <div className="mb-8">
          <h2 className="font-display text-3xl font-medium text-[#f3ede4] mb-2">
            Provision New Workspace
          </h2>
          <p className="text-sm text-[#9c948a]">
            Set up your organization and create your owner account.
          </p>
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
              label="Full Name"
              type="text"
              required
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Elena Rostova"
              leftIcon={<User className="w-4 h-4" />}
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Input
              label="Work Email"
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="elena@acme-engineering.com"
              leftIcon={<Mail className="w-4 h-4" />}
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Input
              label="Workspace / Organization Name"
              type="text"
              value={organizationName}
              onChange={e => setOrganizationName(e.target.value)}
              placeholder="Acme Systems (Optional)"
              leftIcon={<Building2 className="w-4 h-4" />}
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
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
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-[#7d756c] hover:text-[#f3ede4] transition-colors focus:outline-none"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              }
            />
            {/* Password Requirements */}
            <div className="mt-3 grid grid-cols-2 gap-y-2 gap-x-4 pl-1">
              <PasswordRequirement label="8+ characters" met={reqLength} />
              <PasswordRequirement label="Uppercase" met={reqUpper} />
              <PasswordRequirement label="Lowercase" met={reqLower} />
              <PasswordRequirement label="Number" met={reqNumber} />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="pt-4"
          >
            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={loading}
              className="w-full"
              leftIcon={<UserPlus className="w-4 h-4" />}
            >
              {loading ? 'Creating workspace...' : 'Create Workspace (Owner)'}
            </Button>
          </motion.div>
        </form>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="text-center mt-8 text-xs text-[#9c948a]"
        >
          Already have an account?{' '}
          <button
            type="button"
            onClick={onSwitchToLogin}
            className="text-[#E85D22] hover:text-[#f3ede4] font-medium transition-colors"
          >
            Sign in to existing account
          </button>
        </motion.div>
      </motion.div>
    </AuthLayout>
  );
};
