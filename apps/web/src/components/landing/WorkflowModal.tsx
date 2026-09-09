import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  LayoutGrid,
  Menu,
  GitBranch,
  Check,
  Clock,
  MessageSquare,
  Paperclip,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';

interface WorkflowModalProps {
  open: boolean;
  onClose: () => void;
}

type WorkflowView = 'board' | 'list' | 'dependency';

const TASKS = [
  {
    id: 1,
    title: 'Design System Setup',
    status: 'done',
    priority: 'High',
    pc: 'text-[#E85D22]',
    pbg: 'bg-[#E85D22]/15',
    col: 'Done',
    comments: 4,
    att: 2,
  },
  {
    id: 2,
    title: 'Auth Service',
    status: 'done',
    priority: 'High',
    pc: 'text-[#E85D22]',
    pbg: 'bg-[#E85D22]/15',
    col: 'Done',
    comments: 12,
    att: 1,
  },
  {
    id: 3,
    title: 'Component Library',
    status: 'active',
    priority: 'Medium',
    pc: 'text-[#F59E0B]',
    pbg: 'bg-[#F59E0B]/15',
    col: 'In Progress',
    comments: 6,
    att: 0,
  },
  {
    id: 4,
    title: 'API Integration',
    status: 'blocked',
    priority: 'High',
    pc: 'text-[#E85D22]',
    pbg: 'bg-[#E85D22]/15',
    col: 'Blocked',
    comments: 3,
    att: 1,
  },
  {
    id: 5,
    title: 'Beta Launch',
    status: 'todo',
    priority: 'High',
    pc: 'text-[#E85D22]',
    pbg: 'bg-[#E85D22]/15',
    col: 'To Do',
    comments: 1,
    att: 0,
  },
];

const statusMeta = {
  done: { label: 'Done', color: '#22C55E', icon: CheckCircle2 },
  active: { label: 'In Progress', color: '#3B82F6', icon: Clock },
  blocked: { label: 'Blocked', color: '#EF4444', icon: X },
  todo: { label: 'To Do', color: '#737373', icon: Clock },
};

const BoardPane: React.FC = () => (
  <div className="grid grid-cols-3 gap-4">
    {['In Progress', 'Blocked', 'To Do'].map(col => {
      const items = TASKS.filter(t => t.col === col);
      const borderColor =
        col === 'In Progress'
          ? 'border-t-[#3B82F6]'
          : col === 'Blocked'
            ? 'border-t-[#EF4444]'
            : 'border-t-[#737373]';
      return (
        <div key={col} className={`pt-3 border-t-2 ${borderColor}`}>
          <div className="text-[12px] font-bold text-[#A3A3A3] uppercase tracking-wider mb-4">
            {col} <span className="text-[#555555]">·{items.length}</span>
          </div>
          {items.map(t => (
            <div
              key={t.id}
              className="p-4 mb-3 bg-[#161616] border border-[#262626] rounded-[10px] hover:border-[#333333] transition-all cursor-pointer group"
            >
              <p className="text-[13px] font-medium text-[#F3EDE4] mb-3 group-hover:text-white">
                {t.title}
              </p>
              <div className="flex items-center justify-between">
                <span
                  className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-[4px] ${t.pc} ${t.pbg}`}
                >
                  {t.priority}
                </span>
                <div className="flex items-center gap-2 text-[#555555] text-[11px]">
                  {t.comments > 0 && (
                    <span className="flex items-center gap-1">
                      <MessageSquare className="w-3 h-3" />
                      {t.comments}
                    </span>
                  )}
                  {t.att > 0 && (
                    <span className="flex items-center gap-1">
                      <Paperclip className="w-3 h-3" />
                      {t.att}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      );
    })}
  </div>
);

const ListPane: React.FC = () => (
  <div className="space-y-1">
    <div className="grid grid-cols-[1fr_100px_80px] gap-3 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.1em] text-[#555555] border-b border-[#1E1E1E] mb-2">
      <span>Task</span>
      <span>Status</span>
      <span>Priority</span>
    </div>
    {TASKS.map(t => {
      const s = statusMeta[t.status as keyof typeof statusMeta];
      return (
        <div
          key={t.id}
          className="grid grid-cols-[1fr_100px_80px] gap-3 px-3 py-3 rounded-[8px] bg-[#111111] border border-[#1E1E1E] hover:border-[#2A2A2A] transition-all cursor-pointer items-center"
        >
          <div className="flex items-center gap-2.5">
            <div
              className={`w-4 h-4 rounded-[3px] border flex items-center justify-center shrink-0 ${t.status === 'done' ? 'bg-[#22C55E]/20 border-[#22C55E]/50' : 'border-[#404040]'}`}
            >
              {t.status === 'done' && (
                <Check className="w-2.5 h-2.5 text-[#22C55E]" strokeWidth={3} />
              )}
            </div>
            <span
              className={`text-[12px] font-medium ${t.status === 'done' ? 'line-through text-[#555555]' : 'text-[#E5E5E5]'}`}
            >
              {t.title}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: s.color }} />
            <span className="text-[11px]" style={{ color: s.color }}>
              {s.label}
            </span>
          </div>
          <span
            className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-[3px] w-fit ${t.pc} ${t.pbg}`}
          >
            {t.priority}
          </span>
        </div>
      );
    })}
  </div>
);

const DependencyPane: React.FC = () => (
  <div className="relative h-[260px] flex items-center justify-center">
    <svg className="absolute inset-0 w-full h-full pointer-events-none">
      <defs>
        <filter id="wf-glow">
          <feGaussianBlur stdDeviation="2" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {/* Design → Components */}
      <path
        d="M 155 90 C 200 90, 200 90, 240 90"
        fill="none"
        stroke="#22C55E"
        strokeWidth="2.5"
        filter="url(#wf-glow)"
      />
      {/* Auth → Integration */}
      <path
        d="M 155 175 C 200 175, 200 175, 240 175"
        fill="none"
        stroke="#3B82F6"
        strokeWidth="2"
        strokeDasharray="5 4"
      />
      {/* Components → Integration */}
      <path
        d="M 380 90 C 420 90, 420 135, 450 135"
        fill="none"
        stroke="#22C55E"
        strokeWidth="2.5"
        filter="url(#wf-glow)"
      />
      {/* Integration → Launch */}
      <path
        d="M 580 135 C 610 135, 610 135, 640 135"
        fill="none"
        stroke="#EF4444"
        strokeWidth="2"
        strokeDasharray="5 4"
      />
    </svg>

    {[
      { label: 'Design System', status: 'done', color: '#22C55E', x: 10, y: 65 },
      { label: 'Auth Service', status: 'done', color: '#22C55E', x: 10, y: 150 },
      { label: 'Component Lib', status: 'active', color: '#3B82F6', x: 240, y: 65 },
      { label: 'API Integration', status: 'blocked', color: '#EF4444', x: 450, y: 110 },
      { label: 'Beta Launch', status: 'todo', color: '#737373', x: 640, y: 110 },
    ].map(n => (
      <div
        key={n.label}
        className="absolute p-3 rounded-[10px] border bg-[#161616] hover:border-current transition-all cursor-pointer w-[140px]"
        style={{ left: n.x, top: n.y, borderColor: `${n.color}40` }}
      >
        <div className="text-[11px] font-semibold text-[#F3EDE4] mb-1.5 leading-tight">
          {n.label}
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: n.color }} />
          <span className="text-[10px] font-medium" style={{ color: n.color }}>
            {statusMeta[n.status as keyof typeof statusMeta].label}
          </span>
        </div>
      </div>
    ))}
  </div>
);

export const WorkflowModal: React.FC<WorkflowModalProps> = ({ open, onClose }) => {
  const [view, setView] = useState<WorkflowView>('board');

  const views = [
    { id: 'board' as WorkflowView, label: 'Board', icon: <LayoutGrid className="w-4 h-4" /> },
    { id: 'list' as WorkflowView, label: 'List', icon: <Menu className="w-4 h-4" /> },
    {
      id: 'dependency' as WorkflowView,
      label: 'Dependencies',
      icon: <GitBranch className="w-4 h-4" />,
    },
  ];

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="wf-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md"
          />
          <motion.div
            key="wf-modal"
            initial={{ opacity: 0, scale: 0.93, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6 pointer-events-none"
          >
            <div
              className="pointer-events-auto w-full max-w-[800px] max-h-[90vh] overflow-y-auto rounded-[24px] border border-[#333333] bg-[#0F0F0F] shadow-[0_40px_100px_rgba(0,0,0,0.95),_0_0_80px_rgba(232,93,34,0.06)]"
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-8 py-6 border-b border-[#1E1E1E] sticky top-0 bg-[#0F0F0F] z-10">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-[10px] bg-[#E85D22]/15 border border-[#E85D22]/30 flex items-center justify-center">
                    <GitBranch className="w-5 h-5 text-[#E85D22]" />
                  </div>
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#E85D22] mb-0.5">
                      WORKFLOW BUILDER
                    </div>
                    <div className="text-[15px] font-semibold text-[#F3EDE4]">
                      Try it yourself — switch views live
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

              <div className="p-8">
                {/* Hint */}
                <div className="text-[13px] text-[#737373] mb-6">
                  Click a view below to instantly switch between your project's perspectives. No
                  reload, no lag.
                </div>

                {/* Tab bar */}
                <div className="flex gap-2 mb-8 border-b border-[#1E1E1E] pb-5">
                  {views.map(v => (
                    <button
                      key={v.id}
                      onClick={() => setView(v.id)}
                      className={`px-5 py-2.5 rounded-[8px] text-[13px] font-semibold flex items-center gap-2 transition-all ${view === v.id ? 'bg-[#E85D22] text-white shadow-[0_4px_12px_rgba(232,93,34,0.3)]' : 'text-[#A3A3A3] hover:text-white hover:bg-[#1A1A1A]'}`}
                    >
                      {v.icon}
                      {v.label}
                    </button>
                  ))}
                </div>

                {/* View content */}
                <div className="min-h-[280px]">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={view}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                    >
                      {view === 'board' && <BoardPane />}
                      {view === 'list' && <ListPane />}
                      {view === 'dependency' && <DependencyPane />}
                    </motion.div>
                  </AnimatePresence>
                </div>

                {/* Footer CTA */}
                <div className="mt-8 flex items-center justify-between pt-6 border-t border-[#1E1E1E]">
                  <div className="text-[13px] text-[#737373]">
                    <span className="text-[#A3A3A3] font-medium">5 tasks</span> · All views update
                    in real time
                  </div>
                  <button
                    onClick={onClose}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-[8px] bg-[#E85D22] text-white text-[13px] font-semibold hover:bg-[#F0703B] shadow-[0_4px_16px_rgba(232,93,34,0.35)] transition-all"
                  >
                    Start free trial <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
