import React from 'react';
import { motion } from 'framer-motion';
import { Layers, ArrowLeft } from 'lucide-react';

interface AuthLayoutProps {
  children: React.ReactNode;
  leftPanelContent: React.ReactNode;
  onBackToTaskFlow?: () => void;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({
  children,
  leftPanelContent,
  onBackToTaskFlow,
}) => {
  return (
    <div className="min-h-screen w-full bg-[#080808] relative flex flex-col items-center justify-center p-4 sm:p-8 overflow-hidden font-sans">
      {/* Background Effects */}
      <motion.div 
        animate={{ x: ['-5%', '5%', '-5%'] }}
        transition={{ duration: 25, ease: 'easeInOut', repeat: Infinity }}
        className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_center,rgba(232,93,34,0.03)_0%,transparent_70%)] pointer-events-none" 
      />
      <div className="absolute inset-0 z-0 bg-[url('/noise.png')] opacity-[0.02] pointer-events-none mix-blend-overlay" />

      {/* Top Branding & Nav */}
      <div className="absolute top-0 left-0 w-full p-6 sm:p-8 flex justify-between items-center z-20">
        <motion.button
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          onClick={onBackToTaskFlow}
          className="flex items-center gap-2 group cursor-pointer"
        >
          <Layers className="w-6 h-6 text-[#E85D22] transition-transform duration-300 group-hover:-translate-y-px" />
          <span className="font-display font-semibold text-lg text-[#f3ede4] tracking-tight">
            TaskFlow
          </span>
        </motion.button>

        {onBackToTaskFlow && (
          <motion.button
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
            onClick={onBackToTaskFlow}
            className="text-xs font-medium text-[#9c948a] hover:text-[#f3ede4] transition-all duration-200 flex items-center gap-1.5 group hover:brightness-110"
          >
            <ArrowLeft className="w-3.5 h-3.5 transform transition-transform duration-200 ease-out group-hover:-translate-x-[3px] group-hover:text-[#E85D22]" />
            <span className="group-hover:text-[#f3ede4] transition-colors duration-200">Back to TaskFlow</span>
          </motion.button>
        )}
      </div>

      {/* Main Card */}
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-[1000px] grid grid-cols-1 md:grid-cols-12 bg-[rgba(20,20,20,0.75)] backdrop-blur-xl border border-white/[0.08] rounded-[20px] shadow-[0_24px_48px_rgba(0,0,0,0.4)] relative z-10 overflow-hidden"
      >
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_bottom,rgba(232,93,34,0.05)_0%,transparent_50%)] pointer-events-none" />

        {/* Left Panel */}
        <div className="md:col-span-5 p-8 sm:p-10 border-b md:border-b-0 md:border-r border-white/[0.08] relative flex flex-col overflow-hidden bg-gradient-to-b from-transparent to-[#111111]/50">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="h-full flex flex-col justify-between"
          >
            {leftPanelContent}
          </motion.div>
        </div>

        {/* Right Panel (Form) */}
        <div className="md:col-span-7 p-8 sm:p-12 relative flex flex-col justify-center">
          {children}
        </div>
      </motion.div>
    </div>
  );
};
