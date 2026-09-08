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

  const rotateX = useTransform(smoothY, [-0.5, 0.5], [4, -4]);
  const rotateY = useTransform(smoothX, [-0.5, 0.5], [-6, 6]);
  const translateX = useTransform(smoothX, [-0.5, 0.5], [-15, 15]);
  const translateY = useTransform(smoothY, [-0.5, 0.5], [-15, 15]);

  // Floating cards parallax
  const floatX = useTransform(smoothX, [-0.5, 0.5], [-30, 30]);
  const floatY = useTransform(smoothY, [-0.5, 0.5], [-30, 30]);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
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
      className="relative min-h-screen flex items-center pt-[80px] overflow-hidden bg-[#0A0A0A]"
    >
      {/* Deep environmental atmosphere */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-[#E85D22]/10 via-[#0A0A0A]/0 to-[#0A0A0A]/0 pointer-events-none" />
      <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.03] pointer-events-none mix-blend-overlay" />
      
      {/* Large subtle orange glow behind the product mockup */}
      <motion.div 
        className="absolute w-[1000px] h-[1000px] rounded-full blur-[160px] bg-[#E85D22]/[0.07] pointer-events-none"
        style={{
          x: useTransform(smoothX, [-0.5, 0.5], [-50, 50]),
          y: useTransform(smoothY, [-0.5, 0.5], [-50, 50]),
          right: '-10%',
          top: '10%',
        }}
      />

      <div className="max-w-[1400px] mx-auto px-6 w-full grid lg:grid-cols-[1fr,1.3fr] gap-16 lg:gap-12 items-center z-10 py-16 lg:py-0">
        
        {/* Left Column - Typography */}
        <div className="flex flex-col items-start text-left max-w-xl z-20">
          <motion.div
            custom={0}
            initial="hidden"
            animate="visible"
            variants={staggerVariants}
            className="flex items-center gap-2.5 mb-6 px-3 py-1.5 rounded-full border border-[#262626] bg-[#161616]/80 backdrop-blur-md shadow-sm"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#E85D22] shadow-[0_0_8px_#E85D22]" />
            <span className="text-[11px] font-semibold uppercase tracking-widest text-[#A3A3A3]">
              Built for modern teams
            </span>
          </motion.div>

          <motion.h1
            custom={1}
            initial="hidden"
            animate="visible"
            variants={staggerVariants}
            className="font-display text-[clamp(3.5rem,5.5vw,5rem)] font-medium tracking-[-0.03em] leading-[1.05] mb-6 text-[#F3EDE4]"
          >
            Serious work deserves a <span className="text-[#E85D22]">calm</span> operating picture.
          </motion.h1>

          <motion.p
            custom={2}
            initial="hidden"
            animate="visible"
            variants={staggerVariants}
            className="text-[1.15rem] text-[#A3A3A3] leading-relaxed mb-10 max-w-[480px] font-sans"
          >
            Plan, execute, and ship with clarity. TaskFlow brings your projects, tasks, and team together in one intelligent workspace.
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
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-[8px] bg-[#E85D22] text-white text-[15px] font-semibold hover:bg-[#F0703B] shadow-[0_4px_16px_rgba(232,93,34,0.3)] hover:shadow-[0_6px_24px_rgba(232,93,34,0.4)] transition-all hover:-translate-y-[1px]"
            >
              Get started for free
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-[8px] border border-[#262626] bg-[#161616] text-[#F3EDE4] text-[15px] font-medium hover:bg-[#1A1A1A] hover:border-[#333333] shadow-sm transition-all"
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
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="w-9 h-9 rounded-full border-2 border-[#0A0A0A] bg-[#262626] flex items-center justify-center overflow-hidden">
                  <img src={`https://api.dicebear.com/7.x/notionists/svg?seed=${i}&backgroundColor=transparent`} alt="avatar" className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
            <p className="text-[13px] text-[#8A8A8A] font-medium">Trusted by teams who ship.</p>
          </motion.div>
        </div>

        {/* Right Column - Massive 3D Mockup */}
        <motion.div
          custom={5}
          initial={{ opacity: 0, scale: 0.9, rotateX: 10 }}
          animate={{ opacity: 1, scale: 1, rotateX: 0 }}
          transition={{ delay: 0.4, duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
          className="relative lg:h-[700px] flex items-center justify-start perspective-[1400px] hidden lg:flex"
        >
          <motion.div
            className="relative w-[120%] max-w-[1000px] aspect-[16/10] preserve-3d"
            style={{
              rotateX,
              rotateY,
              x: translateX,
              y: translateY,
            }}
          >
            {/* Main Application Window */}
            <div className="absolute inset-0 rounded-[14px] border border-[#262626] bg-[#0F0F0F] shadow-[0_40px_80px_rgba(0,0,0,0.8),_0_0_80px_rgba(232,93,34,0.05),_inset_0_1px_0_rgba(255,255,255,0.05)] overflow-hidden flex flex-col">
              
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
                    <div className="w-5 h-5 rounded-[4px] bg-[#E85D22] flex items-center justify-center">
                      <Zap className="w-3 h-3 text-white" />
                    </div>
                    <span className="text-sm font-semibold text-[#F3EDE4]">TaskFlow</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-48 h-7 bg-[#0A0A0A] border border-[#262626] rounded-[6px] px-3 flex items-center">
                    <span className="text-[11px] text-[#737373]">Search tasks...</span>
                  </div>
                  <div className="w-7 h-7 rounded-full bg-[#262626] overflow-hidden">
                    <img src="https://api.dicebear.com/7.x/notionists/svg?seed=Alex&backgroundColor=transparent" alt="Alex" className="w-full h-full" />
                  </div>
                </div>
              </div>
              
              {/* App Body */}
              <div className="flex-1 flex bg-[#0A0A0A]">
                {/* Sidebar */}
                <div className="w-56 border-r border-[#262626] bg-[#111111] p-5 flex flex-col gap-6">
                  <div className="space-y-1">
                    <div className="flex items-center gap-3 px-3 py-2 bg-[#262626]/50 rounded-[6px] text-[#F3EDE4]">
                      <div className="w-4 h-4 rounded-[4px] bg-[#E85D22]/20 flex items-center justify-center"><CheckCircle2 className="w-3 h-3 text-[#E85D22]"/></div>
                      <span className="text-[13px] font-medium">Home</span>
                    </div>
                    {['Projects', 'My Work', 'AI', 'Members', 'Settings'].map(item => (
                      <div key={item} className="flex items-center gap-3 px-3 py-2 text-[#8A8A8A] hover:bg-[#1A1A1A] rounded-[6px] cursor-pointer transition-colors">
                        <div className="w-4 h-4 rounded-[4px] bg-[#262626] border border-[#333333]" />
                        <span className="text-[13px] font-medium">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 p-8 overflow-hidden relative">
                  
                  {/* Decorative background glow for main content */}
                  <div className="absolute top-0 right-0 w-96 h-96 bg-[#E85D22]/[0.03] blur-[100px] rounded-full pointer-events-none" />

                  <div className="mb-8">
                    <h2 className="text-2xl font-display font-medium text-[#F3EDE4] mb-1">Good to see you, Alex</h2>
                    <p className="text-sm text-[#8A8A8A]">Here's what's happening across your workspace.</p>
                  </div>

                  {/* Metrics Row */}
                  <div className="grid grid-cols-3 gap-5 mb-6">
                    <div className="h-[104px] rounded-[10px] border border-[#262626] bg-[#161616] p-5 flex flex-col justify-between relative overflow-hidden group hover:border-[#333333] transition-colors">
                      <div className="flex justify-between items-start">
                        <div className="text-sm text-[#A3A3A3] font-medium">Active Projects</div>
                        <span className="text-[10px] text-[#22C55E] bg-[#22C55E]/10 px-1.5 py-0.5 rounded font-semibold">+2</span>
                      </div>
                      <div className="text-[2.2rem] font-display text-[#F3EDE4] leading-none">12</div>
                    </div>
                    <div className="h-[104px] rounded-[10px] border border-[#262626] bg-[#161616] p-5 flex flex-col justify-between relative overflow-hidden group hover:border-[#333333] transition-colors">
                      <div className="flex justify-between items-start">
                        <div className="text-sm text-[#A3A3A3] font-medium">Tasks in Progress</div>
                        <span className="text-[10px] text-[#A3A3A3] bg-[#262626] px-1.5 py-0.5 rounded font-semibold">-4</span>
                      </div>
                      <div className="text-[2.2rem] font-display text-[#F3EDE4] leading-none">28</div>
                    </div>
                    <div className="h-[104px] rounded-[10px] border border-[#262626] border-t-[3px] border-t-[#EF4444] bg-[#161616] p-5 flex flex-col justify-between relative overflow-hidden">
                      <div className="flex justify-between items-start">
                        <div className="text-sm text-[#A3A3A3] font-medium">Overdue</div>
                        <span className="text-[10px] text-[#EF4444] bg-[#EF4444]/10 px-1.5 py-0.5 rounded font-semibold">+1</span>
                      </div>
                      <div className="text-[2.2rem] font-display text-[#EF4444] leading-none">3</div>
                    </div>
                  </div>

                  {/* Charts Row */}
                  <div className="grid grid-cols-3 gap-5">
                    <div className="col-span-2 h-[220px] rounded-[10px] border border-[#262626] bg-[#161616] p-5 flex flex-col">
                      <div className="text-sm text-[#F3EDE4] font-medium mb-6">Project Health</div>
                      <div className="flex-1 flex items-end justify-between px-2 gap-2">
                        {[40, 60, 30, 80, 50, 90, 70, 85].map((h, i) => (
                          <div key={i} className="w-full bg-[#262626] rounded-t-[4px] relative group">
                            <div 
                              className="absolute bottom-0 w-full rounded-t-[4px] bg-gradient-to-t from-[#E85D22]/80 to-[#E85D22] opacity-80 group-hover:opacity-100 transition-opacity" 
                              style={{ height: `${h}%` }}
                            />
                          </div>
                        ))}
                      </div>
                      <div className="flex justify-between px-2 mt-3 text-[10px] text-[#737373] uppercase font-semibold">
                        <span>Jan</span><span>Feb</span><span>Mar</span><span>Apr</span><span>May</span><span>Jun</span>
                      </div>
                    </div>
                    <div className="col-span-1 h-[220px] rounded-[10px] border border-[#262626] bg-[#161616] p-5 flex flex-col items-center justify-center relative">
                      <div className="absolute top-5 left-5 text-sm text-[#F3EDE4] font-medium">Team Activity</div>
                      <div className="relative w-32 h-32 mt-4">
                        <svg className="w-full h-full transform -rotate-90">
                          <circle cx="64" cy="64" r="56" fill="none" stroke="#262626" strokeWidth="12" />
                          <circle cx="64" cy="64" r="56" fill="none" stroke="#22C55E" strokeWidth="12" strokeDasharray="351" strokeDashoffset="84" strokeLinecap="round" />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className="text-2xl font-display text-[#F3EDE4]">76%</span>
                          <span className="text-[10px] text-[#22C55E] font-semibold tracking-wide uppercase">On track</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                </div>
              </div>
            </div>

            {/* Floating Card 1: AI Insight */}
            <motion.div
              style={{ x: floatX, y: floatY, translateZ: 80 }}
              className="absolute -right-12 top-6 w-72 rounded-[10px] border border-[#333333] bg-[#1A1A1A]/95 backdrop-blur-xl shadow-[0_24px_48px_rgba(0,0,0,0.8),_0_0_0_1px_rgba(255,255,255,0.05),_inset_0_1px_0_rgba(255,255,255,0.1)] p-5 z-20"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-[6px] bg-[#E85D22]/10 border border-[#E85D22]/20 flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4 text-[#E85D22]" />
                </div>
                <div>
                  <span className="text-[12px] font-semibold tracking-wide uppercase text-[#F3EDE4]">AI Insight</span>
                </div>
              </div>
              <p className="text-[15px] font-medium text-[#F3EDE4] leading-snug mb-1">2 tasks are at risk</p>
              <p className="text-[13px] text-[#8A8A8A] mb-3">These tasks may delay your project by 2-4 days.</p>
              <button className="text-[13px] text-[#E85D22] font-semibold hover:text-[#F0703B] transition-colors flex items-center gap-1">
                Review now <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </motion.div>

            {/* Handwritten annotation element */}
            <motion.div
              style={{ x: useTransform(smoothX, [-0.5, 0.5], [-20, 20]), y: useTransform(smoothY, [-0.5, 0.5], [-20, 20]), translateZ: 100 }}
              className="absolute -right-24 bottom-24 z-30 pointer-events-none opacity-80"
            >
              <p className="font-['Caveat',_cursive] text-[28px] text-[#E85D22] -rotate-6">From tasks to outcomes.</p>
              <svg className="w-16 h-16 ml-8 mt-2 opacity-60" viewBox="0 0 100 100" fill="none" stroke="#E85D22" strokeWidth="2" strokeLinecap="round">
                <path d="M10,90 Q40,50 90,10" />
                <path d="M75,10 L90,10 L85,25" />
              </svg>
            </motion.div>
          </motion.div>
        </motion.div>

      </div>
    </section>
  );
};
