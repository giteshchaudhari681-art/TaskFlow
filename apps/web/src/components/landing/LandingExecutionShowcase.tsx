import React, { useRef, useState } from 'react';
import { motion, useScroll, useTransform, useMotionValue, useSpring } from 'framer-motion';
import { Check, Clock, Network, GitBranch } from 'lucide-react';
import { WorkflowModal } from './WorkflowModal';

export const LandingExecutionShowcase: React.FC = () => {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [workflowOpen, setWorkflowOpen] = useState(false);
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
  const rotateY = useTransform(smoothX, [-0.5, 0.5], [8, 2]);

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
      <div className="absolute top-1/2 right-1/2 translate-x-1/2 -translate-y-1/2 w-[1200px] h-[800px] bg-[#E85D22]/[0.02] rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-[1400px] mx-auto px-6 relative z-10">
        <div className="grid lg:grid-cols-[1.3fr,1fr] gap-20 lg:gap-16 items-center">
          {/* Left Column - Floating UI */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 60 }}
            whileInView={{ opacity: 1, scale: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
            className="relative perspective-[1400px] order-2 lg:order-1 hidden lg:block"
          >
            <motion.div
              style={{ y, rotateX, rotateY }}
              className="relative w-[120%] ml-[-20%] rounded-[16px] border border-[#333333] bg-[#0F0F0F] shadow-[0_60px_120px_rgba(0,0,0,0.9),_0_0_80px_rgba(232,93,34,0.06),_inset_0_1px_0_rgba(255,255,255,0.05)] overflow-hidden preserve-3d"
            >
              {/* App Shell Mockup */}
              <div className="h-16 border-b border-[#262626] bg-[#161616]/90 backdrop-blur-xl flex items-center px-6 justify-between">
                <div className="flex items-center gap-6">
                  <div className="flex gap-2">
                    <div className="w-3 h-3 rounded-full bg-[#EF4444]/40" />
                    <div className="w-3 h-3 rounded-full bg-[#F59E0B]/40" />
                    <div className="w-3 h-3 rounded-full bg-[#22C55E]/40" />
                  </div>
                  <div className="flex items-center gap-3">
                    <Network className="w-5 h-5 text-[#E85D22]" />
                    <span className="text-[14px] font-semibold text-[#F3EDE4]">
                      Dependency Graph
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="px-3 py-1.5 rounded-[6px] bg-[#1A1A1A] border border-[#333333] text-[12px] text-[#A3A3A3] font-medium flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5" />
                    Sprint 14
                  </div>
                </div>
              </div>

              <div className="p-8 bg-[#0D0D0D] min-h-[500px] relative overflow-hidden flex items-center justify-center">
                {/* Timeline Grid Background */}
                <div
                  className="absolute inset-0 z-0 pointer-events-none"
                  style={{
                    backgroundImage:
                      'linear-gradient(to right, #1a1a1a 1px, transparent 1px), linear-gradient(to bottom, #1a1a1a 1px, transparent 1px)',
                    backgroundSize: '40px 40px',
                  }}
                />

                {/* Graph Area */}
                <div className="relative z-10 w-full max-w-[700px] h-[350px]">
                  {/* SVG Edges Layer */}
                  <svg
                    className="absolute inset-0 w-full h-full pointer-events-none"
                    style={{ zIndex: 0 }}
                  >
                    <defs>
                      <filter id="glow-edge">
                        <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                        <feMerge>
                          <feMergeNode in="coloredBlur" />
                          <feMergeNode in="SourceGraphic" />
                        </feMerge>
                      </filter>
                    </defs>

                    {/* Path: Foundation -> Component Library */}
                    <path
                      d="M 160 175 C 220 175, 220 100, 280 100"
                      fill="none"
                      stroke={
                        hoveredNode === null ||
                        hoveredNode === 'foundation' ||
                        hoveredNode === 'components'
                          ? '#E85D22'
                          : '#333'
                      }
                      strokeWidth="3"
                      filter="url(#glow-edge)"
                      className="transition-colors duration-300"
                    />

                    {/* Path: Foundation -> Auth Service */}
                    <path
                      d="M 160 175 C 220 175, 220 250, 280 250"
                      fill="none"
                      stroke={
                        hoveredNode === null ||
                        hoveredNode === 'foundation' ||
                        hoveredNode === 'auth'
                          ? '#555'
                          : '#333'
                      }
                      strokeWidth="2"
                      strokeDasharray="6 6"
                      className="transition-colors duration-300"
                    />

                    {/* Path: Component Library -> End-to-End */}
                    <path
                      d="M 460 100 C 520 100, 520 175, 540 175"
                      fill="none"
                      stroke={
                        hoveredNode === null ||
                        hoveredNode === 'components' ||
                        hoveredNode === 'e2e'
                          ? '#22C55E'
                          : '#333'
                      }
                      strokeWidth="3"
                      filter="url(#glow-edge)"
                      className="transition-colors duration-300"
                    />

                    {/* Path: Auth Service -> End-to-End */}
                    <path
                      d="M 440 250 C 490 250, 490 175, 540 175"
                      fill="none"
                      stroke={
                        hoveredNode === null || hoveredNode === 'auth' || hoveredNode === 'e2e'
                          ? '#555'
                          : '#333'
                      }
                      strokeWidth="2"
                      strokeDasharray="6 6"
                      className="transition-colors duration-300"
                    />
                  </svg>

                  {/* Node 1: Foundation (Completed) */}
                  <div
                    className={`absolute left-0 top-1/2 -translate-y-1/2 w-[160px] p-3.5 rounded-[12px] border ${hoveredNode === 'foundation' ? 'border-[#3B82F6]/60 bg-[#3B82F6]/10' : 'border-[#3B82F6]/30 bg-[#161616]/90'} backdrop-blur-md shadow-[0_10px_30px_rgba(0,0,0,0.5)] transition-all duration-300 cursor-pointer z-10 hover:-translate-y-[52%]`}
                    onMouseEnter={() => setHoveredNode('foundation')}
                    onMouseLeave={() => setHoveredNode(null)}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-6 h-6 rounded-full bg-[#3B82F6]/20 flex items-center justify-center border border-[#3B82F6]/40">
                        <Check className="w-3.5 h-3.5 text-[#3B82F6]" />
                      </div>
                      <span className="text-[13px] font-semibold text-[#F3EDE4]">Foundation</span>
                    </div>
                    <div className="flex justify-between items-center text-[11px] text-[#A3A3A3]">
                      <span>Completed</span>
                      <span className="text-[#3B82F6]">100%</span>
                    </div>
                  </div>

                  {/* Node 2: Component Library (Active, Critical) */}
                  <div
                    className={`absolute left-[280px] top-[100px] -translate-y-1/2 w-[180px] p-3.5 rounded-[12px] border ${hoveredNode === 'components' ? 'border-[#E85D22]/60 bg-[#E85D22]/15 scale-[1.02]' : 'border-[#E85D22]/30 bg-[#161616]/90'} backdrop-blur-md shadow-[0_10px_30px_rgba(0,0,0,0.5),_0_0_20px_rgba(232,93,34,0.1)] transition-all duration-300 cursor-pointer z-10`}
                    onMouseEnter={() => setHoveredNode('components')}
                    onMouseLeave={() => setHoveredNode(null)}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-6 h-6 rounded-full bg-[#E85D22]/20 flex items-center justify-center border border-[#E85D22]/40 animate-pulse">
                        <div className="w-2.5 h-2.5 rounded-full bg-[#E85D22]" />
                      </div>
                      <span className="text-[13px] font-semibold text-[#F3EDE4]">Components</span>
                    </div>
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-[#E85D22] font-medium">In Progress</span>
                      <span className="text-[#A3A3A3]">65%</span>
                    </div>
                  </div>

                  {/* Node 3: Auth Service (Completed) */}
                  <div
                    className={`absolute left-[280px] top-[250px] -translate-y-1/2 w-[160px] p-3.5 rounded-[12px] border ${hoveredNode === 'auth' ? 'border-[#A855F7]/60 bg-[#A855F7]/10' : 'border-[#A855F7]/30 bg-[#161616]/90'} backdrop-blur-md shadow-[0_10px_30px_rgba(0,0,0,0.5)] transition-all duration-300 cursor-pointer z-10 hover:-translate-y-[52%]`}
                    onMouseEnter={() => setHoveredNode('auth')}
                    onMouseLeave={() => setHoveredNode(null)}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-6 h-6 rounded-full bg-[#A855F7]/20 flex items-center justify-center border border-[#A855F7]/40">
                        <Check className="w-3.5 h-3.5 text-[#A855F7]" />
                      </div>
                      <span className="text-[13px] font-semibold text-[#F3EDE4]">Auth Service</span>
                    </div>
                    <div className="flex justify-between items-center text-[11px] text-[#A3A3A3]">
                      <span>Completed</span>
                      <span className="text-[#A855F7]">100%</span>
                    </div>
                  </div>

                  {/* Node 4: End-to-End (Blocked) */}
                  <div
                    className={`absolute right-0 top-1/2 -translate-y-1/2 w-[160px] p-3.5 rounded-[12px] border ${hoveredNode === 'e2e' ? 'border-[#EF4444]/60 bg-[#EF4444]/15 scale-[1.02]' : 'border-[#EF4444]/30 bg-[#161616]/90'} backdrop-blur-md shadow-[0_10px_30px_rgba(0,0,0,0.5)] transition-all duration-300 cursor-pointer z-10`}
                    onMouseEnter={() => setHoveredNode('e2e')}
                    onMouseLeave={() => setHoveredNode(null)}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-6 h-6 rounded-full bg-[#EF4444]/20 flex items-center justify-center border border-[#EF4444]/40">
                        <div className="w-1.5 h-3.5 rounded-full bg-[#EF4444]" />
                      </div>
                      <span className="text-[13px] font-semibold text-[#F3EDE4]">End-to-End</span>
                    </div>
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-[#EF4444] font-medium">Blocked</span>
                      <span className="text-[#A3A3A3]">2 deps</span>
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
              <span className="text-[12px] font-bold uppercase tracking-[0.25em] text-[#E85D22]">
                FLEXIBLE WORKFLOWS
              </span>
            </div>

            <h2 className="font-display text-[clamp(3rem,4.5vw,4rem)] font-medium tracking-tight leading-[1.05] mb-8 text-[#F3EDE4]">
              Every view your team needs. Zero context switching.
            </h2>

            <p className="text-[1.2rem] text-[#A3A3A3] leading-relaxed mb-12 max-w-[480px] font-sans">
              Switch between board, list, calendar, and timeline views. TaskFlow adapts to your
              team's workflow, not the other way around.
            </p>

            <ul className="space-y-6 mb-14">
              {[
                'Drag and drop with ease',
                'Real-time collaboration',
                'Customizable workflows',
                'Works for any team size',
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-5">
                  <div className="w-6 h-6 rounded-[6px] bg-[#E85D22] flex items-center justify-center shrink-0 shadow-[0_2px_12px_rgba(232,93,34,0.4)]">
                    <Check className="w-4 h-4 text-white stroke-[3]" />
                  </div>
                  <span className="text-[#F3EDE4] text-[16px] font-medium">{item}</span>
                </li>
              ))}
            </ul>

            <button
              onClick={() => setWorkflowOpen(true)}
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-[8px] bg-[#E85D22] text-white text-[15px] font-semibold hover:bg-[#F0703B] shadow-[0_4px_20px_rgba(232,93,34,0.35)] hover:shadow-[0_6px_28px_rgba(232,93,34,0.45)] transition-all hover:-translate-y-[1px]"
            >
              <GitBranch className="w-4 h-4" />
              Try it yourself
            </button>
          </motion.div>
        </div>
      </div>
      <WorkflowModal open={workflowOpen} onClose={() => setWorkflowOpen(false)} />
    </section>
  );
};
