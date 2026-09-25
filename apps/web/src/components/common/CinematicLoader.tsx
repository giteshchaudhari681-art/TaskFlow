import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Workflow, Layers, CheckSquare, Search, Users, ShieldCheck, Gauge, Sparkles } from 'lucide-react';

interface CinematicLoaderProps {
  isLoading: boolean;
  onComplete: () => void;
}

export const CinematicLoader: React.FC<CinematicLoaderProps> = ({ isLoading, onComplete }) => {
  const [phase, setPhase] = useState<'initial' | 'waiting' | 'exiting'>('initial');

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
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[#070707] overflow-hidden perspective-[1800px]"
      exit={{ opacity: 0, scale: 1.015, filter: 'blur(2px)' }}
      transition={{ duration: 0.35, ease: 'easeInOut' }}
    >
      {/* Background & Atmosphere */}
      <div 
        className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)]"
        style={{ backgroundSize: '40px 40px' }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_20%,#070707_90%)]" />

      {/* System Signal (0.15s) */}
      <motion.div
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: [0, 1, 0], scale: [0, 1.5, 0] }}
        transition={{ duration: 0.3, delay: 0.15, ease: "easeOut" }}
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-[#FF6A21] rounded-full blur-md"
      />

      <div 
        className="relative w-full max-w-[960px] h-[600px] flex flex-col items-center justify-center"
        style={{ transformStyle: 'preserve-3d' }}
      >
        
        {/* Main Application Window (0.30s) */}
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 20, rotateX: 3, rotateY: -8 }}
          animate={{ opacity: 1, scale: 1, y: 0, rotateX: 0, rotateY: 0 }}
          transition={{ duration: 0.6, delay: 0.3, type: 'spring', stiffness: 100, damping: 20 }}
          style={{ transformStyle: 'preserve-3d' }}
          className="relative w-full md:w-[85%] lg:w-[75%] aspect-[16/10] bg-[#0c0c0c] border border-[#262626] rounded-xl shadow-[0_40px_80px_rgba(0,0,0,0.8),0_0_0_1px_rgba(255,106,33,0.05)] overflow-hidden flex"
        >
          {/* Top Edge Light Sweep (1.45s) */}
          <motion.div
            initial={{ x: '-100%', opacity: 0 }}
            animate={{ x: '100%', opacity: [0, 1, 0] }}
            transition={{ duration: 0.6, delay: 1.45, ease: "easeInOut" }}
            className="absolute top-0 left-0 w-1/2 h-[1px] bg-gradient-to-r from-transparent via-[#FF6A21] to-transparent z-50"
          />

          {/* Sidebar (0.50s) */}
          <motion.div
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.5, ease: "easeOut" }}
            className="w-[20%] h-full border-r border-[#262626] bg-[#111111] flex flex-col p-4 shrink-0"
          >
            {/* Logo in Sidebar */}
            <div className="flex items-center gap-2 mb-8">
              <div className="w-5 h-5 rounded-[4px] bg-[#FF6A21] flex items-center justify-center">
                <Workflow className="w-3 h-3 text-white" />
              </div>
              <span className="font-display text-sm font-medium text-[#F5F5F5]">TaskFlow</span>
            </div>
            
            <div className="space-y-3">
              {[Layers, CheckSquare, Users, ShieldCheck, Gauge].map((Icon, i) => (
                <div key={i} className="flex items-center gap-2 text-[#555]">
                  <Icon className="w-3.5 h-3.5" />
                  <div className="h-2 bg-[#262626] rounded-sm flex-1 opacity-50" />
                </div>
              ))}
            </div>
          </motion.div>

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col h-full bg-[#0c0c0c] relative">
            {/* Header (0.55s) */}
            <motion.div
              initial={{ y: -10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.55, ease: "easeOut" }}
              className="h-12 border-b border-[#262626] flex items-center px-6 justify-between bg-[#111111]/50 backdrop-blur-sm"
            >
              <div className="w-32 h-3 bg-[#262626] rounded-sm" />
              <div className="flex items-center gap-3">
                <Search className="w-3.5 h-3.5 text-[#555]" />
                <div className="w-6 h-6 rounded-full bg-[#262626]" />
              </div>
            </motion.div>

            {/* Dashboard / Workspace Area */}
            <div className="p-6 flex-1 flex flex-col gap-6 overflow-hidden">
              {/* KPI Cards (0.60s) */}
              <div className="grid grid-cols-3 gap-4">
                {[
                  { value: '12', label: 'Active Projects', delay: 0.6 },
                  { value: '28', label: 'Tasks in Progress', delay: 0.65 },
                  { value: '76%', label: 'Delivery Health', delay: 0.7 }
                ].map((kpi, i) => (
                  <motion.div
                    key={i}
                    initial={{ y: 10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.4, delay: kpi.delay, ease: "easeOut" }}
                    className="bg-[#161616] border border-[#262626] rounded-lg p-3 shadow-sm relative overflow-hidden group"
                  >
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: kpi.delay + 0.2 }}
                      className="absolute top-3 right-3 w-1.5 h-1.5 rounded-full bg-[#FF6A21] shadow-[0_0_6px_#FF6A21]"
                    />
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ duration: 0.4, delay: 0.8 + (i * 0.1), ease: "easeOut" }}
                      className="text-lg font-medium text-[#F5F5F5] mb-1"
                    >
                      {kpi.value}
                    </motion.div>
                    <div className="text-[9px] text-[#8A8A8A] uppercase tracking-wider">{kpi.label}</div>
                  </motion.div>
                ))}
              </div>

              {/* Project Board / Kanban (0.75s) */}
              <motion.div
                initial={{ y: 15, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.75, ease: "easeOut" }}
                className="flex-1 bg-[#111111] border border-[#262626] rounded-lg p-4 flex gap-4 overflow-hidden"
              >
                {['To Do', 'In Progress', 'Done'].map((col, i) => (
                  <div key={col} className="flex-1 flex flex-col gap-3">
                    <div className="text-[10px] text-[#8A8A8A] font-medium uppercase tracking-wider flex items-center justify-between">
                      {col}
                      <motion.div 
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: 1 }}
                        transition={{ delay: 0.85 + (i * 0.1), duration: 0.5 }}
                        className="h-[1px] bg-[#333] flex-1 ml-3 origin-left"
                      />
                    </div>
                    
                    {/* Task Cards Sliding In (1.05s) */}
                    <div className="flex flex-col gap-2 relative">
                      {Array.from({ length: i === 1 ? 2 : 1 }).map((_, j) => (
                        <motion.div
                          key={`${i}-${j}`}
                          initial={{ x: -20, opacity: 0 }}
                          animate={{ x: 0, opacity: 1 }}
                          transition={{ duration: 0.4, delay: 1.05 + (i * 0.1) + (j * 0.05), type: 'spring', stiffness: 120 }}
                          className="h-12 bg-[#161616] border border-[#2A2A2A] rounded-md p-2 flex flex-col justify-between"
                        >
                          <div className="w-2/3 h-2 bg-[#333] rounded-sm" />
                          <div className="flex justify-between items-center">
                            <div className="w-4 h-4 rounded-full bg-[#262626]" />
                            <div className="w-10 h-1.5 bg-[#FF6A21]/20 rounded-full overflow-hidden">
                              <motion.div 
                                initial={{ scaleX: 0 }}
                                animate={{ scaleX: 0.6 }}
                                transition={{ delay: 1.3, duration: 0.4 }}
                                className="h-full bg-[#FF6A21] origin-left"
                              />
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                ))}
              </motion.div>

            </div>

            {/* AI Insight Overlay (1.25s) */}
            <motion.div
              initial={{ y: 20, x: -10, opacity: 0, scale: 0.95 }}
              animate={{ y: 0, x: 0, opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 1.25, type: 'spring', stiffness: 150, damping: 20 }}
              style={{ translateZ: '20px' }}
              className="absolute bottom-6 right-6 w-56 bg-[#161616] border border-[#333] rounded-lg shadow-2xl p-4 z-20"
            >
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-3.5 h-3.5 text-[#FF6A21]" />
                <span className="text-[10px] font-semibold tracking-wider text-[#FF6A21] uppercase">AI Insight</span>
              </div>
              <div className="w-3/4 h-2 bg-[#F5F5F5]/80 rounded-sm mb-1.5" />
              <div className="w-full h-1.5 bg-[#555] rounded-sm mb-1" />
              <div className="w-2/3 h-1.5 bg-[#555] rounded-sm" />
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.5, duration: 0.3 }}
                className="mt-3 flex items-center justify-between text-[9px] text-[#8A8A8A]"
              >
                <span>3 tasks need attention</span>
                <span className="text-[#FF6A21]">Review →</span>
              </motion.div>
            </motion.div>
            
          </div>
        </motion.div>

        {/* Global Loading Status & Progress (0.8s) */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.8 }}
          className="absolute -bottom-16 flex flex-col items-center gap-3 w-[220px]"
        >
          <motion.span
            key={phase === 'waiting' && isLoading ? 'waiting' : 'init'}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-[10px] text-[#8A8A8A] font-medium tracking-[0.15em] uppercase"
          >
            {phase === 'waiting' && isLoading ? 'WORKSPACE READY' : 'INITIALIZING WORKSPACE'}
          </motion.span>
          <div className="w-full h-[2px] bg-[#161616] rounded-full overflow-hidden">
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: phase === 'waiting' && isLoading ? 1 : [0, 0.2, 0.5, 0.8, 1] }}
              transition={
                phase === 'waiting' && isLoading 
                  ? { duration: 0.3 } 
                  : { duration: 1.8, ease: 'easeInOut', times: [0, 0.2, 0.5, 0.8, 1] }
              }
              style={{ originX: 0 }}
              className="w-full h-full bg-[#FF6A21] rounded-full shadow-[0_0_6px_rgba(255,106,33,0.3)]"
            />
          </div>
        </motion.div>

      </div>
    </motion.div>
  );
};
