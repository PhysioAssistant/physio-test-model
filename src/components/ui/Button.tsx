import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export type Variant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline' | 'lab' | 'clinical' | 'success';
export type Size = 'xs' | 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  isLoading?: boolean;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  icon?: React.ReactNode;
}

const variantStyles: Record<Variant, string> = {
  primary:
    'bg-clinical-600 text-white hover:bg-clinical-700 focus-visible:ring-clinical-500 shadow-sm',
  clinical:
    'bg-clinical-600 text-white hover:bg-clinical-700 focus-visible:ring-clinical-500 shadow-sm',
  secondary:
    'bg-slate-100 text-slate-700 hover:bg-slate-200 focus-visible:ring-slate-400',
  danger:
    'bg-danger text-white hover:bg-danger-dark focus-visible:ring-red-500 shadow-sm',
  success:
    'bg-success text-white hover:bg-success-dark focus-visible:ring-success shadow-sm',
  ghost:
    'bg-transparent text-slate-600 hover:bg-slate-100 focus-visible:ring-slate-400',
  outline:
    'bg-transparent border border-slate-300 text-slate-700 hover:bg-slate-50 focus-visible:ring-slate-400',
  lab:
    'bg-lab-500 text-white hover:bg-lab-600 focus-visible:ring-lab-400 shadow-sm',
};

const sizeStyles: Record<Size, string> = {
  xs: 'px-2.5 py-1.5 text-xs rounded-md gap-1.5',
  sm: 'px-3.5 py-2 text-sm rounded-lg gap-2',
  md: 'px-5 py-2.5 text-sm rounded-lg gap-2',
  lg: 'px-6 py-3 text-base rounded-xl gap-2.5',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      isLoading = false,
      loading,
      leftIcon,
      rightIcon,
      icon,
      children,
      className,
      disabled,
      ...props
    },
    ref,
  ) => {
    const isBusy = isLoading || Boolean(loading);
    const leadIcon = leftIcon || icon;

    return (
      <button
        ref={ref}
        disabled={disabled || isBusy}
        className={cn(
          'inline-flex items-center justify-center font-medium transition-all duration-150',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          'active:scale-[0.98]',
          variantStyles[variant],
          sizeStyles[size],
          className,
        )}
        {...props}
      >
        {isBusy ? (
          <Loader2 size={14} className="animate-spin shrink-0" />
        ) : leadIcon ? (
          <span className="shrink-0">{leadIcon}</span>
        ) : null}
        {children}
        {rightIcon && !isBusy && (
          <span className="shrink-0">{rightIcon}</span>
        )}
      </button>
    );
  },
);

Button.displayName = 'Button';
