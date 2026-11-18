import React, { useState, useEffect, useCallback } from 'react';
import {
  PageHeader,
  Button,
  Badge,
  Card,
  CardBody,
  StatCard,
} from '@/components/ui';
import {
  Activity,
  AlertTriangle,
  Timer,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw,
  BarChart2,
  Zap,
  ShieldAlert,
  Brain,
  CheckCircle2,
  Filter,
  Download,
} from 'lucide-react';
import { analyticsApi } from '@/lib/api';
import type {
  AnalyticsSnapshot,
  ErrorTaxonomyBucket,
  ModelLatencyStats,
  QualityRadarPoint,
} from '@/types';

// ─── Helpers ────────────────────────────────────────────────────────────────

function fmt(n: number, decimals = 1) {
  return n.toFixed(decimals);
}

function fmtMs(ms: number) {
  if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`;
  return `${ms}ms`;
}

function fmtUsd(usd: number) {
  return `$${usd.toFixed(2)}`;
}

function fmtK(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

function severityColor(severity: string): string {
  switch (severity) {
    case 'critical': return '#ef4444';
    case 'high':     return '#f97316';
    case 'medium':   return '#eab308';
    default:         return '#64748b';
  }
}

function severityBadgeVariant(severity: string): 'danger' | 'warning' | 'info' | 'default' {
  switch (severity) {
    case 'critical': return 'danger';
    case 'high':     return 'warning';
    case 'medium':   return 'info';
    default:         return 'default';
  }
}

const MODEL_COLORS: Record<string, string> = {
  'model-1': '#a78bfa',  // violet — Gemini
  'model-2': '#34d399',  // emerald — Claude
  'model-3': '#60a5fa',  // blue — GPT
};

const QUALITY_DIMS = [
  { key: 'factAccuracy',         label: 'Fact Accuracy' },
  { key: 'groundedness',         label: 'Groundedness' },
  { key: 'safetyCompliance',     label: 'Safety' },
  { key: 'clinicalAlignment',    label: 'Clinical Align.' },
  { key: 'treatmentAlignment',   label: 'Treatment Align.' },
  { key: 'noInferenceAdherence', label: 'No-Inference' },
  { key: 'overallQuality',       label: 'Overall' },
] as const;

// ─── Sub-components ─────────────────────────────────────────────────────────

/** Thin horizontal bar chart for error taxonomy */
function ErrorTaxonomyChart({ buckets }: { buckets: ErrorTaxonomyBucket[] }) {
  const sorted = [...buckets].sort((a, b) => b.count - a.count);
  const max = sorted[0]?.count || 1;

  return (
    <div className="space-y-3">
      {sorted.map((b) => (
        <div key={b.category} className="group">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2 min-w-0">
              <span
                className="inline-block w-2 h-2 rounded-full flex-shrink-0"
                style={{ background: severityColor(b.severity) }}
              />
              <span className="text-sm text-slate-200 font-medium truncate">{b.category}</span>
              {b.subcategory && (
                <span className="text-xs text-slate-500 truncate hidden sm:inline">
                  — {b.subcategory}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0 ml-2">
              {b.trend === 'up' && <TrendingUp size={12} className="text-red-400" />}
              {b.trend === 'down' && <TrendingDown size={12} className="text-emerald-400" />}
              {b.trend === 'stable' && <Minus size={12} className="text-slate-500" />}
              <span className="text-xs text-slate-400 tabular-nums w-8 text-right">{b.count}</span>
              <Badge variant={severityBadgeVariant(b.severity)} size="sm">{b.severity}</Badge>
            </div>
          </div>
          <div className="relative h-2 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 rounded-full transition-all duration-700"
              style={{
                width: `${(b.count / max) * 100}%`,
                background: severityColor(b.severity),
                opacity: 0.85,
              }}
            />
          </div>
          <div className="flex justify-between mt-0.5">
            <span className="text-xs text-slate-600">{fmt(b.percentage)}% of errors</span>
          </div>
        </div>
      ))}
    </div>
  );
}

/** Grouped bar chart for latency histogram per model */
function LatencyHistogram({ stats }: { stats: ModelLatencyStats[] }) {
  const [selectedModel, setSelectedModel] = useState<string>(stats[0]?.modelId ?? '');
  const model = stats.find((s) => s.modelId === selectedModel) ?? stats[0];

  if (!model) return <p className="text-slate-500 text-sm">No latency data.</p>;

  const maxCount = Math.max(...model.buckets.map((b) => b.count));

  return (
    <div>
      {/* Model selector */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {stats.map((s) => (
          <button
            key={s.modelId}
            onClick={() => setSelectedModel(s.modelId)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
              selectedModel === s.modelId
                ? 'text-white border-transparent'
                : 'text-slate-400 border-slate-700 hover:border-slate-600'
            }`}
            style={
              selectedModel === s.modelId
                ? { background: MODEL_COLORS[s.modelId] ?? '#a78bfa', borderColor: 'transparent' }
                : {}
            }
          >
            {s.modelName}
          </button>
        ))}
      </div>

      {/* p50 / p90 / p99 summary */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { label: 'p50', value: model.p50Ms, color: '#34d399' },
          { label: 'p90', value: model.p90Ms, color: '#fbbf24' },
          { label: 'p99', value: model.p99Ms, color: '#f87171' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-slate-800/60 rounded-xl p-3 text-center">
            <p className="text-xs text-slate-500 mb-0.5">{label}</p>
            <p className="text-lg font-bold" style={{ color }}>{fmtMs(value)}</p>
          </div>
        ))}
      </div>

      {/* Histogram bars */}
      <div className="flex items-end gap-2 h-28">
        {model.buckets.map((b) => (
          <div key={b.rangeLabel} className="flex-1 flex flex-col items-center gap-1">
            <span className="text-xs text-slate-400 tabular-nums">{b.count}</span>
            <div
              className="w-full rounded-t-sm transition-all duration-500"
              style={{
                height: `${Math.max(4, (b.count / maxCount) * 80)}px`,
                background: MODEL_COLORS[model.modelId] ?? '#a78bfa',
                opacity: 0.85,
              }}
            />
            <span className="text-[10px] text-slate-500 text-center leading-tight">{b.rangeLabel}</span>
          </div>
        ))}
      </div>

      <p className="text-xs text-slate-600 mt-3 text-right">
        Mean: {fmtMs(model.meanMs)} · Total runs in sample: {model.buckets.reduce((s, b) => s + b.count, 0)}
      </p>
    </div>
  );
}

/** Stacked area / line chart for cost timeline (SVG-based) */
function CostTimeline({ data }: { data: { periodLabel: string; costUsd: number; runCount: number }[] }) {
  const W = 480, H = 140, PAD = { top: 12, right: 20, bottom: 28, left: 44 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  const maxCost = Math.max(...data.map((d) => d.costUsd)) * 1.15;

  const xScale = (i: number) => PAD.left + (i / (data.length - 1)) * chartW;
  const yScale = (v: number) => PAD.top + chartH - (v / maxCost) * chartH;

  const linePath = data
    .map((d, i) => `${i === 0 ? 'M' : 'L'}${xScale(i)},${yScale(d.costUsd)}`)
    .join(' ');

  const areaPath =
    `M${xScale(0)},${PAD.top + chartH} ` +
    data.map((d, i) => `L${xScale(i)},${yScale(d.costUsd)}`).join(' ') +
    ` L${xScale(data.length - 1)},${PAD.top + chartH} Z`;

  const yTicks = [0, maxCost * 0.25, maxCost * 0.5, maxCost * 0.75, maxCost];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 160 }}>
      <defs>
        <linearGradient id="costGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#a78bfa" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#a78bfa" stopOpacity="0.02" />
        </linearGradient>
      </defs>

      {/* Y grid lines */}
      {yTicks.slice(1).map((t, i) => (
        <line
          key={i}
          x1={PAD.left} y1={yScale(t)}
          x2={PAD.left + chartW} y2={yScale(t)}
          stroke="#1e293b" strokeWidth="1"
        />
      ))}

      {/* Y labels */}
      {yTicks.map((t, i) => (
        <text key={i} x={PAD.left - 6} y={yScale(t) + 4} textAnchor="end" fontSize="9" fill="#64748b">
          ${Math.round(t)}
        </text>
      ))}

      {/* Area fill */}
      <path d={areaPath} fill="url(#costGrad)" />

      {/* Line */}
      <path d={linePath} fill="none" stroke="#a78bfa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

      {/* Data points */}
      {data.map((d, i) => (
        <circle key={i} cx={xScale(i)} cy={yScale(d.costUsd)} r="3" fill="#a78bfa" stroke="#0f172a" strokeWidth="1.5" />
      ))}

      {/* X labels */}
      {data.map((d, i) => (
        <text key={i} x={xScale(i)} y={H - 6} textAnchor="middle" fontSize="9" fill="#64748b">
          {d.periodLabel.replace('Week ', 'W')}
        </text>
      ))}
    </svg>
  );
}

/** Longitudinal quality radar — rendered as multi-line SVG chart */
function QualityRadarChart({ points, modelColors }: { points: QualityRadarPoint[]; modelColors: Record<string, string> }) {
  // Group by model
  const byModel = points.reduce<Record<string, QualityRadarPoint[]>>((acc, p) => {
    if (!acc[p.modelId]) acc[p.modelId] = [];
    acc[p.modelId].push(p);
    return acc;
  }, {});

  const periods = [...new Set(points.map((p) => p.period))].sort();
  const dims = QUALITY_DIMS.slice(0, 6); // use 6 dims for radar polygon

  // ── Spider / Radar ──────────────────────────────────────────────────────
  const cx = 160, cy = 130, r = 100;
  const N = dims.length;
  const angle = (i: number) => (Math.PI * 2 * i) / N - Math.PI / 2;

  const spoke = (i: number, radius: number) => ({
    x: cx + radius * Math.cos(angle(i)),
    y: cy + radius * Math.sin(angle(i)),
  });

  // Ring lines at 0.25, 0.5, 0.75, 1.0
  const rings = [0.25, 0.5, 0.75, 1.0].map((f) =>
    dims.map((_, i) => spoke(i, r * f))
  );

  // Latest scores per model
  const latestByModel = Object.entries(byModel).map(([mid, pts]) => ({
    modelId: mid,
    modelName: pts[0].modelName,
    scores: pts[pts.length - 1].scores,
  }));

  const polygonPath = (scores: QualityRadarPoint['scores']) =>
    dims
      .map((d, i) => {
        const val = (scores as Record<string, number>)[d.key] ?? 0;
        const { x, y } = spoke(i, r * val);
        return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ') + ' Z';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Radar */}
      <div>
        <p className="text-xs text-slate-500 uppercase tracking-wider mb-3 font-semibold">
          Current Quality Radar (Latest Period)
        </p>
        <svg viewBox="0 0 320 260" className="w-full">
          {/* Rings */}
          {rings.map((ring, ri) => (
            <polygon
              key={ri}
              points={ring.map((p) => `${p.x},${p.y}`).join(' ')}
              fill="none"
              stroke="#1e293b"
              strokeWidth="1"
            />
          ))}
          {/* Ring labels */}
          {[0.25, 0.5, 0.75, 1.0].map((f) => (
            <text key={f} x={cx + 4} y={cy - r * f + 3} fontSize="8" fill="#475569">
              {Math.round(f * 100)}
            </text>
          ))}
          {/* Spokes */}
          {dims.map((_, i) => {
            const end = spoke(i, r);
            return <line key={i} x1={cx} y1={cy} x2={end.x} y2={end.y} stroke="#1e293b" strokeWidth="1" />;
          })}
          {/* Spoke labels */}
          {dims.map((d, i) => {
            const pos = spoke(i, r + 16);
            return (
              <text
                key={d.key}
                x={pos.x}
                y={pos.y}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize="8.5"
                fill="#94a3b8"
              >
                {d.label}
              </text>
            );
          })}
          {/* Model polygons */}
          {latestByModel.map(({ modelId, scores }) => (
            <polygon
              key={modelId}
              points={
                dims
                  .map((d, i) => {
                    const val = (scores as Record<string, number>)[d.key] ?? 0;
                    const { x, y } = spoke(i, r * val);
                    return `${x.toFixed(1)},${y.toFixed(1)}`;
                  })
                  .join(' ')
              }
              fill={modelColors[modelId] ?? '#a78bfa'}
              fillOpacity="0.12"
              stroke={modelColors[modelId] ?? '#a78bfa'}
              strokeWidth="2"
            />
          ))}
          {/* Dots */}
          {latestByModel.map(({ modelId, scores }) =>
            dims.map((d, i) => {
              const val = (scores as Record<string, number>)[d.key] ?? 0;
              const { x, y } = spoke(i, r * val);
              return (
                <circle
                  key={`${modelId}-${d.key}`}
                  cx={x} cy={y} r="3"
                  fill={modelColors[modelId] ?? '#a78bfa'}
                  stroke="#0f172a" strokeWidth="1.5"
                />
              );
            })
          )}
        </svg>
        {/* Legend */}
        <div className="flex gap-4 justify-center flex-wrap mt-1">
          {latestByModel.map(({ modelId, modelName }) => (
            <div key={modelId} className="flex items-center gap-1.5">
              <div
                className="w-3 h-3 rounded-full"
                style={{ background: modelColors[modelId] ?? '#a78bfa' }}
              />
              <span className="text-xs text-slate-400">{modelName}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Trend lines — overallQuality over time */}
      <div>
        <p className="text-xs text-slate-500 uppercase tracking-wider mb-3 font-semibold">
          Overall Quality Trend
        </p>
        {(() => {
          const W2 = 340, H2 = 180, PAD2 = { top: 12, right: 16, bottom: 32, left: 36 };
          const cW = W2 - PAD2.left - PAD2.right;
          const cH = H2 - PAD2.top - PAD2.bottom;
          const xS = (i: number) => PAD2.left + (i / Math.max(periods.length - 1, 1)) * cW;
          const yS = (v: number) => PAD2.top + cH - v * cH;

          return (
            <svg viewBox={`0 0 ${W2} ${H2}`} className="w-full">
              {/* Grid */}
              {[0, 0.25, 0.5, 0.75, 1].map((f) => (
                <line key={f} x1={PAD2.left} y1={yS(f)} x2={PAD2.left + cW} y2={yS(f)} stroke="#1e293b" strokeWidth="1" />
              ))}
              {[0, 0.25, 0.5, 0.75, 1].map((f) => (
                <text key={f} x={PAD2.left - 4} y={yS(f) + 3} textAnchor="end" fontSize="8" fill="#64748b">
                  {Math.round(f * 100)}
                </text>
              ))}
              {/* Lines per model */}
              {Object.entries(byModel).map(([mid, pts]) => {
                const ordered = [...pts].sort((a, b) => a.period.localeCompare(b.period));
                const path = ordered
                  .map((p, i) => {
                    const pi = periods.indexOf(p.period);
                    return `${i === 0 ? 'M' : 'L'}${xS(pi).toFixed(1)},${yS(p.scores.overallQuality).toFixed(1)}`;
                  })
                  .join(' ');
                return (
                  <g key={mid}>
                    <path d={path} fill="none" stroke={modelColors[mid] ?? '#a78bfa'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    {ordered.map((p) => {
                      const pi = periods.indexOf(p.period);
                      return (
                        <circle
                          key={p.period}
                          cx={xS(pi)} cy={yS(p.scores.overallQuality)} r="3"
                          fill={modelColors[mid] ?? '#a78bfa'}
                          stroke="#0f172a" strokeWidth="1.5"
                        />
                      );
                    })}
                  </g>
                );
              })}
              {/* X labels */}
              {periods.map((p, i) => (
                <text key={p} x={xS(i)} y={H2 - 8} textAnchor="middle" fontSize="8" fill="#64748b">
                  {p.replace('2024-', '')}
                </text>
              ))}
            </svg>
          );
        })()}
        <p className="text-xs text-slate-600 text-right">Y-axis: Overall Quality Score (0–100)</p>
      </div>
    </div>
  );
}

/** Donut chart for cost by model */
function CostDonut({ slices }: { slices: { modelName: string; costUsd: number; percentage: number; modelId: string }[] }) {
  const cx = 80, cy = 80, R = 60, r = 38;
  let startAngle = -Math.PI / 2;

  const paths = slices.map((s) => {
    const sweep = (s.percentage / 100) * 2 * Math.PI;
    const endAngle = startAngle + sweep;
    const x1 = cx + R * Math.cos(startAngle);
    const y1 = cy + R * Math.sin(startAngle);
    const x2 = cx + R * Math.cos(endAngle);
    const y2 = cy + R * Math.sin(endAngle);
    const ix1 = cx + r * Math.cos(startAngle);
    const iy1 = cy + r * Math.sin(startAngle);
    const ix2 = cx + r * Math.cos(endAngle);
    const iy2 = cy + r * Math.sin(endAngle);
    const large = sweep > Math.PI ? 1 : 0;

    const d = `M${x1.toFixed(2)},${y1.toFixed(2)} A${R},${R} 0 ${large} 1 ${x2.toFixed(2)},${y2.toFixed(2)} L${ix2.toFixed(2)},${iy2.toFixed(2)} A${r},${r} 0 ${large} 0 ${ix1.toFixed(2)},${iy1.toFixed(2)} Z`;
    startAngle = endAngle;
    return { ...s, d };
  });

  return (
    <div className="flex items-center gap-6">
      <svg viewBox="0 0 160 160" className="w-36 flex-shrink-0">
        {paths.map((p) => (
          <path key={p.modelId} d={p.d} fill={MODEL_COLORS[p.modelId] ?? '#a78bfa'} />
        ))}
        <text x={cx} y={cy - 6} textAnchor="middle" fontSize="13" fontWeight="700" fill="#f1f5f9">
          {fmtUsd(slices.reduce((s, c) => s + c.costUsd, 0))}
        </text>
        <text x={cx} y={cy + 9} textAnchor="middle" fontSize="8" fill="#64748b">Total</text>
      </svg>
      <div className="space-y-2 flex-1">
        {slices.map((s) => (
          <div key={s.modelId} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: MODEL_COLORS[s.modelId] ?? '#a78bfa' }} />
              <span className="text-xs text-slate-300">{s.modelName}</span>
            </div>
            <div className="text-right">
              <span className="text-xs font-semibold text-slate-200">{fmtUsd(s.costUsd)}</span>
              <span className="text-[10px] text-slate-500 ml-1">({fmt(s.percentage)}%)</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const [snap, setSnap] = useState<AnalyticsSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [errorTab, setErrorTab] = useState<'chart' | 'table'>('chart');
  const [latencyModelId, setLatencyModelId] = useState<string>('all');

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await analyticsApi.getSnapshot();
      setSnap(data);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const data = await analyticsApi.refreshSnapshot();
      setSnap(data);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => { load(); }, [load]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[60vh]">
        <div className="text-center space-y-3">
          <Activity size={32} className="text-lab-400 mx-auto animate-pulse" />
          <p className="text-slate-400 text-sm">Loading analytics…</p>
        </div>
      </div>
    );
  }

  if (!snap) {
    return (
      <div className="p-8 text-center text-slate-500">
        Failed to load analytics. <button onClick={load} className="text-lab-400 underline ml-1">Retry</button>
      </div>
    );
  }

  const filteredTaxonomy =
    severityFilter === 'all'
      ? snap.errorTaxonomy
      : snap.errorTaxonomy.filter((b) => b.severity === severityFilter);

  const criticalCount = snap.errorTaxonomy.filter((b) => b.severity === 'critical').reduce((s, b) => s + b.count, 0);
  const totalErrors = snap.errorTaxonomy.reduce((s, b) => s + b.count, 0);

  // latest quality per model
  const latestQuality: Record<string, QualityRadarPoint> = {};
  snap.qualityTimeline.forEach((q) => {
    if (!latestQuality[q.modelId] || q.period > latestQuality[q.modelId].period) {
      latestQuality[q.modelId] = q;
    }
  });

  const bestModel = Object.values(latestQuality).sort(
    (a, b) => b.scores.overallQuality - a.scores.overallQuality
  )[0];

  return (
    <div className="p-6 max-w-screen-2xl mx-auto space-y-6">
      {/* Header */}
      <PageHeader
        title="Analytics & Observability"
        description={`Snapshot as of ${new Date(snap.generatedAt).toLocaleString()} · Period: ${snap.periodStart} → ${snap.periodEnd}`}
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Download size={14} />}
              onClick={() => {
                const blob = new Blob([JSON.stringify(snap, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `analytics_${snap.id}.json`;
                a.click();
                URL.revokeObjectURL(url);
              }}
            >
              Export JSON
            </Button>
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />}
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              {isRefreshing ? 'Refreshing…' : 'Refresh Snapshot'}
            </Button>
          </div>
        }
      />

      {/* ── KPI Row ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Evaluations"
          value={snap.totalEvaluations.toLocaleString()}
          icon={<Brain size={18} />}
          colorClass="text-lab-400"
        />
        <StatCard
          title="Avg Composite Score"
          value={`${Math.round(snap.avgCompositeScore * 100)}/100`}
          icon={<CheckCircle2 size={18} />}
          colorClass="text-emerald-400"
        />
        <StatCard
          title="Total Errors Flagged"
          value={totalErrors.toString()}
          subtitle={`${criticalCount} critical`}
          icon={<AlertTriangle size={18} />}
          colorClass="text-red-400"
        />
        <StatCard
          title="Total Lab Cost"
          value={fmtUsd(snap.costSummary.totalCostUsd)}
          subtitle={`${fmtK(snap.costSummary.totalTokens)} tokens`}
          icon={<DollarSign size={18} />}
          colorClass="text-amber-400"
        />
      </div>

      {/* ── Row 1: Error Taxonomy + Latency ──────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Error Taxonomy */}
        <Card>
          <CardBody>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-semibold text-slate-100 flex items-center gap-2">
                  <ShieldAlert size={16} className="text-red-400" />
                  Error Taxonomy
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {totalErrors} total errors across {snap.totalEvaluations.toLocaleString()} evaluations
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setErrorTab('chart')}
                  className={`text-xs px-2.5 py-1 rounded-lg transition-colors ${
                    errorTab === 'chart' ? 'bg-lab-500/20 text-lab-400' : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  Chart
                </button>
                <button
                  onClick={() => setErrorTab('table')}
                  className={`text-xs px-2.5 py-1 rounded-lg transition-colors ${
                    errorTab === 'table' ? 'bg-lab-500/20 text-lab-400' : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  Table
                </button>
              </div>
            </div>

            {/* Severity filter */}
            <div className="flex gap-1.5 mb-4 flex-wrap">
              {(['all', 'critical', 'high', 'medium', 'low'] as const).map((sev) => (
                <button
                  key={sev}
                  onClick={() => setSeverityFilter(sev)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all border ${
                    severityFilter === sev
                      ? 'bg-lab-500/20 border-lab-500/40 text-lab-300'
                      : 'border-slate-700 text-slate-500 hover:border-slate-600 hover:text-slate-300'
                  }`}
                >
                  <Filter size={9} className="inline mr-1" />
                  {sev === 'all' ? 'All' : sev.charAt(0).toUpperCase() + sev.slice(1)}
                </button>
              ))}
            </div>

            {errorTab === 'chart' ? (
              <ErrorTaxonomyChart buckets={filteredTaxonomy} />
            ) : (
              <div className="overflow-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-slate-500 border-b border-slate-800">
                      <th className="text-left pb-2 font-medium">Category</th>
                      <th className="text-right pb-2 font-medium">Count</th>
                      <th className="text-right pb-2 font-medium">%</th>
                      <th className="text-center pb-2 font-medium">Trend</th>
                      <th className="text-center pb-2 font-medium">Severity</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filteredTaxonomy
                      .sort((a, b) => b.count - a.count)
                      .map((b) => (
                        <tr key={b.category} className="hover:bg-slate-800/30 transition-colors">
                          <td className="py-2 pr-2">
                            <p className="text-slate-200 font-medium">{b.category}</p>
                            {b.subcategory && (
                              <p className="text-slate-600 text-[10px]">{b.subcategory}</p>
                            )}
                          </td>
                          <td className="py-2 text-right tabular-nums text-slate-300">{b.count}</td>
                          <td className="py-2 text-right tabular-nums text-slate-400">{fmt(b.percentage)}%</td>
                          <td className="py-2 text-center">
                            {b.trend === 'up' && <TrendingUp size={11} className="text-red-400 mx-auto" />}
                            {b.trend === 'down' && <TrendingDown size={11} className="text-emerald-400 mx-auto" />}
                            {b.trend === 'stable' && <Minus size={11} className="text-slate-500 mx-auto" />}
                          </td>
                          <td className="py-2 text-center">
                            <Badge variant={severityBadgeVariant(b.severity)} size="sm">{b.severity}</Badge>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardBody>
        </Card>

        {/* Latency Distribution */}
        <Card>
          <CardBody>
            <h2 className="text-base font-semibold text-slate-100 flex items-center gap-2 mb-1">
              <Timer size={16} className="text-sky-400" />
              Latency Distribution
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              Per-model response time histograms and percentile breakdown
            </p>
            <LatencyHistogram stats={snap.latencyStats} />

            {/* Comparison table */}
            <div className="mt-5 overflow-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-slate-500 border-b border-slate-800">
                    <th className="text-left pb-2 font-medium">Model</th>
                    <th className="text-right pb-2 font-medium">Mean</th>
                    <th className="text-right pb-2 font-medium">p50</th>
                    <th className="text-right pb-2 font-medium">p90</th>
                    <th className="text-right pb-2 font-medium">p99</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {snap.latencyStats.map((s) => (
                    <tr key={s.modelId} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-2 pr-3">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-2 h-2 rounded-full"
                            style={{ background: MODEL_COLORS[s.modelId] ?? '#a78bfa' }}
                          />
                          <span className="text-slate-200">{s.modelName}</span>
                        </div>
                      </td>
                      <td className="py-2 text-right tabular-nums text-slate-300">{fmtMs(s.meanMs)}</td>
                      <td className="py-2 text-right tabular-nums text-emerald-400">{fmtMs(s.p50Ms)}</td>
                      <td className="py-2 text-right tabular-nums text-amber-400">{fmtMs(s.p90Ms)}</td>
                      <td className="py-2 text-right tabular-nums text-red-400">{fmtMs(s.p99Ms)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* ── Row 2: Cost Tracking ─────────────────────────────────────────── */}
      <Card>
        <CardBody>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-base font-semibold text-slate-100 flex items-center gap-2">
                <DollarSign size={16} className="text-amber-400" />
                Token Cost Tracking
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Weekly spend, token volume, and cost-per-run breakdown across models
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-slate-100">{fmtUsd(snap.costSummary.totalCostUsd)}</p>
              <p className="text-xs text-slate-500">{snap.costSummary.totalRuns} runs · avg {fmtUsd(snap.costSummary.avgCostPerRun)}/run</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Timeline */}
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-2 font-semibold">Weekly Spend Timeline</p>
              <CostTimeline data={snap.costSummary.timeline} />

              {/* Stats row */}
              <div className="grid grid-cols-3 gap-3 mt-4">
                {[
                  { label: 'Total Tokens', value: fmtK(snap.costSummary.totalTokens), icon: <Zap size={13} className="text-amber-400" /> },
                  { label: 'Total Runs', value: snap.costSummary.totalRuns.toLocaleString(), icon: <Activity size={13} className="text-lab-400" /> },
                  { label: 'Avg Cost / Run', value: fmtUsd(snap.costSummary.avgCostPerRun), icon: <DollarSign size={13} className="text-emerald-400" /> },
                ].map(({ label, value, icon }) => (
                  <div key={label} className="bg-slate-800/50 rounded-xl p-3 flex items-center gap-2">
                    {icon}
                    <div>
                      <p className="text-[10px] text-slate-500">{label}</p>
                      <p className="text-sm font-bold text-slate-200">{value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Donut */}
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-3 font-semibold">Cost by Model</p>
              <CostDonut slices={snap.costSummary.costByModel} />

              {/* Weekly breakdown table */}
              <div className="mt-5 overflow-auto max-h-40">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-slate-500 border-b border-slate-800 sticky top-0 bg-slate-900">
                      <th className="text-left pb-2 font-medium">Period</th>
                      <th className="text-right pb-2 font-medium">Tokens</th>
                      <th className="text-right pb-2 font-medium">Cost</th>
                      <th className="text-right pb-2 font-medium">Runs</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {snap.costSummary.timeline.map((t) => (
                      <tr key={t.period} className="hover:bg-slate-800/30">
                        <td className="py-1.5 text-slate-300">{t.periodLabel}</td>
                        <td className="py-1.5 text-right tabular-nums text-slate-400">{fmtK(t.totalTokens)}</td>
                        <td className="py-1.5 text-right tabular-nums text-amber-400 font-medium">{fmtUsd(t.costUsd)}</td>
                        <td className="py-1.5 text-right tabular-nums text-slate-400">{t.runCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* ── Row 3: Longitudinal Quality Radar ────────────────────────────── */}
      <Card>
        <CardBody>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-base font-semibold text-slate-100 flex items-center gap-2">
                <BarChart2 size={16} className="text-emerald-400" />
                Longitudinal Model Quality Radar
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                6-dimension quality radar (latest) + overall quality trend over time
              </p>
            </div>
            {bestModel && (
              <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-3 py-2">
                <CheckCircle2 size={14} className="text-emerald-400" />
                <div className="text-right">
                  <p className="text-xs text-slate-400">Best Performer</p>
                  <p className="text-sm font-semibold text-emerald-300">{bestModel.modelName}</p>
                  <p className="text-xs text-slate-500">{Math.round(bestModel.scores.overallQuality * 100)}/100</p>
                </div>
              </div>
            )}
          </div>

          <QualityRadarChart points={snap.qualityTimeline} modelColors={MODEL_COLORS} />

          {/* Dimension table */}
          <div className="mt-6 overflow-auto">
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-3 font-semibold">
              Dimension Scores — Latest Period
            </p>
            <table className="w-full text-xs">
              <thead>
                <tr className="text-slate-500 border-b border-slate-800">
                  <th className="text-left pb-2 font-medium">Dimension</th>
                  {Object.values(latestQuality).map((q) => (
                    <th key={q.modelId} className="text-right pb-2 font-medium">
                      <span style={{ color: MODEL_COLORS[q.modelId] ?? '#a78bfa' }}>{q.modelName}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {QUALITY_DIMS.map((d) => {
                  const vals = Object.values(latestQuality).map((q) => (q.scores as Record<string, number>)[d.key] ?? 0);
                  const maxVal = Math.max(...vals);
                  return (
                    <tr key={d.key} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-2 text-slate-300 font-medium">{d.label}</td>
                      {Object.values(latestQuality).map((q) => {
                        const val = (q.scores as Record<string, number>)[d.key] ?? 0;
                        const isBest = val === maxVal;
                        return (
                          <td key={q.modelId} className="py-2 text-right">
                            <span
                              className={`tabular-nums font-semibold ${isBest ? 'text-emerald-400' : 'text-slate-300'}`}
                            >
                              {Math.round(val * 100)}
                            </span>
                            <span className="text-slate-600">/100</span>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
