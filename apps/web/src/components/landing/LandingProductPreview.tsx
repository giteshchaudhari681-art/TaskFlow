import React, { useRef } from 'react';
import {
  Check,
  ArrowRight,
  Search,
  Menu,
  MessageSquare,
  Paperclip,
  LayoutGrid,
} from 'lucide-react';
import { motion, useScroll, useTransform, useSpring, useMotionValue } from 'framer-motion';

export const LandingProductPreview: React.FC = () => {
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

  const rotateX = useTransform(smoothY, [-0.5, 0.5], [4, 0]);
  const rotateY = useTransform(smoothX, [-0.5, 0.5], [-8, -4]);

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
      id="product"
      className="py-32 relative overflow-hidden bg-[#0A0A0A]"
    >
      {/* Background ambient lighting */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1400px] h-[1000px] bg-[#E85D22]/[0.02] rounded-full blur-[160px] pointer-events-none" />

      <div className="max-w-[1400px] mx-auto px-6 relative z-10">
        <div className="grid lg:grid-cols-[1fr,1.4fr] gap-20 lg:gap-16 items-center">
          {/* Left Column - Typography & Content */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col items-start"
          >
            <div className="flex items-center gap-2.5 mb-8">
              <span className="text-[12px] font-bold uppercase tracking-[0.25em] text-[#3B82F6]">
                PRODUCT OVERVIEW
              </span>
            </div>

            <h2 className="font-display text-[clamp(3rem,4.5vw,4rem)] font-medium tracking-tight leading-[1.05] mb-8 text-[#F3EDE4]">
              The operations platform your team actually wants to use.
            </h2>

            <p className="text-[1.2rem] text-[#A3A3A3] leading-relaxed mb-12 max-w-[480px] font-sans">
              TaskFlow combines powerful project management with AI-driven intelligence, so you can
              move faster without the chaos.
            </p>

            <ul className="space-y-6 mb-14">
              {[
                'Visualize work your way',
                'Get AI-powered recommendations',
                'Keep everyone aligned',
                'Scale from small teams to enterprise',
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-5">
                  <div className="w-6 h-6 rounded-[6px] bg-[#E85D22] flex items-center justify-center shrink-0 shadow-[0_2px_12px_rgba(232,93,34,0.4)]">
                    <Check className="w-4 h-4 text-white stroke-[3]" />
                  </div>
                  <span className="text-[#F3EDE4] text-[16px] font-medium">{item}</span>
                </li>
              ))}
            </ul>

            <button className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-[8px] bg-[#E85D22] text-white text-[15px] font-semibold hover:bg-[#F0703B] shadow-[0_4px_20px_rgba(232,93,34,0.35)] hover:shadow-[0_6px_28px_rgba(232,93,34,0.45)] transition-all hover:-translate-y-[1px]">
              Explore features
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
              className="relative w-[130%] rounded-[16px] border border-[#333333] bg-[#0F0F0F] shadow-[0_60px_120px_rgba(0,0,0,0.9),_0_0_80px_rgba(232,93,34,0.06),_inset_0_1px_0_rgba(255,255,255,0.08)] overflow-hidden preserve-3d"
            >
              {/* App Shell Mockup */}
              <div className="h-16 border-b border-[#262626] bg-[#161616] flex items-center px-6 justify-between">
                <div className="flex items-center gap-4 w-96 h-10 bg-[#0A0A0A] border border-[#262626] rounded-[8px] px-4">
                  <Search className="w-4 h-4 text-[#737373]" />
                  <span className="text-[13px] text-[#737373]">
                    Search tasks, projects, or people...
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-full bg-[#262626] overflow-hidden border border-[#333333]">
                    <img
                      src="https://api.dicebear.com/7.x/notionists/svg?seed=Alice&backgroundColor=transparent"
                      alt="Avatar"
                      className="w-full h-full"
                    />
                  </div>
                </div>
              </div>

              <div className="p-8 bg-[#0A0A0A] min-h-[580px]">
                {/* View toggles */}
                <div className="flex gap-2 mb-10 border-b border-[#262626] pb-4">
                  <div className="px-5 py-2.5 bg-[#E85D22] text-white rounded-[6px] text-[14px] font-semibold flex items-center gap-2 shadow-[0_4px_12px_rgba(232,93,34,0.3)]">
                    <LayoutGrid className="w-4 h-4" />
                    Board
                  </div>
                  <div className="px-5 py-2.5 text-[#A3A3A3] hover:text-[#F3EDE4] hover:bg-[#1A1A1A] rounded-[6px] text-[14px] font-medium flex items-center gap-2 transition-colors cursor-pointer">
                    <Menu className="w-4 h-4" />
                    List
                  </div>
                  <div className="px-5 py-2.5 text-[#A3A3A3] hover:text-[#F3EDE4] hover:bg-[#1A1A1A] rounded-[6px] text-[14px] font-medium flex items-center gap-2 transition-colors cursor-pointer">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                      ></path>
                    </svg>
                    Calendar
                  </div>
                  <div className="px-5 py-2.5 text-[#A3A3A3] hover:text-[#F3EDE4] hover:bg-[#1A1A1A] rounded-[6px] text-[14px] font-medium flex items-center gap-2 transition-colors cursor-pointer">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M4 6h16M4 12h16M4 18h7"
                      ></path>
                    </svg>
                    Timeline
                  </div>
                </div>

                {/* Kanban Mockup */}
                <div className="grid grid-cols-4 gap-6">
                  {[
                    {
                      title: 'To Do',
                      count: 12,
                      border: 'border-t-[#E85D22]',
                      items: [
                        {
                          t: 'Design new dashboard',
                          p: 'High',
                          c: 'text-[#E85D22]',
                          bg: 'bg-[#E85D22]/15',
                          comments: 3,
                          att: 2,
                        },
                        {
                          t: 'Set up CI/CD',
                          p: 'Medium',
                          c: 'text-[#F59E0B]',
                          bg: 'bg-[#F59E0B]/15',
                          comments: 1,
                          att: 0,
                        },
                        {
                          t: 'Research competitors',
                          p: 'Low',
                          c: 'text-[#22C55E]',
                          bg: 'bg-[#22C55E]/15',
                          comments: 8,
                          att: 1,
                        },
                      ],
                    },
                    {
                      title: 'In Progress',
                      count: 6,
                      border: 'border-t-[#3B82F6]',
                      items: [
                        {
                          t: 'Implement API',
                          p: 'High',
                          c: 'text-[#E85D22]',
                          bg: 'bg-[#E85D22]/15',
                          comments: 12,
                          att: 4,
                        },
                        {
                          t: 'Write documentation',
                          p: 'Medium',
                          c: 'text-[#F59E0B]',
                          bg: 'bg-[#F59E0B]/15',
                          comments: 2,
                          att: 0,
                        },
                        {
                          t: 'User testing',
                          p: 'Low',
                          c: 'text-[#22C55E]',
                          bg: 'bg-[#22C55E]/15',
                          comments: 0,
                          att: 0,
                        },
                      ],
                    },
                    {
                      title: 'Review',
                      count: 4,
                      border: 'border-t-[#A855F7]',
                      items: [
                        {
                          t: 'Fix performance issue',
                          p: 'High',
                          c: 'text-[#E85D22]',
                          bg: 'bg-[#E85D22]/15',
                          comments: 5,
                          att: 1,
                        },
                        {
                          t: 'Update dependencies',
                          p: 'Medium',
                          c: 'text-[#F59E0B]',
                          bg: 'bg-[#F59E0B]/15',
                          comments: 0,
                          att: 0,
                        },
                      ],
                    },
                    {
                      title: 'Done',
                      count: 18,
                      border: 'border-t-[#22C55E]',
                      items: [
                        {
                          t: 'Launch v1.0',
                          p: 'High',
                          c: 'text-[#E85D22]',
                          bg: 'bg-[#E85D22]/15',
                          comments: 24,
                          att: 8,
                        },
                        {
                          t: 'Marketing site',
                          p: 'Medium',
                          c: 'text-[#F59E0B]',
                          bg: 'bg-[#F59E0B]/15',
                          comments: 3,
                          att: 2,
                        },
                        {
                          t: 'Post-launch review',
                          p: 'Low',
                          c: 'text-[#22C55E]',
                          bg: 'bg-[#22C55E]/15',
                          comments: 1,
                          att: 0,
                        },
                      ],
                    },
                  ].map((col, i) => (
                    <div key={i} className={`pt-4 border-t-2 ${col.border}`}>
                      <div className="flex items-center justify-between mb-6">
                        <span className="text-[14px] font-semibold text-[#F3EDE4] tracking-wide">
                          {col.title}
                        </span>
                        <span className="text-[12px] font-bold text-[#A3A3A3] bg-[#1A1A1A] px-2.5 py-0.5 rounded-[4px] border border-[#333333]">
                          {col.count}
                        </span>
                      </div>
                      <div className="space-y-4">
                        {col.items.map((item, j) => (
                          <div
                            key={j}
                            className="p-5 bg-[#161616] border border-[#262626] rounded-[10px] shadow-[0_4px_16px_rgba(0,0,0,0.5)] hover:-translate-y-1 hover:border-[#333333] transition-all cursor-pointer group"
                          >
                            <p className="text-[14px] font-medium text-[#F3EDE4] mb-5 leading-snug group-hover:text-white transition-colors">
                              {item.t}
                            </p>
                            <div className="flex items-center justify-between mb-4">
                              <span
                                className={`px-2 py-0.5 rounded-[4px] text-[10px] font-bold tracking-wide uppercase ${item.c} ${item.bg}`}
                              >
                                {item.p}
                              </span>
                            </div>
                            <div className="flex items-center justify-between border-t border-[#262626] pt-3 mt-3">
                              <div className="flex items-center gap-3">
                                {item.comments > 0 && (
                                  <div className="flex items-center gap-1 text-[#737373] text-[11px] font-medium">
                                    <MessageSquare className="w-3.5 h-3.5" />
                                    <span>{item.comments}</span>
                                  </div>
                                )}
                                {item.att > 0 && (
                                  <div className="flex items-center gap-1 text-[#737373] text-[11px] font-medium">
                                    <Paperclip className="w-3.5 h-3.5" />
                                    <span>{item.att}</span>
                                  </div>
                                )}
                              </div>
                              <div className="flex -space-x-2">
                                <div className="w-6 h-6 rounded-full bg-[#262626] border-2 border-[#161616] shrink-0 overflow-hidden">
                                  <img
                                    src={`https://api.dicebear.com/7.x/notionists/svg?seed=${i * 3 + j}&backgroundColor=transparent`}
                                    alt=""
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Handwriting annotation element */}
            <div className="absolute -left-20 top-1/2 -translate-y-1/2 opacity-90 z-20 pointer-events-none drop-shadow-xl">
              <p className="font-['Caveat',_cursive] text-[36px] text-[#A3A3A3] -rotate-12 leading-none whitespace-nowrap">
                Organize
                <br />
                Focus
                <br />
                Deliver
              </p>
              <svg
                className="w-20 h-20 ml-20 -mt-2 opacity-60"
                viewBox="0 0 100 100"
                fill="none"
                stroke="#A3A3A3"
                strokeWidth="2.5"
                strokeLinecap="round"
              >
                <path d="M10,10 Q50,40 90,80" />
                <path d="M70,85 L90,80 L80,65" />
              </svg>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
