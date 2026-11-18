import { cn } from '@/lib/utils';

/* ── Spinner ── */
interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const spinnerSizes = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-8 h-8', xl: 'w-12 h-12' };

export function Spinner({ size = 'md', className }: SpinnerProps) {
  return (
    <svg
      className={cn('animate-spin text-brand-500', spinnerSizes[size], className)}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

/* ── Page Loader (full screen) ── */
export function PageLoader({ message = 'Loading…' }: { message?: string }) {
  return (
    <div className="fixed inset-0 z-40 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm gap-4">
      <Spinner size="lg" />
      <p className="text-sm text-slate-500 animate-pulse">{message}</p>
    </div>
  );
}

/* ── Skeleton line ── */
interface SkeletonProps {
  className?: string;
  width?: string;
}

export function Skeleton({ className, width = '100%' }: SkeletonProps) {
  return (
    <div
      style={{ width }}
      className={cn('h-3 bg-slate-200 rounded-full animate-pulse', className)}
    />
  );
}

/* ── Card Skeleton ── */
export function CardSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="bg-white rounded-xl border border-slate-100 p-5 shadow-xs space-y-3">
      <Skeleton width="40%" className="h-4" />
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} width={`${100 - i * 15}%`} />
      ))}
    </div>
  );
}

/* ── Inline Loading text ── */
export function LoadingText({ children = 'Loading' }: { children?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-sm text-slate-500">
      <Spinner size="sm" />
      {children}…
    </span>
  );
}

/* ── Lab-themed dark page loader ── */
export function LabLoader({ message = 'Running evaluation…' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4">
      <div className="relative">
        <Spinner size="xl" className="text-lab-400" />
      </div>
      <p className="text-sm text-slate-400 animate-pulse font-mono">{message}</p>
    </div>
  );
}

/* ── Progress Bar ── */
interface ProgressBarProps {
  value: number; // 0-100
  label?: string;
  variant?: 'brand' | 'clinical' | 'lab' | 'success' | 'danger';
  showLabel?: boolean;
  size?: 'sm' | 'md';
}

const progressVariants = {
  brand:    'bg-brand-500',
  clinical: 'bg-clinical-600',
  lab:      'bg-lab-500',
  success:  'bg-success',
  danger:   'bg-danger',
};

export function ProgressBar({ value, label, variant = 'brand', showLabel = false, size = 'md' }: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, value));

  return (
    <div className="w-full">
      {(label || showLabel) && (
        <div className="flex justify-between items-center mb-1">
          {label && <span className="text-xs text-slate-500">{label}</span>}
          {showLabel && <span className="text-xs font-mono text-slate-600">{clamped}%</span>}
        </div>
      )}
      <div className={cn('w-full bg-slate-100 rounded-full overflow-hidden', size === 'sm' ? 'h-1.5' : 'h-2.5')}>
        <div
          className={cn('h-full rounded-full transition-all duration-500', progressVariants[variant])}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}
