import React, { useRef } from 'react';
import { Check, ArrowRight, AlertTriangle, Sparkles, BrainCircuit } from 'lucide-react';
import { motion, useScroll, useTransform, useMotionValue, useSpring } from 'framer-motion';

export const LandingAIShowcase: React.FC = () => {
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

  const rotateX = useTransform(smoothY, [-0.5, 0.5], [6, -2]);
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
      {/* Background ambient lighting */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1200px] h-[800px] bg-[#3B82F6]/[0.02] rounded-full blur-[140px] pointer-events-none" />

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
              <span className="text-[12px] font-bold uppercase tracking-[0.25em] text-[#3B82F6]">
                AI-POWERED INSIGHTS
              </span>
            </div>

            <h2 className="font-display text-[clamp(3rem,4.5vw,4rem)] font-medium tracking-tight leading-[1.05] mb-8 text-[#F3EDE4]">
              Know what's going wrong before your team does.
            </h2>

            <p className="text-[1.2rem] text-[#A3A3A3] leading-relaxed mb-12 max-w-[480px] font-sans">
              TaskFlow analyzes your projects, tasks, and team activity to surface risks,
              bottlenecks, and opportunities in real time.
            </p>

            <ul className="space-y-6 mb-14">
              {[
                'Detect at-risk tasks automatically',
                'Get intelligent recommendations',
                'See workload imbalances',
                'Make data-driven decisions',
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-5">
                  <div className="w-6 h-6 rounded-[6px] bg-[#3B82F6] flex items-center justify-center shrink-0 shadow-[0_2px_12px_rgba(59,130,246,0.4)]">
                    <Check className="w-4 h-4 text-white stroke-[3]" />
                  </div>
                  <span className="text-[#F3EDE4] text-[16px] font-medium">{item}</span>
                </li>
              ))}
            </ul>

            <button className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-[8px] bg-[#E85D22] text-white text-[15px] font-semibold hover:bg-[#F0703B] shadow-[0_4px_20px_rgba(232,93,34,0.35)] hover:shadow-[0_6px_28px_rgba(232,93,34,0.45)] transition-all hover:-translate-y-[1px]">
              See AI in action
              <ArrowRight className="w-4 h-4" />
            </button>
          </motion.div>

          {/* Right Column - Massive Floating UI */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 60 }}
            whileInView={{ opacity: 1, scale: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
            className="relative perspective-[1400px] hidden lg:block"
          >
            <motion.div
              style={{ y, rotateX, rotateY }}
              className="relative w-[120%] ml-auto rounded-[16px] border border-[#3B82F6]/20 bg-[#0F0F0F] shadow-[0_60px_120px_rgba(0,0,0,0.9),_0_0_80px_rgba(59,130,246,0.08),_inset_0_1px_0_rgba(255,255,255,0.05)] overflow-hidden preserve-3d"
            >
              {/* Card Header */}
              <div className="p-8 border-b border-[#262626] bg-[#161616]/90 backdrop-blur-xl">
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-8 h-8 rounded-[8px] bg-[#3B82F6]/10 border border-[#3B82F6]/30 flex items-center justify-center">
                    <BrainCircuit className="w-4 h-4 text-[#3B82F6]" />
                  </div>
                  <span className="text-[14px] font-semibold tracking-widest uppercase text-[#F3EDE4]">
                    AI Analysis Engine
                  </span>
                </div>

                <div className="flex items-start gap-6">
                  <div className="w-14 h-14 rounded-[10px] bg-[#EF4444]/10 border border-[#EF4444]/20 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(239,68,68,0.2)]">
                    <AlertTriangle className="w-7 h-7 text-[#EF4444]" />
                  </div>
                  <div>
                    <h3 className="text-[2.2rem] font-display font-medium text-[#F3EDE4] mb-3 leading-tight">
                      Critical Path Blocked
                    </h3>
                    <p className="text-[16px] text-[#A3A3A3] max-w-[400px] leading-relaxed">
                      "API Integration" is delayed by 3 days, pushing the entire Launch milestone
                      off track.
                    </p>
                  </div>
                </div>
              </div>

              {/* Tasks List */}
              <div className="p-8 bg-[#0A0A0A] space-y-5 min-h-[350px]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[13px] font-bold uppercase tracking-widest text-[#737373]">
                    AI Recommendations
                  </span>
                </div>

                {[
                  {
                    title: 'Reassign API tickets to Backend Team B',
                    priority: '+3 Days Saved',
                    color: 'text-[#22C55E]',
                    bg: 'bg-[#22C55E]/10',
                    borderColor: 'border-[#22C55E]/20',
                    icon: Sparkles,
                  },
                  {
                    title: 'Delay Marketing site launch by 1 week',
                    priority: 'Low Impact',
                    color: 'text-[#F59E0B]',
                    bg: 'bg-[#F59E0B]/10',
                    borderColor: 'border-[#F59E0B]/20',
                    icon: AlertTriangle,
                  },
                ].map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-6 bg-[#161616] border border-[#262626] rounded-[10px] hover:border-[#333333] hover:shadow-[0_8px_24px_rgba(0,0,0,0.5)] transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-5">
                      <div
                        className={`w-10 h-10 rounded-[8px] flex items-center justify-center ${item.bg} border ${item.borderColor}`}
                      >
                        <item.icon className={`w-5 h-5 ${item.color}`} />
                      </div>
                      <span className="text-[16px] font-medium text-[#F3EDE4] group-hover:text-white transition-colors">
                        {item.title}
                      </span>
                    </div>
                    <span
                      className={`px-3 py-1.5 rounded-[6px] text-[12px] font-bold tracking-wide uppercase ${item.color} ${item.bg} border ${item.borderColor}`}
                    >
                      {item.priority}
                    </span>
                  </div>
                ))}

                <div className="pt-6">
                  <button className="px-6 py-3.5 border border-[#3B82F6]/30 bg-[#3B82F6]/10 text-[#3B82F6] rounded-[8px] text-[14px] font-semibold hover:bg-[#3B82F6]/20 transition-colors flex items-center gap-2 shadow-[0_4px_12px_rgba(59,130,246,0.15)]">
                    Apply AI Suggestions
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
