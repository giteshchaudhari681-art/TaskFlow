import React, { useState } from 'react';
import {
 Lock,
 Mail,
 Eye,
 EyeOff,
 LogIn,
 AlertCircle,
 UserCheck,
 CheckCircle2,
 ShieldCheck,
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
  <div className="w-full max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-12 border border-[#3a342c] bg-[#1a1714]">
   <div className="md:col-span-5 p-8 border-b md:border-b-0 md:border-r border-[#2e2924]">
    <p className="tf-kicker mb-4">Workspace access</p>
    <h2 className="font-display text-3xl font-medium text-[#f3ede4] leading-tight mb-3">
     Execute with a complete picture of the work.
    </h2>
    <p className="text-sm text-[#9c948a] leading-relaxed mb-8">
     Sign in to your TaskFlow workspace. Delivery, dependencies, and administration stay in one
     place.
    </p>
    <div className="space-y-3 text-sm text-[#b7afa5]">
     <div className="flex items-start gap-2.5">
      <CheckCircle2 className="w-4 h-4 text-[#3d8b6e] shrink-0 mt-0.5" />
      <span>Deterministic dependency tracking</span>
     </div>
     <div className="flex items-start gap-2.5">
      <ShieldCheck className="w-4 h-4 text-[#c45c26] shrink-0 mt-0.5" />
      <span>Role-based access and audit history</span>
     </div>
    </div>
   </div>

   <div className="md:col-span-7 p-8 sm:p-10">
    <h2 className="font-display text-2xl font-medium text-[#f3ede4] mb-1">Sign in</h2>
    <p className="text-xs text-[#9c948a] mb-6">Use your workspace credentials</p>

    {error && (
     <div className="mb-5 p-3 border border-[#c44a4a]/40 text-[#e07a7a] text-xs flex items-start gap-2">
      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
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
        className="text-[#9c948a] hover:text-[#f3ede4]"
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
      Sign in to workspace
     </Button>
    </form>

    <div className="mt-6 pt-5 border-t border-[#2e2924]">
     <span className="tf-kicker block mb-2.5">Demo accounts</span>
     <div className="grid grid-cols-2 gap-2">
      <button
       type="button"
       onClick={() => handleQuickFill('alex.chen@taskflow.dev')}
       className="px-3 py-2 border border-[#3a342c] text-xs text-[#b7afa5] hover:text-[#f3ede4] hover:bg-[#211e1a] flex items-center gap-2 text-left"
      >
       <UserCheck className="w-3.5 h-3.5 text-[#c45c26] shrink-0" />
       <span className="truncate">Alex (Owner)</span>
      </button>
      <button
       type="button"
       onClick={() => handleQuickFill('sam.miller@taskflow.dev')}
       className="px-3 py-2 border border-[#3a342c] text-xs text-[#b7afa5] hover:text-[#f3ede4] hover:bg-[#211e1a] flex items-center gap-2 text-left"
      >
       <UserCheck className="w-3.5 h-3.5 shrink-0" />
       <span className="truncate">Sam (Admin)</span>
      </button>
     </div>
    </div>

    <div className="text-center mt-6 text-xs text-[#9c948a]">
     Don&apos;t have an account?{' '}
     <button
      type="button"
      onClick={onSwitchToRegister}
      className="text-[#c45c26] hover:text-[#e07a45] font-semibold underline underline-offset-4"
     >
      Create workspace
     </button>
    </div>
   </div>
  </div>
 );
};
