import React, { useRef, useState } from 'react';
import { Check, Users } from 'lucide-react';
import { motion, useScroll, useTransform, useMotionValue, useSpring } from 'framer-motion';
import { WorkloadModal } from './WorkloadModal';

export const LandingDependencyShowcase: React.FC = () => {
  const [workloadOpen, setWorkloadOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start end', 'end start'],
  });

  const y = useTransform(scrollYProgress, [0, 1], [50, -50]);

  // Mouse parallax for subtle 3D interaction
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const smoothX = useSpring(mouseX, { damping: 50, stiffness: 400 });
  const smoothY = useSpring(mouseY, { damping: 50, stiffness: 400 });

  const rotateX = useTransform(smoothY, [-0.5, 0.5], [4, -2]);
  const rotateY = useTransform(smoothX, [-0.5, 0.5], [-8, -2]);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const { left, top, width, height } = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - left) / width - 0.5;
    const y = (e.clientY - top) / height - 0.5;
    mouseX.set(x);
    mouseY.set(y);
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  return (
    <section
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="py-32 relative overflow-hidden bg-[#0A0A0A]"
    >
      <div className="max-w-[1400px] mx-auto px-6 relative z-10">
        <div className="grid lg:grid-cols-[1fr,1.3fr] gap-20 lg:gap-16 items-center">
          {/* Left Column - Typography & Content */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col items-start"
          >
            <div className="flex items-center gap-3 mb-8">
              <span className="text-[12px] font-bold uppercase tracking-[0.25em] text-[#A855F7]">
                BUILT FOR TEAMS
              </span>
            </div>

            <h2 className="font-display text-[clamp(3rem,4.5vw,4rem)] font-medium tracking-tight leading-[1.05] mb-8 text-[#F3EDE4]">
              See exactly which task is about to sink your sprint.
            </h2>

            <p className="text-[1.2rem] text-[#A3A3A3] leading-relaxed mb-12 max-w-[480px] font-sans">
              TaskFlow analyzes your team's workload, tracks progress, and surfaces capacity
              bottlenecks before they become problems.
            </p>

            <ul className="space-y-6 mb-14 w-full">
              {[
                'Workload visualization',
                'Real-time activity feed',
                'Team performance insights',
                'Smart notifications',
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-5">
                  <div className="w-6 h-6 rounded-[6px] bg-[#A855F7] flex items-center justify-center shrink-0 shadow-[0_2px_12px_rgba(168,85,247,0.4)]">
                    <Check className="w-4 h-4 text-white stroke-[3]" />
                  </div>
                  <span className="text-[#F3EDE4] text-[16px] font-medium">{item}</span>
                </li>
              ))}
            </ul>

            <button
              onClick={() => setWorkloadOpen(true)}
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-[8px] bg-[#E85D22] text-white text-[15px] font-semibold hover:bg-[#F0703B] shadow-[0_4px_20px_rgba(232,93,34,0.35)] hover:shadow-[0_6px_28px_rgba(232,93,34,0.45)] transition-all hover:-translate-y-[1px]"
            >
              <Users className="w-4 h-4" />
              Balance workload
            </button>
          </motion.div>

          {/* Right Column - Team Workload UI Mockup */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 60 }}
            whileInView={{ opacity: 1, scale: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
            className="relative perspective-[1400px] hidden lg:block"
          >
            <motion.div
              style={{ y, rotateX, rotateY }}
              className="relative w-[120%] ml-auto rounded-[16px] border border-[#333333] bg-[#0F0F0F] shadow-[0_60px_120px_rgba(0,0,0,0.9),_0_0_80px_rgba(168,85,247,0.06),_inset_0_1px_0_rgba(255,255,255,0.05)] overflow-hidden preserve-3d"
            >
              {/* Header */}
              <div className="p-8 border-b border-[#262626] bg-[#161616]/90 backdrop-blur-xl flex items-center justify-between">
                <span className="text-[16px] font-semibold text-[#F3EDE4]">Team Workload</span>
                <div className="px-4 py-2 rounded-[8px] border border-[#333333] bg-[#0A0A0A] text-[13px] text-[#A3A3A3] font-medium flex items-center gap-2 cursor-pointer hover:bg-[#111111] transition-colors">
                  This Week
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M19 9l-7 7-7-7"
                    ></path>
                  </svg>
                </div>
              </div>

              {/* Workload List */}
              <div className="p-4 bg-[#0A0A0A] space-y-2 min-h-[400px]">
                {[
                  {
                    name: 'Alex Chen',
                    role: 'Frontend Dev',
                    capacity: '8/10',
                    barWidth: '80%',
                    color: 'bg-[#22C55E]',
                    glow: 'shadow-[0_0_15px_rgba(34,197,94,0.3)]',
                    avatar: 'Alex',
                  },
                  {
                    name: 'Sarah Kim',
                    role: 'Backend Dev',
                    capacity: '12/10',
                    barWidth: '100%',
                    color: 'bg-[#EF4444]',
                    glow: 'shadow-[0_0_15px_rgba(239,68,68,0.3)]',
                    avatar: 'Sarah',
                    overloaded: true,
                  },
                  {
                    name: 'Mike Johnson',
                    role: 'DevOps',
                    capacity: '10/10',
                    barWidth: '100%',
                    color: 'bg-[#F59E0B]',
                    glow: 'shadow-[0_0_15px_rgba(245,158,11,0.3)]',
                    avatar: 'Mike',
                  },
                  {
                    name: 'Priya Patel',
                    role: 'Product Manager',
                    capacity: '5/10',
                    barWidth: '50%',
                    color: 'bg-[#3B82F6]',
                    glow: 'shadow-[0_0_15px_rgba(59,130,246,0.3)]',
                    avatar: 'Priya',
                  },
                ].map((user, i) => (
                  <div
                    key={i}
                    className={`flex items-center justify-between p-5 rounded-[10px] transition-colors cursor-pointer border ${user.overloaded ? 'bg-[#EF4444]/5 border-[#EF4444]/20 hover:border-[#EF4444]/40' : 'bg-[#161616] border-transparent hover:border-[#333333]'}`}
                  >
                    <div className="flex items-center gap-5 w-1/2">
                      <div className="w-12 h-12 rounded-full bg-[#262626] border-2 border-[#333333] overflow-hidden shrink-0 shadow-lg">
                        <img
                          src={`https://api.dicebear.com/7.x/notionists/svg?seed=${user.avatar}&backgroundColor=transparent`}
                          alt={user.name}
                          className="w-full h-full"
                        />
                      </div>
                      <div>
                        <div className="text-[16px] font-semibold text-[#F3EDE4] leading-tight mb-1.5 flex items-center gap-2">
                          {user.name}
                          {user.overloaded && (
                            <span className="px-2 py-0.5 bg-[#EF4444] text-white text-[10px] font-bold uppercase rounded-[4px]">
                              Overloaded
                            </span>
                          )}
                        </div>
                        <div className="text-[13px] font-medium text-[#737373]">{user.role}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-5 w-1/2 justify-end">
                      <div className="w-full max-w-[180px] h-2.5 bg-[#262626] rounded-full overflow-hidden border border-[#333333]">
                        <div
                          className={`h-full ${user.color} rounded-full ${user.glow}`}
                          style={{ width: user.barWidth }}
                        />
                      </div>
                      <span
                        className={`text-[14px] font-bold w-12 text-right ${user.overloaded ? 'text-[#EF4444]' : 'text-[#A3A3A3]'}`}
                      >
                        {user.capacity}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Background glow for the panel */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#A855F7]/[0.02] blur-[120px] rounded-full pointer-events-none -z-10" />
          </motion.div>
        </div>
      </div>
      <WorkloadModal open={workloadOpen} onClose={() => setWorkloadOpen(false)} />
    </section>
  );
};
