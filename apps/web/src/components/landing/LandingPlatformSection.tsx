import React from 'react';
import { Shield, Lock, Cpu, Server, Zap, Globe } from 'lucide-react';

const specs = [
 {
  icon: Shield,
  title: 'Multi-Tenant Isolation',
  description:
   'Strict logical database isolation protecting each workspace boundary. Zero data cross-contamination between organizations.',
  color: 'text-emerald-400',
  bg: 'bg-emerald-500/10',
  border: 'border-emerald-500/20',
  glow: 'group-hover:border-emerald-500/40 group-hover:shadow-emerald-500/10',
 },
 {
  icon: Lock,
  title: 'Role-Based Access Control',
  description:
   'Fine-grained RBAC with Owner, Admin, Lead, Member, and Viewer permission layers protecting every API route.',
  color: 'text-sky-400',
  bg: 'bg-sky-500/10',
  border: 'border-sky-500/20',
  glow: 'group-hover:border-sky-500/40 group-hover:shadow-sky-500/10',
 },
 {
  icon: Cpu,
  title: 'AI Risk Intelligence',
  description:
   'High-throughput LLM analysis pipeline surfacing delivery risk and optimization actions with sub-second latency.',
  color: 'text-taskflow-text',
  bg: 'bg-taskflow-elevated',
  border: 'border-taskflow-border',
  glow: 'group-hover:border-taskflow-border group-hover:shadow-violet-500/10',
 },
 {
  icon: Server,
  title: 'Socket.IO Real-Time',
  description:
   'Event-driven WebSocket architecture keeps every connected client synchronized with zero-latency state propagation.',
  color: 'text-amber-400',
  bg: 'bg-amber-500/10',
  border: 'border-amber-500/20',
  glow: 'group-hover:border-amber-500/40 group-hover:shadow-amber-500/10',
 },
 {
  icon: Zap,
  title: 'PostgreSQL DAG Engine',
  description:
   'Deterministic dependency graph computation with O(V+E) traversal and automatic critical path detection at query time.',
  color: 'text-rose-400',
  bg: 'bg-rose-500/10',
  border: 'border-rose-500/20',
  glow: 'group-hover:border-rose-500/40 group-hover:shadow-rose-500/10',
 },
 {
  icon: Globe,
  title: 'TypeScript Full-Stack',
  description:
   'End-to-end type safety with shared contracts between React frontend and Express backend via monorepo architecture.',
  color: 'text-indigo-400',
  bg: 'bg-indigo-500/10',
  border: 'border-indigo-500/20',
  glow: 'group-hover:border-indigo-500/40 group-hover:shadow-indigo-500/10',
 },
];

const stackItems = [
 { label: 'React 18 + TypeScript', cat: 'Frontend' },
 { label: 'Node.js + Express', cat: 'Backend' },
 { label: 'PostgreSQL + Prisma', cat: 'Database' },
 { label: 'Socket.IO', cat: 'Real-time' },
 { label: 'OpenAI API', cat: 'AI Engine' },
 { label: 'Turborepo Monorepo', cat: 'Build System' },
];

export const LandingPlatformSection: React.FC = () => {
 return (
  <section id="platform" className="py-24 sm:py-36 relative overflow-hidden">
   <div className="pointer-events-none absolute inset-0">
    <div className="absolute top-0 left-0 right-0 h-px bg-taskflow-surface from-transparent via-white/[0.06] to-transparent" />
    <div className="absolute bottom-0 left-1/4 w-[600px] h-[300px] bg-indigo-600/[0.05] rounded-full blur-3xl" />
   </div>

   <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-10 relative z-10">
    {/* Header */}
    <div className="max-w-2xl mx-auto text-center mb-16">
     <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-sky-500 mb-4">
      Platform Architecture
     </div>
     <h2 className="text-[clamp(2rem,4vw,3rem)] font-black text-white tracking-[-0.025em] leading-[1.1] mb-5">
      Built for security, performance, and enterprise scale.
     </h2>
     <p className="text-[15px] text-slate-400 leading-[1.8]">
      Every layer of TaskFlow is engineered for teams that cannot afford downtime or data
      breaches.
     </p>
    </div>

    {/* Feature grid */}
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-12">
     {specs.map(({ icon: Icon, title, description, color, bg, border, glow }) => (
      <div
       key={title}
       className={`group p-6 rounded-lg bg-white/[0.02] border ${border} hover:shadow-lg ${glow} transition-all duration-300 hover:-translate-y-0.5 space-y-4`}
      >
       <div
        className={`w-10 h-10 rounded-md ${bg} border ${border} flex items-center justify-center`}
       >
        <Icon className={`w-5 h-5 ${color}`} />
       </div>
       <h3 className="text-[15px] font-bold text-white">{title}</h3>
       <p className="text-[12px] text-slate-500 leading-relaxed">{description}</p>
      </div>
     ))}
    </div>

    {/* Tech stack strip */}
    <div className="p-6 sm:p-8 rounded-lg bg-slate-950/60 border border-white/[0.07]">
     <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500 mb-5">
      Technology Stack
     </div>
     <div className="flex flex-wrap gap-3">
      {stackItems.map(({ label, cat }) => (
       <div
        key={label}
        className="flex items-center gap-2 px-3.5 py-2 rounded-md bg-white/[0.04] border border-white/[0.07] hover:border-white/[0.12] transition-colors"
       >
        <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">
         {cat}
        </span>
        <span className="text-[11px] text-white font-semibold">{label}</span>
       </div>
      ))}
     </div>
    </div>
   </div>
  </section>
 );
};
