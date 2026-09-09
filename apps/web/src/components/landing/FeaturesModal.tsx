import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  LayoutGrid,
  Network,
  Brain,
  Bell,
  Users,
  Shield,
  Zap,
  BarChart3,
  GitBranch,
  Calendar,
  MessageSquare,
  Workflow,
  Check,
  ArrowRight,
} from 'lucide-react';

interface FeaturesModalProps {
  open: boolean;
  onClose: () => void;
}

const FEATURE_CATEGORIES = [
  {
    label: 'Project Management',
    color: '#3B82F6',
    features: [
      {
        icon: <LayoutGrid className="w-5 h-5" />,
        title: 'Board, List, Calendar & Timeline',
        desc: 'Switch between four powerful views to visualize your work exactly how your team thinks.',
      },
      {
        icon: <GitBranch className="w-5 h-5" />,
        title: 'Dependency Graphs',
        desc: 'Map blocking relationships between tasks. See your critical path before it becomes a crisis.',
      },
      {
        icon: <Calendar className="w-5 h-5" />,
        title: 'Milestones & Sprints',
        desc: 'Plan releases and sprints with milestone tracking, progress rings, and burndown charts.',
      },
    ],
  },
  {
    label: 'AI Intelligence',
    color: '#E85D22',
    features: [
      {
        icon: <Brain className="w-5 h-5" />,
        title: 'AI Task Decomposition',
        desc: 'Describe a goal in plain language. AI generates a full task breakdown with estimates and subtasks.',
      },
      {
        icon: <Zap className="w-5 h-5" />,
        title: 'Risk Detection',
        desc: 'AI monitors your project 24/7 and surfaces blockers, at-risk tasks, and capacity issues before they escalate.',
      },
      {
        icon: <BarChart3 className="w-5 h-5" />,
        title: 'Project Intelligence Dashboard',
        desc: 'A real-time AI summary of project health, velocity, and predicted delivery date.',
      },
    ],
  },
  {
    label: 'Collaboration',
    color: '#22C55E',
    features: [
      {
        icon: <MessageSquare className="w-5 h-5" />,
        title: 'Task Comments & Activity',
        desc: 'Every task has a full comment thread, @mentions, file attachments, and an audit trail.',
      },
      {
        icon: <Bell className="w-5 h-5" />,
        title: 'Smart Notifications',
        desc: 'Context-aware notifications that only surface what actually needs your attention.',
      },
      {
        icon: <Users className="w-5 h-5" />,
        title: 'Team Workload View',
        desc: 'See who is over-capacity and rebalance assignments in seconds without a spreadsheet.',
      },
    ],
  },
  {
    label: 'Enterprise & Security',
    color: '#A855F7',
    features: [
      {
        icon: <Shield className="w-5 h-5" />,
        title: 'Role-Based Access Control',
        desc: 'Owner, Admin, Lead, Member, and Viewer roles. Fine-grained permissions across every project.',
      },
      {
        icon: <Workflow className="w-5 h-5" />,
        title: 'Audit Logs',
        desc: 'Complete tamper-evident audit trail for every action. Required for compliance-sensitive orgs.',
      },
      {
        icon: <Network className="w-5 h-5" />,
        title: 'Multi-Workspace Isolation',
        desc: 'Strict logical database isolation. No cross-contamination between workspace boundaries.',
      },
    ],
  },
];

export const FeaturesModal: React.FC<FeaturesModalProps> = ({ open, onClose }) => {
  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm"
          />

          {/* Sheet */}
          <motion.div
            key="sheet"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="fixed bottom-0 left-0 right-0 z-50 max-h-[92vh] overflow-y-auto rounded-t-[24px] bg-[#0F0F0F] border-t border-[#262626] shadow-[0_-40px_80px_rgba(0,0,0,0.9)]"
          >
            {/* Handle */}
            <div className="sticky top-0 z-10 flex items-center justify-between px-8 py-5 bg-[#0F0F0F]/95 backdrop-blur-xl border-b border-[#1E1E1E]">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#E85D22] mb-1">
                  TASKFLOW PLATFORM
                </div>
                <h2 className="font-display text-[22px] font-semibold text-[#F3EDE4]">
                  Everything your team needs
                </h2>
              </div>
              <button
                onClick={onClose}
                className="w-10 h-10 rounded-full bg-[#1A1A1A] border border-[#333333] flex items-center justify-center text-[#A3A3A3] hover:text-white hover:bg-[#262626] transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-8 py-10 max-w-[1200px] mx-auto">
              {/* Hero strip */}
              <div className="grid grid-cols-3 gap-4 mb-12">
                {[
                  { stat: '78%', label: 'Fewer missed deadlines', color: 'text-[#3B82F6]' },
                  { stat: '6×', label: 'Faster project setup', color: 'text-[#E85D22]' },
                  { stat: '100%', label: 'Team visibility', color: 'text-[#22C55E]' },
                ].map((s, i) => (
                  <div
                    key={i}
                    className="rounded-[16px] border border-[#1E1E1E] bg-[#111111] p-6 text-center"
                  >
                    <div
                      className={`font-display text-[2.5rem] font-medium leading-none mb-2 ${s.color}`}
                    >
                      {s.stat}
                    </div>
                    <div className="text-[12px] text-[#8A8A8A] font-semibold uppercase tracking-wider">
                      {s.label}
                    </div>
                  </div>
                ))}
              </div>

              {/* Feature categories */}
              <div className="space-y-10">
                {FEATURE_CATEGORIES.map((cat, ci) => (
                  <motion.div
                    key={ci}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: ci * 0.08, ease: [0.16, 1, 0.3, 1] }}
                  >
                    {/* Category label */}
                    <div className="flex items-center gap-3 mb-5">
                      <div className="h-px flex-1 opacity-20" style={{ background: cat.color }} />
                      <span
                        className="text-[11px] font-bold uppercase tracking-[0.2em]"
                        style={{ color: cat.color }}
                      >
                        {cat.label}
                      </span>
                      <div className="h-px flex-1 opacity-20" style={{ background: cat.color }} />
                    </div>

                    {/* Feature cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {cat.features.map((feat, fi) => (
                        <div
                          key={fi}
                          className="group rounded-[16px] border border-[#1E1E1E] bg-[#111111] p-6 hover:border-[#333333] hover:bg-[#161616] transition-all cursor-pointer"
                        >
                          <div
                            className="w-10 h-10 rounded-[10px] flex items-center justify-center mb-4 border"
                            style={{
                              background: `${cat.color}18`,
                              borderColor: `${cat.color}40`,
                              color: cat.color,
                            }}
                          >
                            {feat.icon}
                          </div>
                          <h3 className="text-[15px] font-semibold text-[#F3EDE4] mb-2 group-hover:text-white transition-colors">
                            {feat.title}
                          </h3>
                          <p className="text-[13px] text-[#8A8A8A] leading-relaxed">{feat.desc}</p>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* CTA */}
              <div className="mt-12 flex flex-col sm:flex-row items-center justify-between gap-6 rounded-[20px] border border-[#262626] bg-gradient-to-r from-[#161616] to-[#0F0F0F] p-8">
                <div>
                  <h3 className="font-display text-[20px] font-semibold text-[#F3EDE4] mb-2">
                    Ready to take TaskFlow for a spin?
                  </h3>
                  <p className="text-[14px] text-[#8A8A8A]">
                    Free for up to 5 members. No credit card required.
                  </p>
                </div>
                <div className="flex gap-3 shrink-0">
                  <button
                    onClick={onClose}
                    className="px-6 py-3 rounded-[8px] border border-[#333333] text-[14px] font-medium text-[#A3A3A3] hover:text-white hover:border-[#555555] transition-all"
                  >
                    Maybe later
                  </button>
                  <button className="inline-flex items-center gap-2 px-6 py-3 rounded-[8px] bg-[#E85D22] text-white text-[14px] font-semibold hover:bg-[#F0703B] shadow-[0_4px_20px_rgba(232,93,34,0.35)] transition-all">
                    <Check className="w-4 h-4" />
                    Get started free
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Bottom padding for scroll */}
              <div className="h-8" />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
