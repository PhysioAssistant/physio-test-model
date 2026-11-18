import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from 'react';
import { X, CheckCircle2, AlertTriangle, Info, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ToastVariant = 'success' | 'error' | 'warning' | 'info' | 'danger';

export interface Toast {
  id: string;
  variant: ToastVariant;
  title: string;
  message?: string;
  description?: string;
  duration?: number;
}

export interface ToastContextValue {
  toast: (opts: Omit<Toast, 'id'>) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
  danger: (title: string, message?: string) => void;
}

const ToastContext = createContext<ToastContextValue>({
  toast: () => {},
  success: () => {},
  error: () => {},
  warning: () => {},
  info: () => {},
  danger: () => {},
});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback((opts: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, ...opts }]);
    setTimeout(() => dismiss(id), opts.duration ?? 4500);
  }, [dismiss]);

  const success = useCallback((title: string, message?: string) => toast({ variant: 'success', title, message }), [toast]);
  const error   = useCallback((title: string, message?: string) => toast({ variant: 'error',   title, message }), [toast]);
  const danger  = useCallback((title: string, message?: string) => toast({ variant: 'danger',  title, message }), [toast]);
  const warning = useCallback((title: string, message?: string) => toast({ variant: 'warning', title, message }), [toast]);
  const info    = useCallback((title: string, message?: string) => toast({ variant: 'info',    title, message }), [toast]);

  return (
    <ToastContext.Provider value={{ toast, success, error, warning, info, danger }}>
      {children}
      {/* Toast Viewport */}
      <div className="fixed bottom-5 right-5 z-[60] flex flex-col gap-2 w-[360px] max-w-[calc(100vw-2.5rem)]">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}

/* ── Individual Toast ── */
const variantConfig: Record<
  ToastVariant,
  { icon: typeof CheckCircle2; bg: string; iconCls: string; border: string }
> = {
  success: { icon: CheckCircle2,  bg: 'bg-white',  iconCls: 'text-success',      border: 'border-success/20' },
  error:   { icon: XCircle,       bg: 'bg-white',  iconCls: 'text-danger',       border: 'border-danger/20'  },
  danger:  { icon: XCircle,       bg: 'bg-white',  iconCls: 'text-danger',       border: 'border-danger/20'  },
  warning: { icon: AlertTriangle, bg: 'bg-white',  iconCls: 'text-warning',      border: 'border-warning/20' },
  info:    { icon: Info,          bg: 'bg-white',  iconCls: 'text-info',         border: 'border-info/20'    },
};

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: Toast;
  onDismiss: (id: string) => void;
}) {
  const { icon: Icon, bg, iconCls, border } = variantConfig[toast.variant];
  const text = toast.message || toast.description;

  return (
    <div
      className={cn(
        'flex items-start gap-3 p-4 rounded-xl shadow-lg border',
        'animate-in slide-in-from-right-4 duration-200',
        bg,
        border,
      )}
    >
      <Icon size={18} className={cn('shrink-0 mt-0.5', iconCls)} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-800">{toast.title}</p>
        {text && (
          <p className="text-xs text-slate-500 mt-0.5 leading-snug">{text}</p>
        )}
      </div>
      <button
        onClick={() => onDismiss(toast.id)}
        className="shrink-0 p-0.5 rounded text-slate-400 hover:text-slate-600 transition-colors"
      >
        <X size={14} />
      </button>
    </div>
  );
}
