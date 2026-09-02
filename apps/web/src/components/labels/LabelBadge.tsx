import React from 'react';
import { X } from 'lucide-react';
import { LabelItem } from '@taskflow/shared';

export interface LabelColorConfig {
  bg: string;
  text: string;
  border: string;
  dot: string;
  accent: string;
}

export const LABEL_COLOR_MAP: Record<string, LabelColorConfig> = {
  slate: {
    bg: 'bg-slate-500/10',
    text: 'text-slate-300',
    border: 'border-slate-500/20',
    dot: 'bg-slate-400',
    accent: '#94a3b8',
  },
  gray: {
    bg: 'bg-zinc-500/10',
    text: 'text-zinc-300',
    border: 'border-zinc-500/20',
    dot: 'bg-zinc-400',
    accent: '#a1a1aa',
  },
  red: {
    bg: 'bg-rose-500/10',
    text: 'text-rose-300',
    border: 'border-rose-500/20',
    dot: 'bg-rose-400',
    accent: '#f43f5e',
  },
  orange: {
    bg: 'bg-orange-500/10',
    text: 'text-orange-300',
    border: 'border-orange-500/20',
    dot: 'bg-orange-400',
    accent: '#f97316',
  },
  amber: {
    bg: 'bg-amber-500/10',
    text: 'text-amber-300',
    border: 'border-amber-500/20',
    dot: 'bg-amber-400',
    accent: '#f59e0b',
  },
  yellow: {
    bg: 'bg-yellow-500/10',
    text: 'text-yellow-300',
    border: 'border-yellow-500/20',
    dot: 'bg-yellow-400',
    accent: '#eab308',
  },
  green: {
    bg: 'bg-green-500/10',
    text: 'text-green-300',
    border: 'border-green-500/20',
    dot: 'bg-green-400',
    accent: '#22c55e',
  },
  emerald: {
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-300',
    border: 'border-emerald-500/20',
    dot: 'bg-emerald-400',
    accent: '#10b981',
  },
  teal: {
    bg: 'bg-teal-500/10',
    text: 'text-teal-300',
    border: 'border-teal-500/20',
    dot: 'bg-teal-400',
    accent: '#14b8a6',
  },
  cyan: {
    bg: 'bg-cyan-500/10',
    text: 'text-cyan-300',
    border: 'border-cyan-500/20',
    dot: 'bg-cyan-400',
    accent: '#06b6d4',
  },
  blue: {
    bg: 'bg-blue-500/10',
    text: 'text-blue-300',
    border: 'border-blue-500/20',
    dot: 'bg-blue-400',
    accent: '#3b82f6',
  },
  indigo: {
    bg: 'bg-indigo-500/10',
    text: 'text-indigo-300',
    border: 'border-indigo-500/20',
    dot: 'bg-indigo-400',
    accent: '#6366f1',
  },
  violet: {
    bg: 'bg-violet-500/10',
    text: 'text-violet-300',
    border: 'border-violet-500/20',
    dot: 'bg-violet-400',
    accent: '#8b5cf6',
  },
  purple: {
    bg: 'bg-purple-500/10',
    text: 'text-purple-300',
    border: 'border-purple-500/20',
    dot: 'bg-purple-400',
    accent: '#a855f7',
  },
  pink: {
    bg: 'bg-pink-500/10',
    text: 'text-pink-300',
    border: 'border-pink-500/20',
    dot: 'bg-pink-400',
    accent: '#ec4899',
  },
  rose: {
    bg: 'bg-rose-500/10',
    text: 'text-rose-300',
    border: 'border-rose-500/20',
    dot: 'bg-rose-400',
    accent: '#f43f5e',
  },
};

export function getLabelColors(color?: string): LabelColorConfig {
  if (!color) return LABEL_COLOR_MAP.cyan;
  const normalized = color.toLowerCase();
  return LABEL_COLOR_MAP[normalized] || LABEL_COLOR_MAP.cyan;
}

interface LabelBadgeProps {
  label: Pick<LabelItem, 'name' | 'color'>;
  size?: 'xs' | 'sm' | 'md';
  onRemove?: () => void;
  className?: string;
  interactive?: boolean;
}

export const LabelBadge: React.FC<LabelBadgeProps> = ({
  label,
  size = 'xs',
  onRemove,
  className = '',
  interactive = false,
}) => {
  const colors = getLabelColors(label.color);

  const sizeClasses = {
    xs: 'text-[10px] px-1.5 py-0.5 gap-1 font-medium',
    sm: 'text-xs px-2 py-0.5 gap-1.5 font-medium',
    md: 'text-sm px-2.5 py-1 gap-2 font-medium',
  }[size];

  return (
    <span
      className={`inline-flex items-center rounded-md border transition-colors ${colors.bg} ${colors.text} ${colors.border} ${sizeClasses} ${
        interactive ? 'hover:brightness-125 cursor-pointer' : ''
      } ${className}`}
      title={label.name}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${colors.dot} shrink-0`} />
      <span className="truncate max-w-[120px]">{label.name}</span>
      {onRemove && (
        <button
          type="button"
          onClick={e => {
            e.stopPropagation();
            onRemove();
          }}
          className="hover:opacity-100 opacity-60 transition-opacity ml-0.5 -mr-0.5 p-0.5 rounded-sm hover:bg-black/20 focus:outline-none focus:ring-1 focus:ring-current"
          aria-label={`Remove label ${label.name}`}
        >
          <X className="w-2.5 h-2.5" />
        </button>
      )}
    </span>
  );
};
