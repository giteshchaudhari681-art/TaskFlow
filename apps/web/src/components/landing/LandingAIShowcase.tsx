import React, { useState } from 'react';
import { Sparkles, AlertTriangle, ShieldCheck, TrendingUp, Clock } from 'lucide-react';

const insights = [
 {
  id: 'bottleneck',
  type: 'warning',
  icon: AlertTriangle,
  badge: 'Bottleneck Detected',
  badgeColor: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  title: 'OPS-102 blocks 3 downstream tasks',
  detail:
   'API Token Sync is gating Milestone 2 delivery. Estimated cascade delay: 6 days if unresolved.',
  action: 'Auto-Resolve',
  actionColor: 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-200 border-amber-500/30',
  borderColor: 'border-amber-500/20',
  bgColor: 'bg-amber-500/[0.04]',
 },
 {
  id: 'optimization',
  type: 'info',
  icon: ShieldCheck,
  badge: 'Optimization Available',
  badgeColor: 'text-sky-400 bg-sky-500/10 border-sky-500/20',
  title: 'Reassign subtask to save 1.5 days',
  detail:
   'Moving Frontend Integration to Alex Chen (currently at 40% capacity) optimizes delivery by 1.5d.',
  action: 'Apply AI Fix',
  actionColor: 'bg-sky-500/15 hover:bg-sky-500/25 text-sky-200 border-sky-500/30',
  borderColor: 'border-sky-500/20',
  bgColor: 'bg-sky-500/[0.03]',
 },
 {
  id: 'velocity',
  type: 'success',
  icon: TrendingUp,
  badge: 'Velocity Insight',
  badgeColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  title: 'Sprint pace 12% above target',
  detail:
   'Team velocity has increased 3 weeks in a row. Current trajectory puts milestone completion 2 days early.',
  action: 'View Forecast',
  actionColor: 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-200 border-emerald-500/30',
  borderColor: 'border-emerald-500/20',
  bgColor: 'bg-emerald-500/[0.03]',
 },
];

export const LandingAIShowcase: React.FC = () => {
 const [activeInsight, setActiveInsight] = useState(0);
 const current = insights[activeInsight];

 return (
  <section id="ai" className="py-24 sm:py-36 relative overflow-hidden">
   {/* Background atmosphere */}
   <div className="pointer-events-none absolute inset-0">
    <div className="absolute top-0 left-0 right-0 h-px bg-taskflow-surface from-transparent to-transparent" />
    <div className="absolute bottom-0 left-0 right-0 h-px bg-taskflow-surface from-transparent to-transparent" />
    <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-[600px] h-[400px] bg-violet-600/[0.06] rounded-full blur-3xl" />
   </div>
   <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:48px_48px]" />

   <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-10 relative z-10">
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
     {/* Left: text */}
     <div>
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-taskflow-elevated border border-taskflow-border text-[11px] font-bold text-taskflow-text mb-6 tracking-wide">
       <Sparkles className="w-3.5 h-3.5 text-taskflow-text" />
       AI Delivery Intelligence
      </div>
      <h2 className="text-[clamp(2rem,4vw,3rem)] font-black text-white tracking-[-0.025em] leading-[1.1] mb-5">
       Know what's going wrong
       <br />
       before your team does.
      </h2>
      <p className="text-[15px] text-slate-400 leading-[1.8] mb-8">
       TaskFlow's AI engine continuously monitors velocity, dependency health, and workload
       balance — surfacing risks with single-click resolutions before they reach your
       stakeholders.
      </p>

      {/* Feature list */}
      <ul className="space-y-4">
       {[
        {
         icon: AlertTriangle,
         label: 'Cascade delay prediction',
         desc: 'Detects upstream tasks that will block milestones, days in advance.',
         color: 'text-amber-400 bg-amber-500/10',
        },
        {
         icon: Clock,
         label: 'Delivery timeline intelligence',
         desc: 'Calculates milestone risk from historical execution velocity.',
         color: 'text-sky-400 bg-sky-500/10',
        },
        {
         icon: TrendingUp,
         label: 'Workload optimization',
         desc: 'Smart task reassignment suggestions to unblock the critical path.',
         color: 'text-taskflow-text bg-taskflow-elevated',
        },
       ].map(({ icon: Icon, label, desc, color }) => (
        <li key={label} className="flex items-start gap-4">
         <div
          className={`w-8 h-8 rounded-lg ${color} flex items-center justify-center shrink-0 mt-0.5`}
         >
          <Icon className="w-4 h-4" />
         </div>
         <div>
          <div className="text-[13px] font-bold text-white mb-0.5">{label}</div>
          <div className="text-[12px] text-slate-500">{desc}</div>
         </div>
        </li>
       ))}
      </ul>
     </div>

     {/* Right: interactive AI radar */}
     <div className="relative">
      {/* Outer glow */}
      <div className="absolute -inset-4 bg-taskflow-elevated rounded-3xl blur-2xl" />

      <div className="relative p-6 sm:p-8 rounded-lg bg-slate-950/80 border border-taskflow-border ">
       {/* Header */}
       <div className="flex items-center justify-between pb-5 border-b border-white/[0.07] mb-5">
        <div className="flex items-center gap-3">
         <div className="w-8 h-8 rounded-md bg-taskflow-elevated border border-taskflow-border flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-taskflow-text" />
         </div>
         <div>
          <div className="text-[13px] font-bold text-white">AI Intelligence Radar</div>
          <div className="text-[11px] text-slate-500">
           Live · {insights.length} insights active
          </div>
         </div>
        </div>
        <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[11px] font-bold text-emerald-400">
         Monitoring
        </span>
       </div>

       {/* Tab selectors */}
       <div className="flex gap-2 mb-4">
        {insights.map((ins, i) => (
         <button
          key={ins.id}
          onClick={() => setActiveInsight(i)}
          className={`flex-1 py-1.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
           activeInsight === i
            ? 'bg-white/[0.08] text-white'
            : 'text-slate-500 hover:text-slate-300'
          }`}
         >
          {i === 0 ? 'Warning' : i === 1 ? 'Suggestion' : 'Insight'}
         </button>
        ))}
       </div>

       {/* Active insight card */}
       <div
        key={current.id}
        className={`p-5 rounded-md ${current.bgColor} border ${current.borderColor} transition-all duration-300`}
       >
        <div className="flex items-start justify-between gap-3 mb-3">
         <div
          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10px] font-bold ${current.badgeColor}`}
         >
          <current.icon className="w-3 h-3" />
          {current.badge}
         </div>
        </div>
        <h4 className="text-[14px] font-bold text-white mb-2">{current.title}</h4>
        <p className="text-[12px] text-slate-400 leading-relaxed mb-4">{current.detail}</p>
        <button
         className={`px-3.5 py-2 rounded-lg border text-[12px] font-bold ${current.actionColor} transition-colors cursor-pointer`}
        >
         {current.action}
        </button>
       </div>

       {/* Pulse indicator */}
       <div className="mt-4 flex items-center gap-2 text-[11px] text-slate-600">
        <span className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" />
        Analyzing 47 task dependencies in real-time…
       </div>
      </div>
     </div>
    </div>
   </div>
  </section>
 );
};
