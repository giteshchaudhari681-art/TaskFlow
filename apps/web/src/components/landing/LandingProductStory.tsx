import React, { useRef } from 'react';
import { Check, AlertTriangle, Sparkles, CheckCircle2 } from 'lucide-react';
import { motion, useScroll, useTransform, useMotionValue, useSpring } from 'framer-motion';

export const LandingProductStory: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start end', 'end start'],
  });

  // Very slow and subtle parallax for the background elements
  const yBg = useTransform(scrollYProgress, [0, 1], [100, -100]);

  // Mouse parallax for subtle 3D interaction
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const smoothX = useSpring(mouseX, { damping: 50, stiffness: 400 });
  const smoothY = useSpring(mouseY, { damping: 50, stiffness: 400 });

  const rotateX1 = useTransform(smoothY, [-0.5, 0.5], [8, -2]);
  const rotateY1 = useTransform(smoothX, [-0.5, 0.5], [18, 22]);

  const rotateX2 = useTransform(smoothY, [-0.5, 0.5], [4, -2]);
  const rotateY2 = useTransform(smoothX, [-0.5, 0.5], [6, 10]);

  const rotateX3 = useTransform(smoothY, [-0.5, 0.5], [-2, -8]);
  const rotateY3 = useTransform(smoothX, [-0.5, 0.5], [8, 14]);

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
        <div className="grid lg:grid-cols-[1.1fr,1fr] gap-16 lg:gap-24 items-center">
          {/* Left Column - Stacked 3D Cards */}
          <div className="relative h-[650px] w-full hidden lg:flex items-center justify-center perspective-[1200px] ml-[-40px]">
            {/* Background glowing orb */}
            <motion.div
              style={{ y: yBg }}
              className="absolute w-[600px] h-[600px] bg-[#E85D22]/[0.02] rounded-full blur-[100px] pointer-events-none"
            />
            {/* Deep background image/texture for the rocks feeling */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_left,_var(--tw-gradient-stops))] from-[#111111] via-[#0A0A0A]/0 to-transparent pointer-events-none" />

            {/* Card 1: High Priority (Back, top left) */}
            <motion.div
              initial={{ opacity: 0, x: -60, y: -70 }}
              whileInView={{ opacity: 1, x: -50, y: -90 }}
              viewport={{ once: true, margin: '-100px' }}
              transition={{ duration: 1, ease: 'easeOut' }}
              style={{ rotateX: rotateX1, rotateY: rotateY1, z: -50 }}
              className="absolute z-10 w-[360px] p-6 rounded-[14px] border border-[#EF4444]/20 bg-[#111111]/95 backdrop-blur-md shadow-[0_30px_60px_rgba(0,0,0,0.9),_inset_0_1px_0_rgba(255,255,255,0.05),_0_0_20px_rgba(239,68,68,0.1)] preserve-3d transition-transform hover:z-40"
            >
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-[6px] bg-[#EF4444]/15 flex items-center justify-center border border-[#EF4444]/30 shadow-[0_0_10px_rgba(239,68,68,0.2)]">
                    <AlertTriangle className="w-4 h-4 text-[#EF4444]" />
                  </div>
                  <span className="text-[12px] font-bold tracking-[0.15em] text-[#EF4444] uppercase">
                    High Priority
                  </span>
                </div>
                <p className="text-[17px] font-medium text-[#F3EDE4]">Fix payment flow</p>
              </div>
            </motion.div>

            {/* Card 2: AI Suggestion (Middle, right) */}
            <motion.div
              initial={{ opacity: 0, x: 60, y: 0 }}
              whileInView={{ opacity: 1, x: 50, y: -10 }}
              viewport={{ once: true, margin: '-100px' }}
              transition={{ duration: 1, delay: 0.2, ease: 'easeOut' }}
              style={{ rotateX: rotateX2, rotateY: rotateY2, z: 0 }}
              className="absolute z-20 w-[360px] p-6 rounded-[14px] border border-[#3B82F6]/30 bg-[#161616]/95 backdrop-blur-md shadow-[0_40px_80px_rgba(0,0,0,0.95),_inset_0_1px_0_rgba(255,255,255,0.05),_0_0_30px_rgba(59,130,246,0.15)] preserve-3d transition-transform hover:z-40"
            >
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-[6px] bg-[#3B82F6]/15 flex items-center justify-center border border-[#3B82F6]/30 shadow-[0_0_10px_rgba(59,130,246,0.2)]">
                    <Sparkles className="w-4 h-4 text-[#3B82F6]" />
                  </div>
                  <span className="text-[12px] font-bold tracking-[0.15em] text-[#3B82F6] uppercase">
                    AI Suggestion
                  </span>
                </div>
                <p className="text-[17px] font-medium text-[#F3EDE4]">Break down this task</p>
                <div className="w-full h-1.5 bg-[#262626] rounded-full mt-2 overflow-hidden border border-[#333333]">
                  <div className="w-1/3 h-full bg-gradient-to-r from-[#3B82F6] to-[#60A5FA] shadow-[0_0_10px_#3B82F6]" />
                </div>
              </div>
            </motion.div>

            {/* Card 3: Ready to Ship (Front, bottom left) */}
            <motion.div
              initial={{ opacity: 0, x: -30, y: 110 }}
              whileInView={{ opacity: 1, x: -20, y: 90 }}
              viewport={{ once: true, margin: '-100px' }}
              transition={{ duration: 1, delay: 0.4, ease: 'easeOut' }}
              style={{ rotateX: rotateX3, rotateY: rotateY3, z: 50 }}
              className="absolute z-30 w-[360px] p-6 rounded-[14px] border border-[#22C55E]/40 bg-[#1A1A1A]/95 backdrop-blur-xl shadow-[0_50px_100px_rgba(0,0,0,0.95),_inset_0_1px_0_rgba(255,255,255,0.08),_0_0_40px_rgba(34,197,94,0.15)] preserve-3d transition-transform hover:z-40"
            >
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-[6px] bg-[#22C55E]/15 flex items-center justify-center border border-[#22C55E]/30 shadow-[0_0_10px_rgba(34,197,94,0.2)]">
                    <CheckCircle2 className="w-4 h-4 text-[#22C55E]" />
                  </div>
                  <span className="text-[12px] font-bold tracking-[0.15em] text-[#22C55E] uppercase">
                    Ready to Ship
                  </span>
                </div>
                <p className="text-[17px] font-medium text-[#F3EDE4]">All checks passed</p>
              </div>
            </motion.div>
          </div>

          {/* Right Column - Typography & Content */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col items-start"
          >
            <div className="flex items-center gap-2.5 mb-8">
              <span className="text-[12px] font-bold uppercase tracking-[0.25em] text-[#A3A3A3]">
                WHY TASKFLOW
              </span>
            </div>
            <h2 className="font-display text-[clamp(3rem,4.5vw,4rem)] font-medium tracking-tight leading-[1.05] mb-8 text-[#F3EDE4]">
              Projects don't fail at launch.
              <br />
              They fail weeks before.
            </h2>
            <p className="text-[1.2rem] text-[#A3A3A3] leading-relaxed mb-12 font-sans max-w-[500px]">
              TaskFlow helps you spot risks early, keep work moving, and make smarter decisions with
              AI. Most tools show you what happened. TaskFlow shows you what's about to happen.
            </p>

            <ul className="space-y-6 mb-14">
              {[
                'Identify risks before they become blockers',
                'Get intelligent task decomposition',
                'Track progress with real-time insights',
                'Keep your team focused on what matters',
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-5">
                  <div className="w-6 h-6 rounded-[6px] bg-[#E85D22] flex items-center justify-center shrink-0 shadow-[0_2px_12px_rgba(232,93,34,0.4)]">
                    <Check className="w-4 h-4 text-white stroke-[3]" />
                  </div>
                  <span className="text-[16px] text-[#F3EDE4] font-medium">{item}</span>
                </li>
              ))}
            </ul>

            <div className="grid grid-cols-4 gap-6 w-full pt-10 border-t border-[#262626]">
              <div>
                <div className="text-[2.5rem] font-display text-[#3B82F6] leading-none mb-3 font-medium">
                  78%
                </div>
                <div className="text-[12px] text-[#8A8A8A] font-bold uppercase tracking-wider leading-snug">
                  Fewer missed deadlines
                </div>
              </div>
              <div>
                <div className="text-[2.5rem] font-display text-[#22C55E] leading-none mb-3 font-medium">
                  6x
                </div>
                <div className="text-[12px] text-[#8A8A8A] font-bold uppercase tracking-wider leading-snug">
                  Faster project setup
                </div>
              </div>
              <div>
                <div className="text-[2.5rem] font-display text-[#F3EDE4] leading-none mb-3 font-medium">
                  100%
                </div>
                <div className="text-[12px] text-[#8A8A8A] font-bold uppercase tracking-wider leading-snug">
                  Team visibility
                </div>
              </div>
              <div>
                <div className="text-[2.5rem] font-display text-[#F59E0B] leading-none mb-3 font-medium">
                  3+
                </div>
                <div className="text-[12px] text-[#8A8A8A] font-bold uppercase tracking-wider leading-snug">
                  Hours saved per week
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
