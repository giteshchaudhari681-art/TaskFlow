import React from 'react';
import { Check, AlertTriangle, Sparkles, CheckCircle2 } from 'lucide-react';
import { motion, useScroll, useTransform } from 'framer-motion';

export const LandingProductStory: React.FC = () => {
  const { scrollYProgress } = useScroll();
  // Very slow and subtle parallax for the background elements
  const yBg = useTransform(scrollYProgress, [0, 1], [0, -100]);

  return (
    <section className="py-32 relative overflow-hidden bg-[#0A0A0A]">
      <div className="max-w-[1400px] mx-auto px-6 relative z-10">
        <div className="grid lg:grid-cols-[1fr,1fr] gap-20 items-center">
          {/* Left Column - Stacked 3D Cards */}
          <div className="relative h-[600px] w-full hidden lg:flex items-center justify-center perspective-[1200px]">
            {/* Background glowing orb */}
            <motion.div
              style={{ y: yBg }}
              className="absolute w-[500px] h-[500px] bg-[#E85D22]/[0.03] rounded-full blur-[80px]"
            />

            {/* Card 1: High Priority (Back, top left) */}
            <motion.div
              initial={{ opacity: 0, x: -50, y: -50, rotateX: 10, rotateY: 20 }}
              whileInView={{ opacity: 1, x: -40, y: -80, rotateX: 5, rotateY: 15 }}
              viewport={{ once: true, margin: '-100px' }}
              transition={{ duration: 1, ease: 'easeOut' }}
              whileHover={{ translateZ: 30, scale: 1.05 }}
              className="absolute z-10 w-80 p-5 rounded-[12px] border border-[#333333] bg-[#111111]/90 backdrop-blur-md shadow-[0_20px_40px_rgba(0,0,0,0.8)] cursor-pointer preserve-3d"
            >
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded bg-[#EF4444]/10 flex items-center justify-center border border-[#EF4444]/20">
                    <AlertTriangle className="w-3.5 h-3.5 text-[#EF4444]" />
                  </div>
                  <span className="text-[11px] font-bold tracking-wider text-[#EF4444] uppercase">
                    High Priority
                  </span>
                </div>
                <p className="text-[15px] font-medium text-[#F3EDE4]">Fix payment flow</p>
              </div>
            </motion.div>

            {/* Card 2: AI Suggestion (Middle, right) */}
            <motion.div
              initial={{ opacity: 0, x: 50, rotateX: 10, rotateY: 10 }}
              whileInView={{ opacity: 1, x: 40, y: 10, rotateX: 2, rotateY: 5 }}
              viewport={{ once: true, margin: '-100px' }}
              transition={{ duration: 1, delay: 0.2, ease: 'easeOut' }}
              whileHover={{ translateZ: 40, scale: 1.05 }}
              className="absolute z-20 w-80 p-5 rounded-[12px] border border-[#333333] bg-[#161616]/95 backdrop-blur-md shadow-[0_30px_60px_rgba(0,0,0,0.9),_0_0_0_1px_rgba(59,130,246,0.1)] cursor-pointer preserve-3d"
            >
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded bg-[#3B82F6]/10 flex items-center justify-center border border-[#3B82F6]/20">
                    <Sparkles className="w-3.5 h-3.5 text-[#3B82F6]" />
                  </div>
                  <span className="text-[11px] font-bold tracking-wider text-[#3B82F6] uppercase">
                    AI Suggestion
                  </span>
                </div>
                <p className="text-[15px] font-medium text-[#F3EDE4]">Break down this task</p>
                <div className="w-full h-1.5 bg-[#262626] rounded-full mt-1 overflow-hidden">
                  <div className="w-1/3 h-full bg-[#3B82F6]" />
                </div>
              </div>
            </motion.div>

            {/* Card 3: Ready to Ship (Front, bottom left) */}
            <motion.div
              initial={{ opacity: 0, y: 100, rotateX: -10, rotateY: 15 }}
              whileInView={{ opacity: 1, x: -20, y: 100, rotateX: -5, rotateY: 10 }}
              viewport={{ once: true, margin: '-100px' }}
              transition={{ duration: 1, delay: 0.4, ease: 'easeOut' }}
              whileHover={{ translateZ: 50, scale: 1.05 }}
              className="absolute z-30 w-80 p-5 rounded-[12px] border border-[#22C55E]/30 bg-[#161616]/95 backdrop-blur-md shadow-[0_40px_80px_rgba(0,0,0,0.9),_0_0_40px_rgba(34,197,94,0.05)] cursor-pointer preserve-3d"
            >
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded bg-[#22C55E]/10 flex items-center justify-center border border-[#22C55E]/20">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#22C55E]" />
                  </div>
                  <span className="text-[11px] font-bold tracking-wider text-[#22C55E] uppercase">
                    Ready to Ship
                  </span>
                </div>
                <p className="text-[15px] font-medium text-[#F3EDE4]">All checks passed</p>
              </div>
            </motion.div>
          </div>

          {/* Right Column - Typography & Content */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col items-start"
          >
            <div className="flex items-center gap-2.5 mb-8">
              <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#A3A3A3]">
                WHY TASKFLOW
              </span>
            </div>
            <h2 className="font-display text-[clamp(2.5rem,4vw,3.5rem)] font-medium tracking-tight leading-[1.05] mb-8 text-[#F3EDE4]">
              Projects don't fail at launch.
              <br />
              They fail weeks before.
            </h2>
            <p className="text-[1.15rem] text-[#A3A3A3] leading-relaxed mb-12 font-sans max-w-[500px]">
              TaskFlow helps you spot risks early, keep work moving, and make smarter decisions with
              AI. Most tools show you what happened. TaskFlow shows you what's about to happen.
            </p>

            <ul className="space-y-5 mb-12">
              {[
                'Identify risks before they become blockers',
                'Get intelligent task decomposition',
                'Track progress with real-time insights',
                'Keep your team focused on what matters',
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-4">
                  <div className="w-5 h-5 rounded-[4px] bg-[#E85D22] flex items-center justify-center shrink-0 shadow-[0_2px_8px_rgba(232,93,34,0.4)]">
                    <Check className="w-3.5 h-3.5 text-white stroke-[3]" />
                  </div>
                  <span className="text-[15px] text-[#F3EDE4] font-medium">{item}</span>
                </li>
              ))}
            </ul>

            <div className="grid grid-cols-3 gap-6 w-full pt-8 border-t border-[#262626]">
              <div>
                <div className="text-[2.2rem] font-display text-[#3B82F6] leading-none mb-2">
                  78%
                </div>
                <div className="text-[11px] text-[#8A8A8A] font-medium uppercase tracking-wide">
                  Fewer missed deadlines
                </div>
              </div>
              <div>
                <div className="text-[2.2rem] font-display text-[#22C55E] leading-none mb-2">
                  6x
                </div>
                <div className="text-[11px] text-[#8A8A8A] font-medium uppercase tracking-wide">
                  Faster project setup
                </div>
              </div>
              <div>
                <div className="text-[2.2rem] font-display text-[#F3EDE4] leading-none mb-2">
                  100%
                </div>
                <div className="text-[11px] text-[#8A8A8A] font-medium uppercase tracking-wide">
                  Team visibility
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
