import { cn } from '@/lib/utils';

export type BadgeVariant =
  | 'default'
  | 'primary'
  | 'brand'
  | 'neutral'
  | 'clinical'
  | 'lab'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'outline';

export type BadgeSize = 'xs' | 'sm' | 'md' | 'lg';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  default:   'bg-slate-100 text-slate-600',
  neutral:   'bg-slate-100 text-slate-600',
  primary:   'bg-brand-100 text-brand-700',
  brand:     'bg-brand-100 text-brand-700',
  clinical:  'bg-clinical-100 text-clinical-700',
  lab:       'bg-lab-100 text-lab-700',
  success:   'bg-success-light text-success-dark',
  warning:   'bg-warning-light text-warning-dark',
  danger:    'bg-danger-light text-danger-dark',
  info:      'bg-info-light text-info-dark',
  outline:   'bg-transparent border border-slate-300 text-slate-600',
};

const dotStyles: Record<BadgeVariant, string> = {
  default:   'bg-slate-400',
  neutral:   'bg-slate-400',
  primary:   'bg-brand-500',
  brand:     'bg-brand-500',
  clinical:  'bg-clinical-500',
  lab:       'bg-lab-500',
  success:   'bg-success',
  warning:   'bg-warning',
  danger:    'bg-danger',
  info:      'bg-info',
  outline:   'bg-slate-400',
};

export function Badge({ children, variant = 'default', size = 'sm', dot, className }: BadgeProps) {
  const sizeCls =
    size === 'xs'
      ? 'text-[11px] px-1.5 py-0.2'
      : size === 'sm'
      ? 'text-xs px-2 py-0.5'
      : size === 'lg'
      ? 'text-base px-3 py-1.5'
      : 'text-sm px-2.5 py-1';

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 font-medium rounded-full',
        sizeCls,
        variantStyles[variant],
        className,
      )}
    >
      {dot && (
        <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', dotStyles[variant])} />
      )}
      {children}
    </span>
  );
}

/* ── Status Badge for case/experiment status ── */
type CaseStatus = 'draft' | 'ground_truth_ready' | 'evaluating' | 'reviewed';
type ExperimentStatus = 'draft' | 'queued' | 'running' | 'completed' | 'partial_failure' | 'failed' | 'cancelled';

const caseStatusMap: Record<CaseStatus, { label: string; variant: BadgeVariant }> = {
  draft:               { label: 'Draft',               variant: 'default' },
  ground_truth_ready:  { label: 'Ground Truth Ready',  variant: 'clinical' },
  evaluating:          { label: 'Evaluating',          variant: 'warning' },
  reviewed:            { label: 'Reviewed',            variant: 'success' },
};

const experimentStatusMap: Record<ExperimentStatus, { label: string; variant: BadgeVariant }> = {
  draft:           { label: 'Draft',           variant: 'default' },
  queued:          { label: 'Queued',          variant: 'default' },
  running:         { label: 'Running',         variant: 'lab' },
  completed:       { label: 'Completed',       variant: 'success' },
  partial_failure: { label: 'Partial Failure', variant: 'warning' },
  failed:          { label: 'Failed',          variant: 'danger' },
  cancelled:       { label: 'Cancelled',       variant: 'outline' },
};

export function CaseStatusBadge({ status }: { status: CaseStatus }) {
  const { label, variant } = caseStatusMap[status];
  return <Badge variant={variant} dot>{label}</Badge>;
}

export function ExperimentStatusBadge({ status }: { status: ExperimentStatus }) {
  const { label, variant } = experimentStatusMap[status];
  return <Badge variant={variant} dot>{label}</Badge>;
}

/* ── Role Badge ── */
type UserRole = 'doctor' | 'ai_user' | 'admin';

export function RoleBadge({ role }: { role: UserRole }) {
  const map: Record<UserRole, { label: string; variant: BadgeVariant }> = {
    doctor:  { label: 'Doctor',       variant: 'clinical' },
    ai_user: { label: 'AI Researcher', variant: 'lab' },
    admin:   { label: 'Admin',        variant: 'danger' },
  };
  const { label, variant } = map[role];
  return <Badge variant={variant}>{label}</Badge>;
}

/* ── Score Badge for evaluation scores 0-10 ── */
export function ScoreBadge({ score }: { score: number }) {
  let variant: BadgeVariant = 'danger';
  if (score >= 8.5) variant = 'success';
  else if (score >= 6.5) variant = 'clinical';
  else if (score >= 4.0) variant = 'warning';

  return (
    <Badge variant={variant} className="font-mono">
      {score.toFixed(1)}
    </Badge>
  );
}
