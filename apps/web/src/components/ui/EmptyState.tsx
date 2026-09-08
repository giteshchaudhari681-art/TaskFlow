import React from 'react';
import { clsx } from 'clsx';
import { Button } from './Button';

export interface EmptyStateProps {
 icon: React.ReactNode;
 title: string;
 description: string;
 actionLabel?: string;
 onAction?: () => void;
 className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
 icon,
 title,
 description,
 actionLabel,
 onAction,
 className,
}) => {
 return (
  <div className={clsx('flex flex-col items-start text-left py-12 px-1', className)}>
   <div className="text-[#c45c26] mb-4">{icon}</div>
   <h3 className="font-display text-xl font-medium text-[#f3ede4] mb-2">{title}</h3>
   <p className="text-sm text-[#9c948a] max-w-md mb-6 leading-relaxed">{description}</p>
   {actionLabel && onAction && (
    <Button variant="primary" size="sm" onClick={onAction}>
     {actionLabel}
    </Button>
   )}
  </div>
 );
};
