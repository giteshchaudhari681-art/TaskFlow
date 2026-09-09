import React, { useRef } from 'react';
import { ArrowRight, Play, AlertTriangle, Zap, CheckCircle2 } from 'lucide-react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';

interface LandingHeroProps {
  onGetStarted: () => void;
  onExplore: () => void;
}

export const LandingHero: React.FC<LandingHeroProps> = ({ onGetStarted }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Motion values for parallax and 3D
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const springConfig = { damping: 40, stiffness: 120, mass: 1.5 };
  const smoothX = useSpring(mouseX, springConfig);
  const smoothY = useSpring(mouseY, springConfig);

  // Base rotation + parallax offset
  const rotateX = useTransform(smoothY, [-0.5, 0.5], [4, 0]);
  const rotateY = useTransform(smoothX, [-0.5, 0.5], [-8, -2]);
  const translateX = useTransform(smoothX, [-0.5, 0.5], [-20, 20]);
  const translateY = useTransform(smoothY, [-0.5, 0.5], [-20, 20]);

  // Floating cards parallax
  const floatX = useTransform(smoothX, [-0.5, 0.5], [-40, 40]);
  const floatY = useTransform(smoothY, [-0.5, 0.5], [-40, 40]);
  const floatXReverse = useTransform(smoothX, [-0.5, 0.5], [40, -40]);
  const floatYReverse = useTransform(smoothY, [-0.5, 0.5], [40, -40]);

  // Floating cursor
  const cursorX = useTransform(smoothX, [-0.5, 0.5], [-80, 80]);
  const cursorY = useTransform(smoothY, [-0.5, 0.5], [-80, 80]);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current || window.matchMedia('(prefers-reduced-motion: reduce)').matches)
      return;
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

  const staggerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: i * 0.1,
        duration: 0.8,
        ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
      },
    }),
  };

  return (
    <section
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative min-h-[90vh] flex items-center pt-[100px] pb-[80px] overflow-hidden bg-[#0A0A0A]"
    >
      {/* Deep environmental atmosphere */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-[#E85D22]/15 via-[#0A0A0A]/0 to-[#0A0A0A]/0 pointer-events-none" />
      <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.04] pointer-events-none mix-blend-overlay" />

      {/* Large subtle orange glow behind the product mockup */}
      <motion.div
        className="absolute w-[1200px] h-[1200px] rounded-full blur-[180px] bg-[#E85D22]/[0.08] pointer-events-none"
        style={{
          x: useTransform(smoothX, [-0.5, 0.5], [-80, 80]),
          y: useTransform(smoothY, [-0.5, 0.5], [-80, 80]),
          right: '-20%',
          top: '0%',
        }}
      />

      <div className="max-w-[1400px] mx-auto px-6 w-full grid lg:grid-cols-[1fr,1.4fr] gap-12 lg:gap-8 items-center z-10 relative">
        {/* Left Column - Typography */}
        <div className="flex flex-col items-start text-left max-w-[540px] z-20 mt-10 lg:mt-0">
          <motion.div
            custom={0}
            initial="hidden"
            animate="visible"
            variants={staggerVariants}
            className="flex items-center gap-2.5 mb-6 px-3 py-1.5 rounded-full border border-[#262626] bg-[#161616]/80 backdrop-blur-md shadow-sm"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#E85D22] shadow-[0_0_8px_#E85D22]" />
            <span className="text-[11px] font-semibold uppercase tracking-widest text-[#A3A3A3]">
              v1.0 Built for modern teams
            </span>
          </motion.div>

          <motion.h1
            custom={1}
            initial="hidden"
            animate="visible"
            variants={staggerVariants}
            className="font-display text-[clamp(4rem,5.5vw,5.5rem)] font-medium tracking-tight leading-[1.02] mb-6 text-[#F3EDE4]"
          >
            Serious work deserves a <span className="text-[#E85D22]">calm</span> operating picture.
          </motion.h1>

          <motion.p
            custom={2}
            initial="hidden"
            animate="visible"
            variants={staggerVariants}
            className="text-[1.2rem] text-[#A3A3A3] leading-relaxed mb-10 max-w-[480px] font-sans"
          >
            Plan, execute, and ship with clarity. TaskFlow brings your projects, tasks, and team
            together in one intelligent workspace.
          </motion.p>

          <motion.div
            custom={3}
            initial="hidden"
            animate="visible"
            variants={staggerVariants}
            className="flex flex-col sm:flex-row items-center gap-4 mb-14 w-full sm:w-auto"
          >
            <button
              type="button"
              onClick={onGetStarted}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-[8px] bg-[#E85D22] text-white text-[15px] font-semibold hover:bg-[#F0703B] shadow-[0_4px_24px_rgba(232,93,34,0.35)] hover:shadow-[0_6px_32px_rgba(232,93,34,0.45)] transition-all hover:-translate-y-[1px]"
            >
              Get started for free
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-[8px] border border-[#262626] bg-[#161616] text-[#F3EDE4] text-[15px] font-medium hover:bg-[#1A1A1A] hover:border-[#333333] shadow-sm transition-all hover:-translate-y-[1px]"
            >
              <Play className="w-4 h-4 text-[#A3A3A3]" />
              Watch demo
            </button>
          </motion.div>

          <motion.div
            custom={4}
            initial="hidden"
            animate="visible"
            variants={staggerVariants}
            className="flex items-center gap-5"
          >
            <div className="flex -space-x-3">
              {[1, 2, 3, 4].map(i => (
                <div
                  key={i}
                  className="w-9 h-9 rounded-full border-2 border-[#0A0A0A] bg-[#262626] flex items-center justify-center overflow-hidden shadow-sm"
                >
                  <img
                    src={`https://api.dicebear.com/7.x/notionists/svg?seed=${i}&backgroundColor=transparent`}
                    alt="avatar"
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
            <p className="text-[13px] text-[#8A8A8A] font-medium tracking-wide">
              Trusted by teams who ship.
            </p>
          </motion.div>
        </div>

        {/* Right Column - Massive 3D Mockup */}
        <motion.div
          custom={5}
          initial={{ opacity: 0, scale: 0.8, rotateX: 20, rotateY: -10, y: 100, z: -200 }}
          animate={{ opacity: 1, scale: 1, rotateX: 0, rotateY: 0, y: 0, z: 0 }}
          transition={{ delay: 0.2, duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
          className="relative lg:h-[750px] flex items-center justify-start perspective-[1400px] hidden lg:flex ml-[-20px] preserve-3d"
        >
          {/* We apply a base static rotation here to ensure 3D is ALWAYS visible, and motion adds slight parallax */}
          <motion.div
            className="relative w-[130%] max-w-[1100px] aspect-[16/10] preserve-3d"
            style={{
              rotateX,
              rotateY,
              x: translateX,
              y: translateY,
            }}
          >
            {/* Main Application Window */}
            <div className="absolute inset-0 rounded-[16px] border border-[#333333] bg-[#0F0F0F] shadow-[0_60px_100px_rgba(0,0,0,0.9),_0_0_80px_rgba(232,93,34,0.08),_inset_0_1px_0_rgba(255,255,255,0.08)] overflow-hidden flex flex-col">
              {/* App Header */}
              <div className="h-14 border-b border-[#262626] bg-[#161616] flex items-center justify-between px-5">
                <div className="flex items-center gap-4">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-[#333333]" />
                    <div className="w-3 h-3 rounded-full bg-[#333333]" />
                    <div className="w-3 h-3 rounded-full bg-[#333333]" />
                  </div>
                  <div className="h-4 w-px bg-[#262626] mx-2" />
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-[4px] bg-[#E85D22] flex items-center justify-center shadow-[0_0_10px_rgba(232,93,34,0.3)]">
                      <Zap className="w-3 h-3 text-white" />
                    </div>
                    <span className="text-sm font-semibold text-[#F3EDE4]">TaskFlow</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-64 h-8 bg-[#0A0A0A] border border-[#262626] rounded-[6px] px-3 flex items-center">
                    <span className="text-[11px] text-[#737373]">Search tasks...</span>
                  </div>
                  <div className="w-7 h-7 rounded-full bg-[#262626] overflow-hidden border border-[#333333]">
                    <img
                      src="https://api.dicebear.com/7.x/notionists/svg?seed=Alex&backgroundColor=transparent"
                      alt="Alex"
                      className="w-full h-full"
                    />
                  </div>
                </div>
              </div>

              {/* App Body */}
              <div className="flex-1 flex bg-[#0A0A0A]">
                {/* Sidebar */}
                <div className="w-60 border-r border-[#262626] bg-[#111111] p-5 flex flex-col gap-6">
                  <div className="space-y-1">
                    <div className="flex items-center gap-3 px-3 py-2.5 bg-[#E85D22]/10 border border-[#E85D22]/20 rounded-[6px] text-[#F3EDE4]">
                      <div className="w-4 h-4 rounded-[4px] bg-[#E85D22]/20 flex items-center justify-center">
                        <CheckCircle2 className="w-3 h-3 text-[#E85D22]" />
                      </div>
                      <span className="text-[13px] font-medium tracking-wide">Home</span>
                    </div>
                    {['Projects', 'My Work', 'AI', 'Members', 'Settings'].map(item => (
                      <div
                        key={item}
                        className="flex items-center gap-3 px-3 py-2.5 text-[#8A8A8A] hover:bg-[#1A1A1A] hover:text-[#F3EDE4] rounded-[6px] cursor-pointer transition-colors"
                      >
                        <div className="w-4 h-4 rounded-[4px] bg-[#262626] border border-[#333333]" />
                        <span className="text-[13px] font-medium tracking-wide">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 p-10 overflow-hidden relative">
                  {/* Decorative background glow for main content */}
                  <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#E85D22]/[0.04] blur-[120px] rounded-full pointer-events-none" />

                  <div className="mb-10">
                    <h2 className="text-[28px] font-display font-medium text-[#F3EDE4] mb-1">
                      Good to see you, Alex
                    </h2>
                    <p className="text-[15px] text-[#8A8A8A]">
                      Here's what's happening across your workspace.
                    </p>
                  </div>

                  {/* Metrics Row */}
                  <div className="grid grid-cols-3 gap-6 mb-8">
                    <div className="h-[120px] rounded-[12px] border border-[#262626] bg-[#161616] p-6 flex flex-col justify-between relative overflow-hidden group hover:border-[#333333] transition-colors shadow-sm">
                      <div className="flex justify-between items-start">
                        <div className="text-[15px] text-[#A3A3A3] font-medium">
                          Active Projects
                        </div>
                        <span className="text-[11px] text-[#22C55E] bg-[#22C55E]/10 border border-[#22C55E]/20 px-2 py-0.5 rounded font-semibold">
                          +2
                        </span>
                      </div>
                      <div className="text-[2.5rem] font-display text-[#F3EDE4] leading-none">
                        12
                      </div>
                    </div>
                    <div className="h-[120px] rounded-[12px] border border-[#262626] bg-[#161616] p-6 flex flex-col justify-between relative overflow-hidden group hover:border-[#333333] transition-colors shadow-sm">
                      <div className="flex justify-between items-start">
                        <div className="text-[15px] text-[#A3A3A3] font-medium">
                          Tasks in Progress
                        </div>
                        <span className="text-[11px] text-[#A3A3A3] bg-[#262626] border border-[#333333] px-2 py-0.5 rounded font-semibold">
                          -4
                        </span>
                      </div>
                      <div className="text-[2.5rem] font-display text-[#F3EDE4] leading-none">
                        28
                      </div>
                    </div>
                    <div className="h-[120px] rounded-[12px] border border-[#262626] border-t-[3px] border-t-[#EF4444] bg-[#1A1111] p-6 flex flex-col justify-between relative overflow-hidden shadow-sm">
                      <div className="flex justify-between items-start">
                        <div className="text-[15px] text-[#A3A3A3] font-medium">Overdue</div>
                        <span className="text-[11px] text-[#EF4444] bg-[#EF4444]/10 border border-[#EF4444]/20 px-2 py-0.5 rounded font-semibold">
                          +1
                        </span>
                      </div>
                      <div className="text-[2.5rem] font-display text-[#EF4444] leading-none">
                        3
                      </div>
                    </div>
                  </div>

                  {/* Charts Row */}
                  <div className="grid grid-cols-3 gap-6">
                    <div className="col-span-2 h-[260px] rounded-[12px] border border-[#262626] bg-[#161616] p-6 flex flex-col shadow-sm">
                      <div className="text-[15px] text-[#F3EDE4] font-medium mb-6">
                        Project Health
                      </div>
                      <div className="flex-1 flex items-end justify-between px-2 gap-3">
                        {[40, 60, 30, 80, 50, 90, 70, 85].map((h, i) => (
                          <div
                            key={i}
                            className="w-full bg-[#262626] rounded-t-[4px] relative group transition-colors"
                          >
                            <div
                              className="absolute bottom-0 w-full rounded-t-[4px] bg-gradient-to-t from-[#E85D22]/80 to-[#E85D22] opacity-90 group-hover:opacity-100 transition-opacity shadow-[0_0_12px_rgba(232,93,34,0.3)]"
                              style={{ height: `${h}%` }}
                            />
                          </div>
                        ))}
                      </div>
                      <div className="flex justify-between px-2 mt-4 text-[11px] text-[#737373] uppercase font-semibold tracking-wide">
                        <span>Jan</span>
                        <span>Feb</span>
                        <span>Mar</span>
                        <span>Apr</span>
                        <span>May</span>
                        <span>Jun</span>
                      </div>
                    </div>
                    <div className="col-span-1 h-[260px] rounded-[12px] border border-[#262626] bg-[#161616] p-6 flex flex-col items-center justify-center relative shadow-sm">
                      <div className="absolute top-6 left-6 text-[15px] text-[#F3EDE4] font-medium">
                        Team Activity
                      </div>
                      <div className="relative w-36 h-36 mt-6">
                        <svg className="w-full h-full transform -rotate-90">
                          <circle
                            cx="72"
                            cy="72"
                            r="64"
                            fill="none"
                            stroke="#262626"
                            strokeWidth="14"
                          />
                          <circle
                            cx="72"
                            cy="72"
                            r="64"
                            fill="none"
                            stroke="#22C55E"
                            strokeWidth="14"
                            strokeDasharray="402"
                            strokeDashoffset="96"
                            strokeLinecap="round"
                            className="drop-shadow-[0_0_8px_rgba(34,197,94,0.4)]"
                          />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className="text-3xl font-display text-[#F3EDE4]">76%</span>
                          <span className="text-[11px] text-[#22C55E] font-semibold tracking-wider uppercase mt-1">
                            On track
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Floating Card 1: AI Insight */}
            <motion.div
              style={{ x: floatX, y: floatY, translateZ: 120 }}
              className="absolute -right-8 top-12 w-80 rounded-[12px] border border-[#333333] bg-[#1A1A1A]/95 backdrop-blur-2xl shadow-[0_32px_64px_rgba(0,0,0,0.9),_0_0_0_1px_rgba(255,255,255,0.08),_inset_0_1px_0_rgba(255,255,255,0.15)] p-6 z-20 preserve-3d"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-[8px] bg-[#E85D22]/15 border border-[#E85D22]/30 flex items-center justify-center shadow-[0_0_15px_rgba(232,93,34,0.2)]">
                  <AlertTriangle className="w-5 h-5 text-[#E85D22]" />
                </div>
                <div>
                  <span className="text-[13px] font-bold tracking-widest uppercase text-[#F3EDE4]">
                    AI Insight
                  </span>
                </div>
              </div>
              <p className="text-[16px] font-medium text-[#F3EDE4] leading-snug mb-2">
                2 tasks are at risk
              </p>
              <p className="text-[14px] text-[#8A8A8A] mb-4">
                These tasks may delay your project by 2-4 days.
              </p>
              <button className="text-[14px] text-[#E85D22] font-semibold hover:text-[#F0703B] transition-colors flex items-center gap-1.5">
                Review now <ArrowRight className="w-4 h-4" />
              </button>
            </motion.div>

            {/* Floating Card 2: Team Workload (Bottom Left) */}
            <motion.div
              style={{ x: floatXReverse, y: floatYReverse, translateZ: 140 }}
              className="absolute -left-12 bottom-20 w-72 rounded-[12px] border border-[#333333] bg-[#1A1A1A]/95 backdrop-blur-2xl shadow-[0_32px_64px_rgba(0,0,0,0.9),_0_0_0_1px_rgba(255,255,255,0.08),_inset_0_1px_0_rgba(255,255,255,0.15)] p-5 z-20 preserve-3d"
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-[13px] font-bold tracking-widest uppercase text-[#F3EDE4]">
                  Team Load
                </span>
                <span className="text-[11px] text-[#22C55E] bg-[#22C55E]/10 px-2 py-0.5 rounded border border-[#22C55E]/20 font-semibold">
                  Balanced
                </span>
              </div>
              <div className="space-y-3">
                {[
                  { name: 'Sarah', w: '70%', color: '#3B82F6' },
                  { name: 'Mike', w: '40%', color: '#E85D22' },
                  { name: 'Alex', w: '85%', color: '#22C55E' },
                ].map((user, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-[#262626] border border-[#333333] shrink-0 overflow-hidden">
                      <img
                        src={`https://api.dicebear.com/7.x/notionists/svg?seed=${user.name}&backgroundColor=transparent`}
                        alt=""
                        className="w-full h-full"
                      />
                    </div>
                    <div className="flex-1 h-2 bg-[#0A0A0A] rounded-full overflow-hidden border border-[#262626]">
                      <div
                        className="h-full rounded-full"
                        style={{ width: user.w, backgroundColor: user.color }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Floating Cursor (Top Left, moving across) */}
            <motion.div
              style={{ x: cursorX, y: cursorY, translateZ: 180 }}
              className="absolute left-1/4 top-1/4 z-40 pointer-events-none drop-shadow-2xl"
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="transform -rotate-12 drop-shadow-md"
              >
                <path
                  d="M5.5 3.25L11.5 21L13.5 14L20.5 12L5.5 3.25Z"
                  fill="#A855F7"
                  stroke="white"
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                />
              </svg>
              <div className="mt-1 ml-4 bg-[#A855F7] text-white text-[10px] font-bold px-2 py-0.5 rounded-[4px] shadow-sm whitespace-nowrap">
                Priya (Editing)
              </div>
            </motion.div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};
