import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/* ── Section Header (page/card header pattern) ── */
export interface PageHeaderProps {
  title: string;
  description?: string;
  subtitle?: string;
  action?: ReactNode;
  actions?: ReactNode;
  breadcrumb?: string;
  className?: string;
}

export function PageHeader({ title, description, subtitle, action, actions, breadcrumb, className }: PageHeaderProps) {
  const text = description || subtitle;
  const actionContent = action || actions;
  return (
    <div className={cn('flex items-start justify-between mb-8', className)}>
      <div>
        {breadcrumb && (
          <p className="text-xs text-slate-400 uppercase tracking-wider mb-1 font-medium">{breadcrumb}</p>
        )}
        <h1 className="font-display font-bold text-2xl text-slate-900 leading-tight">{title}</h1>
        {text && (
          <p className="text-sm text-slate-600 mt-1 max-w-lg">{text}</p>
        )}
      </div>
      {actionContent && <div className="shrink-0 ml-4">{actionContent}</div>}
    </div>
  );
}

/* ── Divider ── */
interface DividerProps {
  label?: string;
  className?: string;
}

export function Divider({ label, className }: DividerProps) {
  if (label) {
    return (
      <div className={cn('flex items-center gap-4 my-4', className)}>
        <div className="flex-1 h-px bg-slate-200" />
        <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">{label}</span>
        <div className="flex-1 h-px bg-slate-200" />
      </div>
    );
  }
  return <div className={cn('h-px bg-slate-200 my-4', className)} />;
}

/* ── Tooltip ── */
interface TooltipProps {
  content: string;
  children: ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export function Tooltip({ content, children, position = 'top' }: TooltipProps) {
  const posStyles = {
    top:    'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left:   'right-full top-1/2 -translate-y-1/2 mr-2',
    right:  'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  return (
    <div className="relative inline-flex group">
      {children}
      <div
        className={cn(
          'absolute z-50 pointer-events-none',
          'opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100',
          'transition-all duration-150',
          posStyles[position],
        )}
      >
        <div className="bg-slate-800 text-slate-100 text-xs px-2.5 py-1.5 rounded-lg whitespace-nowrap shadow-lg">
          {content}
        </div>
      </div>
    </div>
  );
}

/* ── Copy-to-clipboard button ── */
import { useState } from 'react';
import { Copy, Check } from 'lucide-react';

export function CopyButton({ text, className }: { text: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      onClick={handleCopy}
      className={cn(
        'p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all',
        className,
      )}
      title="Copy to clipboard"
    >
      {copied ? <Check size={13} className="text-success" /> : <Copy size={13} />}
    </button>
  );
}

/* ── Keyboard shortcut hint ── */
export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-mono bg-slate-100 border border-slate-300 text-slate-600">
      {children}
    </kbd>
  );
}

/* ── Score Meter (for evaluation dimensions) ── */
interface ScoreMeterProps {
  label: string;
  score: number;  // 0–10
  className?: string;
}

export function ScoreMeter({ label, score, className }: ScoreMeterProps) {
  const pct = (score / 10) * 100;
  let colour = 'bg-danger';
  if (score >= 8.5)    colour = 'bg-success';
  else if (score >= 6.5) colour = 'bg-clinical-500';
  else if (score >= 4.0) colour = 'bg-warning';

  return (
    <div className={cn('space-y-1', className)}>
      <div className="flex justify-between text-xs">
        <span className="text-slate-600 font-medium">{label}</span>
        <span className="font-mono text-slate-700">{score.toFixed(1)}</span>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-700', colour)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
