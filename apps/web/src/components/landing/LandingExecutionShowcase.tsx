import React, { useState } from 'react';
import { LayoutGrid, Milestone, Activity, GitBranch, ChevronRight } from 'lucide-react';

type TabId = 'kanban' | 'milestones' | 'activity';

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
 { id: 'kanban', label: 'Board', icon: LayoutGrid },
 { id: 'milestones', label: 'Timeline', icon: Milestone },
 { id: 'activity', label: 'Activity', icon: Activity },
];

const KanbanView: React.FC = () => {
 const columns = [
  {
   id: 'todo',
   label: 'To Do',
   count: 2,
   dotColor: 'bg-slate-500',
   labelColor: 'text-slate-400',
   tasks: [
    {
     id: 'OPS-101',
     title: 'Implement Socket.IO State Sync',
     assignee: 'A.C',
     priority: 'High',
     priColor: 'text-rose-400 bg-rose-500/10',
    },
    {
     id: 'OPS-103',
     title: 'RBAC Permission Schema v2',
     assignee: 'S.M',
     priority: 'Medium',
     priColor: 'text-amber-400 bg-amber-500/10',
    },
   ],
  },
  {
   id: 'inprogress',
   label: 'In Progress',
   count: 1,
   dotColor: 'bg-amber-400',
   labelColor: 'text-amber-400',
   tasks: [
    {
     id: 'OPS-102',
     title: 'DAG Dependency Cascade Verification',
     assignee: 'J.D',
     priority: 'Critical',
     priColor: 'text-red-400 bg-red-500/10',
    },
   ],
  },
  {
   id: 'done',
   label: 'Done',
   count: 4,
   dotColor: 'bg-emerald-400',
   labelColor: 'text-emerald-400',
   tasks: [
    {
     id: 'OPS-099',
     title: 'Multi-Tenant Workspace Isolation',
     assignee: 'A.C',
     priority: 'Done',
     priColor: 'text-emerald-400 bg-emerald-500/10',
    },
   ],
  },
 ];

 return (
  <div className="grid grid-cols-3 gap-3">
   {columns.map(col => (
    <div key={col.id} className="flex flex-col gap-2">
     {/* Column header */}
     <div
      className={`flex items-center justify-between px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.06] text-[11px] font-semibold ${col.labelColor}`}
     >
      <div className="flex items-center gap-1.5">
       <span className={`w-1.5 h-1.5 rounded-full ${col.dotColor}`} />
       {col.label}
      </div>
      <span className="text-slate-600 font-normal">{col.count}</span>
     </div>
     {/* Task cards */}
     {col.tasks.map(task => (
      <div
       key={task.id}
       className="p-3 rounded-lg bg-slate-900/80 border border-white/[0.07] hover:border-white/[0.12] transition-colors space-y-2 cursor-pointer"
      >
       <div className="flex items-center justify-between">
        <span className="text-[9px] font-mono font-bold text-sky-400 bg-sky-500/10 px-1.5 py-0.5 rounded">
         {task.id}
        </span>
        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${task.priColor}`}>
         {task.priority}
        </span>
       </div>
       <p className="text-[11px] font-semibold text-white leading-snug">{task.title}</p>
       <div className="flex items-center justify-between">
        <div className="w-5 h-5 rounded-full bg-sky-500/20 border border-sky-500/30 flex items-center justify-center text-[8px] font-bold text-sky-400">
         {task.assignee}
        </div>
       </div>
      </div>
     ))}
    </div>
   ))}
  </div>
 );
};

const MilestonesView: React.FC = () => {
 const milestones = [
  {
   name: 'Core Telemetry Platform',
   phase: 'Phase 1',
   date: "Sep 15 '26",
   progress: 100,
   status: 'DONE',
   statusColor: 'text-emerald-400 bg-emerald-500/10',
  },
  {
   name: 'AI Risk Radar Engine',
   phase: 'Phase 2',
   date: "Oct 01 '26",
   progress: 65,
   status: 'ON TRACK',
   statusColor: 'text-sky-400 bg-sky-500/10',
  },
  {
   name: 'Enterprise Multi-Tenancy',
   phase: 'Phase 3',
   date: "Oct 20 '26",
   progress: 20,
   status: 'PLANNING',
   statusColor: 'text-taskflow-text bg-taskflow-elevated',
  },
 ];

 return (
  <div className="space-y-3">
   {milestones.map(m => (
    <div
     key={m.name}
     className="p-4 rounded-md bg-slate-900/80 border border-white/[0.07] hover:border-white/[0.11] transition-colors"
    >
     <div className="flex items-start justify-between gap-4 mb-3">
      <div>
       <div className="text-[10px] font-bold text-slate-500 mb-0.5">{m.phase}</div>
       <div className="text-[13px] font-bold text-white">{m.name}</div>
      </div>
      <div className="flex flex-col items-end gap-1 shrink-0">
       <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${m.statusColor}`}>
        {m.status}
       </span>
       <span className="text-[10px] text-slate-500 font-mono">{m.date}</span>
      </div>
     </div>
     <div className="w-full h-1.5 rounded-full bg-white/[0.07] overflow-hidden">
      <div
       className={`h-full rounded-full ${m.progress === 100 ? 'bg-emerald-500' : 'bg-taskflow-surface'}`}
       style={{ width: `${m.progress}%` }}
      />
     </div>
     <div className="mt-1.5 text-[10px] text-slate-600">{m.progress}% complete</div>
    </div>
   ))}
  </div>
 );
};

const ActivityView: React.FC = () => {
 const events = [
  {
   avatar: 'AC',
   user: 'Alex Chen',
   action: 'completed',
   target: 'OPS-099 Workspace Multi-Tenancy',
   time: '10m ago',
   color: 'bg-sky-500',
  },
  {
   avatar: 'AI',
   user: 'AI Intelligence',
   action: 'detected risk in',
   target: 'OPS-102 DAG Verification',
   time: '1h ago',
   color: 'bg-violet-500',
  },
  {
   avatar: 'SM',
   user: 'Sam Miller',
   action: 'moved to review',
   target: 'OPS-094 API Token Sync',
   time: '2h ago',
   color: 'bg-emerald-500',
  },
  {
   avatar: 'JD',
   user: 'Jamie Doe',
   action: 'assigned blocker to',
   target: 'Milestone 2 delivery',
   time: '3h ago',
   color: 'bg-amber-500',
  },
 ];

 return (
  <div className="space-y-2">
   {events.map((ev, i) => (
    <div
     key={i}
     className="flex items-start gap-3 p-3.5 rounded-md bg-slate-900/60 border border-white/[0.06] hover:border-white/[0.09] transition-colors"
    >
     <div
      className={`w-7 h-7 rounded-full ${ev.color} flex items-center justify-center text-[10px] font-bold text-white shrink-0`}
     >
      {ev.avatar}
     </div>
     <div className="flex-1 min-w-0">
      <div className="text-[12px]">
       <span className="font-bold text-white">{ev.user}</span>{' '}
       <span className="text-slate-400">{ev.action}</span>{' '}
       <span className="text-sky-300 font-semibold">{ev.target}</span>
      </div>
     </div>
     <span className="text-[10px] text-slate-600 font-mono shrink-0">{ev.time}</span>
    </div>
   ))}
  </div>
 );
};

export const LandingExecutionShowcase: React.FC = () => {
 const [activeTab, setActiveTab] = useState<TabId>('kanban');

 return (
  <section className="py-24 sm:py-32 relative overflow-hidden">
   <div className="pointer-events-none absolute top-0 left-0 right-0 h-px bg-taskflow-surface from-transparent via-white/[0.07] to-transparent" />

   <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-10">
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
     {/* Left sticky text */}
     <div className="lg:col-span-4 lg:sticky lg:top-24">
      <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-sky-500 mb-4">
       Unified Execution
      </div>
      <h2 className="text-[clamp(1.75rem,3.5vw,2.75rem)] font-black text-white tracking-[-0.025em] leading-[1.1] mb-5">
       Every view your team needs. Zero context switching.
      </h2>
      <p className="text-[14px] text-slate-400 leading-[1.8] mb-8">
       From Kanban boards to milestone timelines to live activity streams — TaskFlow keeps
       your entire team aligned without leaving the platform.
      </p>
      <div className="space-y-2">
       {[
        { icon: LayoutGrid, label: 'Kanban & task management', color: 'text-sky-400' },
        {
         icon: Milestone,
         label: 'Interactive milestone timeline',
         color: 'text-taskflow-text',
        },
        {
         icon: Activity,
         label: 'Real-time activity telemetry',
         color: 'text-emerald-400',
        },
        { icon: GitBranch, label: 'Dependency graph overlays', color: 'text-amber-400' },
       ].map(({ icon: Icon, label, color }) => (
        <div key={label} className="flex items-center gap-3 text-[13px] text-slate-400">
         <Icon className={`w-4 h-4 ${color} shrink-0`} />
         {label}
         <ChevronRight className="w-3 h-3 text-slate-700 ml-auto" />
        </div>
       ))}
      </div>
     </div>

     {/* Right interactive panel */}
     <div className="lg:col-span-8">
      {/* Tab bar */}
      <div className="flex gap-1 p-1 rounded-md bg-white/[0.04] border border-white/[0.07] mb-4 w-fit">
       {TABS.map(({ id, label, icon: Icon }) => (
        <button
         key={id}
         onClick={() => setActiveTab(id)}
         className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[12px] font-semibold transition-all cursor-pointer ${
          activeTab === id
           ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/25'
           : 'text-slate-500 hover:text-white'
         }`}
        >
         <Icon className="w-3.5 h-3.5" />
         {label}
        </button>
       ))}
      </div>

      {/* Panel */}
      <div className="p-5 sm:p-7 rounded-lg bg-slate-950/60 border border-white/[0.08] shadow-2xl min-h-[340px]">
       {activeTab === 'kanban' && <KanbanView />}
       {activeTab === 'milestones' && <MilestonesView />}
       {activeTab === 'activity' && <ActivityView />}
      </div>
     </div>
    </div>
   </div>
  </section>
 );
};
