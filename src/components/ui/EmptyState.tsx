import type { ReactNode } from 'react';
import {
  FolderOpen,
  FlaskConical,
  SearchX,
  AlertCircle,
  WifiOff,
  ShieldOff,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './Button';

/* ── Generic Empty State ── */
interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'outline' | 'lab';
  };
  className?: string;
  variant?: 'default' | 'lab';
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
  variant = 'default',
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center py-16 px-8',
        'rounded-xl border border-dashed',
        variant === 'lab'
          ? 'border-slate-700 bg-slate-900/30'
          : 'border-slate-200 bg-slate-50/50',
        className,
      )}
    >
      <div
        className={cn(
          'p-4 rounded-2xl mb-4',
          variant === 'lab' ? 'bg-slate-800 text-slate-500' : 'bg-white text-slate-300 shadow-xs border border-slate-100',
        )}
      >
        {icon ?? <FolderOpen size={28} />}
      </div>
      <h3
        className={cn(
          'font-semibold text-base mb-1',
          variant === 'lab' ? 'text-slate-300' : 'text-slate-700',
        )}
      >
        {title}
      </h3>
      {description && (
        <p
          className={cn(
            'text-sm max-w-xs leading-relaxed mb-5',
            variant === 'lab' ? 'text-slate-500' : 'text-slate-400',
          )}
        >
          {description}
        </p>
      )}
      {action && (
        <Button
          variant={action.variant ?? (variant === 'lab' ? 'lab' : 'primary')}
          size="sm"
          onClick={action.onClick}
        >
          {action.label}
        </Button>
      )}
    </div>
  );
}

/* ── Pre-built domain empty states ── */
export function NoCasesEmpty({ onCreate }: { onCreate: () => void }) {
  return (
    <EmptyState
      icon={<FolderOpen size={28} />}
      title="No patient cases yet"
      description="Create your first case to start capturing clinical information and ground truth."
      action={{ label: '+ New Case', onClick: onCreate }}
    />
  );
}

export function NoExperimentsEmpty({ onCreate }: { onCreate: () => void }) {
  return (
    <EmptyState
      icon={<FlaskConical size={28} />}
      title="No experiments yet"
      description="Configure your models and prompts, then launch your first evaluation run."
      action={{ label: 'New Experiment', onClick: onCreate, variant: 'lab' }}
      variant="lab"
    />
  );
}

export function NoResultsEmpty({ query }: { query?: string }) {
  return (
    <EmptyState
      icon={<SearchX size={28} />}
      title="No results found"
      description={
        query
          ? `No matches for "${query}". Try adjusting your search.`
          : 'Try adjusting your filters or search terms.'
      }
    />
  );
}

/* ── Error States ── */
interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  variant?: 'default' | 'lab';
}

export function ErrorState({
  title = 'Something went wrong',
  message = 'An unexpected error occurred. Please try again.',
  onRetry,
  variant = 'default',
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center py-16 px-8 rounded-xl border',
        variant === 'lab'
          ? 'border-red-900/30 bg-red-950/20'
          : 'border-danger/20 bg-danger-light',
      )}
    >
      <AlertCircle
        size={36}
        className={cn('mb-4', variant === 'lab' ? 'text-red-400' : 'text-danger')}
      />
      <h3
        className={cn(
          'font-semibold text-base mb-1',
          variant === 'lab' ? 'text-red-300' : 'text-danger-dark',
        )}
      >
        {title}
      </h3>
      <p className={cn('text-sm mb-5 max-w-xs', variant === 'lab' ? 'text-red-400/70' : 'text-slate-500')}>
        {message}
      </p>
      {onRetry && (
        <Button variant={variant === 'lab' ? 'ghost' : 'outline'} size="sm" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

export function NetworkError({ onRetry }: { onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <WifiOff size={32} className="text-slate-300 mb-4" />
      <h3 className="font-semibold text-slate-600 mb-1">Connection lost</h3>
      <p className="text-sm text-slate-400 mb-5">
        Unable to reach the server. Check your connection.
      </p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          Retry
        </Button>
      )}
    </div>
  );
}

export function UnauthorisedState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <ShieldOff size={32} className="text-slate-300 mb-4" />
      <h3 className="font-semibold text-slate-600 mb-1">Access denied</h3>
      <p className="text-sm text-slate-400 max-w-xs">
        You don't have permission to view this page. Contact your administrator.
      </p>
    </div>
  );
}

/* ── Inline Alert ── */
type AlertVariant = 'info' | 'success' | 'warning' | 'danger';

interface AlertProps {
  variant?: AlertVariant;
  title?: string;
  children: ReactNode;
  className?: string;
}

const alertStyles: Record<AlertVariant, { wrapper: string; icon: ReactNode; title: string; body: string }> = {
  info:    { wrapper: 'bg-info-light border-info/30',    icon: <AlertCircle size={15} className="text-info shrink-0 mt-0.5" />,    title: 'text-info-dark',    body: 'text-info-dark/80'    },
  success: { wrapper: 'bg-success-light border-success/30', icon: <AlertCircle size={15} className="text-success shrink-0 mt-0.5" />, title: 'text-success-dark', body: 'text-success-dark/80' },
  warning: { wrapper: 'bg-warning-light border-warning/30', icon: <AlertCircle size={15} className="text-warning shrink-0 mt-0.5" />, title: 'text-warning-dark', body: 'text-warning-dark/80' },
  danger:  { wrapper: 'bg-danger-light border-danger/30',  icon: <AlertCircle size={15} className="text-danger shrink-0 mt-0.5" />,  title: 'text-danger-dark',  body: 'text-danger-dark/80'  },
};

export function Alert({ variant = 'info', title, children, className }: AlertProps) {
  const styles = alertStyles[variant];
  return (
    <div className={cn('flex gap-3 p-4 rounded-lg border text-sm', styles.wrapper, className)}>
      {styles.icon}
      <div>
        {title && <p className={cn('font-semibold mb-0.5', styles.title)}>{title}</p>}
        <p className={styles.body}>{children}</p>
      </div>
    </div>
  );
}
