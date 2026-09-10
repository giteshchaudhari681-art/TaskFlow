import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  BrainCircuit,
  AlertTriangle,
  Sparkles,
  CheckCircle2,
  Clock,
  Users,
  Zap,
  TrendingDown,
  ArrowRight,
  Shield,
} from 'lucide-react';

interface AIDemoModalProps {
  open: boolean;
  onClose: () => void;
}

type DemoStep = 'scanning' | 'risks' | 'recommendations' | 'done';

const SCAN_STEPS = [
  { label: 'Analyzing task dependencies…', duration: 900 },
  { label: 'Checking team workload capacity…', duration: 900 },
  { label: 'Detecting critical path blockers…', duration: 900 },
  { label: 'Generating AI recommendations…', duration: 900 },
];

const RISKS = [
  {
    icon: AlertTriangle,
    color: '#EF4444',
    bg: 'bg-[#EF4444]/10',
    border: 'border-[#EF4444]/25',
    title: 'Critical Path Blocked',
    desc: '"API Integration" is delayed 3 days, blocking the Launch milestone.',
    badge: 'HIGH',
    badgeColor: 'text-[#EF4444] bg-[#EF4444]/10 border-[#EF4444]/25',
  },
  {
    icon: Users,
    color: '#F59E0B',
    bg: 'bg-[#F59E0B]/10',
    border: 'border-[#F59E0B]/25',
    title: 'Team Overloaded',
    desc: 'Backend Team A is at 130% capacity. 4 tasks at risk of delay.',
    badge: 'MEDIUM',
    badgeColor: 'text-[#F59E0B] bg-[#F59E0B]/10 border-[#F59E0B]/25',
  },
  {
    icon: Clock,
    color: '#3B82F6',
    bg: 'bg-[#3B82F6]/10',
    border: 'border-[#3B82F6]/25',
    title: 'Sprint Velocity Drop',
    desc: 'Velocity dropped 22% this sprint. Delivery date will slip by 5 days.',
    badge: 'LOW',
    badgeColor: 'text-[#3B82F6] bg-[#3B82F6]/10 border-[#3B82F6]/25',
  },
];

const RECS = [
  {
    icon: Sparkles,
    color: '#22C55E',
    bg: 'bg-[#22C55E]/10',
    border: 'border-[#22C55E]/25',
    title: 'Reassign API tickets to Backend Team B',
    impact: '+3 Days Saved',
    impactColor: 'text-[#22C55E] bg-[#22C55E]/10 border-[#22C55E]/25',
  },
  {
    icon: TrendingDown,
    color: '#F59E0B',
    bg: 'bg-[#F59E0B]/10',
    border: 'border-[#F59E0B]/25',
    title: 'Delay Marketing site launch by 1 week',
    impact: 'Low Impact',
    impactColor: 'text-[#F59E0B] bg-[#F59E0B]/10 border-[#F59E0B]/25',
  },
  {
    icon: Zap,
    color: '#A855F7',
    bg: 'bg-[#A855F7]/10',
    border: 'border-[#A855F7]/25',
    title: 'Break "Auth Migration" into 3 parallel tasks',
    impact: '+2 Days Saved',
    impactColor: 'text-[#A855F7] bg-[#A855F7]/10 border-[#A855F7]/25',
  },
];

export const AIDemoModal: React.FC<AIDemoModalProps> = ({ open, onClose }) => {
  const [step, setStep] = useState<DemoStep>('scanning');
  const [scanIdx, setScanIdx] = useState(0);
  const [visibleRisks, setVisibleRisks] = useState(0);
  const [visibleRecs, setVisibleRecs] = useState(0);

  // Reset on open
  useEffect(() => {
    if (!open) return;
    setStep('scanning');
    setScanIdx(0);
    setVisibleRisks(0);
    setVisibleRecs(0);
  }, [open]);

  // Drive the scanning animation
  useEffect(() => {
    if (!open || step !== 'scanning') return;
    if (scanIdx < SCAN_STEPS.length - 1) {
      const t = setTimeout(() => setScanIdx(i => i + 1), SCAN_STEPS[scanIdx].duration);
      return () => clearTimeout(t);
    } else {
      const t = setTimeout(() => setStep('risks'), 1000);
      return () => clearTimeout(t);
    }
  }, [open, step, scanIdx]);

  // Reveal risks one by one
  useEffect(() => {
    if (!open || step !== 'risks') return;
    if (visibleRisks < RISKS.length) {
      const t = setTimeout(() => setVisibleRisks(n => n + 1), 500);
      return () => clearTimeout(t);
    } else {
      const t = setTimeout(() => setStep('recommendations'), 800);
      return () => clearTimeout(t);
    }
  }, [open, step, visibleRisks]);

  // Reveal recommendations one by one
  useEffect(() => {
    if (!open || step !== 'recommendations') return;
    if (visibleRecs < RECS.length) {
      const t = setTimeout(() => setVisibleRecs(n => n + 1), 500);
      return () => clearTimeout(t);
    } else {
      const t = setTimeout(() => setStep('done'), 600);
      return () => clearTimeout(t);
    }
  }, [open, step, visibleRecs]);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="ai-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md"
          />

          {/* Modal */}
          <motion.div
            key="ai-modal"
            initial={{ opacity: 0, scale: 0.93, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6 pointer-events-none"
          >
            <div
              className="pointer-events-auto w-full max-w-[780px] max-h-[90vh] overflow-y-auto rounded-[24px] border border-[#333333] bg-[#0F0F0F] shadow-[0_40px_100px_rgba(0,0,0,0.95),_0_0_80px_rgba(59,130,246,0.06)]"
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-8 py-6 border-b border-[#1E1E1E] bg-[#0F0F0F] sticky top-0 z-10">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-[10px] bg-[#3B82F6]/15 border border-[#3B82F6]/30 flex items-center justify-center">
                    <BrainCircuit className="w-5 h-5 text-[#3B82F6]" />
                  </div>
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#3B82F6] mb-0.5">
                      AI ANALYSIS ENGINE
                    </div>
                    <div className="text-[15px] font-semibold text-[#F3EDE4]">
                      Live Project Intelligence Demo
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
                {/* Step 1: Scanning */}
                <div>
                  <div className="flex items-center gap-2 mb-5">
                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center ${step === 'scanning' ? 'bg-[#3B82F6]/20 border border-[#3B82F6]/50' : 'bg-[#22C55E]/20 border border-[#22C55E]/50'}`}
                    >
                      {step === 'scanning' ? (
                        <div className="w-2 h-2 rounded-full bg-[#3B82F6] animate-pulse" />
                      ) : (
                        <CheckCircle2 className="w-3 h-3 text-[#22C55E]" />
                      )}
                    </div>
                    <span className="text-[13px] font-bold uppercase tracking-[0.12em] text-[#A3A3A3]">
                      Analysis
                    </span>
                  </div>

                  <div className="rounded-[14px] border border-[#1E1E1E] bg-[#111111] p-6 space-y-3">
                    {SCAN_STEPS.map((s, i) => {
                      const done = step !== 'scanning' || i < scanIdx;
                      const active = step === 'scanning' && i === scanIdx;
                      const pending = step === 'scanning' && i > scanIdx;
                      return (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: pending ? 0.3 : 1, x: 0 }}
                          transition={{ delay: i * 0.1 }}
                          className="flex items-center gap-3"
                        >
                          <div
                            className={`w-4 h-4 rounded-full shrink-0 flex items-center justify-center ${done ? 'bg-[#22C55E]/20 border border-[#22C55E]/50' : active ? 'border border-[#3B82F6]/50' : 'border border-[#333333]'}`}
                          >
                            {done ? (
                              <CheckCircle2 className="w-3 h-3 text-[#22C55E]" />
                            ) : active ? (
                              <div className="w-1.5 h-1.5 rounded-full bg-[#3B82F6] animate-pulse" />
                            ) : null}
                          </div>
                          <span
                            className={`text-[13px] font-medium ${done ? 'text-[#22C55E]' : active ? 'text-[#F3EDE4]' : 'text-[#555555]'}`}
                          >
                            {s.label}
                          </span>
                          {active && (
                            <div className="flex-1 h-1 rounded-full bg-[#1A1A1A] overflow-hidden">
                              <motion.div
                                className="h-full bg-[#3B82F6] rounded-full"
                                initial={{ width: 0 }}
                                animate={{ width: '100%' }}
                                transition={{ duration: s.duration / 1000, ease: 'linear' }}
                              />
                            </div>
                          )}
                        </motion.div>
                      );
                    })}
                  </div>
                </div>

                {/* Step 2: Risks */}
                <AnimatePresence>
                  {(step === 'risks' || step === 'recommendations' || step === 'done') && (
                    <motion.div
                      key="risks-section"
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                    >
                      <div className="flex items-center gap-2 mb-5">
                        <div className="w-5 h-5 rounded-full bg-[#EF4444]/20 border border-[#EF4444]/50 flex items-center justify-center">
                          <AlertTriangle className="w-3 h-3 text-[#EF4444]" />
                        </div>
                        <span className="text-[13px] font-bold uppercase tracking-[0.12em] text-[#A3A3A3]">
                          {visibleRisks} Risk{visibleRisks !== 1 ? 's' : ''} Detected
                        </span>
                      </div>
                      <div className="space-y-3">
                        {RISKS.slice(0, visibleRisks).map((r, i) => (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                            className={`flex items-start justify-between gap-4 p-5 rounded-[12px] border ${r.border} ${r.bg}`}
                          >
                            <div className="flex items-start gap-4">
                              <r.icon
                                className="w-5 h-5 mt-0.5 shrink-0"
                                style={{ color: r.color }}
                              />
                              <div>
                                <div className="text-[14px] font-semibold text-[#F3EDE4] mb-1">
                                  {r.title}
                                </div>
                                <div className="text-[12px] text-[#8A8A8A]">{r.desc}</div>
                              </div>
                            </div>
                            <span
                              className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-[5px] border shrink-0 ${r.badgeColor}`}
                            >
                              {r.badge}
                            </span>
                          </motion.div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Step 3: Recommendations */}
                <AnimatePresence>
                  {(step === 'recommendations' || step === 'done') && (
                    <motion.div
                      key="recs-section"
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                    >
                      <div className="flex items-center gap-2 mb-5">
                        <div className="w-5 h-5 rounded-full bg-[#22C55E]/20 border border-[#22C55E]/50 flex items-center justify-center">
                          <Sparkles className="w-3 h-3 text-[#22C55E]" />
                        </div>
                        <span className="text-[13px] font-bold uppercase tracking-[0.12em] text-[#A3A3A3]">
                          AI Recommendations
                        </span>
                      </div>
                      <div className="space-y-3">
                        {RECS.slice(0, visibleRecs).map((r, i) => (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                            className="flex items-center justify-between gap-4 p-5 bg-[#111111] border border-[#222222] rounded-[12px] hover:border-[#333333] transition-all cursor-pointer group"
                          >
                            <div className="flex items-center gap-4">
                              <div
                                className={`w-9 h-9 rounded-[8px] flex items-center justify-center shrink-0 border ${r.bg} ${r.border}`}
                              >
                                <r.icon className="w-4 h-4" style={{ color: r.color }} />
                              </div>
                              <span className="text-[14px] font-medium text-[#E5E5E5] group-hover:text-white transition-colors">
                                {r.title}
                              </span>
                            </div>
                            <span
                              className={`text-[11px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-[6px] border shrink-0 ${r.impactColor}`}
                            >
                              {r.impact}
                            </span>
                          </motion.div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Done state CTA */}
                <AnimatePresence>
                  {step === 'done' && (
                    <motion.div
                      key="done-cta"
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                      className="flex items-center justify-between gap-6 rounded-[16px] border border-[#22C55E]/20 bg-[#22C55E]/05 p-6"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-[#22C55E]/20 border border-[#22C55E]/40 flex items-center justify-center">
                          <Shield className="w-5 h-5 text-[#22C55E]" />
                        </div>
                        <div>
                          <div className="text-[15px] font-semibold text-[#F3EDE4] mb-1">
                            Analysis complete
                          </div>
                          <div className="text-[13px] text-[#8A8A8A]">
                            3 risks found · 3 recommendations ready to apply
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={onClose}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-[8px] bg-[#E85D22] text-white text-[13px] font-semibold hover:bg-[#F0703B] shadow-[0_4px_16px_rgba(232,93,34,0.35)] transition-all shrink-0"
                      >
                        Get started free
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </motion.div>
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
