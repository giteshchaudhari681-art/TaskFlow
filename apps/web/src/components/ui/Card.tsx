import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'glass' | 'interactive' | 'outline' | 'spotlight';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'default', padding = 'md', children, ...props }, ref) => {
    const baseStyles = 'rounded-[6px] relative';

    const paddingStyles = {
      none: '',
      sm: 'p-3.5 sm:p-4',
      md: 'p-5',
      lg: 'p-6 sm:p-8',
    };

    const variantStyles = {
      default: 'bg-[#211e1a] border border-[#3a342c]',
      elevated: 'bg-[#2a2621] border border-[#3a342c] shadow-elevation-2',
      glass: 'bg-[#211e1a] border border-[#3a342c] text-[#f3ede4]',
      interactive:
        'bg-[#211e1a] border border-[#3a342c] hover:border-[#4a4339] hover:bg-[#2a2621] cursor-pointer transition-colors duration-150',
      outline: 'bg-transparent border border-[#3a342c]',
      spotlight: 'bg-[#1a1714] border border-[#3a342c]',
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
