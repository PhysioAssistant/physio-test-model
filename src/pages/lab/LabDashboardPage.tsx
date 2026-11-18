import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  StatCard,
  PageHeader,
  Button,
  Badge,
  Tabs,
  TabList,
  TabTrigger,
  TabContent,
  Card,
  CardBody,
} from '@/components/ui';
import {
  FlaskConical,
  Database,
  Cpu,
  GitCompare,
  FileCode2,
  Layers,
  FolderOpen,
  PlusCircle,
  ArrowRight,
  Clock,
  DollarSign,
  Zap,
  Columns3,
  Stethoscope,
  ShieldCheck,
  BarChart3,
} from 'lucide-react';
import {
  experimentsApi,
  modelsApi,
  datasetsApi,
  promptsApi,
  ragApi,
  casesApi,
} from '@/lib/api';
import type { Experiment } from '@/types';

export default function LabDashboardPage() {
  const navigate = useNavigate();
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [modelsCount, setModelsCount] = useState(0);
  const [datasetsCount, setDatasetsCount] = useState(0);
  const [promptsCount, setPromptsCount] = useState(0);
  const [ragCount, setRagCount] = useState(0);
  const [casesCount, setCasesCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      experimentsApi.list(),
      modelsApi.list(),
      datasetsApi.list(),
      promptsApi.list(),
      ragApi.list(),
      casesApi.list(),
    ])
      .then(([exp, mod, ds, pr, rag, cs]) => {
        setExperiments(exp);
        setModelsCount(mod.length);
        setDatasetsCount(ds.length);
        setPromptsCount(pr.length);
        setRagCount(rag.length);
        setCasesCount(cs.length);
      })
      .catch((err) => console.error('Error loading AI Lab dashboard data:', err))
      .finally(() => setIsLoading(false));
  }, []);

  const totalRuns = experiments.length;
  const runningCount = experiments.filter((e) => e.status === 'running').length;
  const completedCount = experiments.filter((e) => e.status === 'completed').length;

  const moduleCards = [
    {
      icon: FolderOpen,
      label: 'Case Repository',
      desc: 'Inspect raw clinical presentations, transcripts, and verified ground truth',
      count: casesCount,
      path: '/doctor/lab/cases',
      colour: 'text-clinical-400 bg-clinical-500/10',
    },
    {
      icon: Database,
      label: 'Dataset Management',
      desc: 'Benchmark cohorts, golden test collections, and case groupings',
      count: datasetsCount,
      path: '/doctor/lab/datasets',
      colour: 'text-lab-400 bg-lab-500/10',
    },
    {
      icon: Cpu,
      label: 'Model Registry',
      desc: 'Provider-agnostic LLMs: Claude, GPT-4o, Bedrock, Ollama, HTTP',
      count: modelsCount,
      path: '/doctor/lab/models',
      colour: 'text-brand-400 bg-brand-500/10',
    },
    {
      icon: FileCode2,
      label: 'Versioned Prompt Lab',
      desc: 'System prompts, variables ({{patient_context}}), and output schemas',
      count: promptsCount,
      path: '/doctor/lab/prompts',
      colour: 'text-amber-400 bg-amber-500/10',
    },
    {
      icon: Layers,
      label: 'RAG Studio',
      desc: 'Knowledge bases, Hybrid RRF, chunking parameters, and rerankers',
      count: ragCount,
      path: '/doctor/lab/rag',
      colour: 'text-indigo-400 bg-indigo-500/10',
    },
    {
      icon: GitCompare,
      label: 'Benchmark Experiments',
      desc: 'Multi-model execution batches, parameter matrices, and queue manager',
      count: totalRuns,
      path: '/doctor/lab/experiments',
      colour: 'text-emerald-400 bg-emerald-500/10',
    },
    {
      icon: Columns3,
      label: 'Side-by-Side Comparison',
      desc: 'Synchronized multi-column clinical grid, ground truth diffs & telemetry',
      count: 'Live Grid',
      path: '/doctor/lab/comparison',
      colour: 'text-cyan-400 bg-cyan-500/10',
    },
    {
      icon: BarChart3,
      label: '10-D Evaluation Engine',
      desc: 'Automated clinical scoring, No-Inference checks, and error taxonomy',
      count: '10 Dims',
      path: '/doctor/lab/evaluations',
      colour: 'text-fuchsia-400 bg-fuchsia-500/10',
    },
    {
      icon: Stethoscope,
      label: 'Doctor Review Loop',
      desc: 'Physician corrections, error taxonomy, and active learning dataset builder',
      count: 'Active Loop',
      path: '/doctor/lab/reviews',
      colour: 'text-emerald-400 bg-emerald-500/10',
    },
    {
      icon: ShieldCheck,
      label: 'Regression Suite',
      desc: 'Golden benchmark audits, drift detection, and pre-deployment gatekeeper',
      count: 'Gatekeeper',
      path: '/doctor/lab/regression',
      colour: 'text-rose-400 bg-rose-500/10',
    },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-fadeIn text-slate-100">
      {/* ── Page Header ── */}
      <PageHeader
        title="AI Evaluation Studio & Research Lab"
        subtitle="Provider-agnostic benchmarking, multi-model execution, and 10-dimensional clinical evaluations"
        action={
          <div className="flex items-center gap-3">
            <Badge variant="lab" size="sm">
              Internal Research Mode
            </Badge>
            <Button
              variant="lab"
              size="md"
              icon={<PlusCircle size={15} />}
              onClick={() => navigate('/doctor/lab/experiments?action=new')}
            >
              Launch Experiment
            </Button>
          </div>
        }
      />

      {/* ── High-Level Stat Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Active Models</span>
            <Cpu size={16} className="text-brand-400" />
          </div>
          <p className="text-2xl font-bold font-mono text-white">{modelsCount}</p>
          <p className="text-xs text-slate-500">Anthropic, OpenAI, Bedrock</p>
        </div>

        <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Benchmark Datasets</span>
            <Database size={16} className="text-lab-400" />
          </div>
          <p className="text-2xl font-bold font-mono text-white">{datasetsCount}</p>
          <p className="text-xs text-slate-500">Golden evaluation cohorts</p>
        </div>

        <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Avg Inference Latency</span>
            <Zap size={16} className="text-amber-400" />
          </div>
          <p className="text-2xl font-bold font-mono text-white">1,420 ms</p>
          <p className="text-xs text-slate-500">Across hybrid retrieval runs</p>
        </div>

        <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Experiment Batches</span>
            <FlaskConical size={16} className="text-emerald-400" />
          </div>
          <p className="text-2xl font-bold font-mono text-white">{totalRuns}</p>
          <p className="text-xs text-slate-500">{runningCount} currently executing</p>
        </div>
      </div>

      {/* ── Analytical Modules Navigation Grid ── */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          Analytical Engineering Modules
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {moduleCards.map((m) => {
            const Icon = m.icon;
            return (
              <div
                key={m.label}
                onClick={() => navigate(m.path)}
                className="p-5 rounded-xl bg-slate-900/90 border border-slate-800/80 hover:border-slate-700 hover:bg-slate-900 transition-all cursor-pointer group flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className={`p-2.5 rounded-lg ${m.colour}`}>
                      <Icon size={18} />
                    </div>
                    <span className="text-xs font-mono font-medium text-slate-500 bg-slate-800/80 px-2 py-0.5 rounded-md border border-slate-700/50">
                      {m.count} items
                    </span>
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold text-slate-200 group-hover:text-lab-300 transition-colors">
                      {m.label}
                    </h4>
                    <p className="text-xs text-slate-400 leading-relaxed mt-1">{m.desc}</p>
                  </div>
                </div>

                <div className="pt-4 mt-3 border-t border-slate-800/60 flex items-center justify-end text-xs font-semibold text-slate-400 group-hover:text-lab-400 transition-colors">
                  <span className="flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                    Open Module
                    <ArrowRight size={13} />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Experiments Running & Benchmark Batches ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Recent Benchmark Experiments
          </h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/doctor/lab/experiments')}
            className="text-xs text-slate-400 hover:text-white"
          >
            View All ({totalRuns})
          </Button>
        </div>

        {experiments.length === 0 ? (
          <div className="p-8 text-center bg-slate-900 rounded-xl border border-slate-800 text-slate-500 text-sm">
            No experiments logged yet.
          </div>
        ) : (
          <div className="bg-slate-900 border border-slate-800 rounded-xl divide-y divide-slate-800/60 overflow-hidden">
            {experiments.map((exp) => (
              <div
                key={exp.id}
                onClick={() => navigate('/doctor/lab/experiments')}
                className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-850/60 transition-colors cursor-pointer"
              >
                <div className="space-y-1 max-w-xl">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-medium text-slate-500">{exp.id}</span>
                    <span className="text-slate-700">•</span>
                    <h4 className="text-sm font-semibold text-slate-200">{exp.name}</h4>
                  </div>
                  <p className="text-xs text-slate-400 line-clamp-1">{exp.description}</p>
                </div>

                <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-slate-400">
                  <span className="flex items-center gap-1">
                    <Clock size={12} className="text-slate-500" />
                    {exp.averageLatencyMs ? `${exp.averageLatencyMs}ms` : '—'}
                  </span>
                  <span className="flex items-center gap-1">
                    <DollarSign size={12} className="text-slate-500" />
                    {exp.totalCostUsd ? `$${exp.totalCostUsd.toFixed(2)}` : '$0.00'}
                  </span>
                  <span className="bg-slate-800 px-2 py-0.5 rounded text-slate-300">
                    {exp.completedCases}/{exp.totalCases} cases
                  </span>
                  <Badge
                    variant={exp.status === 'completed' ? 'success' : 'warning'}
                    size="sm"
                    dot
                  >
                    {exp.status.toUpperCase()}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

