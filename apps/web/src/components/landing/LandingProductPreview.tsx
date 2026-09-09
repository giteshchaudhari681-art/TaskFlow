import React, { useRef, useState } from 'react';
import { FeaturesModal } from './FeaturesModal';
import {
  Check,
  ArrowRight,
  Search,
  Menu,
  MessageSquare,
  Paperclip,
  LayoutGrid,
  CheckCircle2,
  AlertCircle,
  Clock,
} from 'lucide-react';
import {
  motion,
  useScroll,
  useTransform,
  useSpring,
  useMotionValue,
  AnimatePresence,
  type Variants,
} from 'framer-motion';

type ViewType = 'board' | 'list' | 'calendar' | 'timeline';

const TASKS = [
  {
    t: 'Design new dashboard',
    p: 'High',
    pc: 'text-[#E85D22]',
    pbg: 'bg-[#E85D22]/15',
    status: 'In Progress',
    assignee: 1,
    done: false,
  },
  {
    t: 'Implement API endpoints',
    p: 'High',
    pc: 'text-[#E85D22]',
    pbg: 'bg-[#E85D22]/15',
    status: 'In Progress',
    assignee: 2,
    done: false,
  },
  {
    t: 'Write documentation',
    p: 'Medium',
    pc: 'text-[#F59E0B]',
    pbg: 'bg-[#F59E0B]/15',
    status: 'To Do',
    assignee: 3,
    done: false,
  },
  {
    t: 'Set up CI/CD pipeline',
    p: 'Medium',
    pc: 'text-[#F59E0B]',
    pbg: 'bg-[#F59E0B]/15',
    status: 'To Do',
    assignee: 1,
    done: false,
  },
  {
    t: 'Fix performance issue',
    p: 'High',
    pc: 'text-[#E85D22]',
    pbg: 'bg-[#E85D22]/15',
    status: 'Review',
    assignee: 4,
    done: false,
  },
  {
    t: 'Launch v1.0',
    p: 'High',
    pc: 'text-[#E85D22]',
    pbg: 'bg-[#E85D22]/15',
    status: 'Done',
    assignee: 2,
    done: true,
  },
  {
    t: 'Marketing site',
    p: 'Medium',
    pc: 'text-[#F59E0B]',
    pbg: 'bg-[#F59E0B]/15',
    status: 'Done',
    assignee: 3,
    done: true,
  },
  {
    t: 'Research competitors',
    p: 'Low',
    pc: 'text-[#22C55E]',
    pbg: 'bg-[#22C55E]/15',
    status: 'To Do',
    assignee: 1,
    done: false,
  },
];

const statusColor: Record<string, string> = {
  'To Do': 'text-[#A3A3A3]',
  'In Progress': 'text-[#3B82F6]',
  Review: 'text-[#A855F7]',
  Done: 'text-[#22C55E]',
};

const viewVariants: Variants = {
  enter: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.2 } },
};

/* ─── Board View ─── */
const BoardView: React.FC = () => (
  <div className="grid grid-cols-4 gap-6">
    {[
      {
        title: 'To Do',
        count: 12,
        border: 'border-t-[#E85D22]',
        items: [
          {
            t: 'Design new dashboard',
            p: 'High',
            c: 'text-[#E85D22]',
            bg: 'bg-[#E85D22]/15',
            comments: 3,
            att: 2,
          },
          {
            t: 'Set up CI/CD',
            p: 'Medium',
            c: 'text-[#F59E0B]',
            bg: 'bg-[#F59E0B]/15',
            comments: 1,
            att: 0,
          },
          {
            t: 'Research competitors',
            p: 'Low',
            c: 'text-[#22C55E]',
            bg: 'bg-[#22C55E]/15',
            comments: 8,
            att: 1,
          },
        ],
      },
      {
        title: 'In Progress',
        count: 6,
        border: 'border-t-[#3B82F6]',
        items: [
          {
            t: 'Implement API',
            p: 'High',
            c: 'text-[#E85D22]',
            bg: 'bg-[#E85D22]/15',
            comments: 12,
            att: 4,
          },
          {
            t: 'Write documentation',
            p: 'Medium',
            c: 'text-[#F59E0B]',
            bg: 'bg-[#F59E0B]/15',
            comments: 2,
            att: 0,
          },
          {
            t: 'User testing',
            p: 'Low',
            c: 'text-[#22C55E]',
            bg: 'bg-[#22C55E]/15',
            comments: 0,
            att: 0,
          },
        ],
      },
      {
        title: 'Review',
        count: 4,
        border: 'border-t-[#A855F7]',
        items: [
          {
            t: 'Fix performance issue',
            p: 'High',
            c: 'text-[#E85D22]',
            bg: 'bg-[#E85D22]/15',
            comments: 5,
            att: 1,
          },
          {
            t: 'Update dependencies',
            p: 'Medium',
            c: 'text-[#F59E0B]',
            bg: 'bg-[#F59E0B]/15',
            comments: 0,
            att: 0,
          },
        ],
      },
      {
        title: 'Done',
        count: 18,
        border: 'border-t-[#22C55E]',
        items: [
          {
            t: 'Launch v1.0',
            p: 'High',
            c: 'text-[#E85D22]',
            bg: 'bg-[#E85D22]/15',
            comments: 24,
            att: 8,
          },
          {
            t: 'Marketing site',
            p: 'Medium',
            c: 'text-[#F59E0B]',
            bg: 'bg-[#F59E0B]/15',
            comments: 3,
            att: 2,
          },
          {
            t: 'Post-launch review',
            p: 'Low',
            c: 'text-[#22C55E]',
            bg: 'bg-[#22C55E]/15',
            comments: 1,
            att: 0,
          },
        ],
      },
    ].map((col, i) => (
      <div key={i} className={`pt-4 border-t-2 ${col.border}`}>
        <div className="flex items-center justify-between mb-6">
          <span className="text-[14px] font-semibold text-[#F3EDE4] tracking-wide">
            {col.title}
          </span>
          <span className="text-[12px] font-bold text-[#A3A3A3] bg-[#1A1A1A] px-2.5 py-0.5 rounded-[4px] border border-[#333333]">
            {col.count}
          </span>
        </div>
        <div className="space-y-4">
          {col.items.map((item, j) => (
            <div
              key={j}
              className="p-5 bg-[#161616] border border-[#262626] rounded-[10px] shadow-[0_4px_16px_rgba(0,0,0,0.5)] hover:-translate-y-1 hover:border-[#333333] transition-all cursor-pointer group"
            >
              <p className="text-[14px] font-medium text-[#F3EDE4] mb-5 leading-snug group-hover:text-white transition-colors">
                {item.t}
              </p>
              <div className="flex items-center justify-between mb-4">
                <span
                  className={`px-2 py-0.5 rounded-[4px] text-[10px] font-bold tracking-wide uppercase ${item.c} ${item.bg}`}
                >
                  {item.p}
                </span>
              </div>
              <div className="flex items-center justify-between border-t border-[#262626] pt-3 mt-3">
                <div className="flex items-center gap-3">
                  {item.comments > 0 && (
                    <div className="flex items-center gap-1 text-[#737373] text-[11px] font-medium">
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>{item.comments}</span>
                    </div>
                  )}
                  {item.att > 0 && (
                    <div className="flex items-center gap-1 text-[#737373] text-[11px] font-medium">
                      <Paperclip className="w-3.5 h-3.5" />
                      <span>{item.att}</span>
                    </div>
                  )}
                </div>
                <div className="w-6 h-6 rounded-full bg-[#262626] border-2 border-[#161616] shrink-0 overflow-hidden">
                  <img
                    src={`https://api.dicebear.com/7.x/notionists/svg?seed=${i * 3 + j}&backgroundColor=transparent`}
                    alt=""
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    ))}
  </div>
);

/* ─── List View ─── */
const ListView: React.FC = () => (
  <div className="space-y-1">
    <div className="grid grid-cols-[1fr_100px_90px_80px] gap-4 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.1em] text-[#737373] border-b border-[#262626] mb-2">
      <span>Task</span>
      <span>Status</span>
      <span>Priority</span>
      <span>Assignee</span>
    </div>
    {TASKS.map((task, i) => (
      <div
        key={i}
        className="grid grid-cols-[1fr_100px_90px_80px] gap-4 px-4 py-3.5 rounded-[8px] bg-[#111111] border border-[#1E1E1E] hover:border-[#333333] hover:bg-[#161616] transition-all cursor-pointer group items-center"
      >
        <div className="flex items-center gap-3">
          <div
            className={`w-4 h-4 rounded-[4px] border flex items-center justify-center shrink-0 ${task.done ? 'bg-[#22C55E]/20 border-[#22C55E]/50' : 'border-[#404040]'}`}
          >
            {task.done && <Check className="w-2.5 h-2.5 text-[#22C55E]" strokeWidth={3} />}
          </div>
          <span
            className={`text-[13px] font-medium group-hover:text-white transition-colors ${task.done ? 'line-through text-[#737373]' : 'text-[#E5E5E5]'}`}
          >
            {task.t}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {task.status === 'Done' ? (
            <CheckCircle2 className="w-3.5 h-3.5 text-[#22C55E]" />
          ) : task.status === 'Review' ? (
            <AlertCircle className="w-3.5 h-3.5 text-[#A855F7]" />
          ) : task.status === 'In Progress' ? (
            <Clock className="w-3.5 h-3.5 text-[#3B82F6]" />
          ) : (
            <div className="w-3.5 h-3.5 rounded-full border border-[#737373]" />
          )}
          <span className={`text-[12px] font-medium ${statusColor[task.status]}`}>
            {task.status}
          </span>
        </div>
        <span
          className={`text-[11px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-[4px] w-fit ${task.pc} ${task.pbg}`}
        >
          {task.p}
        </span>
        <div className="w-6 h-6 rounded-full bg-[#262626] border border-[#333333] overflow-hidden">
          <img
            src={`https://api.dicebear.com/7.x/notionists/svg?seed=${task.assignee}&backgroundColor=transparent`}
            alt=""
          />
        </div>
      </div>
    ))}
  </div>
);

/* ─── Calendar View ─── */
const CalendarView: React.FC = () => {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const events: Record<number, { label: string; color: string }[]> = {
    2: [{ label: 'Design Review', color: 'bg-[#3B82F6]/20 border-[#3B82F6]/40 text-[#93C5FD]' }],
    5: [
      { label: 'API Sprint', color: 'bg-[#E85D22]/20 border-[#E85D22]/40 text-[#FDBA74]' },
      { label: 'Stand-up', color: 'bg-[#A855F7]/20 border-[#A855F7]/40 text-[#D8B4FE]' },
    ],
    9: [{ label: 'Launch v1.0', color: 'bg-[#22C55E]/20 border-[#22C55E]/40 text-[#86EFAC]' }],
    12: [{ label: 'Marketing', color: 'bg-[#F59E0B]/20 border-[#F59E0B]/40 text-[#FCD34D]' }],
    15: [{ label: 'Retro', color: 'bg-[#3B82F6]/20 border-[#3B82F6]/40 text-[#93C5FD]' }],
    19: [{ label: 'API Sprint', color: 'bg-[#E85D22]/20 border-[#E85D22]/40 text-[#FDBA74]' }],
    22: [
      { label: 'User Testing', color: 'bg-[#A855F7]/20 border-[#A855F7]/40 text-[#D8B4FE]' },
      { label: 'Review', color: 'bg-[#22C55E]/20 border-[#22C55E]/40 text-[#86EFAC]' },
    ],
    27: [{ label: 'Planning', color: 'bg-[#F59E0B]/20 border-[#F59E0B]/40 text-[#FCD34D]' }],
  };
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <span className="text-[15px] font-semibold text-[#F3EDE4]">September 2026</span>
        <div className="flex gap-2">
          <button className="w-7 h-7 rounded-[6px] bg-[#1A1A1A] border border-[#333333] flex items-center justify-center text-[#A3A3A3] hover:text-white transition-colors text-[12px]">
            ‹
          </button>
          <button className="w-7 h-7 rounded-[6px] bg-[#1A1A1A] border border-[#333333] flex items-center justify-center text-[#A3A3A3] hover:text-white transition-colors text-[12px]">
            ›
          </button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1 mb-1">
        {days.map(d => (
          <div
            key={d}
            className="text-center text-[11px] font-bold text-[#737373] py-2 uppercase tracking-wide"
          >
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: 35 }, (_, idx) => {
          const day = idx - 0; // September starts on Monday
          const num = day + 1;
          const isToday = num === 9;
          const evts = events[num] ?? [];
          return (
            <div
              key={idx}
              className={`min-h-[70px] rounded-[6px] p-1.5 border transition-all cursor-pointer ${isToday ? 'border-[#E85D22]/50 bg-[#E85D22]/05' : 'border-[#1E1E1E] hover:border-[#333333] bg-[#111111]'} ${num < 1 || num > 30 ? 'opacity-0 pointer-events-none' : ''}`}
            >
              <span
                className={`text-[11px] font-bold ${isToday ? 'text-[#E85D22]' : 'text-[#737373]'}`}
              >
                {num >= 1 && num <= 30 ? num : ''}
              </span>
              <div className="mt-1 space-y-0.5">
                {evts.map((e, ei) => (
                  <div
                    key={ei}
                    className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-[3px] border truncate ${e.color}`}
                  >
                    {e.label}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* ─── Timeline View ─── */
const TimelineView: React.FC = () => {
  const rows = [
    {
      name: 'Design',
      tasks: [
        { label: 'UI Design', start: 0, width: 25, color: 'bg-[#3B82F6]/60 border-[#3B82F6]' },
        { label: 'Prototype', start: 20, width: 20, color: 'bg-[#A855F7]/60 border-[#A855F7]' },
      ],
    },
    {
      name: 'Frontend',
      tasks: [
        { label: 'Component Lib', start: 15, width: 30, color: 'bg-[#E85D22]/60 border-[#E85D22]' },
        { label: 'Integration', start: 45, width: 25, color: 'bg-[#F59E0B]/60 border-[#F59E0B]' },
      ],
    },
    {
      name: 'Backend',
      tasks: [
        { label: 'API v1', start: 10, width: 35, color: 'bg-[#22C55E]/60 border-[#22C55E]' },
        { label: 'Auth Service', start: 30, width: 20, color: 'bg-[#3B82F6]/60 border-[#3B82F6]' },
      ],
    },
    {
      name: 'QA',
      tasks: [
        { label: 'Unit Tests', start: 40, width: 20, color: 'bg-[#A855F7]/60 border-[#A855F7]' },
        { label: 'E2E Tests', start: 60, width: 20, color: 'bg-[#E85D22]/60 border-[#E85D22]' },
      ],
    },
    {
      name: 'Launch',
      tasks: [
        { label: 'Beta Release', start: 65, width: 15, color: 'bg-[#22C55E]/60 border-[#22C55E]' },
        { label: 'v1.0', start: 80, width: 15, color: 'bg-[#F59E0B]/60 border-[#F59E0B]' },
      ],
    },
  ];
  const months = ['Sep', 'Oct', 'Nov', 'Dec'];
  return (
    <div>
      {/* Header months */}
      <div className="flex ml-[90px] mb-3">
        {months.map(m => (
          <div
            key={m}
            className="flex-1 text-center text-[11px] font-bold text-[#737373] uppercase tracking-wider border-l border-[#262626] pl-2"
          >
            {m}
          </div>
        ))}
      </div>
      {/* Today line */}
      <div className="relative">
        <div className="absolute top-0 bottom-0 left-[calc(90px_+_20%)] w-[2px] bg-[#E85D22]/60 z-10 pointer-events-none">
          <div className="w-2 h-2 rounded-full bg-[#E85D22] -ml-[3px] -mt-1" />
        </div>
        <div className="space-y-2">
          {rows.map((row, ri) => (
            <div key={ri} className="flex items-center gap-0 h-10">
              <div className="w-[90px] shrink-0 text-[12px] font-medium text-[#A3A3A3] pr-3 text-right">
                {row.name}
              </div>
              <div className="flex-1 relative h-full bg-[#0D0D0D] border border-[#1E1E1E] rounded-[6px] overflow-hidden">
                <div
                  className="absolute inset-0"
                  style={{
                    backgroundImage: 'linear-gradient(to right, #1a1a1a 1px, transparent 1px)',
                    backgroundSize: '25% 100%',
                  }}
                />
                {row.tasks.map((t, ti) => (
                  <div
                    key={ti}
                    className={`absolute top-1 bottom-1 rounded-[4px] border flex items-center px-2 text-[11px] font-semibold text-white/90 ${t.color} backdrop-blur-sm shadow-[0_2px_8px_rgba(0,0,0,0.4)] cursor-pointer hover:brightness-125 transition-all`}
                    style={{ left: `${t.start}%`, width: `${t.width}%` }}
                  >
                    <span className="truncate">{t.label}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/* ─── Main Component ─── */
export const LandingProductPreview: React.FC = () => {
  const [activeView, setActiveView] = useState<ViewType>('board');
  const [featuresOpen, setFeaturesOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start end', 'end start'],
  });
  const y = useTransform(scrollYProgress, [0, 1], [50, -50]);

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const smoothX = useSpring(mouseX, { damping: 50, stiffness: 400 });
  const smoothY = useSpring(mouseY, { damping: 50, stiffness: 400 });
  const rotateX = useTransform(smoothY, [-0.5, 0.5], [4, 0]);
  const rotateY = useTransform(smoothX, [-0.5, 0.5], [-8, -4]);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const { left, top, width, height } = containerRef.current.getBoundingClientRect();
    mouseX.set((e.clientX - left) / width - 0.5);
    mouseY.set((e.clientY - top) / height - 0.5);
  };
  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  const views: { id: ViewType; label: string; icon: React.ReactNode }[] = [
    { id: 'board', label: 'Board', icon: <LayoutGrid className="w-4 h-4" /> },
    { id: 'list', label: 'List', icon: <Menu className="w-4 h-4" /> },
    {
      id: 'calendar',
      label: 'Calendar',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      ),
    },
    {
      id: 'timeline',
      label: 'Timeline',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M4 6h16M4 12h16M4 18h7"
          />
        </svg>
      ),
    },
  ];

  return (
    <section
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      id="product"
      className="py-32 relative overflow-hidden bg-[#0A0A0A]"
    >
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1400px] h-[1000px] bg-[#E85D22]/[0.02] rounded-full blur-[160px] pointer-events-none" />

      <div className="max-w-[1400px] mx-auto px-6 relative z-10">
        <div className="grid lg:grid-cols-[1fr,1.4fr] gap-20 lg:gap-16 items-center">
          {/* Left Column */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col items-start"
          >
            <div className="flex items-center gap-2.5 mb-8">
              <span className="text-[12px] font-bold uppercase tracking-[0.25em] text-[#3B82F6]">
                PRODUCT OVERVIEW
              </span>
            </div>
            <h2 className="font-display text-[clamp(3rem,4.5vw,4rem)] font-medium tracking-tight leading-[1.05] mb-8 text-[#F3EDE4]">
              The operations platform your team actually wants to use.
            </h2>
            <p className="text-[1.2rem] text-[#A3A3A3] leading-relaxed mb-12 max-w-[480px] font-sans">
              TaskFlow combines powerful project management with AI-driven intelligence, so you can
              move faster without the chaos.
            </p>
            <ul className="space-y-6 mb-14">
              {[
                'Visualize work your way',
                'Get AI-powered recommendations',
                'Keep everyone aligned',
                'Scale from small teams to enterprise',
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-5">
                  <div className="w-6 h-6 rounded-[6px] bg-[#E85D22] flex items-center justify-center shrink-0 shadow-[0_2px_12px_rgba(232,93,34,0.4)]">
                    <Check className="w-4 h-4 text-white stroke-[3]" />
                  </div>
                  <span className="text-[#F3EDE4] text-[16px] font-medium">{item}</span>
                </li>
              ))}
            </ul>
            <button
              onClick={() => setFeaturesOpen(true)}
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-[8px] bg-[#E85D22] text-white text-[15px] font-semibold hover:bg-[#F0703B] shadow-[0_4px_20px_rgba(232,93,34,0.35)] hover:shadow-[0_6px_28px_rgba(232,93,34,0.45)] transition-all hover:-translate-y-[1px]"
            >
              Explore features
              <ArrowRight className="w-4 h-4" />
            </button>
          </motion.div>

          {/* Right Column - Interactive UI Panel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 60 }}
            whileInView={{ opacity: 1, scale: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
            className="relative perspective-[1400px] hidden lg:block"
          >
            <motion.div
              style={{ y, rotateX, rotateY }}
              className="relative w-[130%] rounded-[16px] border border-[#333333] bg-[#0F0F0F] shadow-[0_60px_120px_rgba(0,0,0,0.9),_0_0_80px_rgba(232,93,34,0.06),_inset_0_1px_0_rgba(255,255,255,0.08)] overflow-hidden preserve-3d"
            >
              {/* Top bar */}
              <div className="h-16 border-b border-[#262626] bg-[#161616] flex items-center px-6 justify-between">
                <div className="flex items-center gap-4 w-96 h-10 bg-[#0A0A0A] border border-[#262626] rounded-[8px] px-4">
                  <Search className="w-4 h-4 text-[#737373]" />
                  <span className="text-[13px] text-[#737373]">
                    Search tasks, projects, or people...
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-full bg-[#262626] overflow-hidden border border-[#333333]">
                    <img
                      src="https://api.dicebear.com/7.x/notionists/svg?seed=Alice&backgroundColor=transparent"
                      alt="Avatar"
                      className="w-full h-full"
                    />
                  </div>
                </div>
              </div>

              <div className="p-8 bg-[#0A0A0A] min-h-[580px]">
                {/* View Toggle Tabs */}
                <div className="flex gap-2 mb-10 border-b border-[#262626] pb-4">
                  {views.map(v => (
                    <button
                      key={v.id}
                      onClick={() => setActiveView(v.id)}
                      className={`px-5 py-2.5 rounded-[6px] text-[14px] font-medium flex items-center gap-2 transition-all cursor-pointer ${
                        activeView === v.id
                          ? 'bg-[#E85D22] text-white font-semibold shadow-[0_4px_12px_rgba(232,93,34,0.3)]'
                          : 'text-[#A3A3A3] hover:text-[#F3EDE4] hover:bg-[#1A1A1A]'
                      }`}
                    >
                      {v.icon}
                      {v.label}
                    </button>
                  ))}
                </div>

                {/* Animated View Content */}
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeView}
                    variants={viewVariants}
                    initial="enter"
                    animate="visible"
                    exit="exit"
                  >
                    {activeView === 'board' && <BoardView />}
                    {activeView === 'list' && <ListView />}
                    {activeView === 'calendar' && <CalendarView />}
                    {activeView === 'timeline' && <TimelineView />}
                  </motion.div>
                </AnimatePresence>
              </div>
            </motion.div>

            {/* Handwriting annotation */}
            <div className="absolute -left-20 top-1/2 -translate-y-1/2 opacity-90 z-20 pointer-events-none drop-shadow-xl">
              <p className="font-['Caveat',_cursive] text-[36px] text-[#A3A3A3] -rotate-12 leading-none whitespace-nowrap">
                Organize
                <br />
                Focus
                <br />
                Deliver
              </p>
              <svg
                className="w-20 h-20 ml-20 -mt-2 opacity-60"
                viewBox="0 0 100 100"
                fill="none"
                stroke="#A3A3A3"
                strokeWidth="2.5"
                strokeLinecap="round"
              >
                <path d="M10,10 Q50,40 90,80" />
                <path d="M70,85 L90,80 L80,65" />
              </svg>
            </div>
          </motion.div>
        </div>
      </div>
      <FeaturesModal open={featuresOpen} onClose={() => setFeaturesOpen(false)} />
    </section>
  );
};
