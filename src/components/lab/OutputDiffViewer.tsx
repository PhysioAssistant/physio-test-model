import React from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  PlusCircle,
  MinusCircle,
  ShieldAlert,
} from 'lucide-react';
import { Badge } from '@/components/ui';

export type DiffStatus = 'matched' | 'missing' | 'added' | 'contradiction';

export interface DiffItem {
  id: string;
  label: string;
  status: DiffStatus;
  groundTruthValue?: string;
  modelValue?: string;
  explanation?: string;
}

export interface OutputDiffViewerProps {
  items: DiffItem[];
  title?: string;
  className?: string;
}

export const OutputDiffViewer: React.FC<OutputDiffViewerProps> = ({
  items,
  title,
  className = '',
}) => {
  const getStatusBadge = (status: DiffStatus) => {
    switch (status) {
      case 'matched':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
            <CheckCircle2 size={12} />
            Ground Truth Match
          </span>
        );
      case 'missing':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
            <MinusCircle size={12} />
            Missing From Output
          </span>
        );
      case 'added':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20">
            <PlusCircle size={12} />
            Model Addition
          </span>
        );
      case 'contradiction':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
            <XCircle size={12} />
            Clinical Conflict / Safety Warning
          </span>
        );
    }
  };

  const getBorderColor = (status: DiffStatus) => {
    switch (status) {
      case 'matched':
        return 'border-emerald-500/30 bg-emerald-950/20';
      case 'missing':
        return 'border-amber-500/30 bg-amber-950/20';
      case 'added':
        return 'border-sky-500/30 bg-sky-950/20';
      case 'contradiction':
        return 'border-rose-500/40 bg-rose-950/30';
    }
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {title && (
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          {title}
        </h4>
      )}

      <div className="space-y-2">
        {items.map((item) => (
          <div
            key={item.id}
            className={`p-3 rounded-xl border text-xs transition-all ${getBorderColor(
              item.status
            )}`}
          >
            <div className="flex items-start justify-between gap-2 mb-1">
              <span className="font-semibold text-slate-200">{item.label}</span>
              {getStatusBadge(item.status)}
            </div>

            {item.modelValue && (
              <p className="text-slate-300 font-sans leading-relaxed mt-1">
                <span className="text-slate-500 font-mono text-[11px]">Model Output: </span>
                {item.modelValue}
              </p>
            )}

            {item.groundTruthValue && (
              <p className="text-slate-400 font-sans leading-relaxed mt-0.5">
                <span className="text-slate-500 font-mono text-[11px]">Ground Truth: </span>
                {item.groundTruthValue}
              </p>
            )}

            {item.explanation && (
              <p className="text-[11px] text-amber-300/90 font-mono italic mt-1.5 pt-1.5 border-t border-slate-800">
                Evaluation Note: {item.explanation}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
