import React from 'react';
import { Check } from 'lucide-react';
import { motion } from 'framer-motion';

export const LandingDependencyShowcase: React.FC = () => {
  return (
    <section className="py-32 relative overflow-hidden bg-[#0A0A0A]">
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
              <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#3B82F6]">
                BUILT FOR TEAMS
              </span>
            </div>
            
            <h2 className="font-display text-[clamp(2.5rem,4.5vw,3.5rem)] font-medium tracking-tight leading-[1.05] mb-8 text-[#F3EDE4]">
              See exactly which task is about to sink your sprint.
            </h2>
            
            <p className="text-[1.15rem] text-[#A3A3A3] leading-relaxed mb-12 max-w-[480px] font-sans">
              TaskFlow analyzes your team's workload, tracks progress, and surfaces capacity bottlenecks before they become problems.
            </p>

            <div className="grid grid-cols-2 gap-6 w-full">
              {[
                'Workload visualization',
                'Real-time activity feed',
                'Team performance insights',
                'Smart notifications'
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className="w-5 h-5 rounded-[4px] bg-[#E85D22] flex items-center justify-center shrink-0 shadow-[0_2px_8px_rgba(232,93,34,0.4)]">
                    <Check className="w-3.5 h-3.5 text-white stroke-[3]" />
                  </div>
                  <span className="text-[#F3EDE4] text-[14px] font-medium">{item}</span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Right Column - Team Workload UI Mockup */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 40 }}
            whileInView={{ opacity: 1, scale: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
            className="relative"
          >
            <div className="relative w-full max-w-[640px] ml-auto rounded-[14px] border border-[#333333] bg-[#111111] shadow-[0_40px_80px_rgba(0,0,0,0.8),_inset_0_1px_0_rgba(255,255,255,0.05)] overflow-hidden">
              
              {/* Header */}
              <div className="p-6 border-b border-[#262626] bg-[#161616] flex items-center justify-between">
                <span className="text-[15px] font-semibold text-[#F3EDE4]">Team Workload</span>
                <div className="px-3 py-1.5 rounded-[6px] border border-[#333333] bg-[#0A0A0A] text-[12px] text-[#A3A3A3] font-medium flex items-center gap-2 cursor-pointer">
                  This Week
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                </div>
              </div>

              {/* Workload List */}
              <div className="p-2 bg-[#0A0A0A]">
                {[
                  { name: 'Alex Chen', role: 'Frontend Dev', capacity: '8/10', barWidth: '80%', color: 'bg-[#22C55E]', avatar: 'Alex' },
                  { name: 'Sarah Kim', role: 'Backend Dev', capacity: '4/10', barWidth: '40%', color: 'bg-[#E85D22]', avatar: 'Sarah' },
                  { name: 'Mike Johnson', role: 'DevOps', capacity: '10/10', barWidth: '100%', color: 'bg-[#A855F7]', avatar: 'Mike' },
                  { name: 'Priya Patel', role: 'Product Manager', capacity: '5/10', barWidth: '50%', color: 'bg-[#F59E0B]', avatar: 'Priya' },
                ].map((user, i) => (
                  <div key={i} className="flex items-center justify-between p-4 hover:bg-[#161616] rounded-[8px] transition-colors cursor-pointer border border-transparent hover:border-[#262626]">
                    <div className="flex items-center gap-4 w-1/2">
                      <div className="w-10 h-10 rounded-full bg-[#262626] border border-[#333333] overflow-hidden shrink-0">
                        <img src={`https://api.dicebear.com/7.x/notionists/svg?seed=${user.avatar}&backgroundColor=transparent`} alt={user.name} className="w-full h-full" />
                      </div>
                      <div>
                        <div className="text-[14px] font-semibold text-[#F3EDE4] leading-tight mb-1">{user.name}</div>
                        <div className="text-[12px] text-[#737373]">{user.role}</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 w-1/2 justify-end">
                      <div className="w-full max-w-[140px] h-2 bg-[#262626] rounded-full overflow-hidden">
                        <div className={`h-full ${user.color} rounded-full`} style={{ width: user.barWidth }} />
                      </div>
                      <span className="text-[13px] font-medium text-[#A3A3A3] w-10 text-right">{user.capacity}</span>
                    </div>
                  </div>
                ))}
              </div>
              
            </div>
            
            {/* Background glow for the panel */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[#3B82F6]/[0.03] blur-[80px] rounded-full pointer-events-none -z-10" />

          </motion.div>
        </div>
      </div>
    </section>
  );
};
