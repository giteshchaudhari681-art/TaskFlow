import React, { useState, useEffect } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Workflow } from 'lucide-react';

interface CinematicLoaderProps {
  isLoading: boolean;
  onComplete: () => void;
}

export const CinematicLoader: React.FC<CinematicLoaderProps> = ({ isLoading, onComplete }) => {
  const [phase, setPhase] = useState<'initial' | 'waiting' | 'exiting'>('initial');
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    // STRICT 2 second cinematic sequence requirement
    const timer = setTimeout(() => {
      setPhase('waiting');
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (phase === 'waiting' && !isLoading) {
      setPhase('exiting');
      onComplete();
    }
  }, [phase, isLoading, onComplete]);

  // Framer motion variants for text stagger
  const textContainer = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.05, delayChildren: 0.6 }
    }
  };

  const textItem = {
    hidden: { opacity: 0, y: 10, filter: 'blur(4px)' },
    show: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { type: 'spring' as const, stiffness: 200, damping: 20 } }
  };

  return (
    <motion.div
      key="hyper-premium-cinematic-loader"
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#050505] overflow-hidden perspective-[1200px]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: prefersReducedMotion ? 1 : 1.15, filter: 'blur(10px)' }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* Dynamic Background */}
      <div 
        className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff02_1px,transparent_1px),linear-gradient(to_bottom,#ffffff02_1px,transparent_1px)]"
        style={{ backgroundSize: '48px 48px' }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#050505_80%)] pointer-events-none" />

      {/* Sweeping background light (0s - 1.5s) */}
      {!prefersReducedMotion && (
        <motion.div
          initial={{ x: '-100%', opacity: 0, skewX: -45 }}
          animate={{ x: '200%', opacity: [0, 0.03, 0] }}
          transition={{ duration: 1.5, ease: 'easeInOut' }}
          className="absolute top-0 bottom-0 w-1/2 bg-gradient-to-r from-transparent via-[#FF6A21] to-transparent pointer-events-none"
        />
      )}

      {/* Laser Split Opening (0s - 0.5s) */}
      {!prefersReducedMotion && (
        <motion.div
          initial={{ width: 0, opacity: 0, scaleY: 1 }}
          animate={{ width: [0, 300, 500, 0], opacity: [0, 1, 1, 0], scaleY: [1, 2, 0] }}
          transition={{ times: [0, 0.2, 0.6, 1], duration: 0.8, ease: 'easeInOut' }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[1px] bg-white shadow-[0_0_20px_#E85D22,0_0_8px_#E85D22] z-0"
        />
      )}

      <div className="relative z-10 flex flex-col items-center">
        {/* Animated Logo Container (0.4s ->) */}
        <motion.div
          initial={{ opacity: 0, scale: prefersReducedMotion ? 1 : 0.5, rotateX: 45 }}
          animate={{ opacity: 1, scale: 1, rotateX: 0 }}
          transition={{ duration: 0.7, delay: 0.3, type: 'spring', stiffness: 150, damping: 15 }}
          className="relative w-20 h-20 bg-gradient-to-b from-[#1c1c1c] to-[#0a0a0a] border border-[#333] rounded-2xl flex items-center justify-center mb-8 shadow-[0_20px_40px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.1)] overflow-visible"
        >
          {/* Subtle breathing inner glow */}
          {!prefersReducedMotion && (
            <motion.div
              animate={{ opacity: [0.1, 0.3, 0.1] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute inset-0 rounded-2xl shadow-[inset_0_0_20px_rgba(232,93,34,0.3)] pointer-events-none"
            />
          )}
          
          {/* Tri-layered high-speed data rings (0.6s ->) */}
          {!prefersReducedMotion && (
            <svg className="absolute inset-[-24px] w-[calc(100%+48px)] h-[calc(100%+48px)] pointer-events-none overflow-visible">
              <defs>
                <linearGradient id="ring-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#E85D22" stopOpacity="1" />
                  <stop offset="50%" stopColor="#E85D22" stopOpacity="0" />
                  <stop offset="100%" stopColor="#E85D22" stopOpacity="0" />
                </linearGradient>
              </defs>
              
              {/* Outer fast ring */}
              <motion.circle
                cx="50%" cy="50%" r="48"
                fill="none" stroke="url(#ring-gradient)" strokeWidth="1" strokeLinecap="round" strokeDasharray="60 200"
                initial={{ opacity: 0, rotate: -90, scale: 0.8 }}
                animate={{ opacity: 1, rotate: 270, scale: 1 }}
                transition={{ opacity: { delay: 0.6, duration: 0.4 }, scale: { delay: 0.6, duration: 0.5, type: 'spring' }, rotate: { duration: 1.5, repeat: Infinity, ease: 'linear' } }}
                style={{ originX: '50%', originY: '50%' }}
              />

              {/* Middle dashed ring */}
              <motion.circle
                cx="50%" cy="50%" r="42"
                fill="none" stroke="#E85D22" strokeWidth="1.5" strokeOpacity="0.2" strokeDasharray="4 8"
                initial={{ opacity: 0, rotate: 0, scale: 0.8 }}
                animate={{ opacity: 1, rotate: -360, scale: 1 }}
                transition={{ opacity: { delay: 0.7, duration: 0.4 }, scale: { delay: 0.7, duration: 0.5, type: 'spring' }, rotate: { duration: 4, repeat: Infinity, ease: 'linear' } }}
                style={{ originX: '50%', originY: '50%' }}
              />
            </svg>
          )}

          <Workflow className="w-10 h-10 text-white relative z-10 drop-shadow-[0_0_15px_rgba(255,255,255,0.6)]" />
        </motion.div>

        {/* Wordmark (Staggered text) */}
        <motion.div
          variants={textContainer}
          initial="hidden"
          animate="show"
          className="flex flex-col items-center gap-5"
        >
          {/* Individual letters */}
          <div className="flex font-display text-3xl font-semibold tracking-tight">
            {['T', 'a', 's', 'k', 'F', 'l', 'o', 'w'].map((letter, index) => (
              <motion.span 
                key={index} 
                variants={textItem}
                className="text-transparent bg-clip-text bg-[linear-gradient(180deg,#FFFFFF_0%,#A0A0A0_100%)] drop-shadow-sm"
              >
                {letter}
              </motion.span>
            ))}
          </div>
          
          {/* Status Capsule (1.0s ->) */}
          <motion.div 
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.5, delay: 1.0, type: 'spring' }}
            className="flex items-center gap-2.5 px-4 py-2 bg-[#111] border border-[#222] rounded-full shadow-[0_8px_16px_rgba(0,0,0,0.6)]"
          >
            {/* Status light */}
            <div className="relative flex items-center justify-center w-2 h-2">
              <motion.div
                animate={phase === 'waiting' && !isLoading ? { scale: 1, opacity: 1 } : { scale: [1, 1.8, 1], opacity: [0.5, 1, 0.5] }}
                transition={phase === 'waiting' && !isLoading ? { duration: 0.2 } : { duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
                className={`absolute inset-0 rounded-full blur-[2px] ${phase === 'waiting' && !isLoading ? 'bg-[#22c55e]' : 'bg-[#E85D22]'}`}
              />
              <div className={`w-1.5 h-1.5 rounded-full z-10 ${phase === 'waiting' && !isLoading ? 'bg-[#22c55e]' : 'bg-[#E85D22]'}`} />
            </div>

            <span className={`text-[11px] font-bold tracking-[0.15em] uppercase w-[130px] text-center transition-colors duration-300 ${phase === 'waiting' && !isLoading ? 'text-[#22c55e] drop-shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'text-[#A0A0A0]'}`}>
              {phase === 'waiting' && !isLoading ? 'SYSTEM ONLINE' : 'INITIALIZING'}
            </span>
          </motion.div>
        </motion.div>
      </div>
    </motion.div>
  );
};
