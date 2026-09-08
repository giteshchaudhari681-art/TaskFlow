import React from 'react';
import { Brain, GitBranch, Zap, Shield, Activity, Users } from 'lucide-react';

const caps = [
 {
  icon: Brain,
  label: 'AI Intelligence',
  color: 'text-taskflow-text',
  bg: 'bg-taskflow-elevated',
  border: 'border-taskflow-border',
 },
 {
  icon: GitBranch,
  label: 'DAG Dependencies',
  color: 'text-sky-400',
  bg: 'bg-sky-500/10',
  border: 'border-sky-500/20',
 },
 {
  icon: Zap,
  label: 'Real-Time Sync',
  color: 'text-amber-400',
  bg: 'bg-amber-500/10',
  border: 'border-amber-500/20',
 },
 {
  icon: Shield,
  label: 'Enterprise RBAC',
  color: 'text-emerald-400',
  bg: 'bg-emerald-500/10',
  border: 'border-emerald-500/20',
 },
 {
  icon: Activity,
  label: 'Live Telemetry',
  color: 'text-rose-400',
  bg: 'bg-rose-500/10',
  border: 'border-rose-500/20',
 },
 {
  icon: Users,
  label: 'Multi-Workspace',
  color: 'text-indigo-400',
  bg: 'bg-indigo-500/10',
  border: 'border-indigo-500/20',
 },
];

export const LandingCapabilityStrip: React.FC = () => {
 return (
  <div className="border-y border-white/[0.06] bg-taskflow-surface from-slate-900/30 to-transparent py-12">
   <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-10">
    <div className="flex flex-wrap items-center justify-center gap-3">
     {caps.map(({ icon: Icon, label, color, bg, border }) => (
      <div
       key={label}
       className={`inline-flex items-center gap-2.5 px-4 py-2.5 rounded-md ${bg} border ${border} group hover:scale-105 transition-transform duration-200`}
      >
       <Icon className={`w-4 h-4 ${color} shrink-0`} />
       <span className={`text-[12px] font-semibold ${color}`}>{label}</span>
      </div>
     ))}
    </div>
   </div>
  </div>
 );
};
