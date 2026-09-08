import React from 'react';
import { ArrowRight, Sparkles, ShieldCheck, Zap } from 'lucide-react';
import { motion } from 'framer-motion';

interface LandingCTAProps {
  onGetStarted: () => void;
}

export const LandingCTA: React.FC<LandingCTAProps> = ({ onGetStarted }) => {
  return (
    <section className="py-24 sm:py-36 relative overflow-hidden bg-[#0A0A0A]">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-[#E85D22]/10 rounded-full blur-[120px]" />
      </div>

      <div className="max-w-[1200px] mx-auto px-6 relative z-10">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          whileInView={{ opacity: 1, scale: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="relative p-12 sm:p-20 rounded-[16px] overflow-hidden border border-[#262626] bg-[#161616] text-center shadow-[0_40px_80px_rgba(0,0,0,0.6)]"
        >
          {/* Subtle noise/grid overlay */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:32px_32px] opacity-50" />

          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-[4px] bg-[#E85D22]/10 border border-[#E85D22]/20 text-[11px] font-semibold uppercase tracking-widest text-[#E85D22] mb-8">
              <Sparkles className="w-3.5 h-3.5 text-[#E85D22]" />
              Start your free workspace today
            </div>

            <h2 className="font-display text-[clamp(2.5rem,5vw,4.5rem)] font-medium text-[#F3EDE4] tracking-tight leading-[1.05] max-w-3xl mx-auto mb-6">
              Build with clarity.<br />
              <span className="text-[#A3A3A3]">Ship with confidence.</span>
            </h2>

            <p className="text-[1.1rem] text-[#8A8A8A] max-w-xl mx-auto mb-12 leading-relaxed font-sans">
              Join engineering and product teams who've replaced reactive firefighting with deterministic, AI-powered project delivery.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10">
              <button
                onClick={onGetStarted}
                className="group inline-flex items-center justify-center gap-2 px-8 py-4 rounded-[6px] bg-[#E85D22] text-white text-[15px] font-semibold hover:bg-[#F0703B] shadow-[0_4px_16px_rgba(232,93,34,0.3)] transition-all hover:-translate-y-[2px]"
              >
                Get started free
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-6 text-[12px] font-medium text-[#8A8A8A]">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-[#22C55E]" />
                No credit card required
              </div>
              <div className="flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-[#F59E0B]" />
                Up and running in 2 minutes
              </div>
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#E85D22]" />
                AI intelligence included
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
