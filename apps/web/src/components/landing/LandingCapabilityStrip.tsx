import React from 'react';
import { motion } from 'framer-motion';
import { Brain, LayoutGrid, Zap, Workflow, ShieldCheck } from 'lucide-react';

const caps = [
  {
    icon: Brain,
    label: 'AI-Powered\nInsights',
    color: 'text-[#E85D22]',
    bg: 'bg-[#E85D22]/5',
    border: 'border-[#E85D22]/30',
    iconBg: 'bg-[#E85D22]/15',
    shadow: 'shadow-[0_0_15px_rgba(232,93,34,0.1)]',
  },
  {
    icon: LayoutGrid,
    label: 'Smart\nPlanning',
    color: 'text-[#3B82F6]',
    bg: 'bg-[#3B82F6]/5',
    border: 'border-[#3B82F6]/30',
    iconBg: 'bg-[#3B82F6]/15',
    shadow: 'shadow-[0_0_15px_rgba(59,130,246,0.1)]',
  },
  {
    icon: Zap,
    label: 'Real-Time\nCollaboration',
    color: 'text-[#22C55E]',
    bg: 'bg-[#22C55E]/5',
    border: 'border-[#22C55E]/30',
    iconBg: 'bg-[#22C55E]/15',
    shadow: 'shadow-[0_0_15px_rgba(34,197,94,0.1)]',
  },
  {
    icon: Workflow,
    label: 'Advanced\nAutomation',
    color: 'text-[#A855F7]',
    bg: 'bg-[#A855F7]/5',
    border: 'border-[#A855F7]/30',
    iconBg: 'bg-[#A855F7]/15',
    shadow: 'shadow-[0_0_15px_rgba(168,85,247,0.1)]',
  },
  {
    icon: ShieldCheck,
    label: 'Enterprise\nReady',
    color: 'text-[#EF4444]',
    bg: 'bg-[#EF4444]/5',
    border: 'border-[#EF4444]/30',
    iconBg: 'bg-[#EF4444]/15',
    shadow: 'shadow-[0_0_15px_rgba(239,68,68,0.1)]',
  },
];

export const LandingCapabilityStrip: React.FC = () => {
  return (
    <div className="relative z-30 -mt-16 mb-24 pointer-events-none">
      <div className="max-w-[1300px] mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-50px' }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-wrap items-stretch justify-center gap-4 lg:gap-5"
        >
          {caps.map(({ icon: Icon, label, color, bg, border, iconBg, shadow }, i) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ delay: 0.2 + i * 0.1, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className={`flex-1 min-w-[200px] flex items-center gap-4 px-5 py-5 rounded-[12px] bg-[#161616]/95 backdrop-blur-xl border ${border} ${bg} hover:-translate-y-1.5 hover:shadow-[0_12px_32px_rgba(0,0,0,0.6)] ${shadow} transition-all duration-300 pointer-events-auto cursor-default preserve-3d`}
            >
              <div
                className={`w-11 h-11 rounded-[8px] flex items-center justify-center shrink-0 ${iconBg} border ${border} shadow-inner`}
              >
                <Icon className={`w-5 h-5 ${color}`} />
              </div>
              <span className="text-[14px] font-semibold text-[#F3EDE4] whitespace-pre-line leading-snug">
                {label}
              </span>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  );
};
