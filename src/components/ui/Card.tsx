import { cn } from '@/lib/utils';

/* ── Card ── */
interface CardProps {
  children: React.ReactNode;
  className?: string;
  hoverable?: boolean;
  onClick?: () => void;
}

export function Card({ children, className, hoverable, onClick }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'bg-white rounded-xl border border-slate-100 shadow-xs',
        hoverable && 'cursor-pointer hover:border-slate-200 hover:shadow-sm transition-all duration-150',
        onClick && 'cursor-pointer',
        className,
      )}
    >
      {children}
    </div>
  );
}

/* ── Card subcomponents ── */
export function CardHeader({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('px-6 py-5 border-b border-slate-100', className)}>
      {children}
    </div>
  );
}

export function CardBody({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('px-6 py-5', className)}>
      {children}
    </div>
  );
}

export function CardFooter({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('px-6 py-4 border-t border-slate-100 bg-slate-50/50 rounded-b-xl', className)}>
      {children}
    </div>
  );
}

export interface StatCardProps {
  label?: string;
  title?: string;
  value: string | number;
  icon?: React.ReactNode;
  iconBg?: string;
  colorClass?: string;
  delta?: { value: number; label?: string };
  description?: string;
  subtitle?: string;
  className?: string;
}

export function StatCard({
  label,
  title,
  value,
  icon,
  iconBg,
  colorClass,
  delta,
  description,
  subtitle,
  className,
}: StatCardProps) {
  const displayLabel = label || title || '';
  const displayDescription = description || subtitle;
  const bgStyle = iconBg || (colorClass ? `bg-slate-100 ${colorClass}` : 'bg-brand-50 text-brand-600');

  return (
    <Card className={cn('p-5', className)}>
      <div className="flex items-start justify-between mb-3">
        <p className="text-sm text-slate-500 font-medium">{displayLabel}</p>
        {icon && (
          <div className={cn('p-2 rounded-lg', bgStyle)}>
            {icon}
          </div>
        )}
      </div>
      <p className="text-3xl font-display font-bold text-slate-900">{value}</p>
      {delta !== undefined && (
        <p className={cn('text-xs mt-1', delta.value >= 0 ? 'text-success' : 'text-danger')}>
          {delta.value >= 0 ? '↑' : '↓'} {Math.abs(delta.value)}%
          {delta.label && <span className="text-slate-400 ml-1">{delta.label}</span>}
        </p>
      )}
      {displayDescription && (
        <p className="text-xs text-slate-500 mt-1">{displayDescription}</p>
      )}
    </Card>
  );
}
