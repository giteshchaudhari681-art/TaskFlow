import React from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';

export const LandingExecutionShowcase: React.FC = () => {
  return (
    <section className="py-24 sm:py-32 relative overflow-hidden bg-[#0A0A0A]">
      <div className="max-w-[1200px] mx-auto px-6 relative z-10">
        <div className="grid lg:grid-cols-[1.2fr,1fr] gap-16 lg:gap-12 items-center">
          
          {/* Left Column - Floating UI */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            whileInView={{ opacity: 1, scale: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
            className="relative perspective-1000 order-2 lg:order-1"
          >
            <div className="relative w-full rounded-[12px] border border-[#262626] bg-[#161616] shadow-[0_32px_64px_rgba(0,0,0,0.6)] overflow-hidden preserve-3d transform rotate-y-[4deg] rotate-x-[2deg] hover:rotate-y-0 hover:rotate-x-0 transition-transform duration-700 ease-out">
              
              {/* App Shell Mockup */}
              <div className="h-12 border-b border-[#262626] bg-[#1A1A1A] flex items-center px-4 justify-between">
                <div className="flex gap-2">
                  <div className="w-24 h-6 bg-[#262626] rounded-[4px]" />
                  <div className="w-16 h-6 bg-[#0A0A0A] border border-[#333333] rounded-[4px]" />
                </div>
              </div>

              <div className="p-6 bg-[#0D0D0D] min-h-[400px]">
                {/* Kanban Mockup */}
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { title: 'To Do', items: [1, 2, 3] },
                    { title: 'In Progress', items: [1, 2] },
                    { title: 'Review', items: [1] },
                  ].map((col, i) => (
                    <div key={i} className="flex flex-col gap-3">
                      <div className="flex items-center justify-between px-1">
                        <span className="text-sm font-semibold text-[#F3EDE4]">{col.title}</span>
                        <span className="text-xs text-[#8A8A8A]">{col.items.length}</span>
                      </div>
                      <div className="space-y-3">
                        {col.items.map((_, j) => (
                          <div key={j} className="p-3 bg-[#161616] border border-[#262626] rounded-[6px] shadow-sm hover:-translate-y-1 hover:border-[#333333] transition-all cursor-grab active:cursor-grabbing">
                            <div className="w-3/4 h-3 bg-[#262626] rounded-[2px] mb-3" />
                            <div className="w-1/2 h-3 bg-[#262626] rounded-[2px] mb-4" />
                            <div className="flex items-center justify-between">
                              <div className="w-5 h-5 rounded-full bg-[#333333]" />
                              <div className="w-12 h-4 rounded-[2px] bg-[#E85D22]/10 border border-[#E85D22]/20" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            {/* Handwriting annotation mockup (optional decorative element) */}
            <div className="absolute top-10 -right-10 opacity-60 hidden xl:block">
              <svg width="120" height="80" viewBox="0 0 120 80" className="stroke-[#E85D22]" fill="none">
                <path d="M10,70 C40,70 60,30 110,40" strokeWidth="1.5" strokeDasharray="4 4" />
                <path d="M100,35 L110,40 L105,50" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                <text x="0" y="85" fill="#E85D22" className="font-display italic text-lg" stroke="none">From ideas to impact</text>
              </svg>
            </div>
          </motion.div>

          {/* Right Column - Typography & Content */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col items-start order-1 lg:order-2"
          >
            <div className="flex items-center gap-2 mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-[#E85D22]" />
              <span className="text-[11px] font-semibold uppercase tracking-widest text-[#E85D22]">
                Flexible Workflows
              </span>
            </div>
            
            <h2 className="font-display text-[clamp(2rem,4vw,3.2rem)] font-medium tracking-tight leading-[1.1] mb-6 text-[#F3EDE4]">
              Every view your team needs. Zero context switching.
            </h2>
            
            <p className="text-[1.05rem] text-[#A3A3A3] leading-relaxed mb-10 max-w-[90%] font-sans">
              Switch between board, list, calendar, and timeline views. TaskFlow adapts to your team's workflow, not the other way around.
            </p>

            <div className="flex gap-2 mb-8">
              <div className="px-5 py-2 bg-[#E85D22] text-white rounded-[6px] text-[13px] font-semibold shadow-[0_2px_8px_rgba(232,93,34,0.25)]">Board</div>
              <div className="px-5 py-2 border border-[#262626] bg-[#161616] text-[#A3A3A3] rounded-[6px] text-[13px] font-medium hover:text-[#F3EDE4] transition-colors cursor-pointer">List</div>
              <div className="px-5 py-2 border border-[#262626] bg-[#161616] text-[#A3A3A3] rounded-[6px] text-[13px] font-medium hover:text-[#F3EDE4] transition-colors cursor-pointer">Calendar</div>
              <div className="px-5 py-2 border border-[#262626] bg-[#161616] text-[#A3A3A3] rounded-[6px] text-[13px] font-medium hover:text-[#F3EDE4] transition-colors cursor-pointer">Timeline</div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {[
                'Drag and drop with ease',
                'Real-time collaboration',
                'Customizable workflows',
                'Works for any team size'
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-[4px] bg-[#E85D22]/10 border border-[#E85D22]/20 flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3 text-[#E85D22] stroke-[3]" />
                  </div>
                  <span className="text-[#A3A3A3] text-sm font-medium">{item}</span>
                </div>
              ))}
            </div>

          </motion.div>

        </div>
      </div>
    </section>
  );
};
