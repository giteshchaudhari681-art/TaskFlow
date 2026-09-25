import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, helperText, leftIcon, rightIcon, id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-[#b7afa5]"
          >
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {leftIcon && (
            <div className="absolute left-3 text-[#9c948a] pointer-events-none flex items-center justify-center">
              {leftIcon}
            </div>
          )}
          <input
            id={inputId}
            ref={ref}
            className={twMerge(
              clsx(
                'w-full bg-[#111111] text-[#f3ede4] placeholder-[#7d756c] text-xs sm:text-sm rounded-[6px] border border-[#292929] hover:border-[#3a342c] focus:border-[#E85D22] focus:ring-2 focus:ring-[#E85D22]/20 focus:outline-none transition-all duration-200 py-2 sm:py-2.5',
                leftIcon ? 'pl-9' : 'pl-3.5',
                rightIcon ? 'pr-9' : 'pr-3.5',
                error && 'border-[#c44a4a] focus:border-[#c44a4a] focus:ring-[#c44a4a]/20',
                className
              )
            )}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3 text-[#9c948a] flex items-center justify-center">
              {rightIcon}
            </div>
          )}
        </div>
        {error && <p className="text-xs text-[#e07a7a] font-medium">{error}</p>}
        {helperText && !error && <p className="text-xs text-[#9c948a]">{helperText}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
