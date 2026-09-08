import React from 'react';
import { motion } from 'framer-motion';
import { Brain, LayoutGrid, Zap, Workflow, ShieldCheck } from 'lucide-react';

const caps = [
  {
    icon: Brain,
    label: 'AI-Powered\nInsights',
    color: 'text-[#E85D22]',
    bg: 'bg-[#E85D22]/5',
    border: 'border-[#E85D22]/20',
    iconBg: 'bg-[#E85D22]/10',
  },
  {
    icon: LayoutGrid,
    label: 'Smart\nPlanning',
    color: 'text-[#3B82F6]',
    bg: 'bg-[#3B82F6]/5',
    border: 'border-[#3B82F6]/20',
    iconBg: 'bg-[#3B82F6]/10',
  },
  {
    icon: Zap,
    label: 'Real-Time\nCollaboration',
    color: 'text-[#22C55E]',
    bg: 'bg-[#22C55E]/5',
    border: 'border-[#22C55E]/20',
    iconBg: 'bg-[#22C55E]/10',
  },
  {
    icon: Workflow,
    label: 'Advanced\nAutomation',
    color: 'text-[#A855F7]',
    bg: 'bg-[#A855F7]/5',
    border: 'border-[#A855F7]/20',
    iconBg: 'bg-[#A855F7]/10',
  },
  {
    icon: ShieldCheck,
    label: 'Enterprise\nReady',
    color: 'text-[#EF4444]',
    bg: 'bg-[#EF4444]/5',
    border: 'border-[#EF4444]/20',
    iconBg: 'bg-[#EF4444]/10',
  },
];

export const LandingCapabilityStrip: React.FC = () => {
  return (
    <div className="relative z-20 mt-12 mb-24">
      <div className="max-w-[1200px] mx-auto px-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-wrap items-stretch justify-center gap-4 lg:gap-6"
        >
          {caps.map(({ icon: Icon, label, color, bg, border, iconBg }, i) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className={`flex-1 min-w-[200px] flex items-center gap-4 px-5 py-4 rounded-[12px] bg-[#161616]/80 backdrop-blur-sm border ${border} ${bg} hover:-translate-y-1 hover:shadow-[0_8px_24px_rgba(0,0,0,0.4)] transition-all duration-300 cursor-default`}
            >
              <div className={`w-10 h-10 rounded-[8px] flex items-center justify-center shrink-0 ${iconBg} border ${border}`}>
                <Icon className={`w-5 h-5 ${color}`} />
              </div>
              <span className="text-[13px] font-semibold text-[#F3EDE4] whitespace-pre-line leading-snug">
                {label}
              </span>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  );
};
