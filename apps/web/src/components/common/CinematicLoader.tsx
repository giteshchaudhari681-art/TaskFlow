import React, { useState, useEffect } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Workflow } from 'lucide-react';

interface CinematicLoaderProps {
  isLoading: boolean;
  onComplete: () => void;
}

const systemElements = [
  { id: 'projects', title: 'PROJECTS', label: '12 Active', x: -180, y: -100, color: 'bg-[#FF6A21]' },
  { id: 'tasks', title: 'TASKS', label: '28 In Progress', x: -220, y: 0, color: 'bg-[#3b82f6]' },
  { id: 'team', title: 'TEAM', label: '8 Members', x: -180, y: 100, color: 'bg-[#10b981]' },
  { id: 'ai', title: 'AI', label: '3 Risks', x: 180, y: -100, color: 'bg-[#a855f7]' },
  { id: 'delivery', title: 'DELIVERY', label: '76% Healthy', x: 220, y: 0, color: 'bg-[#0ea5e9]' },
  { id: 'dependencies', title: 'DEPENDENCIES', label: '4 Blocked', x: 180, y: 100, color: 'bg-[#f59e0b]' },
];

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
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[#070707] overflow-hidden"
      exit={{ opacity: 0, scale: 1.01, filter: 'blur(2px)' }}
      transition={{ duration: 0.35, ease: 'easeInOut' }}
    >
      {/* Subtle Background Grid & Vignette */}
      <div 
        className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)]"
        style={{ backgroundSize: '40px 40px' }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_20%,#070707_90%)]" />

      {/* NO GIANT ORANGE GLOW. Only a very faint, restricted ambient highlight */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-[#FF6A21] opacity-[0.04] blur-[80px] rounded-full pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center justify-center perspective-[1200px] w-full h-full max-w-[800px] max-h-[800px]">
        
        {/* System Signal (0.0s - 0.2s) */}
        {!prefersReducedMotion && (
          <motion.div
            initial={{ width: 2, opacity: 0 }}
            animate={{ width: [2, 2, 40, 0], opacity: [0, 1, 1, 0] }}
            transition={{ times: [0, 0.2, 0.8, 1], duration: 0.3, delay: 0, ease: 'linear' }}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[2px] bg-[#FF6A21] shadow-[0_0_8px_#FF6A21]"
          />
        )}

        {/* SVG Connecting Lines (0.2s - 1.6s) */}
        {!prefersReducedMotion && (
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] pointer-events-none">
            <svg width="800" height="800" viewBox="-400 -400 800 800" className="w-full h-full overflow-visible">
              {systemElements.map((el, i) => (
                <motion.line
                  key={`line-${el.id}`}
                  x1={0}
                  y1={0}
                  x2={el.x}
                  y2={el.y}
                  stroke="#262626"
                  strokeWidth="1"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ 
                    pathLength: [0, 1, 1, 0],
                    opacity: [0, 1, 1, 0]
                  }}
                  transition={{ 
                    times: [0, 0.35, 0.57, 1], 
                    duration: 1.4, 
                    delay: 0.2 + (i * 0.05),
                    ease: 'easeInOut' 
                  }}
                />
              ))}
            </svg>
          </div>
        )}

        {/* Interface Fragments (0.2s - 1.6s) */}
        {!prefersReducedMotion && systemElements.map((el, i) => (
          <motion.div
            key={`card-${el.id}`}
            initial={{ opacity: 0, x: el.x + (el.x > 0 ? 30 : -30), y: el.y, scale: 0.95 }}
            animate={{ 
              opacity: [0, 1, 1, 0], 
              x: [el.x + (el.x > 0 ? 30 : -30), el.x, el.x, 0],
              y: [el.y, el.y, el.y, 0],
              scale: [0.95, 1, 1, 0.8]
            }}
            transition={{ 
              times: [0, 0.35, 0.57, 1], 
              duration: 1.4, 
              delay: 0.2 + (i * 0.05),
              ease: 'easeInOut' 
            }}
            style={{
              rotateX: el.y > 0 ? -4 : 4,
              rotateY: el.x > 0 ? -4 : 4,
            }}
            className="absolute left-1/2 top-1/2 -ml-[60px] -mt-[24px] w-[120px] h-[48px] bg-[#111111] border border-[#262626] rounded-md shadow-xl flex flex-col justify-center px-3"
          >
            <div className="flex items-center gap-1.5 mb-0.5">
              <div className={`w-1.5 h-1.5 rounded-full ${el.color} shadow-[0_0_6px_currentColor]`} />
              <span className="text-[9px] font-semibold tracking-widest text-[#F5F5F5]">{el.title}</span>
            </div>
            <span className="text-[10px] text-[#8A8A8A] ml-3">{el.label}</span>
          </motion.div>
        ))}

        {/* Central TaskFlow Core (0.6s ->) */}
        <div className="relative flex flex-col items-center justify-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.5, type: 'spring', stiffness: 200, damping: 20 }}
            className="relative w-16 h-16 bg-[#111111] border border-[#262626] rounded-2xl shadow-2xl flex items-center justify-center z-20 overflow-hidden"
          >
            {/* Subtle inner edge glow */}
            <div className="absolute inset-0 shadow-[inset_0_0_12px_rgba(255,106,33,0.1)] rounded-2xl pointer-events-none" />
            <Workflow className="w-8 h-8 text-[#FF6A21]" />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, filter: 'blur(4px)', y: 6 }}
            animate={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
            transition={{ delay: 0.75, duration: 0.35, ease: 'easeOut' }}
            className="mt-4 z-20"
          >
            <span className="font-display text-2xl font-medium text-[#F5F5F5] tracking-tight">
              TaskFlow
            </span>
          </motion.div>
        </div>

        {/* Status and Progress (1.0s ->) */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.1, duration: 0.4 }}
          className="absolute top-[65%] left-1/2 -translate-x-1/2 flex flex-col items-center gap-3 w-[200px]"
        >
          <span className="text-[11px] text-[#8A8A8A] font-medium tracking-wide">
            Connecting your workspace
          </span>
          <div className="w-full h-[2px] bg-[#161616] rounded-full overflow-hidden">
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: phase === 'waiting' && isLoading ? [0.9, 0.95, 0.9] : 1 }}
              transition={
                phase === 'waiting' && isLoading 
                  ? { duration: 2, repeat: Infinity, ease: 'easeInOut' } 
                  : { duration: 1.8, ease: 'easeOut' }
              }
              style={{ originX: 0 }}
              className="w-full h-full bg-[#FF6A21] rounded-full shadow-[0_0_8px_rgba(255,106,33,0.4)]"
            />
          </div>
        </motion.div>
        
      </div>
    </motion.div>
  );
};
