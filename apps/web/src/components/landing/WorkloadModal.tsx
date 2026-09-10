import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Users,
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  TrendingDown,
  UserCheck,
  Zap,
} from 'lucide-react';

interface WorkloadModalProps {
  open: boolean;
  onClose: () => void;
}

type RebalanceState = 'idle' | 'scanning' | 'rebalancing' | 'done';

const TEAM = [
  {
    name: 'Sarah Kim',
    role: 'Backend Dev',
    seed: 5,
    tasks: 12,
    capacity: 8,
    overloaded: true,
    color: '#EF4444',
    barWidth: '100%',
    newTasks: 8,
    newWidth: '67%',
    newColor: '#22C55E',
  },
  {
    name: 'Alex Chen',
    role: 'Frontend Dev',
    seed: 2,
    tasks: 8,
    capacity: 10,
    overloaded: false,
    color: '#22C55E',
    barWidth: '75%',
    newTasks: 10,
    newWidth: '83%',
    newColor: '#22C55E',
  },
  {
    name: 'Mike Johnson',
    role: 'DevOps',
    seed: 7,
    tasks: 10,
    capacity: 10,
    overloaded: false,
    color: '#F59E0B',
    barWidth: '85%',
    newTasks: 10,
    newWidth: '83%',
    newColor: '#22C55E',
  },
  {
    name: 'Priya Patel',
    role: 'Product Manager',
    seed: 3,
    tasks: 5,
    capacity: 10,
    overloaded: false,
    color: '#3B82F6',
    barWidth: '40%',
    newTasks: 7,
    newWidth: '58%',
    newColor: '#3B82F6',
  },
];

const REASSIGNMENTS = [
  { from: 'Sarah Kim', to: 'Alex Chen', task: 'Auth API endpoint', impact: 'Removes blocker' },
  { from: 'Sarah Kim', to: 'Priya Patel', task: 'Docs update', impact: 'Better fit' },
];

export const WorkloadModal: React.FC<WorkloadModalProps> = ({ open, onClose }) => {
  const [state, setState] = useState<RebalanceState>('idle');
  const [doneIdx, setDoneIdx] = useState(-1);

  const handleRebalance = () => {
    if (state !== 'idle') return;
    setState('scanning');
    setTimeout(() => {
      setState('rebalancing');
      REASSIGNMENTS.forEach((_, i) => {
        setTimeout(
          () => {
            setDoneIdx(i);
            if (i === REASSIGNMENTS.length - 1) {
              setTimeout(() => setState('done'), 600);
            }
          },
          600 + i * 900
        );
      });
    }, 1400);
  };

  const reset = () => {
    setState('idle');
    setDoneIdx(-1);
  };

  const rebalanced = state === 'rebalancing' || state === 'done';

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="wl-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md"
          />
          <motion.div
            key="wl-modal"
            initial={{ opacity: 0, scale: 0.93, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6 pointer-events-none"
          >
            <div
              className="pointer-events-auto w-full max-w-[720px] max-h-[90vh] overflow-y-auto rounded-[24px] border border-[#333333] bg-[#0F0F0F] shadow-[0_40px_100px_rgba(0,0,0,0.95),_0_0_80px_rgba(168,85,247,0.06)]"
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-8 py-6 border-b border-[#1E1E1E] sticky top-0 bg-[#0F0F0F] z-10">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-[10px] bg-[#A855F7]/15 border border-[#A855F7]/30 flex items-center justify-center">
                    <Users className="w-5 h-5 text-[#A855F7]" />
                  </div>
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#A855F7] mb-0.5">
                      TEAM INTELLIGENCE
                    </div>
                    <div className="text-[15px] font-semibold text-[#F3EDE4]">
                      Workload Rebalancer
                    </div>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="w-9 h-9 rounded-full bg-[#1A1A1A] border border-[#333333] flex items-center justify-center text-[#737373] hover:text-white hover:bg-[#262626] transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-8 space-y-8">
                {/* Warning */}
                <div className="flex items-center gap-4 p-5 rounded-[14px] border border-[#EF4444]/25 bg-[#EF4444]/05">
                  <AlertTriangle className="w-5 h-5 text-[#EF4444] shrink-0" />
                  <div>
                    <div className="text-[14px] font-semibold text-[#F3EDE4] mb-0.5">
                      Capacity issue detected
                    </div>
                    <div className="text-[12px] text-[#8A8A8A]">
                      Sarah Kim is at 150% capacity. 4 tasks are at risk of delay this sprint.
                    </div>
                  </div>
                </div>

                {/* Team capacity bars */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[13px] font-bold uppercase tracking-[0.12em] text-[#737373]">
                      Team Capacity
                    </span>
                    {state === 'done' && (
                      <button
                        onClick={reset}
                        className="text-[11px] text-[#737373] hover:text-[#A3A3A3] transition-colors underline underline-offset-2"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                  <div className="space-y-4">
                    {TEAM.map((member, i) => (
                      <div key={i} className="flex items-center gap-5">
                        <div className="w-9 h-9 rounded-full bg-[#262626] border border-[#333333] overflow-hidden shrink-0">
                          <img
                            src={`https://api.dicebear.com/7.x/notionists/svg?seed=${member.seed}&backgroundColor=transparent`}
                            alt=""
                          />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-[13px] font-semibold text-[#F3EDE4]">
                                {member.name}
                              </span>
                              {member.overloaded && !rebalanced && (
                                <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-[4px] bg-[#EF4444]/15 text-[#EF4444] border border-[#EF4444]/30">
                                  Overloaded
                                </span>
                              )}
                              {rebalanced && member.overloaded && (
                                <motion.span
                                  initial={{ opacity: 0, scale: 0.8 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-[4px] bg-[#22C55E]/15 text-[#22C55E] border border-[#22C55E]/30"
                                >
                                  Balanced
                                </motion.span>
                              )}
                            </div>
                            <span
                              className={`text-[12px] font-bold ${rebalanced ? 'text-[#22C55E]' : member.overloaded ? 'text-[#EF4444]' : 'text-[#A3A3A3]'}`}
                            >
                              {rebalanced ? member.newTasks : member.tasks} tasks
                            </span>
                          </div>
                          <div className="h-2 rounded-full bg-[#1A1A1A] overflow-hidden">
                            <motion.div
                              className="h-full rounded-full"
                              style={{ background: rebalanced ? member.newColor : member.color }}
                              initial={{ width: member.barWidth }}
                              animate={{ width: rebalanced ? member.newWidth : member.barWidth }}
                              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Suggested reassignments */}
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Zap className="w-4 h-4 text-[#A855F7]" />
                    <span className="text-[13px] font-bold uppercase tracking-[0.12em] text-[#737373]">
                      Suggested Reassignments
                    </span>
                  </div>
                  <div className="space-y-3">
                    {REASSIGNMENTS.map((r, i) => {
                      const applied = doneIdx >= i;
                      return (
                        <div
                          key={i}
                          className={`flex items-center justify-between gap-4 p-4 rounded-[12px] border transition-all duration-500 ${applied ? 'border-[#22C55E]/30 bg-[#22C55E]/05' : 'border-[#1E1E1E] bg-[#111111]'}`}
                        >
                          <div className="flex items-center gap-3">
                            {applied ? (
                              <CheckCircle2 className="w-5 h-5 text-[#22C55E] shrink-0" />
                            ) : (
                              <UserCheck className="w-5 h-5 text-[#A855F7] shrink-0" />
                            )}
                            <div>
                              <div className="text-[13px] font-semibold text-[#F3EDE4]">
                                "{r.task}"
                              </div>
                              <div className="text-[11px] text-[#737373]">
                                {r.from} → {r.to}
                              </div>
                            </div>
                          </div>
                          <span
                            className={`text-[11px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-[6px] border shrink-0 ${applied ? 'text-[#22C55E] bg-[#22C55E]/10 border-[#22C55E]/25' : 'text-[#A855F7] bg-[#A855F7]/10 border-[#A855F7]/25'}`}
                          >
                            {applied ? '✓ Applied' : r.impact}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* CTA */}
                <AnimatePresence mode="wait">
                  {state === 'done' ? (
                    <motion.div
                      key="done"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center justify-between gap-4 p-5 rounded-[14px] border border-[#22C55E]/25 bg-[#22C55E]/05"
                    >
                      <div className="flex items-center gap-3">
                        <TrendingDown className="w-5 h-5 text-[#22C55E]" />
                        <div>
                          <div className="text-[14px] font-semibold text-[#F3EDE4]">
                            Team rebalanced successfully
                          </div>
                          <div className="text-[12px] text-[#8A8A8A]">
                            Sprint risk reduced · Sarah Kim back to 100% capacity
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={onClose}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-[8px] bg-[#E85D22] text-white text-[13px] font-semibold hover:bg-[#F0703B] transition-all shrink-0"
                      >
                        Get started <ArrowRight className="w-4 h-4" />
                      </button>
                    </motion.div>
                  ) : (
                    <motion.button
                      key="rebalance-btn"
                      onClick={handleRebalance}
                      disabled={state !== 'idle'}
                      whileHover={{ scale: state === 'idle' ? 1.02 : 1 }}
                      whileTap={{ scale: 0.98 }}
                      className="w-full flex items-center justify-center gap-2 px-6 py-4 rounded-[12px] bg-[#A855F7]/15 border border-[#A855F7]/30 text-[#A855F7] text-[15px] font-semibold hover:bg-[#A855F7]/25 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {state === 'scanning' ? (
                        <>
                          <div className="w-4 h-4 border-2 border-[#A855F7]/30 border-t-[#A855F7] rounded-full animate-spin" />{' '}
                          Scanning team capacity…
                        </>
                      ) : state === 'rebalancing' ? (
                        <>
                          <div className="w-4 h-4 border-2 border-[#A855F7]/30 border-t-[#A855F7] rounded-full animate-spin" />{' '}
                          Applying reassignments…
                        </>
                      ) : (
                        <>
                          <Zap className="w-4 h-4" /> Auto-rebalance team now
                        </>
                      )}
                    </motion.button>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
