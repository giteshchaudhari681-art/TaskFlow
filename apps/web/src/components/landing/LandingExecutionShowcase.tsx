import React, { useRef } from 'react';
import { motion, useScroll, useTransform, useMotionValue, useSpring } from 'framer-motion';
import { Check, ArrowRight, Network, GitCommit } from 'lucide-react';

export const LandingExecutionShowcase: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start end', 'end start'],
  });

  const parallaxY = useTransform(scrollYProgress, [0, 1], [40, -40]);

  // Mouse parallax for subtle interaction (flat shifting instead of 3D tilt)
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const smoothX = useSpring(mouseX, { damping: 50, stiffness: 400 });
  const smoothY = useSpring(mouseY, { damping: 50, stiffness: 400 });

  const shiftX = useTransform(smoothX, [-0.5, 0.5], [-15, 15]);
  const shiftY = useTransform(smoothY, [-0.5, 0.5], [-15, 15]);

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
      className="py-32 relative overflow-hidden bg-[#0A0A0A] border-t border-[#1A1A1A]"
    >
      {/* Background ambient lighting - Deep Blue Theme */}
      <div className="absolute top-1/2 left-0 w-[1000px] h-[800px] bg-[#3B82F6]/[0.03] rounded-full blur-[140px] pointer-events-none -translate-y-1/2" />

      <div className="max-w-[1400px] mx-auto px-6 relative z-10">
        <div className="grid lg:grid-cols-[1.3fr,1fr] gap-20 lg:gap-16 items-center">
          {/* Left Column - Flat Glassmorphic Graph UI */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
            className="relative order-2 lg:order-1 hidden lg:block"
          >
            <motion.div
              style={{ y: parallaxY, x: shiftX, top: shiftY }}
              className="relative w-[115%] ml-[-15%] rounded-[24px] border border-[#3B82F6]/20 bg-[#0A0A0A]/40 backdrop-blur-2xl shadow-[0_0_100px_rgba(59,130,246,0.05),_inset_0_1px_0_rgba(255,255,255,0.05)] overflow-hidden"
            >
              {/* Minimal App Header */}
              <div className="h-14 border-b border-[#3B82F6]/10 bg-transparent flex items-center px-6 justify-between">
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-3">
                    <Network className="w-5 h-5 text-[#3B82F6]" />
                    <span className="text-[14px] font-semibold text-[#F3EDE4]">
                      Dependency Graph
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="px-3 py-1.5 rounded-[8px] bg-[#3B82F6]/10 text-[12px] text-[#3B82F6] font-semibold flex items-center gap-2">
                    <GitCommit className="w-4 h-4" />
                    Critical Path
                  </div>
                </div>
              </div>

              <div className="p-10 min-h-[480px] relative overflow-hidden flex items-center justify-center">
                {/* Graph Background Grid */}
                <div
                  className="absolute inset-0 z-0 pointer-events-none opacity-20"
                  style={{
                    backgroundImage:
                      'linear-gradient(to right, #3B82F6 1px, transparent 1px), linear-gradient(to bottom, #3B82F6 1px, transparent 1px)',
                    backgroundSize: '40px 40px',
                  }}
                />

                {/* Node Graph Mockup */}
                <div className="relative z-10 w-full h-full flex flex-col justify-between space-y-12">
                  {/* Row 1 */}
                  <div className="flex justify-start pl-[10%]">
                    <div className="relative">
                      <div className="px-6 py-3 bg-[#0A0A0A] border border-[#3B82F6]/30 rounded-[12px] shadow-[0_0_20px_rgba(59,130,246,0.15)] flex items-center gap-3 relative z-10">
                        <div className="w-3 h-3 rounded-full bg-[#3B82F6] shadow-[0_0_10px_#3B82F6]" />
                        <span className="text-[14px] font-medium text-[#F3EDE4]">API Gateway</span>
                      </div>
                      {/* Line to Row 2 */}
                      <svg className="absolute left-1/2 top-full w-40 h-24 overflow-visible">
                        <path
                          d="M0,0 C0,40 80,50 80,96"
                          fill="none"
                          stroke="#3B82F6"
                          strokeWidth="2"
                          strokeDasharray="4 4"
                          className="opacity-50"
                        />
                        <path
                          d="M0,0 C0,40 -60,50 -60,96"
                          fill="none"
                          stroke="#3B82F6"
                          strokeWidth="2"
                          strokeDasharray="4 4"
                          className="opacity-50"
                        />
                      </svg>
                    </div>
                  </div>

                  {/* Row 2 */}
                  <div className="flex justify-center gap-16">
                    <div className="relative translate-x-[-20px]">
                      <div className="px-6 py-3 bg-[#0A0A0A] border border-[#06B6D4]/30 rounded-[12px] shadow-[0_0_20px_rgba(6,182,212,0.15)] flex items-center gap-3 relative z-10">
                        <div className="w-3 h-3 rounded-full bg-[#06B6D4] shadow-[0_0_10px_#06B6D4]" />
                        <span className="text-[14px] font-medium text-[#F3EDE4]">Auth Service</span>
                      </div>
                      <svg className="absolute left-1/2 top-full w-20 h-24 overflow-visible">
                        <path
                          d="M0,0 C0,40 40,50 40,96"
                          fill="none"
                          stroke="#06B6D4"
                          strokeWidth="2"
                          strokeDasharray="4 4"
                          className="opacity-50"
                        />
                      </svg>
                    </div>

                    <div className="relative translate-x-[20px]">
                      <div className="px-6 py-3 bg-[#0A0A0A] border border-[#8B5CF6]/30 rounded-[12px] shadow-[0_0_20px_rgba(139,92,246,0.15)] flex items-center gap-3 relative z-10">
                        <div className="w-3 h-3 rounded-full bg-[#8B5CF6] shadow-[0_0_10px_#8B5CF6]" />
                        <span className="text-[14px] font-medium text-[#F3EDE4]">
                          User Database
                        </span>
                      </div>
                      <svg className="absolute left-1/2 top-full w-20 h-24 overflow-visible">
                        <path
                          d="M0,0 C0,40 -40,50 -40,96"
                          fill="none"
                          stroke="#8B5CF6"
                          strokeWidth="2"
                          strokeDasharray="4 4"
                          className="opacity-50"
                        />
                      </svg>
                    </div>
                  </div>

                  {/* Row 3 */}
                  <div className="flex justify-center pt-2">
                    <div className="relative">
                      {/* Pulse ring for critical path */}
                      <div className="absolute inset-0 bg-[#E85D22] rounded-[12px] animate-ping opacity-20" />
                      <div className="px-6 py-3 bg-[#0A0A0A] border border-[#E85D22]/40 rounded-[12px] shadow-[0_0_30px_rgba(232,93,34,0.25)] flex items-center gap-3 relative z-10">
                        <div className="w-3 h-3 rounded-full bg-[#E85D22] shadow-[0_0_10px_#E85D22]" />
                        <span className="text-[14px] font-medium text-[#F3EDE4]">
                          Frontend Client (Blocked)
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>

          {/* Right Column - Typography & Content */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col items-start order-1 lg:order-2"
          >
            <div className="flex items-center gap-3 mb-8">
              <span className="text-[12px] font-bold uppercase tracking-[0.25em] text-[#3B82F6]">
                DETERMINISTIC PLANNING
              </span>
            </div>

            <h2 className="font-display text-[clamp(3rem,4.5vw,4rem)] font-medium tracking-tight leading-[1.05] mb-8 text-[#F3EDE4]">
              Stop guessing what happens when dates change.
            </h2>

            <p className="text-[1.2rem] text-[#A3A3A3] leading-relaxed mb-12 max-w-[480px] font-sans">
              Visualize the exact critical path of your project. When one task slips, see the
              cascading impact instantly across every dependent team.
            </p>

            <ul className="space-y-6 mb-14">
              {[
                'Auto-calculating critical paths',
                'Cross-team dependency linking',
                'Visual impact analysis',
                'Blocker notifications',
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-5">
                  <div className="w-6 h-6 rounded-[6px] bg-[#3B82F6] flex items-center justify-center shrink-0 shadow-[0_2px_12px_rgba(59,130,246,0.4)]">
                    <Check className="w-4 h-4 text-white stroke-[3]" />
                  </div>
                  <span className="text-[#F3EDE4] text-[16px] font-medium">{item}</span>
                </li>
              ))}
            </ul>

            <button className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-[8px] bg-[#3B82F6] text-white text-[15px] font-semibold hover:bg-[#2563EB] shadow-[0_4px_20px_rgba(59,130,246,0.35)] hover:shadow-[0_6px_28px_rgba(59,130,246,0.45)] transition-all hover:-translate-y-[1px]">
              Explore dependencies
              <ArrowRight className="w-4 h-4" />
            </button>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
