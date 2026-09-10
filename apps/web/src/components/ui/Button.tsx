import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'glass' | 'ghost' | 'danger' | 'outline';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'secondary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      children,
      disabled,
      type = 'button',
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium transition-[background-color,border-color,color,box-shadow] duration-150 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c45c26]/50 disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none select-none';

    const sizeStyles = {
      sm: 'px-2.5 py-1.5 text-xs rounded-[4px] gap-1.5',
      md: 'px-3.5 py-2 text-xs sm:text-sm rounded-[4px] gap-2',
      lg: 'px-5 py-2.5 text-sm rounded-[4px] gap-2.5',
      icon: 'p-2 rounded-[4px] text-sm',
    };

    const variantStyles = {
      primary:
        'bg-[#c45c26] hover:bg-[#a84d20] text-[#fff8f2] border border-[#a84d20] font-semibold',
      secondary: 'bg-[#2a2621] text-[#f3ede4] hover:bg-[#322d27] border border-[#3a342c]',
      glass:
        'bg-[#211e1a] text-[#e8e0d6] hover:text-[#f3ede4] border border-[#3a342c] hover:border-[#4a4339]',
      outline:
        'bg-transparent text-[#e8e0d6] hover:text-[#f3ede4] border border-[#3a342c] hover:border-[#4a4339] hover:bg-[#1a1714]',
      ghost:
        'bg-transparent text-[#9c948a] hover:text-[#f3ede4] hover:bg-[#1c1916] border border-transparent',
      danger: 'bg-[#c44a4a] hover:bg-[#a83d3d] text-white border border-[#8f3333] font-semibold',
    };

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || isLoading}
        className={twMerge(clsx(baseStyles, sizeStyles[size], variantStyles[variant], className))}
        {...props}
      >
        {isLoading ? (
          <svg
            className="animate-spin -ml-1 mr-2 h-4 w-4 text-current"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
        ) : (
          leftIcon
        )}
        {children}
        {!isLoading && rightIcon}
      </button>
    );
  }
);

Button.displayName = 'Button';
