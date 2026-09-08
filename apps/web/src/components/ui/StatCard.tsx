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
 description,
 className,
}) => {
 return (
  <div className={clsx('pr-6 py-1', className)}>
   <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#9c948a] mb-2">
    {title}
   </div>
   <div className="flex items-baseline gap-3">
    <div className="font-display text-[2rem] font-medium tabular-nums tracking-tight text-[#f3ede4] leading-none">
     {value}
    </div>
    {change && (
     <span
      className={clsx(
       'text-[11px]',
       trend === 'up' && 'text-[#6fba9a]',
       trend === 'down' && 'text-[#e07a7a]',
       trend === 'neutral' && 'text-[#9c948a]'
      )}
     >
      {change}
     </span>
    )}
   </div>
   {description && <p className="mt-2 text-xs text-[#9c948a] leading-relaxed">{description}</p>}
  </div>
 );
};
