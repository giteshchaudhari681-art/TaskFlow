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
    // Minimum 2 seconds animation duration
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
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0a0a0a] overflow-hidden"
      exit={{ opacity: 0, scale: 1.02, filter: 'blur(4px)' }}
      transition={{ duration: 0.5, ease: 'easeInOut' }}
    >
      {/* Subtle Background Grid */}
      <div 
        className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)]"
        style={{ backgroundSize: '40px 40px' }}
      />

      {/* Radial glow */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.5, ease: "easeOut" }}
        className="absolute w-[600px] h-[600px] bg-[#E85D22] rounded-full blur-[120px] opacity-[0.03] pointer-events-none"
      />

      {/* Center Compo */}
      <div className="relative z-10 flex flex-col items-center justify-center perspective-[1000px]">
        
        {/* The 3D container */}
        <motion.div
          animate={prefersReducedMotion ? {} : { 
            rotateX: [0, 2, -2, 0], 
            rotateY: [0, -2, 2, 0] 
          }}
          transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
          className="relative flex flex-col items-center justify-center"
        >
          {/* Central Dot -> Ring */}
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: [0, 1, 3], opacity: [0, 1, 0] }}
            transition={{ duration: 0.8, ease: "easeOut", times: [0, 0.4, 1] }}
            className="absolute w-2 h-2 bg-[#E85D22] rounded-full shadow-[0_0_12px_#E85D22]"
          />
          
          <motion.div
            initial={{ scale: 0.5, opacity: 0, borderWidth: '2px' }}
            animate={{ scale: 2.5, opacity: [0, 0.5, 0], borderWidth: '0px' }}
            transition={{ delay: 0.25, duration: 0.8, ease: "easeOut" }}
            className="absolute w-12 h-12 border-[#E85D22] rounded-full"
          />

          {/* Logo Reveal */}
          <div className="relative flex items-center justify-center mb-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.7, rotate: -10 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              transition={{ delay: 0.45, duration: 0.6, type: "spring", stiffness: 200, damping: 20 }}
              className="relative w-14 h-14 bg-[#141414] border border-[#2A2A2A] rounded-2xl flex items-center justify-center shadow-[0_0_40px_rgba(232,93,34,0.15)] z-10"
            >
              <Workflow className="w-7 h-7 text-[#E85D22]" />
            </motion.div>

            {/* Light Sweep */}
            <motion.div
              initial={{ x: '-150%', opacity: 0 }}
              animate={{ x: '150%', opacity: [0, 1, 0] }}
              transition={{ delay: 1.2, duration: 0.8, ease: "easeInOut" }}
              className="absolute w-24 h-[1px] bg-gradient-to-r from-transparent via-[#E85D22] to-transparent blur-[1px] z-20"
            />
          </div>

          {/* Wordmark */}
          <motion.div
            initial={{ opacity: 0, y: 8, filter: 'blur(4px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{ delay: 0.8, duration: 0.5 }}
          >
            <span className="font-display text-3xl font-medium text-[#F3EDE4] tracking-tight">
              TaskFlow
            </span>
          </motion.div>

          {/* Status Text */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2, duration: 0.5 }}
            className="mt-4 flex flex-col items-center gap-2"
          >
            <span className="text-[11px] uppercase tracking-[0.2em] font-semibold text-[#E85D22]">
              Initializing your workspace
            </span>
            {phase === 'waiting' && isLoading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="w-32 h-[2px] bg-[#2A2A2A] rounded-full overflow-hidden mt-1"
              >
                <motion.div 
                  className="h-full bg-[#E85D22]"
                  animate={{ x: ['-100%', '100%'] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                />
              </motion.div>
            )}
          </motion.div>
          
          {/* Micro Particles flowing in */}
          {!prefersReducedMotion && (
            <div className="absolute inset-0 pointer-events-none">
              {[...Array(6)].map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ 
                    opacity: 0, 
                    x: Math.cos(i * (Math.PI / 3)) * 80, 
                    y: Math.sin(i * (Math.PI / 3)) * 80,
                    scale: 0
                  }}
                  animate={{ 
                    opacity: [0, 0.8, 0], 
                    x: 0, 
                    y: 0,
                    scale: [0, 1, 0.5]
                  }}
                  transition={{ delay: 1.0 + (i * 0.05), duration: 0.6, ease: "easeIn" }}
                  className="absolute left-1/2 top-1/2 w-1 h-1 bg-[#E85D22] rounded-full -ml-[2px] -mt-[2px] shadow-[0_0_4px_#E85D22]"
                />
              ))}
            </div>
          )}

          {/* Conceptual Operational Elements */}
          {!prefersReducedMotion && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              {['PROJECTS', 'TASKS', 'AI', 'TEAM'].map((label, i) => {
                const angle = i * (Math.PI / 2);
                const distance = 100;
                return (
                  <motion.div
                    key={label}
                    initial={{ 
                      opacity: 0, 
                      x: Math.cos(angle) * (distance + 20), 
                      y: Math.sin(angle) * (distance + 20),
                    }}
                    animate={{ 
                      opacity: [0, 1, 0], 
                      x: Math.cos(angle) * distance, 
                      y: Math.sin(angle) * distance,
                    }}
                    transition={{ delay: 1.45 + (i * 0.05), duration: 0.8, ease: "easeOut" }}
                    className="absolute text-[8px] font-mono tracking-widest text-[#737373]"
                  >
                    {label}
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
};
