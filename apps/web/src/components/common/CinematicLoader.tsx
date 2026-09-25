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
    // STRICT 3 second cinematic sequence requirement
    const timer = setTimeout(() => {
      setPhase('waiting');
    }, 3000);
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
      key="premium-cinematic-loader"
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#070707] overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: prefersReducedMotion ? 1 : 0.98 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
    >
      <div 
        className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff02_1px,transparent_1px),linear-gradient(to_bottom,#ffffff02_1px,transparent_1px)]"
        style={{ backgroundSize: '64px 64px' }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#070707_70%)] pointer-events-none" />

      {/* Laser line opening sequence (0s - 0.8s) */}
      {!prefersReducedMotion && (
        <motion.div
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: [0, 400, 600, 0], opacity: [0, 1, 1, 0] }}
          transition={{ times: [0, 0.3, 0.6, 1], duration: 1.2, ease: 'easeInOut' }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[1px] bg-[#E85D22] shadow-[0_0_12px_#E85D22] z-0"
        />
      )}

      <div className="relative z-10 flex flex-col items-center">
        {/* Animated Logo Container (0.8s ->) */}
        <motion.div
          initial={{ opacity: 0, scale: prefersReducedMotion ? 1 : 0.8, y: prefersReducedMotion ? 0 : 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.8, type: 'spring', stiffness: 200, damping: 20 }}
          className="relative w-16 h-16 bg-[#111111]/80 backdrop-blur-xl border border-[#262626] rounded-2xl flex items-center justify-center mb-6 shadow-2xl overflow-visible"
        >
          {/* Subtle breathing inner glow */}
          {!prefersReducedMotion && (
            <motion.div
              animate={{ opacity: [0.05, 0.2, 0.05] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute inset-0 rounded-2xl shadow-[inset_0_0_12px_rgba(232,93,34,0.3)] pointer-events-none"
            />
          )}
          
          {/* Dual circular data rings spinning around the box (1.5s ->) */}
          {!prefersReducedMotion && (
            <>
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1, rotate: 360 }}
                transition={{ opacity: { duration: 0.5, delay: 1.2 }, scale: { duration: 0.5, delay: 1.2 }, rotate: { duration: 8, repeat: Infinity, ease: 'linear' } }}
                className="absolute inset-[-14px] border border-dashed border-[#E85D22]/20 rounded-full"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1, rotate: -360 }}
                transition={{ opacity: { duration: 0.5, delay: 1.4 }, scale: { duration: 0.5, delay: 1.4 }, rotate: { duration: 5, repeat: Infinity, ease: 'linear' } }}
                className="absolute inset-[-6px] border border-dotted border-[#E85D22]/40 rounded-full"
              />
            </>
          )}

          <Workflow className="w-8 h-8 text-[#E85D22] relative z-10 drop-shadow-[0_0_12px_rgba(232,93,34,0.5)]" />
        </motion.div>

        {/* Wordmark (1.0s ->) */}
        <motion.div
          initial={{ opacity: 0, filter: 'blur(8px)', y: 4 }}
          animate={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
          transition={{ duration: 0.6, delay: 1.0, ease: 'easeOut' }}
          className="flex flex-col items-center gap-4"
        >
          {/* Shimmer text effect */}
          <div className="relative font-display text-2xl font-medium tracking-tight">
            <motion.span 
              animate={!prefersReducedMotion ? { 
                backgroundPosition: ['200% center', '-200% center']
              } : {}}
              transition={{ 
                duration: 3,
                repeat: Infinity,
                ease: "linear"
              }}
              className={`text-transparent bg-clip-text ${
                prefersReducedMotion 
                  ? 'bg-[#F5F5F5]' 
                  : 'bg-[linear-gradient(90deg,#F5F5F5_0%,#666_50%,#F5F5F5_100%)] bg-[length:200%_auto]'
              }`}
            >
              TaskFlow
            </motion.span>
          </div>
          
          {/* Status Capsule (1.4s ->) */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 1.4, ease: 'easeOut' }}
            className="flex items-center gap-2 px-3 py-1.5 bg-[#161616] border border-[#262626] rounded-full shadow-lg"
          >
            <motion.div
              animate={phase === 'waiting' && !isLoading ? { opacity: 1, scale: 1 } : { scale: [1, 1.5, 1], opacity: [0.4, 1, 0.4] }}
              transition={phase === 'waiting' && !isLoading ? { duration: 0.3 } : { duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
              className={`w-1.5 h-1.5 rounded-full ${phase === 'waiting' && !isLoading ? 'bg-green-500 shadow-[0_0_6px_#22c55e]' : 'bg-[#E85D22]'}`}
            />
            <span className={`text-[10px] font-semibold tracking-[0.1em] uppercase w-[120px] text-center transition-colors duration-300 ${phase === 'waiting' && !isLoading ? 'text-green-500' : 'text-[#8A8A8A]'}`}>
              {phase === 'waiting' && !isLoading ? 'WORKSPACE READY' : 'RESTORING SESSION'}
            </span>
          </motion.div>
        </motion.div>
      </div>
    </motion.div>
  );
};
