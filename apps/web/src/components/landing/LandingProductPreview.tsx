import React from 'react';

export const LandingProductPreview: React.FC = () => {
  return (
    <section id="product" className="py-24 sm:py-32 relative overflow-hidden">
      {/* Subtle ambient glow */}
      <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-gradient-to-r from-sky-500/[0.05] to-indigo-600/[0.05] rounded-full blur-3xl" />

      <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-10 relative z-10">
        {/* Section label */}
        <div className="text-center mb-14">
          <div className="inline-block text-[11px] font-bold uppercase tracking-[0.18em] text-sky-500 mb-4">
            Product Overview
          </div>
          <h2 className="text-[clamp(2rem,4.5vw,3.25rem)] font-black text-white tracking-[-0.025em] leading-[1.1] max-w-2xl mx-auto">
            The operations platform your team actually wants to use.
          </h2>
        </div>

        {/* Browser frame mockup */}
        <div className="relative rounded-2xl overflow-hidden border border-white/[0.10] shadow-[0_40px_120px_rgba(0,0,0,0.7)] bg-[#0c1018]">
          {/* Browser chrome */}
          <div className="flex items-center gap-3 px-5 py-3 bg-[#111520] border-b border-white/[0.07]">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
              <div className="w-3 h-3 rounded-full bg-[#febc2e]" />
              <div className="w-3 h-3 rounded-full bg-[#28c840]" />
            </div>
            <div className="flex-1 flex justify-center">
              <div className="flex items-center gap-2 px-4 py-1 rounded-md bg-white/[0.05] border border-white/[0.07] max-w-xs w-full">
                <div className="w-2 h-2 rounded-full bg-emerald-400" />
                <span className="text-[11px] text-slate-500 font-mono">
                  app.taskflow.io / workspace / project
                </span>
              </div>
            </div>
          </div>

          {/* App shell */}
          <div className="flex h-[520px] sm:h-[600px]">
            {/* Sidebar */}
            <div className="hidden sm:flex flex-col w-[220px] bg-[#0a0e18] border-r border-white/[0.06] p-4 gap-2 shrink-0">
              {/* Logo */}
              <div className="flex items-center gap-2 px-2 py-1 mb-3">
                <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-sky-400 to-indigo-600 flex items-center justify-center">
                  <div className="w-3 h-3 border-2 border-white rounded-sm" />
                </div>
                <span className="text-[13px] font-bold text-white">TaskFlow</span>
              </div>

              {/* Workspace */}
              <div className="px-2 py-1.5 rounded-lg bg-sky-500/10 border border-sky-500/20 mb-2">
                <div className="text-[10px] text-sky-400 font-bold uppercase tracking-widest mb-0.5">
                  Workspace
                </div>
                <div className="text-[12px] text-white font-semibold">Operations Core</div>
              </div>

              {[
                { label: 'Dashboard', active: false, dot: '' },
                { label: 'Project OPS-2024', active: true, dot: 'bg-sky-400' },
                { label: 'My Work', active: false, dot: '' },
                { label: 'Team Members', active: false, dot: '' },
              ].map(({ label, active, dot }) => (
                <div
                  key={label}
                  className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[12px] font-medium ${
                    active ? 'bg-white/[0.08] text-white' : 'text-slate-500'
                  }`}
                >
                  {dot && <span className={`w-1.5 h-1.5 rounded-full ${dot} shrink-0`} />}
                  {label}
                </div>
              ))}
            </div>

            {/* Main content area */}
            <div className="flex-1 overflow-hidden p-6 flex flex-col gap-5">
              {/* Top bar */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold text-sky-400 uppercase tracking-widest">
                      Active Sprint
                    </span>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span className="text-[10px] text-emerald-400 font-semibold">
                      100% On Track
                    </span>
                  </div>
                  <h3 className="text-[18px] font-bold text-white">Project Operations Core</h3>
                </div>
                <div className="hidden sm:flex items-center gap-2">
                  <div className="px-3 py-1.5 rounded-lg bg-sky-500/10 border border-sky-500/20 text-[11px] text-sky-400 font-semibold">
                    Sprint 4 of 6
                  </div>
                </div>
              </div>

              {/* Health bar */}
              <div className="p-4 rounded-xl bg-slate-900/80 border border-white/[0.07] flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center font-black text-emerald-400 text-base">
                    94
                  </div>
                  <div>
                    <div className="text-[12px] font-bold text-white mb-0.5">Health Score</div>
                    <div className="text-[10px] text-slate-400">
                      0 critical blockers · 4d to milestone
                    </div>
                  </div>
                </div>
                <div className="hidden sm:flex gap-5 text-[11px]">
                  {[
                    { label: 'Completed', val: '12', color: 'text-emerald-400' },
                    { label: 'In Review', val: '3', color: 'text-amber-400' },
                    { label: 'Blocked', val: '0', color: 'text-slate-500' },
                  ].map(({ label, val, color }) => (
                    <div key={label} className="text-center">
                      <div className={`text-[16px] font-black ${color}`}>{val}</div>
                      <div className="text-slate-500">{label}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Three metric panels */}
              <div className="grid grid-cols-3 gap-3 flex-1">
                {/* Velocity chart */}
                <div className="p-4 rounded-xl bg-slate-900/60 border border-white/[0.07] flex flex-col gap-3">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    Velocity
                  </div>
                  <div className="text-[22px] font-black text-white">18 pts</div>
                  <div className="flex items-end gap-[3px] h-10 mt-auto">
                    {[30, 55, 40, 70, 65, 80, 90].map((h, i) => (
                      <div
                        key={i}
                        className="flex-1 rounded-sm bg-sky-500/40"
                        style={{ height: `${h}%` }}
                      />
                    ))}
                  </div>
                  <div className="text-[10px] text-emerald-400 font-semibold">
                    +12% vs last sprint
                  </div>
                </div>

                {/* Completion donut */}
                <div className="p-4 rounded-xl bg-slate-900/60 border border-white/[0.07] flex flex-col gap-3">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    Completion
                  </div>
                  <div className="text-[22px] font-black text-white">84%</div>
                  <div className="w-full h-2 rounded-full bg-white/[0.08] overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-sky-400 to-emerald-400 rounded-full"
                      style={{ width: '84%' }}
                    />
                  </div>
                  <div className="text-[10px] text-sky-400 font-semibold">12 of 15 tasks done</div>
                </div>

                {/* AI Risk panel */}
                <div className="p-4 rounded-xl bg-violet-900/20 border border-violet-500/20 flex flex-col gap-3">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    AI Risk
                  </div>
                  <div className="text-[22px] font-black text-emerald-400">Clear</div>
                  <div className="flex gap-1 flex-wrap">
                    {['OPS-080', 'OPS-094', 'MS-02'].map(tag => (
                      <span
                        key={tag}
                        className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold text-violet-300 bg-violet-500/10"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  <div className="text-[10px] text-slate-400">No blockers detected</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Caption */}
        <p className="text-center text-[13px] text-slate-600 mt-5 font-mono">
          taskflow.io · Project Operations Dashboard · Real-time view
        </p>
      </div>
    </section>
  );
};
