import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Workflow } from 'lucide-react';

export const CinematicLoader: React.FC = () => {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      key="minimal-loader"
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#080808]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: prefersReducedMotion ? 1 : 0.98 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
    >
      <div className="flex flex-col items-center">
        {/* Animated Logo Container */}
        <motion.div
          initial={{ opacity: 0, scale: prefersReducedMotion ? 1 : 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="relative w-12 h-12 bg-[#111111] border border-[#262626] rounded-xl flex items-center justify-center mb-4"
        >
          {/* Subtle one-time orange edge sweep/glow */}
          {!prefersReducedMotion && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: [0, 1, 0], scale: [0.8, 1.1, 1.1] }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className="absolute inset-0 rounded-xl shadow-[0_0_15px_rgba(232,93,34,0.3)] pointer-events-none"
            />
          )}
          <Workflow className="w-6 h-6 text-[#E85D22] relative z-10" />
        </motion.div>

        {/* Wordmark and Status */}
        <motion.div
          initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1, ease: 'easeOut' }}
          className="flex flex-col items-center"
        >
          <span className="font-display text-lg font-medium text-[#F5F5F5] mb-2 tracking-tight">
            TaskFlow
          </span>
          <div className="flex items-center gap-2 text-[#8A8A8A] text-[11px] font-medium tracking-wide uppercase">
            <span>Restoring session</span>
            <motion.div
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
              className="flex gap-1"
            >
              <span className="w-1 h-1 rounded-full bg-[#8A8A8A]" />
              <span className="w-1 h-1 rounded-full bg-[#8A8A8A]" />
              <span className="w-1 h-1 rounded-full bg-[#8A8A8A]" />
            </motion.div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};
