import React from 'react';
import { Check, ArrowRight } from 'lucide-react';
import { motion, useScroll, useTransform } from 'framer-motion';

export const LandingProductPreview: React.FC = () => {
  const { scrollYProgress } = useScroll();
  const y = useTransform(scrollYProgress, [0, 1], [0, -100]);

  return (
    <section id="product" className="py-32 relative overflow-hidden bg-[#0A0A0A]">
      {/* Background ambient lighting */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1200px] h-[800px] bg-[#E85D22]/[0.02] rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-[1400px] mx-auto px-6 relative z-10">
        <div className="grid lg:grid-cols-[1fr,1.3fr] gap-20 lg:gap-16 items-center">
          {/* Left Column - Typography & Content */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col items-start"
          >
            <div className="flex items-center gap-2.5 mb-8">
              <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#3B82F6]">
                PRODUCT OVERVIEW
              </span>
            </div>

            <h2 className="font-display text-[clamp(2.5rem,4.5vw,3.5rem)] font-medium tracking-tight leading-[1.05] mb-8 text-[#F3EDE4]">
              The operations platform your team actually wants to use.
            </h2>

            <p className="text-[1.15rem] text-[#A3A3A3] leading-relaxed mb-12 max-w-[480px] font-sans">
              TaskFlow combines powerful project management with AI-driven intelligence, so you can
              move faster without the chaos.
            </p>

            <ul className="space-y-5 mb-12">
              {[
                'Visualize work your way',
                'Get AI-powered recommendations',
                'Keep everyone aligned',
                'Scale from small teams to enterprise',
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
              Explore features
              <ArrowRight className="w-4 h-4" />
            </button>
          </motion.div>

          {/* Right Column - Massive Floating UI */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 40, rotateX: 10, rotateY: -10 }}
            whileInView={{ opacity: 1, scale: 1, y: 0, rotateX: 2, rotateY: -6 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
            style={{ y }}
            className="relative perspective-[1400px] hidden lg:block"
          >
            <div className="relative w-[115%] rounded-[14px] border border-[#333333] bg-[#111111] shadow-[0_60px_120px_rgba(0,0,0,0.8),_0_0_80px_rgba(232,93,34,0.06),_inset_0_1px_0_rgba(255,255,255,0.05)] overflow-hidden preserve-3d">
              {/* App Shell Mockup */}
              <div className="h-14 border-b border-[#262626] bg-[#161616] flex items-center px-6 justify-between">
                <div className="w-72 h-8 bg-[#0A0A0A] border border-[#262626] rounded-[6px] flex items-center px-3">
                  <svg
                    className="w-3.5 h-3.5 text-[#737373] mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    ></path>
                  </svg>
                  <span className="text-[12px] text-[#737373]">
                    Search tasks, projects, or people...
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-[#262626] overflow-hidden">
                    <img
                      src="https://api.dicebear.com/7.x/notionists/svg?seed=Alice&backgroundColor=transparent"
                      alt="Avatar"
                      className="w-full h-full"
                    />
                  </div>
                </div>
              </div>

              <div className="p-8 bg-[#0A0A0A] min-h-[500px]">
                {/* View toggles */}
                <div className="flex gap-2 mb-8">
                  <div className="px-4 py-2 bg-[#E85D22] text-white rounded-[6px] text-[13px] font-semibold flex items-center gap-2">
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M4 4h4v16H4V4zm6 0h4v16h-4V4zm6 0h4v16h-4V4z"></path>
                    </svg>
                    Board
                  </div>
                  <div className="px-4 py-2 text-[#A3A3A3] hover:bg-[#1A1A1A] rounded-[6px] text-[13px] font-medium flex items-center gap-2 transition-colors cursor-pointer">
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z"></path>
                    </svg>
                    List
                  </div>
                  <div className="px-4 py-2 text-[#A3A3A3] hover:bg-[#1A1A1A] rounded-[6px] text-[13px] font-medium flex items-center gap-2 transition-colors cursor-pointer">
                    <svg
                      className="w-3.5 h-3.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                      ></path>
                    </svg>
                    Calendar
                  </div>
                  <div className="px-4 py-2 text-[#A3A3A3] hover:bg-[#1A1A1A] rounded-[6px] text-[13px] font-medium flex items-center gap-2 transition-colors cursor-pointer">
                    <svg
                      className="w-3.5 h-3.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
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
                          bg: 'bg-[#E85D22]/10',
                        },
                        {
                          t: 'Set up CI/CD',
                          p: 'Medium',
                          c: 'text-[#F59E0B]',
                          bg: 'bg-[#F59E0B]/10',
                        },
                        {
                          t: 'Research competitors',
                          p: 'Low',
                          c: 'text-[#22C55E]',
                          bg: 'bg-[#22C55E]/10',
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
                          bg: 'bg-[#E85D22]/10',
                        },
                        {
                          t: 'Write documentation',
                          p: 'Medium',
                          c: 'text-[#F59E0B]',
                          bg: 'bg-[#F59E0B]/10',
                        },
                        { t: 'User testing', p: 'Low', c: 'text-[#22C55E]', bg: 'bg-[#22C55E]/10' },
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
                          bg: 'bg-[#E85D22]/10',
                        },
                        {
                          t: 'Update dependencies',
                          p: 'Medium',
                          c: 'text-[#F59E0B]',
                          bg: 'bg-[#F59E0B]/10',
                        },
                      ],
                    },
                    {
                      title: 'Done',
                      count: 18,
                      border: 'border-t-[#22C55E]',
                      items: [
                        { t: 'Launch v1.0', p: 'High', c: 'text-[#E85D22]', bg: 'bg-[#E85D22]/10' },
                        {
                          t: 'Marketing site',
                          p: 'Medium',
                          c: 'text-[#F59E0B]',
                          bg: 'bg-[#F59E0B]/10',
                        },
                        {
                          t: 'Post-launch review',
                          p: 'Low',
                          c: 'text-[#22C55E]',
                          bg: 'bg-[#22C55E]/10',
                        },
                      ],
                    },
                  ].map((col, i) => (
                    <div key={i} className={`pt-3 border-t-2 ${col.border}`}>
                      <div className="flex items-center justify-between mb-5">
                        <span className="text-[13px] font-semibold text-[#F3EDE4] tracking-wide">
                          {col.title}
                        </span>
                        <span className="text-[11px] font-semibold text-[#737373] bg-[#161616] px-2 py-0.5 rounded-full">
                          {col.count}
                        </span>
                      </div>
                      <div className="space-y-4">
                        {col.items.map((item, j) => (
                          <div
                            key={j}
                            className="p-4 bg-[#161616] border border-[#262626] rounded-[8px] shadow-[0_4px_12px_rgba(0,0,0,0.4)] hover:-translate-y-1 transition-transform cursor-pointer"
                          >
                            <p className="text-[13px] font-medium text-[#F3EDE4] mb-4 leading-snug">
                              {item.t}
                            </p>
                            <div className="flex items-center justify-between">
                              <span
                                className={`px-2 py-0.5 rounded-[4px] text-[10px] font-bold tracking-wide uppercase ${item.c} ${item.bg}`}
                              >
                                {item.p}
                              </span>
                              <div className="w-5 h-5 rounded-full bg-[#262626] border border-[#333333] shrink-0" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Handwriting annotation element */}
            <div className="absolute -left-20 top-1/2 -translate-y-1/2 opacity-80 z-20 pointer-events-none">
              <p className="font-['Caveat',_cursive] text-[32px] text-[#A3A3A3] -rotate-12 leading-none whitespace-nowrap">
                Organize
                <br />
                Focus
                <br />
                Deliver
              </p>
              <svg
                className="w-16 h-16 ml-20 -mt-4 opacity-60"
                viewBox="0 0 100 100"
                fill="none"
                stroke="#A3A3A3"
                strokeWidth="2"
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
