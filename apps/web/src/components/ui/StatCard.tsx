import React from 'react';
import { clsx } from 'clsx';

export interface StatCardProps {
  title: string;
  value: string | number;
  change?: string;
  trend?: 'up' | 'down' | 'neutral';
  icon?: React.ReactNode;
  description?: string;
  accentColor?: 'cyan' | 'indigo' | 'purple' | 'emerald' | 'amber';
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  change,
  trend = 'neutral',
  icon,
  description,
  accentColor = 'cyan',
  className,
}) => {
  const accentGlows = {
    cyan: 'from-sky-500/10 via-transparent to-transparent border-sky-500/20 text-sky-400',
    indigo:
      'from-indigo-500/10 via-transparent to-transparent border-indigo-500/20 text-indigo-400',
    purple:
      'from-purple-500/10 via-transparent to-transparent border-purple-500/20 text-purple-400',
    emerald:
      'from-emerald-500/10 via-transparent to-transparent border-emerald-500/20 text-emerald-400',
    amber: 'from-amber-500/10 via-transparent to-transparent border-amber-500/20 text-amber-400',
  };

  return (
    <div
      className={clsx(
        'relative group overflow-hidden rounded-xl bg-slate-900/80 backdrop-blur-xl border border-white/[0.08] p-5 sm:p-6 transition-all duration-300 hover:border-white/20 hover:-translate-y-1 hover:shadow-elevation-3',
        className
      )}
    >
      {/* Background Accent Ambient Gradient */}
      <div
        className={clsx(
          'absolute -top-12 -right-12 w-32 h-32 rounded-full bg-gradient-to-br opacity-50 blur-2xl transition-opacity duration-300 group-hover:opacity-100',
          accentGlows[accentColor]
        )}
      />

      <div className="flex items-center justify-between gap-3 mb-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 font-display">
          {title}
        </span>
        {icon && (
          <div
            className={clsx(
              'p-2 rounded-lg bg-slate-800/80 border border-white/5 text-slate-300 transition-colors group-hover:text-white',
              accentGlows[accentColor].split(' ').pop()
            )}
          >
            {icon}
          </div>
        )}
      </div>

      <div className="flex items-baseline justify-between gap-2">
        <div className="text-2xl sm:text-3xl lg:text-4xl font-extrabold font-display tracking-tight text-white">
          {value}
        </div>
        {change && (
          <span
            className={clsx(
              'text-xs font-semibold px-2 py-0.5 rounded-full border',
              trend === 'up' && 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
              trend === 'down' && 'bg-rose-500/10 text-rose-400 border-rose-500/20',
              trend === 'neutral' && 'bg-slate-800 text-slate-300 border-slate-700'
            )}
          >
            {change}
          </span>
        )}
      </div>

      {description && <p className="mt-2 text-xs text-slate-400">{description}</p>}
    </div>
  );
};
