import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
 variant?:
  | 'default'
  | 'primary'
  | 'success'
  | 'warning'
  | 'danger'
  | 'purple'
  | 'indigo'
  | 'outline';
 size?: 'sm' | 'md';
 dot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
 className,
 variant = 'default',
 size = 'md',
 dot = false,
 children,
 ...props
}) => {
 const baseStyles =
  'inline-flex items-center font-medium tracking-wide rounded-[3px] select-none';

 const sizeStyles = {
  sm: 'px-1.5 py-0.5 text-[10px] gap-1',
  md: 'px-2 py-0.5 text-[11px] gap-1.5',
 };

 const variantStyles = {
  default: 'bg-[#2a2621] text-[#c4bbb0] border border-[#3a342c]',
  primary: 'bg-[#c45c26]/12 text-[#e07a45] border border-[#c45c26]/25',
  success: 'bg-[#3d8b6e]/12 text-[#6fba9a] border border-[#3d8b6e]/25',
  warning: 'bg-[#c4843a]/12 text-[#d4a05a] border border-[#c4843a]/25',
  danger: 'bg-[#c44a4a]/12 text-[#e07a7a] border border-[#c44a4a]/25',
  purple: 'bg-[#2a2621] text-[#c4bbb0] border border-[#3a342c]',
  indigo: 'bg-[#2a2621] text-[#c4bbb0] border border-[#3a342c]',
  outline: 'bg-transparent text-[#9c948a] border border-[#3a342c]',
 };

 const dotColors = {
  default: 'bg-[#9c948a]',
  primary: 'bg-[#c45c26]',
  success: 'bg-[#3d8b6e]',
  warning: 'bg-[#c4843a]',
  danger: 'bg-[#c44a4a]',
  purple: 'bg-[#9c948a]',
  indigo: 'bg-[#9c948a]',
  outline: 'bg-[#9c948a]',
 };

 return (
  <span
   className={twMerge(clsx(baseStyles, sizeStyles[size], variantStyles[variant], className))}
   {...props}
  >
   {dot && <span className={clsx('w-1.5 h-1.5 rounded-full shrink-0', dotColors[variant])} />}
   {children}
  </span>
 );
};
