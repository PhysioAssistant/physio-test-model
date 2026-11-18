import React, { useState } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Info,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  XCircle,
  Sparkles,
} from 'lucide-react';
import { Badge, Button } from '@/components/ui';
import type {
  ComprehensiveEvaluation,
  EvaluationDimensionScore,
  EvaluationItemIssue,
} from '@/types';
import { getEvaluationDimensionsList } from '@/lib/evaluations';

interface EvaluationScoreCardProps {
  evaluation: ComprehensiveEvaluation;
  modelName: string;
  onReevaluate?: () => void;
  isReevaluating?: boolean;
}

export function EvaluationScoreCard({
  evaluation,
  modelName,
  onReevaluate,
  isReevaluating,
}: EvaluationScoreCardProps) {
  const [expandedDimension, setExpandedDimension] = useState<string | null>(null);
  const [showAllIssues, setShowAllIssues] = useState(false);

  const dimensions = getEvaluationDimensionsList(evaluation);

  // Compute average score across the 10 dimensions
  const totalScore = dimensions.reduce((acc, d) => acc + d.score, 0);
  const averageScore = Number((totalScore / dimensions.length).toFixed(1));

  // Collect all issues
  const allIssues: EvaluationItemIssue[] = dimensions.flatMap((d) => d.issues);
  const criticalCount = allIssues.filter((i) => i.severity === 'critical').length;
  const highCount = allIssues.filter((i) => i.severity === 'high').length;

  const getScoreColor = (score: number) => {
    if (score >= 9.0) return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
    if (score >= 7.5) return 'text-blue-400 bg-blue-500/10 border-blue-500/30';
    if (score >= 5.0) return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
    return 'text-rose-400 bg-rose-500/10 border-rose-500/30';
  };

  const getBarColor = (score: number) => {
    if (score >= 9.0) return 'bg-emerald-500';
    if (score >= 7.5) return 'bg-blue-500';
    if (score >= 5.0) return 'bg-amber-500';
    return 'bg-rose-500';
  };

  const getSeverityBadge = (severity: EvaluationItemIssue['severity']) => {
    switch (severity) {
      case 'critical':
        return <Badge variant="danger" size="xs">CRITICAL</Badge>;
      case 'high':
        return <Badge variant="warning" size="xs">HIGH</Badge>;
      case 'medium':
        return <Badge variant="outline" size="xs">MEDIUM</Badge>;
      default:
        return <Badge variant="outline" size="xs">LOW</Badge>;
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
      {/* ── Card Header: Overall Score & Safety Status ── */}
      <div className="p-4 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">
              {modelName}
            </span>
            {evaluation.criticalSafetyPassed ? (
              <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                <ShieldCheck size={12} />
                Safety Passed
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[11px] font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20 animate-pulse">
                <ShieldAlert size={12} />
                Safety Violation ({criticalCount})
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-1 line-clamp-1">
            {evaluation.overallQualitySummary}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-[10px] uppercase font-mono text-slate-500 block">Composite</span>
            <span className={`text-xl font-bold font-mono px-2.5 py-0.5 rounded-lg border ${getScoreColor(averageScore)}`}>
              {averageScore}
              <span className="text-xs text-slate-500 font-normal"> / 10</span>
            </span>
          </div>

          {onReevaluate && (
            <Button
              variant="outline"
              size="xs"
              onClick={onReevaluate}
              loading={isReevaluating}
              icon={<Sparkles size={12} />}
            >
              Re-Score
            </Button>
          )}
        </div>
      </div>

      {/* ── 10-Dimensional Breakdown Grid ── */}
      <div className="p-4 space-y-2.5">
        <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 mb-1">
          <span>10-DIMENSIONAL PROFILE</span>
          <span>SCORE (0-10)</span>
        </div>

        {dimensions.map((dim) => {
          const isExpanded = expandedDimension === dim.key;
          const hasIssues = dim.issues.length > 0;

          return (
            <div
              key={dim.key}
              className={`rounded-lg border transition-all text-xs ${
                hasIssues
                  ? 'border-slate-800 bg-slate-950/60'
                  : 'border-slate-800/40 bg-slate-950/30'
              }`}
            >
              <div
                onClick={() => setExpandedDimension(isExpanded ? null : dim.key)}
                className="p-2.5 flex items-center justify-between cursor-pointer hover:bg-slate-800/30 select-none"
              >
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-200">{dim.dimension}</span>
                  {hasIssues && (
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center gap-0.5">
                      <AlertTriangle size={10} />
                      {dim.issues.length} {dim.issues.length === 1 ? 'issue' : 'issues'}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2.5">
                  {/* Visual Progress Bar */}
                  <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden hidden sm:block">
                    <div
                      className={`h-full rounded-full ${getBarColor(dim.score)}`}
                      style={{ width: `${dim.score * 10}%` }}
                    />
                  </div>

                  <span className={`font-mono font-bold text-xs ${dim.score >= 8.5 ? 'text-emerald-400' : dim.score >= 7.0 ? 'text-blue-400' : 'text-amber-400'}`}>
                    {dim.score.toFixed(1)}
                  </span>

                  {isExpanded ? (
                    <ChevronUp size={13} className="text-slate-500" />
                  ) : (
                    <ChevronDown size={13} className="text-slate-500" />
                  )}
                </div>
              </div>

              {/* Expanded Reasoning & Issues Inspector */}
              {isExpanded && (
                <div className="px-3 pb-3 pt-1 border-t border-slate-800/60 space-y-2 bg-slate-950/90 text-[11px]">
                  <p className="text-slate-400 leading-relaxed italic">
                    "{dim.reasoning}"
                  </p>

                  {dim.issues.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      <span className="text-[10px] font-mono uppercase text-slate-500 block">
                        Identified Penalties:
                      </span>
                      {dim.issues.map((issue, idx) => (
                        <div
                          key={idx}
                          className="p-2 rounded border border-slate-800 bg-slate-900/80 space-y-1 font-mono text-[11px]"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-300">
                              {issue.taxonomy}
                            </span>
                            {getSeverityBadge(issue.severity)}
                          </div>
                          <p className="text-slate-400 text-xs font-sans">
                            {issue.explanation}
                          </p>
                          <div className="grid grid-cols-2 gap-2 text-[10px] pt-1 text-slate-500">
                            <div>
                              <span className="text-slate-400">Expected: </span>
                              {issue.expected}
                            </div>
                            <div>
                              <span className="text-rose-400">Actual: </span>
                              {issue.actual}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Footer: All Identified Issues Summary ── */}
      {allIssues.length > 0 && (
        <div className="p-3 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between text-xs">
          <span className="text-slate-400 font-mono flex items-center gap-1.5">
            <AlertTriangle size={13} className="text-amber-400" />
            Total flagged issues: <strong className="text-slate-200">{allIssues.length}</strong>
            {criticalCount > 0 && (
              <span className="text-rose-400 font-bold">({criticalCount} critical)</span>
            )}
          </span>

          <button
            onClick={() => setShowAllIssues(!showAllIssues)}
            className="text-lab-400 hover:text-lab-300 font-semibold cursor-pointer underline underline-offset-2"
          >
            {showAllIssues ? 'Collapse issues' : 'Inspect all issues'}
          </button>
        </div>
      )}

      {/* Full Issues Drawer / List */}
      {showAllIssues && (
        <div className="p-4 bg-slate-950 border-t border-slate-800 space-y-2 max-h-72 overflow-y-auto">
          {allIssues.map((issue, idx) => (
            <div
              key={idx}
              className="p-3 rounded-lg border border-slate-800/80 bg-slate-900/60 space-y-1.5"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-slate-300">
                  {issue.taxonomy}
                </span>
                {getSeverityBadge(issue.severity)}
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">{issue.explanation}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-mono pt-1 text-slate-500 border-t border-slate-800/40">
                <div>
                  <span className="text-emerald-400 font-semibold">Doctor Ground Truth: </span>
                  {issue.expected}
                </div>
                <div>
                  <span className="text-rose-400 font-semibold">Model Output: </span>
                  {issue.actual}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
