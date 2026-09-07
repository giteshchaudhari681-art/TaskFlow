import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'glass' | 'interactive' | 'outline' | 'spotlight';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'default', padding = 'md', children, ...props }, ref) => {
    const baseStyles = 'rounded-xl transition-all duration-200 ease-out relative overflow-hidden';

    const paddingStyles = {
      none: '',
      sm: 'p-3.5 sm:p-4',
      md: 'p-5 sm:p-6',
      lg: 'p-6 sm:p-8',
    };

    const variantStyles = {
      default: 'bg-[#111827] border border-white/[0.08] shadow-sm',
      elevated: 'bg-[#0f172a] border border-white/[0.08] shadow-elevation-2',
      glass:
        'bg-slate-900/70 backdrop-blur-xl border border-white/[0.08] shadow-elevation-2 text-slate-100',
      interactive:
        'bg-[#111827] border border-white/[0.08] shadow-sm hover:border-sky-500/40 hover:shadow-glow-cyan hover:-translate-y-0.5 cursor-pointer',
      outline: 'bg-transparent border border-slate-800 hover:border-slate-700',
      spotlight:
        'bg-gradient-to-b from-slate-900/90 to-slate-900/40 border border-white/[0.1] backdrop-blur-md shadow-elevation-2',
    };

    return (
      <div
        ref={ref}
        className={twMerge(
          clsx(baseStyles, paddingStyles[padding], variantStyles[variant], className)
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';
