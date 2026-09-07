import React from 'react';
import { CheckCircle2, X } from 'lucide-react';

const beforeItems = [
  'Hidden dependency blockers found only after deadlines slip',
  'Manual weekly status syncs eating your engineering time',
  'No delivery risk visibility until stakeholders escalate',
  'Context-switching between disconnected tools and spreadsheets',
];

const afterItems = [
  'Automated DAG engine maps every dependency — before it breaks',
  'Real-time Socket.IO state keeps every stakeholder aligned',
  'AI risk radar surfaces delay risk 72 hours before it hits',
  'Unified execution: tasks, milestones, dependencies, live activity',
];

export const LandingProductStory: React.FC = () => {
  return (
    <section className="py-24 sm:py-36 relative overflow-hidden">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute top-1/3 right-0 w-[600px] h-[400px] bg-sky-600/[0.04] rounded-full blur-3xl" />

      <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-10">
        {/* Header */}
        <div className="max-w-2xl mb-20">
          <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-sky-500 mb-4">
            Why TaskFlow
          </div>
          <h2 className="text-[clamp(2rem,4vw,3rem)] font-black text-white tracking-[-0.025em] leading-[1.1] mb-5">
            Projects don't fail at launch.
            <br />
            They fail weeks before.
          </h2>
          <p className="text-[15px] text-slate-400 leading-[1.8] font-normal">
            Most project tools show you what happened. TaskFlow shows you what's about to happen —
            and what to do about it.
          </p>
        </div>

        {/* Two-column comparison */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 lg:gap-8">
          {/* Before: The old way */}
          <div className="relative p-8 sm:p-10 rounded-2xl bg-rose-950/10 border border-rose-900/20 overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-rose-500/40 to-transparent" />
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-[11px] font-bold text-rose-400 mb-6">
              The old way
            </div>
            <h3 className="text-[20px] font-bold text-slate-200 mb-6">
              Fragmented visibility. Reactive firefighting.
            </h3>
            <ul className="space-y-4">
              {beforeItems.map(item => (
                <li key={item} className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-rose-500/15 border border-rose-500/25 flex items-center justify-center shrink-0 mt-0.5">
                    <X className="w-3 h-3 text-rose-400" />
                  </div>
                  <span className="text-[13px] text-slate-400 leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
            {/* Terminal snippet */}
            <div className="mt-8 p-4 rounded-xl bg-slate-950/60 border border-rose-900/20 font-mono text-[11px] text-rose-300/60">
              <span className="text-rose-500">⚠</span> WARN: OPS-102 blocked — cascade risk detected
              <br />
              <span className="text-slate-600">└─</span>{' '}
              <span className="text-rose-400/70">
                3 downstream tasks at risk · milestone delayed 6d
              </span>
            </div>
          </div>

          {/* After: TaskFlow */}
          <div className="relative p-8 sm:p-10 rounded-2xl bg-sky-950/10 border border-sky-500/20 overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-sky-400/50 to-transparent" />
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/20 text-[11px] font-bold text-sky-400 mb-6">
              The TaskFlow way
            </div>
            <h3 className="text-[20px] font-bold text-white mb-6">
              Predictive operations. Deterministic delivery.
            </h3>
            <ul className="space-y-4">
              {afterItems.map(item => (
                <li key={item} className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-sky-500/15 border border-sky-500/25 flex items-center justify-center shrink-0 mt-0.5">
                    <CheckCircle2 className="w-3 h-3 text-sky-400" />
                  </div>
                  <span className="text-[13px] text-slate-300 leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
            {/* Status badge */}
            <div className="mt-8 p-4 rounded-xl bg-slate-950/60 border border-sky-500/15 font-mono text-[11px] flex items-center justify-between">
              <span className="text-emerald-400">
                ✓ PROJECT HEALTH: 94/100 · All milestones on track
              </span>
              <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                LIVE
              </span>
            </div>
          </div>
        </div>

        {/* Summary stat row */}
        <div className="mt-14 grid grid-cols-2 sm:grid-cols-4 gap-5">
          {[
            { stat: '72hrs', label: 'Avg. early risk detection', color: 'text-sky-400' },
            { stat: '0', label: 'Surprise delivery failures', color: 'text-emerald-400' },
            { stat: '100%', label: 'Dependency visibility', color: 'text-violet-400' },
            { stat: '3×', label: 'Faster incident resolution', color: 'text-amber-400' },
          ].map(({ stat, label, color }) => (
            <div
              key={label}
              className="p-5 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:border-white/[0.10] transition-colors"
            >
              <div className={`text-[2rem] font-black ${color} mb-1 tracking-tight`}>{stat}</div>
              <div className="text-[12px] text-slate-500 font-medium leading-snug">{label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
