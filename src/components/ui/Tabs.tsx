import { createContext, useContext, useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface TabsContextValue {
  active: string;
  setActive: (id: string) => void;
  variant: 'line' | 'pill' | 'lab';
}

const TabsContext = createContext<TabsContextValue>({
  active: '',
  setActive: () => {},
  variant: 'line',
});

/* ── Root ── */
interface TabsProps {
  defaultValue?: string;
  value?: string;
  onValueChange?: (id: string) => void;
  children: ReactNode;
  variant?: 'line' | 'pill' | 'lab';
  className?: string;
}

export function Tabs({ defaultValue = '', value, onValueChange, children, variant = 'line', className }: TabsProps) {
  const [internalActive, setInternalActive] = useState(defaultValue);
  const active = value !== undefined ? value : internalActive;

  const setActive = (id: string) => {
    if (value === undefined) {
      setInternalActive(id);
    }
    onValueChange?.(id);
  };

  return (
    <TabsContext.Provider value={{ active, setActive, variant }}>
      <div className={cn('w-full', className)}>{children}</div>
    </TabsContext.Provider>
  );
}

/* ── Tab List ── */
interface TabListProps {
  children: ReactNode;
  className?: string;
}

const listStyles: Record<'line' | 'pill' | 'lab', string> = {
  line: 'border-b border-slate-200 flex gap-1',
  pill: 'bg-slate-100 p-1 rounded-xl flex gap-1 w-fit',
  lab:  'border-b border-slate-700 flex gap-1',
};

export function TabList({ children, className }: TabListProps) {
  const { variant } = useContext(TabsContext);
  return (
    <div className={cn(listStyles[variant], className)} role="tablist">
      {children}
    </div>
  );
}

/* ── Tab Trigger ── */
interface TabTriggerProps {
  value: string;
  children: ReactNode;
  icon?: ReactNode;
  badge?: string | number;
  disabled?: boolean;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  className?: string;
}

export function TabTrigger({ value, children, icon, badge, disabled, onClick, className }: TabTriggerProps) {
  const { active, setActive, variant } = useContext(TabsContext);
  const isActive = active === value;

  const triggerStyles: Record<typeof variant, { base: string; active: string; inactive: string }> = {
    line: {
      base:     'flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg transition-all relative -mb-px border-b-2',
      active:   'border-clinical-600 text-clinical-700',
      inactive: 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300',
    },
    pill: {
      base:     'flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all',
      active:   'bg-white text-slate-900 shadow-sm',
      inactive: 'text-slate-600 hover:text-slate-800',
    },
    lab: {
      base:     'flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg transition-all relative -mb-px border-b-2',
      active:   'border-lab-400 text-lab-300',
      inactive: 'border-transparent text-slate-500 hover:text-slate-300 hover:border-slate-600',
    },
  };

  const styles = triggerStyles[variant];

  return (
    <button
      role="tab"
      aria-selected={isActive}
      disabled={disabled}
      onClick={(e) => {
        if (!disabled) {
          setActive(value);
          onClick?.(e);
        }
      }}
      className={cn(
        styles.base,
        isActive ? styles.active : styles.inactive,
        disabled && 'opacity-40 cursor-not-allowed',
        className
      )}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      {children}
      {badge !== undefined && (
        <span className={cn(
          'ml-1 px-1.5 py-0.5 rounded-full text-xs font-semibold',
          isActive ? 'bg-clinical-100 text-clinical-700' : 'bg-slate-200 text-slate-600',
        )}>
          {badge}
        </span>
      )}
    </button>
  );
}

/* ── Tab Content ── */
interface TabContentProps {
  value: string;
  children: ReactNode;
  className?: string;
}

export function TabContent({ value, children, className }: TabContentProps) {
  const { active } = useContext(TabsContext);

  if (active !== value) return null;

  return (
    <div role="tabpanel" className={cn('pt-4 page-enter', className)}>
      {children}
    </div>
  );
}
