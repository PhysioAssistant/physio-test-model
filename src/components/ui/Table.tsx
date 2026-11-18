import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';

/* ── Table Root ── */
interface TableProps {
  children: ReactNode;
  className?: string;
  variant?: 'default' | 'lab';
}

export function Table({ children, className, variant = 'default' }: TableProps) {
  return (
    <div className={cn(
      'w-full overflow-x-auto rounded-xl border',
      variant === 'lab' ? 'border-slate-800' : 'border-slate-200',
    )}>
      <table className={cn('w-full text-sm border-collapse', className)}>
        {children}
      </table>
    </div>
  );
}

/* ── Table Head ── */
interface TableHeadProps {
  children: ReactNode;
  variant?: 'default' | 'lab';
}

export function TableHead({ children, variant = 'default' }: TableHeadProps) {
  return (
    <thead className={cn(
      'text-xs font-semibold uppercase tracking-wider',
      variant === 'lab'
        ? 'bg-slate-900 text-slate-400'
        : 'bg-slate-50 text-slate-500',
    )}>
      {children}
    </thead>
  );
}

/* ── Table Body ── */
export function TableBody({ children, variant = 'default' }: { children: ReactNode; variant?: 'default' | 'lab' }) {
  return (
    <tbody className={cn(
      'divide-y',
      variant === 'lab' ? 'divide-slate-800 bg-slate-900' : 'divide-slate-100 bg-white',
    )}>
      {children}
    </tbody>
  );
}

/* ── Table Row ── */
interface TableRowProps {
  children: ReactNode;
  onClick?: () => void;
  isSelected?: boolean;
  variant?: 'default' | 'lab';
}

export function TableRow({ children, onClick, isSelected, variant = 'default' }: TableRowProps) {
  return (
    <tr
      onClick={onClick}
      className={cn(
        'transition-colors duration-100',
        onClick && 'cursor-pointer',
        variant === 'lab'
          ? [
              'text-slate-300',
              onClick && 'hover:bg-slate-800/60',
              isSelected && 'bg-lab-500/10',
            ]
          : [
              'text-slate-700',
              onClick && 'hover:bg-slate-50',
              isSelected && 'bg-clinical-50',
            ],
      )}
    >
      {children}
    </tr>
  );
}

/* ── Table Header Cell ── */
interface ThProps {
  children: ReactNode;
  className?: string;
  sortable?: boolean;
  sorted?: 'asc' | 'desc' | null;
  onSort?: () => void;
}

export function Th({ children, className, sortable, sorted, onSort }: ThProps) {
  return (
    <th
      className={cn(
        'px-4 py-3 text-left',
        sortable && 'cursor-pointer select-none hover:text-slate-700',
        className,
      )}
      onClick={sortable ? onSort : undefined}
    >
      <span className="flex items-center gap-1">
        {children}
        {sortable && (
          <span className="text-slate-300">
            {sorted === 'asc' ? ' ↑' : sorted === 'desc' ? ' ↓' : ' ↕'}
          </span>
        )}
      </span>
    </th>
  );
}

/* ── Table Data Cell ── */
interface TdProps {
  children: ReactNode;
  className?: string;
  muted?: boolean;
  mono?: boolean;
}

export function Td({ children, className, muted, mono }: TdProps) {
  return (
    <td
      className={cn(
        'px-4 py-3',
        muted && 'text-slate-400',
        mono && 'font-mono text-xs',
        className,
      )}
    >
      {children}
    </td>
  );
}

/* ── Table Skeleton Loader ── */
export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="w-full overflow-x-auto rounded-xl border border-slate-200">
      <table className="w-full text-sm">
        <thead className="bg-slate-50">
          <tr>
            {Array.from({ length: cols }).map((_, i) => (
              <th key={i} className="px-4 py-3">
                <div className="h-3 bg-slate-200 rounded animate-pulse w-24" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {Array.from({ length: rows }).map((_, i) => (
            <tr key={i}>
              {Array.from({ length: cols }).map((_, j) => (
                <td key={j} className="px-4 py-3">
                  <div className="h-3 bg-slate-100 rounded animate-pulse" style={{ width: `${60 + (j * 15) % 30}%` }} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
