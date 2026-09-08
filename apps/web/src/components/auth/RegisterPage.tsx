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
 CheckCircle2,
 Boxes,
 Workflow,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

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
  <div className="w-full max-w-4xl mx-auto my-4 sm:my-8 grid grid-cols-1 md:grid-cols-12 rounded-lg bg-slate-900/90 border border-white/[0.08] shadow-elevation-4 overflow-hidden">
   {/* Left Feature Showcase Banner */}
   <div className="md:col-span-5 bg-taskflow-surface p-6 sm:p-8 flex flex-col justify-between relative overflow-hidden border-b md:border-b-0 md:border-r border-white/[0.08]">
    <div className="absolute -top-16 -left-16 w-48 h-48 bg-indigo-500/20 rounded-full blur-3xl" />
    <div className="absolute -bottom-16 -right-16 w-48 h-48 bg-sky-500/20 rounded-full blur-3xl" />

    <div className="relative z-10 space-y-6">
     <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold">
      <Sparkles className="w-3.5 h-3.5" />
      <span>Workspace Provisioning</span>
     </div>

     <div>
      <h2 className="text-2xl sm:text-3xl font-extrabold text-white font-display tracking-tight leading-tight">
       Create Your Operations Hub.
      </h2>
      <p className="text-xs sm:text-sm text-slate-400 mt-2 leading-relaxed">
       Launch a isolated multi-tenant organization, invite team members, and manage complex
       engineering roadmaps.
      </p>
     </div>

     <div className="space-y-3 pt-2">
      <div className="flex items-center space-x-3 text-xs text-slate-300">
       <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
       <span>Full Owner role permissions & RBAC controls</span>
      </div>
      <div className="flex items-center space-x-3 text-xs text-slate-300">
       <Workflow className="w-4 h-4 text-sky-400 shrink-0" />
       <span>Automated Gantt timelines & milestone tracking</span>
      </div>
      <div className="flex items-center space-x-3 text-xs text-slate-300">
       <Boxes className="w-4 h-4 text-indigo-400 shrink-0" />
       <span>Pre-seeded demo project templates</span>
      </div>
     </div>
    </div>

    <div className="relative z-10 pt-8 border-t border-white/[0.08] mt-6">
     <p className="text-[11px] font-mono text-slate-500 uppercase tracking-wider">
      No credit card required • Instant setup
     </p>
    </div>
   </div>

   {/* Right Registration Form */}
   <div className="md:col-span-7 p-6 sm:p-10 flex flex-col justify-center bg-[#0b0f17]/90 relative">
    <div className="mb-6">
     <h2 className="text-xl sm:text-2xl font-bold text-white font-display tracking-tight">
      Provision New Workspace
     </h2>
     <p className="text-xs text-slate-400 mt-1">
      Fill in your organization details to create your account
     </p>
    </div>

    {error && (
     <div className="mb-5 p-3.5 rounded-lg bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs flex items-start space-x-2.5">
      <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
      <span>{error}</span>
     </div>
    )}

    <form onSubmit={handleSubmit} className="space-y-3.5">
     <Input
      label="Full Name *"
      type="text"
      required
      value={name}
      onChange={e => setName(e.target.value)}
      placeholder="Elena Rostova"
      leftIcon={<User className="w-4 h-4" />}
     />

     <Input
      label="Work Email *"
      type="email"
      required
      value={email}
      onChange={e => setEmail(e.target.value)}
      placeholder="elena@acme-engineering.com"
      leftIcon={<Mail className="w-4 h-4" />}
     />

     <Input
      label="Workspace / Organization Name"
      type="text"
      value={organizationName}
      onChange={e => setOrganizationName(e.target.value)}
      placeholder="Acme Systems (Optional)"
      leftIcon={<Building2 className="w-4 h-4" />}
     />

     <Input
      label="Password *"
      type={showPassword ? 'text' : 'password'}
      required
      value={password}
      onChange={e => setPassword(e.target.value)}
      placeholder="••••••••••••"
      helperText="Min 8 chars, 1 uppercase, 1 lowercase, 1 number"
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
      className="w-full mt-3"
      leftIcon={<UserPlus className="w-4 h-4" />}
     >
      Create Workspace (Owner)
     </Button>
    </form>

    <div className="text-center mt-6 text-xs text-slate-400">
     Already have an account?{' '}
     <button
      onClick={onSwitchToLogin}
      className="text-sky-400 hover:text-sky-300 font-semibold transition-colors cursor-pointer underline underline-offset-4"
     >
      Sign in to existing account
     </button>
    </div>
   </div>
  </div>
 );
};
