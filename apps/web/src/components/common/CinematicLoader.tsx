import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Workflow } from 'lucide-react';

export const CinematicLoader: React.FC = () => {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      key="premium-minimal-loader"
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#070707]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: prefersReducedMotion ? 1 : 0.98 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
    >
      {/* Ultra-subtle background depth to prevent it from feeling empty */}
      <div 
        className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)]"
        style={{ backgroundSize: '64px 64px' }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#070707_75%)] pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center">
        {/* Animated Logo Container */}
        <motion.div
          initial={{ opacity: 0, scale: prefersReducedMotion ? 1 : 0.9, y: prefersReducedMotion ? 0 : 4 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
          className="relative w-14 h-14 bg-[#111111] border border-[#262626] rounded-xl flex items-center justify-center mb-5 shadow-2xl"
        >
          {/* Subtle breathing inner glow */}
          {!prefersReducedMotion && (
            <motion.div
              animate={{ opacity: [0.05, 0.2, 0.05] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute inset-0 rounded-xl shadow-[inset_0_0_12px_rgba(232,93,34,0.3)] pointer-events-none"
            />
          )}
          
          {/* Circular progress ring tracing the border */}
          {!prefersReducedMotion && (
            <svg className="absolute inset-0 w-full h-full -rotate-90 text-[#E85D22]/10" viewBox="0 0 56 56">
              <circle cx="28" cy="28" r="26" fill="none" stroke="currentColor" strokeWidth="1" />
              <motion.circle
                cx="28" cy="28" r="26"
                fill="none"
                stroke="#E85D22"
                strokeWidth="1.5"
                strokeLinecap="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: [0, 1, 0], rotate: [0, 180, 360] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                style={{ originX: '50%', originY: '50%' }}
              />
            </svg>
          )}

          <Workflow className="w-6 h-6 text-[#E85D22] relative z-10 drop-shadow-[0_0_8px_rgba(232,93,34,0.4)]" />
        </motion.div>

        {/* Wordmark and Status */}
        <motion.div
          initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1, ease: [0.23, 1, 0.32, 1] }}
          className="flex flex-col items-center gap-3"
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
          
          {/* Status Capsule */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-[#161616] border border-[#262626] rounded-full shadow-lg">
            <motion.div
              animate={{ scale: [1, 1.5, 1], opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
              className="w-1.5 h-1.5 rounded-full bg-[#E85D22]"
            />
            <span className="text-[#8A8A8A] text-[10px] font-semibold tracking-[0.1em] uppercase">
              Restoring session
            </span>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};
