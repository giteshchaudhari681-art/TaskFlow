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

  return (
    <motion.div
      key="deep-cinematic-loader"
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#030303] overflow-hidden"
      style={{ perspective: '1200px' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: prefersReducedMotion ? 1 : 1.2, filter: 'blur(12px)' }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* Premium Cinematic Background Gradients */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        {/* Base dark layer */}
        <div className="absolute inset-0 bg-[#030303]" />

        {/* Massive, subtle ambient glows */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 0.15, scale: 1 }}
          transition={{ duration: 1.5, ease: 'easeOut' }}
          className="absolute -top-1/2 -left-1/2 w-[200%] h-[200%] bg-[radial-gradient(ellipse_at_center,rgba(232,93,34,0.15)_0%,transparent_50%)]"
        />
        <motion.div
          initial={{ opacity: 0, rotate: 0 }}
          animate={{ opacity: 0.1, rotate: 15 }}
          transition={{ duration: 2, ease: 'easeOut' }}
          className="absolute -top-full right-[-50%] w-[150%] h-[150%] bg-[radial-gradient(circle_at_center,rgba(255,106,33,0.1)_0%,transparent_60%)]"
        />

        {/* Edge darkening vignette */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_20%,#000000_100%)]" />
      </div>

      {/* Main Assembly Group flying from the deep background */}
      <motion.div
        initial={{ opacity: 0, scale: 0.1, z: -1000, filter: 'blur(10px)' }}
        animate={{ opacity: 1, scale: 1, z: 0, filter: 'blur(0px)' }}
        transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }} // smooth deceleration
        className="relative z-10 flex flex-col items-center gap-6"
        style={{ transformStyle: 'preserve-3d' }}
      >
        {/* Animated Logo Container */}
        <div className="relative w-24 h-24 bg-gradient-to-b from-[#1c1c1c] to-[#0a0a0a] border border-[#333] rounded-3xl flex items-center justify-center shadow-[0_30px_60px_rgba(0,0,0,0.9),inset_0_2px_1px_rgba(255,255,255,0.15)] overflow-visible z-20">
          {/* Intense breathing inner glow */}
          {!prefersReducedMotion && (
            <motion.div
              animate={{ opacity: [0.1, 0.4, 0.1] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute inset-0 rounded-3xl shadow-[inset_0_0_30px_rgba(232,93,34,0.4)] pointer-events-none"
            />
          )}

          {/* Complex Multi-layered High-Speed Data Rings */}
          {!prefersReducedMotion && (
            <svg className="absolute inset-[-40px] w-[calc(100%+80px)] h-[calc(100%+80px)] pointer-events-none overflow-visible z-0">
              <defs>
                <linearGradient id="glow-ring" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#E85D22" stopOpacity="1" />
                  <stop offset="50%" stopColor="#E85D22" stopOpacity="0.1" />
                  <stop offset="100%" stopColor="#E85D22" stopOpacity="0.1" />
                </linearGradient>
              </defs>

              {/* Outer thick dashed ring */}
              <motion.circle
                cx="50%"
                cy="50%"
                r="70"
                fill="none"
                stroke="url(#glow-ring)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeDasharray="80 180"
                initial={{ opacity: 0, rotate: -180, scale: 0.5 }}
                animate={{ opacity: 1, rotate: 360, scale: 1 }}
                transition={{
                  opacity: { delay: 0.5, duration: 0.5 },
                  scale: { delay: 0.5, duration: 0.6, type: 'spring' },
                  rotate: { duration: 2, repeat: Infinity, ease: 'linear' },
                }}
                style={{ originX: '50%', originY: '50%' }}
              />

              {/* Middle dotted ring */}
              <motion.circle
                cx="50%"
                cy="50%"
                r="60"
                fill="none"
                stroke="#E85D22"
                strokeWidth="2"
                strokeOpacity="0.3"
                strokeDasharray="2 12"
                initial={{ opacity: 0, rotate: 0, scale: 0.5 }}
                animate={{ opacity: 1, rotate: -360, scale: 1 }}
                transition={{
                  opacity: { delay: 0.6, duration: 0.5 },
                  scale: { delay: 0.6, duration: 0.6, type: 'spring' },
                  rotate: { duration: 4, repeat: Infinity, ease: 'linear' },
                }}
                style={{ originX: '50%', originY: '50%' }}
              />

              {/* Inner solid tracking ring */}
              <motion.circle
                cx="50%"
                cy="50%"
                r="52"
                fill="none"
                stroke="#E85D22"
                strokeWidth="1"
                strokeOpacity="0.5"
                strokeDasharray="100 200"
                initial={{ opacity: 0, rotate: 90, scale: 0.5 }}
                animate={{ opacity: 1, rotate: -270, scale: 1 }}
                transition={{
                  opacity: { delay: 0.7, duration: 0.5 },
                  scale: { delay: 0.7, duration: 0.6, type: 'spring' },
                  rotate: { duration: 1.5, repeat: Infinity, ease: 'linear' },
                }}
                style={{ originX: '50%', originY: '50%' }}
              />
            </svg>
          )}

          <Workflow className="w-12 h-12 text-white relative z-10 drop-shadow-[0_0_20px_rgba(255,255,255,0.8)]" />
        </div>

        {/* Wordmark and Status aligned beautifully */}
        <div className="flex flex-col items-center gap-6 z-20">
          {/* Fully Animated Shimmer Wordmark */}
          <div className="relative font-display text-5xl font-black tracking-tight drop-shadow-[0_8px_16px_rgba(0,0,0,0.9)]">
            <motion.span
              animate={
                !prefersReducedMotion
                  ? {
                      backgroundPosition: ['200% center', '-200% center'],
                    }
                  : {}
              }
              transition={{
                duration: 2.5,
                repeat: Infinity,
                ease: 'linear',
              }}
              className={`text-transparent bg-clip-text ${
                prefersReducedMotion
                  ? 'bg-[#F5F5F5]'
                  : 'bg-[linear-gradient(90deg,#FFFFFF_0%,#777777_50%,#FFFFFF_100%)] bg-[length:200%_auto]'
              }`}
            >
              TaskFlow
            </motion.span>
          </div>

          {/* Status Capsule (Drops in after fly-in) */}
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.8, type: 'spring', stiffness: 200, damping: 20 }}
            className="flex items-center gap-3 px-5 py-2.5 bg-[#0a0a0a]/80 backdrop-blur-md border border-[#222] rounded-full shadow-[0_12px_24px_rgba(0,0,0,0.8)] overflow-hidden"
          >
            {/* Status light */}
            <div className="relative flex items-center justify-center w-2.5 h-2.5">
              <motion.div
                animate={
                  phase === 'waiting' && !isLoading
                    ? { scale: 1, opacity: 1 }
                    : { scale: [1, 2, 1], opacity: [0.3, 1, 0.3] }
                }
                transition={
                  phase === 'waiting' && !isLoading
                    ? { duration: 0.2 }
                    : { duration: 1.0, repeat: Infinity, ease: 'easeInOut' }
                }
                className={`absolute inset-0 rounded-full blur-[3px] ${phase === 'waiting' && !isLoading ? 'bg-[#22c55e]' : 'bg-[#E85D22]'}`}
              />
              <div
                className={`w-2 h-2 rounded-full z-10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)] ${phase === 'waiting' && !isLoading ? 'bg-[#22c55e]' : 'bg-[#E85D22]'}`}
              />
            </div>

            <span
              className={`text-[12px] font-black tracking-[0.2em] uppercase w-[150px] text-center transition-colors duration-300 ${phase === 'waiting' && !isLoading ? 'text-[#22c55e] drop-shadow-[0_0_8px_rgba(34,197,94,0.4)]' : 'text-[#A0A0A0]'}`}
            >
              {phase === 'waiting' && !isLoading ? 'SYSTEM ONLINE' : 'INITIALIZING'}
            </span>
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  );
};
