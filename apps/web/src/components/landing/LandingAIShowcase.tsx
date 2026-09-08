import React from 'react';
import { Check, ArrowRight, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';

export const LandingAIShowcase: React.FC = () => {
  return (
    <section className="py-32 relative overflow-hidden bg-[#0A0A0A]">
      {/* Background ambient lighting */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[600px] bg-[#E85D22]/[0.02] rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-[1400px] mx-auto px-6 relative z-10">
        <div className="grid lg:grid-cols-[1fr,1.2fr] gap-20 lg:gap-16 items-center">
          
          {/* Left Column - Typography & Content */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col items-start"
          >
            <div className="flex items-center gap-2.5 mb-8">
              <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#A3A3A3]">
                AI-POWERED INSIGHTS
              </span>
            </div>
            
            <h2 className="font-display text-[clamp(2.5rem,4.5vw,3.5rem)] font-medium tracking-tight leading-[1.05] mb-8 text-[#F3EDE4]">
              Know what's going wrong before your team does.
            </h2>
            
            <p className="text-[1.15rem] text-[#A3A3A3] leading-relaxed mb-12 max-w-[480px] font-sans">
              TaskFlow analyzes your projects, tasks, and team activity to surface risks, bottlenecks, and opportunities in real time.
            </p>

            <ul className="space-y-5 mb-12">
              {[
                'Detect at-risk tasks automatically',
                'Get intelligent recommendations',
                'See workload imbalances',
                'Make data-driven decisions'
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-4">
                  <div className="w-5 h-5 rounded-[4px] bg-[#E85D22] flex items-center justify-center shrink-0 shadow-[0_2px_8px_rgba(232,93,34,0.4)]">
                    <Check className="w-3.5 h-3.5 text-white stroke-[3]" />
                  </div>
                  <span className="text-[#F3EDE4] text-[15px] font-medium">{item}</span>
                </li>
              ))}
            </ul>

            <button className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-[8px] bg-[#E85D22] text-white text-[15px] font-semibold hover:bg-[#F0703B] shadow-[0_4px_16px_rgba(232,93,34,0.3)] hover:shadow-[0_6px_24px_rgba(232,93,34,0.4)] transition-all hover:-translate-y-[1px]">
              See AI in action
              <ArrowRight className="w-4 h-4" />
            </button>
          </motion.div>

          {/* Right Column - Massive Floating UI */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 40, rotateX: 5, rotateY: 5 }}
            whileInView={{ opacity: 1, scale: 1, y: 0, rotateX: 0, rotateY: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
            className="relative perspective-[1400px]"
          >
            <div className="relative w-full max-w-[640px] ml-auto rounded-[14px] border border-[#333333] bg-[#111111] shadow-[0_40px_80px_rgba(0,0,0,0.8),_0_0_60px_rgba(232,93,34,0.06),_inset_0_1px_0_rgba(255,255,255,0.05)] overflow-hidden preserve-3d">
              
              {/* Card Header */}
              <div className="p-8 border-b border-[#262626] bg-[#161616]">
                <div className="flex items-center gap-3 mb-6">
                  <AlertTriangle className="w-5 h-5 text-[#E85D22]" />
                  <span className="text-[13px] font-semibold tracking-wide uppercase text-[#F3EDE4]">AI Project Insight</span>
                </div>
                
                <div className="flex items-start gap-5">
                  <div className="w-12 h-12 rounded-[8px] bg-[#EF4444]/10 border border-[#EF4444]/20 flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-6 h-6 text-[#EF4444]" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-display font-medium text-[#F3EDE4] mb-2">3 tasks are at risk</h3>
                    <p className="text-[15px] text-[#A3A3A3]">These tasks may delay your project by 2-4 days.</p>
                  </div>
                </div>
              </div>

              {/* Tasks List */}
              <div className="p-8 bg-[#0A0A0A] space-y-4">
                {[
                  { title: 'Fix payment flow', priority: 'High Risk', color: 'text-[#EF4444]', bg: 'bg-[#EF4444]/10', borderColor: 'border-[#EF4444]/20' },
                  { title: 'Update dependencies', priority: 'Medium Risk', color: 'text-[#F59E0B]', bg: 'bg-[#F59E0B]/10', borderColor: 'border-[#F59E0B]/20' },
                  { title: 'Write documentation', priority: 'Medium Risk', color: 'text-[#F59E0B]', bg: 'bg-[#F59E0B]/10', borderColor: 'border-[#F59E0B]/20' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between p-5 bg-[#161616] border border-[#262626] rounded-[8px] hover:border-[#333333] transition-colors cursor-pointer">
                    <div className="flex items-center gap-4">
                      <div className={`w-2.5 h-2.5 rounded-full ${item.bg.replace('/10', '')}`} />
                      <span className="text-[15px] font-medium text-[#F3EDE4]">{item.title}</span>
                    </div>
                    <span className={`px-2.5 py-1 rounded-[4px] text-[11px] font-bold tracking-wide uppercase ${item.color} ${item.bg} border ${item.borderColor}`}>
                      {item.priority}
                    </span>
                  </div>
                ))}
                
                <div className="pt-4">
                  <button className="px-5 py-2.5 border border-[#333333] bg-[#161616] text-[#F3EDE4] rounded-[6px] text-[13px] font-medium hover:bg-[#1A1A1A] transition-colors flex items-center gap-2">
                    View Details
                    <ArrowRight className="w-4 h-4 text-[#A3A3A3]" />
                  </button>
                </div>
              </div>
            </div>
            
          </motion.div>
        </div>
      </div>
    </section>
  );
};
