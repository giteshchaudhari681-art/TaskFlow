import React from 'react';
import { ArrowRight, Sparkles, ShieldCheck, Zap } from 'lucide-react';

interface LandingCTAProps {
  onGetStarted: () => void;
}

export const LandingCTA: React.FC<LandingCTAProps> = ({ onGetStarted }) => {
  return (
    <section className="py-24 sm:py-36 relative overflow-hidden">
      {/* Atmospheric glows */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-sky-500/30 to-transparent" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[500px] bg-gradient-radial from-sky-500/[0.10] via-indigo-500/[0.05] to-transparent rounded-full blur-3xl" />
        <div className="absolute top-1/3 left-1/4 w-[400px] h-[300px] bg-violet-600/[0.06] rounded-full blur-3xl" />
      </div>

      <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-10 relative z-10">
        <div className="relative p-12 sm:p-20 rounded-3xl overflow-hidden border border-white/[0.10] bg-gradient-to-b from-slate-900/80 via-slate-900/60 to-[#06080d]/80 backdrop-blur-2xl text-center">
          {/* Corner accents */}
          <div className="absolute top-0 left-0 w-px h-32 bg-gradient-to-b from-sky-400/60 to-transparent" />
          <div className="absolute top-0 left-0 h-px w-32 bg-gradient-to-r from-sky-400/60 to-transparent" />
          <div className="absolute bottom-0 right-0 w-px h-32 bg-gradient-to-t from-indigo-400/40 to-transparent" />
          <div className="absolute bottom-0 right-0 h-px w-32 bg-gradient-to-l from-indigo-400/40 to-transparent" />

          {/* Eyebrow */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-sky-500/10 border border-sky-500/25 text-[12px] font-semibold text-sky-300 mb-8">
            <Sparkles className="w-3.5 h-3.5 text-sky-400" />
            Start your free workspace today
          </div>

          <h2 className="text-[clamp(2.5rem,6vw,4.5rem)] font-black text-white tracking-[-0.03em] leading-[1.04] max-w-3xl mx-auto mb-6">
            Build with clarity.
            <br />
            <span className="bg-gradient-to-r from-sky-400 via-blue-400 to-indigo-400 bg-clip-text text-transparent">
              Ship with confidence.
            </span>
          </h2>

          <p className="text-[clamp(1rem,1.5vw,1.15rem)] text-slate-400 max-w-xl mx-auto mb-12 leading-[1.8]">
            Join engineering and product teams who've replaced reactive firefighting with
            deterministic, AI-powered project delivery.
          </p>

          {/* CTA buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10">
            <button
              onClick={onGetStarted}
              className="group inline-flex items-center gap-2.5 px-9 py-4 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-[16px] font-bold shadow-2xl shadow-sky-500/30 hover:shadow-sky-500/50 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
            >
              <span>Get started free</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          {/* Micro reassurances */}
          <div className="flex flex-wrap items-center justify-center gap-6 text-[12px] text-slate-600">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              No credit card required
            </div>
            <div className="flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              Up and running in 2 minutes
            </div>
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-violet-500" />
              AI intelligence included
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
