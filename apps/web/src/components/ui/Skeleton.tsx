import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'circular' | 'rectangular';
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className,
  variant = 'rectangular',
  ...props
}) => {
  return (
    <div
      className={twMerge(
        clsx(
          'animate-shimmer rounded-lg border border-white/[0.04]',
          variant === 'circular' && 'rounded-full',
          variant === 'text' && 'h-4 w-3/4 my-1',
          className
        )
      )}
      {...props}
    />
  );
};
