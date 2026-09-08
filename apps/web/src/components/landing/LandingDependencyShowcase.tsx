import React from 'react';
import { GitBranch, AlertCircle, CheckCircle2, ArrowRight, Clock } from 'lucide-react';

interface DagNode {
 id: string;
 title: string;
 status: 'completed' | 'in-progress' | 'at-risk' | 'planned';
 milestone?: string;
}

const nodes: DagNode[] = [
 { id: 'OPS-080', title: 'OAuth Auth Isolation', status: 'completed' },
 { id: 'OPS-089', title: 'DB Schema Migration', status: 'completed' },
 { id: 'OPS-094', title: 'API Token Sync', status: 'in-progress' },
 { id: 'OPS-102', title: 'DAG Cascade Verify', status: 'at-risk' },
 { id: 'MS-02', title: 'Production Release', status: 'planned', milestone: 'Oct 1' },
];

const statusConfig: Record<
 DagNode['status'],
 { label: string; dot: string; border: string; bg: string; text: string }
> = {
 completed: {
  label: 'DONE',
  dot: 'bg-emerald-400',
  border: 'border-emerald-500/40',
  bg: 'bg-emerald-500/5',
  text: 'text-emerald-400',
 },
 'in-progress': {
  label: 'IN PROGRESS',
  dot: 'bg-amber-400',
  border: 'border-amber-500/40',
  bg: 'bg-amber-500/5',
  text: 'text-amber-400',
 },
 'at-risk': {
  label: 'AT RISK',
  dot: 'bg-rose-400 animate-pulse',
  border: 'border-rose-500/50',
  bg: 'bg-rose-500/[0.07]',
  text: 'text-rose-400',
 },
 planned: {
  label: 'MILESTONE',
  dot: 'bg-sky-400',
  border: 'border-sky-500/40',
  bg: 'bg-sky-500/5',
  text: 'text-sky-400',
 },
};

export const LandingDependencyShowcase: React.FC = () => {
 return (
  <section id="dependencies" className="py-24 sm:py-36 relative overflow-hidden">
   {/* Background */}
   <div className="pointer-events-none absolute inset-0">
    <div className="absolute top-0 left-0 right-0 h-px bg-taskflow-surface from-transparent to-transparent" />
    <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(14,165,233,0.015)_1px,transparent_1px),linear-gradient(to_bottom,rgba(14,165,233,0.015)_1px,transparent_1px)] bg-[size:56px_56px]" />
    <div className="absolute top-1/3 right-1/4 w-[500px] h-[350px] bg-sky-600/[0.05] rounded-full blur-3xl" />
   </div>

   <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-10 relative z-10">
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 items-center">
     {/* Left: DAG visualization */}
     <div className="order-2 lg:order-1">
      {/* Visual header */}
      <div className="flex items-center gap-2 mb-5">
       <div className="w-8 h-8 rounded-md bg-sky-500/15 border border-sky-500/25 flex items-center justify-center">
        <GitBranch className="w-4 h-4 text-sky-400" />
       </div>
       <div>
        <div className="text-[12px] font-bold text-white">
         Dependency Graph · Project OPS-2024
        </div>
        <div className="text-[10px] text-slate-500">
         Live · 5 tasks tracked · 1 at-risk path
        </div>
       </div>
      </div>

      {/* DAG flow */}
      <div className="p-6 rounded-lg bg-slate-950/80 border border-white/[0.08] shadow-2xl space-y-3">
       {/* Node layout */}
       <div className="flex flex-col gap-3">
        {/* Row 1: root nodes */}
        <div className="grid grid-cols-2 gap-3">
         {nodes.slice(0, 2).map(node => {
          const cfg = statusConfig[node.status];
          return (
           <div
            key={node.id}
            className={`p-3.5 rounded-md border ${cfg.border} ${cfg.bg} space-y-1.5`}
           >
            <div className="flex items-center justify-between">
             <span className={`text-[9px] font-mono font-bold ${cfg.text}`}>
              {node.id}
             </span>
             <div className={`w-2 h-2 rounded-full ${cfg.dot}`} />
            </div>
            <div className="text-[11px] font-bold text-white leading-snug">
             {node.title}
            </div>
            <div className={`text-[9px] font-bold ${cfg.text}`}>{cfg.label}</div>
           </div>
          );
         })}
        </div>

        {/* Arrow row */}
        <div className="flex justify-around items-center px-6">
         {[0, 1].map(i => (
          <div key={i} className="flex flex-col items-center gap-0.5">
           <div className="w-px h-4 bg-white/[0.12]" />
           <ArrowRight className="w-3.5 h-3.5 text-sky-500/50 rotate-90" />
          </div>
         ))}
        </div>

        {/* Row 2: dependent nodes */}
        <div className="grid grid-cols-2 gap-3">
         {nodes.slice(2, 4).map(node => {
          const cfg = statusConfig[node.status];
          return (
           <div
            key={node.id}
            className={`p-3.5 rounded-md border ${cfg.border} ${cfg.bg} space-y-1.5`}
           >
            <div className="flex items-center justify-between">
             <span className={`text-[9px] font-mono font-bold ${cfg.text}`}>
              {node.id}
             </span>
             <div className={`w-2 h-2 rounded-full ${cfg.dot}`} />
            </div>
            <div className="text-[11px] font-bold text-white leading-snug">
             {node.title}
            </div>
            <div className={`text-[9px] font-bold ${cfg.text}`}>{cfg.label}</div>
           </div>
          );
         })}
        </div>

        {/* Arrow to milestone */}
        <div className="flex justify-center">
         <div className="flex flex-col items-center gap-0.5">
          <div className="w-px h-4 bg-white/[0.12]" />
          <ArrowRight className="w-3.5 h-3.5 text-sky-500/50 rotate-90" />
         </div>
        </div>

        {/* Milestone node */}
        {(() => {
         const node = nodes[4];
         const cfg = statusConfig[node.status];
         return (
          <div
           className={`p-4 rounded-md border ${cfg.border} ${cfg.bg} flex items-center justify-between`}
          >
           <div className="space-y-0.5">
            <div className="flex items-center gap-2">
             <span className={`text-[9px] font-mono font-bold ${cfg.text}`}>
              {node.id}
             </span>
             <span
              className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${cfg.bg} ${cfg.text}`}
             >
              {cfg.label}
             </span>
            </div>
            <div className="text-[12px] font-bold text-white">{node.title}</div>
           </div>
           <div className="flex items-center gap-1.5 text-[11px] text-sky-400 font-semibold">
            <Clock className="w-3.5 h-3.5" />
            {node.milestone}
           </div>
          </div>
         );
        })()}
       </div>

       {/* Risk alert */}
       <div className="mt-3 p-3.5 rounded-md bg-rose-500/[0.07] border border-rose-500/25 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
         <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
         <div className="text-[11px] text-slate-300">
          <span className="font-bold text-rose-400">OPS-102</span> is at risk — cascade
          delay of <span className="font-bold text-white">6 days</span> if unresolved.
         </div>
        </div>
        <button className="px-2.5 py-1 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 text-[10px] font-bold transition-colors shrink-0 cursor-pointer">
         Fix Now
        </button>
       </div>

       {/* Legend */}
       <div className="pt-3 border-t border-white/[0.06] flex flex-wrap gap-4 text-[10px] font-medium">
        {[
         { color: 'bg-emerald-400', label: 'Completed' },
         { color: 'bg-amber-400', label: 'In Progress' },
         { color: 'bg-rose-400', label: 'At Risk' },
         { color: 'bg-sky-400', label: 'Milestone' },
        ].map(({ color, label }) => (
         <div key={label} className="flex items-center gap-1.5 text-slate-500">
          <span className={`w-2 h-2 rounded-full ${color}`} />
          {label}
         </div>
        ))}
       </div>
      </div>
     </div>

     {/* Right: text */}
     <div className="order-1 lg:order-2">
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-sky-500/10 border border-sky-500/25 text-[11px] font-bold text-sky-300 mb-6 tracking-wide">
       <GitBranch className="w-3.5 h-3.5 text-sky-400" />
       Deterministic DAG Engine
      </div>
      <h2 className="text-[clamp(2rem,4vw,3rem)] font-black text-white tracking-[-0.025em] leading-[1.1] mb-5">
       See exactly which task
       <br />
       is about to sink your sprint.
      </h2>
      <p className="text-[15px] text-slate-400 leading-[1.8] mb-8">
       TaskFlow's DAG engine maps every dependency relationship and calculates the critical
       path in real-time. When an upstream task slips, you see the cascade impact instantly —
       not in your post-mortem.
      </p>

      {/* Feature points */}
      <ul className="space-y-4">
       {[
        {
         icon: CheckCircle2,
         color: 'text-emerald-400',
         label: 'Critical path detection',
         desc: 'Automatically identifies which sequence of tasks must finish on time.',
        },
        {
         icon: AlertCircle,
         color: 'text-amber-400',
         label: 'Cascade delay warnings',
         desc: 'When Task A slips, immediately see how far downstream the impact ripples.',
        },
        {
         icon: GitBranch,
         color: 'text-sky-400',
         label: 'Visual DAG graph view',
         desc: 'Interactive dependency graph for any project, milestone, or sprint.',
        },
       ].map(({ icon: Icon, color, label, desc }) => (
        <li key={label} className="flex items-start gap-4">
         <Icon className={`w-5 h-5 ${color} shrink-0 mt-0.5`} />
         <div>
          <div className="text-[13px] font-bold text-white mb-0.5">{label}</div>
          <div className="text-[12px] text-slate-500">{desc}</div>
         </div>
        </li>
       ))}
      </ul>
     </div>
    </div>
   </div>
  </section>
 );
};
