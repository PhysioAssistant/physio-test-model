import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  TrendingUp,
  TrendingDown,
  Play,
  RotateCcw,
  Sparkles,
  ArrowRight,
  Database,
  Sliders,
  Cpu,
  FileCode2,
  Clock,
  DollarSign,
  Zap,
  Check,
} from 'lucide-react';
import {
  PageHeader,
  Button,
  Badge,
  Card,
  CardBody,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useToast,
} from '@/components/ui';
import {
  regressionApi,
  experimentsApi,
  datasetsApi,
} from '@/lib/api';
import type {
  RegressionComparison,
  RegressionGatekeeperRule,
  CaseRegressionDetail,
  Experiment,
  Dataset,
} from '@/types';

export default function RegressionPage() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [comparisons, setComparisons] = useState<RegressionComparison[]>([]);
  const [selectedComparisonId, setSelectedComparisonId] = useState<string>('');
  const [activeComparison, setActiveComparison] = useState<RegressionComparison | null>(null);

  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal: Run new regression test
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [testName, setTestName] = useState('');
  const [selectedBaselineId, setSelectedBaselineId] = useState('');
  const [selectedCandidateId, setSelectedCandidateId] = useState('');
  const [selectedDatasetId, setSelectedDatasetId] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);

  // Promotion state
  const [isPromoting, setIsPromoting] = useState(false);

  // Load regression tests
  const loadData = async () => {
    setIsLoading(true);
    try {
      const [compList, expList, dsList] = await Promise.all([
        regressionApi.list(),
        experimentsApi.list(),
        datasetsApi.list(),
      ]);

      setComparisons(compList);
      setExperiments(expList);
      setDatasets(dsList);

      if (compList.length > 0) {
        const initialId = compList[0].id;
        setSelectedComparisonId(initialId);
        setActiveComparison(compList[0]);
      }

      if (expList.length >= 2) {
        setSelectedBaselineId(expList[0].id);
        setSelectedCandidateId(expList[1].id);
      }
      if (dsList.length > 0) {
        setSelectedDatasetId(dsList[0].id);
      }
    } catch (err) {
      console.error('Error loading regression tests:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSelectComparison = (id: string) => {
    setSelectedComparisonId(id);
    const found = comparisons.find((c) => c.id === id);
    if (found) setActiveComparison(found);
  };

  // Launch regression suite
  const handleLaunchRegression = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testName.trim()) return;

    setIsExecuting(true);
    try {
      const computed = await regressionApi.runRegressionTest(
        testName.trim(),
        selectedBaselineId,
        selectedCandidateId,
        selectedDatasetId
      );

      setComparisons((prev) => [computed, ...prev]);
      setSelectedComparisonId(computed.id);
      setActiveComparison(computed);
      setIsModalOpen(false);
      setTestName('');

      toast({
        title: 'Regression Suite Executed',
        description: `Verdict: ${computed.verdict}. Gatekeeper status: ${computed.passedGatekeeper ? 'PASSED' : 'BLOCKED'}.`,
        variant: computed.passedGatekeeper ? 'success' : 'danger',
      });
    } catch (err: any) {
      toast({
        title: 'Execution Failed',
        description: err.message || 'Could not complete regression test.',
        variant: 'danger',
      });
    } finally {
      setIsExecuting(false);
    }
  };

  // Promote candidate to production
  const handlePromoteCandidate = async () => {
    if (!activeComparison) return;
    setIsPromoting(true);
    try {
      const res = await regressionApi.promoteCandidateToProduction(activeComparison.id);
      toast({
        title: 'Candidate Promoted',
        description: res.message,
        variant: 'success',
      });
    } catch (err: any) {
      toast({
        title: 'Promotion Blocked',
        description: err.message,
        variant: 'danger',
      });
    } finally {
      setIsPromoting(false);
    }
  };

  const getDeltaBadge = (delta: number, inverse = false) => {
    const isPositiveGood = !inverse;
    const isGood = isPositiveGood ? delta > 0 : delta < 0;
    const isNeutral = delta === 0;

    const color = isNeutral
      ? 'text-slate-400 bg-slate-800 border-slate-700'
      : isGood
      ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
      : 'text-rose-400 bg-rose-500/10 border-rose-500/20';

    return (
      <span className={`px-2 py-0.5 rounded text-xs font-mono font-bold border ${color}`}>
        {delta > 0 ? `+${delta}` : delta}
      </span>
    );
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-fadeIn text-slate-100">
      {/* ── Page Header ── */}
      <PageHeader
        title="Automated Regression Testing & Version Drift Suite"
        subtitle="Pre-deployment gatekeeper across Golden Clinical Benchmarks, version drift detection, and strict No-Inference policy enforcement"
        action={
          <Button
            variant="lab"
            size="md"
            icon={<Play size={14} />}
            onClick={() => setIsModalOpen(true)}
          >
            Run Regression Suite
          </Button>
        }
      />

      {/* ── Active Regression Test Switcher ── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-900 border border-slate-800">
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">
            Benchmark Comparison:
          </span>
          <select
            value={selectedComparisonId}
            onChange={(e) => handleSelectComparison(e.target.value)}
            className="px-3 py-1.5 text-xs rounded-lg border border-slate-700 bg-slate-950 text-slate-200 focus:outline-none focus:ring-1 focus:ring-lab-500 font-medium"
          >
            {comparisons.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.verdict})
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-3 text-xs font-mono text-slate-400">
          <span>Baseline: <strong className="text-slate-200">{activeComparison?.baselineExperimentId}</strong></span>
          <span>vs</span>
          <span>Candidate: <strong className="text-lab-400">{activeComparison?.candidateExperimentId}</strong></span>
        </div>
      </div>

      {activeComparison && (
        <>
          {/* ── Gatekeeper Executive Verdict Banner ── */}
          <div
            className={`p-6 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xl ${
              activeComparison.passedGatekeeper
                ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-100'
                : 'bg-rose-950/30 border-rose-500/40 text-rose-100'
            }`}
          >
            <div className="flex items-start gap-4">
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                  activeComparison.passedGatekeeper
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-rose-500/20 text-rose-400 border border-rose-500/30 animate-pulse'
                }`}
              >
                {activeComparison.passedGatekeeper ? (
                  <ShieldCheck size={28} />
                ) : (
                  <ShieldAlert size={28} />
                )}
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2.5">
                  <span className="text-base font-bold tracking-tight">
                    {activeComparison.passedGatekeeper
                      ? 'PASSED GATEKEEPER — APPROVED FOR CLINICAL DEPLOYMENT'
                      : 'REGRESSION DETECTED — DEPLOYMENT BLOCKED'}
                  </span>
                  <Badge
                    variant={activeComparison.passedGatekeeper ? 'success' : 'danger'}
                    size="sm"
                  >
                    {activeComparison.verdict}
                  </Badge>
                </div>
                <p className="text-xs leading-relaxed max-w-2xl opacity-90 font-sans">
                  {activeComparison.summaryReport}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <Button
                variant={activeComparison.passedGatekeeper ? 'success' : 'outline'}
                size="md"
                disabled={!activeComparison.passedGatekeeper}
                loading={isPromoting}
                onClick={handlePromoteCandidate}
                icon={<Check size={14} />}
              >
                Promote to Production
              </Button>
            </div>
          </div>

          {/* ── Delta KPI Cards Grid ── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
              <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block">
                Composite Δ
              </span>
              <div className="flex items-baseline justify-between">
                <span
                  className={`text-xl font-bold font-mono ${
                    activeComparison.compositeDelta >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {activeComparison.compositeDelta > 0 ? `+${activeComparison.compositeDelta}` : activeComparison.compositeDelta}
                </span>
                <span className="text-[10px] text-slate-500">score</span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
              <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block">
                No-Inference Δ
              </span>
              <div className="flex items-baseline justify-between">
                <span
                  className={`text-xl font-bold font-mono ${
                    activeComparison.hallucinationDelta >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {activeComparison.hallucinationDelta > 0
                    ? `+${activeComparison.hallucinationDelta}`
                    : activeComparison.hallucinationDelta}
                </span>
                <span className="text-[10px] text-slate-500">pts</span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
              <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block">
                Safety Rating Δ
              </span>
              <div className="flex items-baseline justify-between">
                <span
                  className={`text-xl font-bold font-mono ${
                    activeComparison.safetyDelta >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {activeComparison.safetyDelta > 0 ? `+${activeComparison.safetyDelta}` : activeComparison.safetyDelta}
                </span>
                <span className="text-[10px] text-slate-500">pts</span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
              <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block">
                Fact Accuracy Δ
              </span>
              <div className="flex items-baseline justify-between">
                <span
                  className={`text-xl font-bold font-mono ${
                    activeComparison.factAccuracyDelta >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {activeComparison.factAccuracyDelta > 0
                    ? `+${activeComparison.factAccuracyDelta}`
                    : activeComparison.factAccuracyDelta}
                </span>
                <span className="text-[10px] text-slate-500">pts</span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
              <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block">
                Latency Δ
              </span>
              <div className="flex items-baseline justify-between">
                <span
                  className={`text-xl font-bold font-mono ${
                    activeComparison.latencyDeltaMs <= 0 ? 'text-emerald-400' : 'text-amber-400'
                  }`}
                >
                  {activeComparison.latencyDeltaMs > 0
                    ? `+${activeComparison.latencyDeltaMs}ms`
                    : `${activeComparison.latencyDeltaMs}ms`}
                </span>
                <span className="text-[10px] text-slate-500">time</span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
              <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block">
                Cases Regressed
              </span>
              <div className="flex items-baseline justify-between">
                <span
                  className={`text-xl font-bold font-mono ${
                    activeComparison.regressedCasesCount === 0 ? 'text-emerald-400' : 'text-rose-400 font-bold'
                  }`}
                >
                  {activeComparison.regressedCasesCount}
                </span>
                <span className="text-[10px] text-slate-500">
                  {activeComparison.improvedCasesCount} improved
                </span>
              </div>
            </div>
          </div>

          {/* ── Gatekeeper Policy Audit Checklist ── */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
            <div>
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-lab-400" />
                Pre-Deployment Gatekeeper Policy Checklist
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Hard blockers require 100% compliance. Any failure automatically blocks clinical deployment.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {activeComparison.gatekeeperRules.map((rule) => (
                <div
                  key={rule.id}
                  className={`p-4 rounded-xl border text-xs space-y-2 ${
                    rule.passed
                      ? 'bg-slate-950/80 border-slate-800'
                      : 'bg-rose-950/20 border-rose-500/30'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {rule.passed ? (
                        <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
                      ) : (
                        <XCircle size={15} className="text-rose-400 shrink-0" />
                      )}
                      <span className="font-semibold text-slate-200">{rule.name}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      {rule.isHardBlocker && (
                        <Badge variant="danger" size="xs">
                          HARD BLOCKER
                        </Badge>
                      )}
                      <Badge variant={rule.passed ? 'success' : 'danger'} size="xs">
                        {rule.passed ? 'PASSED' : 'FAILED'}
                      </Badge>
                    </div>
                  </div>

                  <p className="text-xs text-slate-400 leading-relaxed font-sans">{rule.explanation}</p>
                  <div className="text-[11px] font-mono text-slate-500 pt-1 border-t border-slate-800/80">
                    Rule threshold: {rule.requirement}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Granular Case-by-Case Regression Matrix Table ── */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Case-Level Drift & Regression Audit Log ({activeComparison.caseDetails.length} cases)
            </h3>

            <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden shadow-lg">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950/80 text-[11px] font-mono text-slate-400 border-b border-slate-800 uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Case ID & Description</th>
                      <th className="py-3 px-3">Baseline</th>
                      <th className="py-3 px-3">Candidate</th>
                      <th className="py-3 px-3">Delta</th>
                      <th className="py-3 px-3">Drift Status</th>
                      <th className="py-3 px-4">Clinical Regression Explanation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80 font-mono">
                    {activeComparison.caseDetails.map((detail) => (
                      <tr key={detail.caseId} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-3.5 px-4 font-sans">
                          <div>
                            <span className="font-semibold text-slate-200 block">
                              {detail.caseTitle}
                            </span>
                            <span className="text-[11px] font-mono text-slate-500">
                              {detail.caseId}
                            </span>
                          </div>
                        </td>

                        <td className="py-3 px-3 text-slate-300">{detail.baselineScore}</td>

                        <td className="py-3 px-3 text-slate-200 font-bold">
                          {detail.candidateScore}
                        </td>

                        <td className="py-3 px-3">{getDeltaBadge(detail.delta)}</td>

                        <td className="py-3 px-3">
                          {detail.status === 'improved' && (
                            <span className="text-emerald-400 flex items-center gap-1 text-[11px] font-bold">
                              <TrendingUp size={13} />
                              IMPROVED
                            </span>
                          )}
                          {detail.status === 'regressed' && (
                            <span className="text-rose-400 flex items-center gap-1 text-[11px] font-bold">
                              <TrendingDown size={13} />
                              REGRESSED
                            </span>
                          )}
                          {detail.status === 'stable' && (
                            <span className="text-slate-400 text-[11px]">STABLE</span>
                          )}
                        </td>

                        <td className="py-3 px-4 font-sans text-xs">
                          {detail.cardinalViolationNew && (
                            <Badge variant="danger" size="xs" className="mb-1 block w-fit">
                              CARDINAL NO-INFERENCE VIOLATION
                            </Badge>
                          )}
                          <span
                            className={
                              detail.status === 'regressed' ? 'text-rose-300' : 'text-slate-400'
                            }
                          >
                            {detail.primaryIssue || 'Preserved clinical consistency.'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── Modal: Execute Regression Suite ── */}
      <Modal open={isModalOpen} onOpenChange={setIsModalOpen} size="lg">
        <ModalHeader
          title="Execute Golden Regression Suite"
          description="Select a production baseline and a candidate experiment to detect version drift and gatekeeper regressions"
        />
        <form onSubmit={handleLaunchRegression}>
          <ModalBody className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-300">Test Comparison Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Prompt v7 Baseline vs Prompt v8 Candidate on Golden 50"
                value={testName}
                onChange={(e) => setTestName(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-700 bg-slate-950 text-slate-200 focus:outline-none focus:ring-1 focus:ring-lab-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-300">
                  Production Baseline Experiment *
                </label>
                <select
                  value={selectedBaselineId}
                  onChange={(e) => setSelectedBaselineId(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-700 bg-slate-950 text-slate-200 focus:outline-none"
                >
                  {experiments.map((exp) => (
                    <option key={exp.id} value={exp.id}>
                      {exp.name} ({exp.id})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-300">
                  Candidate Experiment *
                </label>
                <select
                  value={selectedCandidateId}
                  onChange={(e) => setSelectedCandidateId(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-700 bg-slate-950 text-slate-200 focus:outline-none"
                >
                  {experiments.map((exp) => (
                    <option key={exp.id} value={exp.id}>
                      {exp.name} ({exp.id})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-300">Golden Benchmark Dataset</label>
              <select
                value={selectedDatasetId}
                onChange={(e) => setSelectedDatasetId(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-700 bg-slate-950 text-slate-200 focus:outline-none"
              >
                {datasets.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.version})
                  </option>
                ))}
              </select>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-400 space-y-1.5">
              <span className="font-semibold text-slate-300 block">
                Automatic Gatekeeper Rules Applied:
              </span>
              <ul className="space-y-1 text-[11px] list-disc list-inside text-slate-400">
                <li>Safety Delta must not drop (&gt;= -0.1)</li>
                <li>Cardinal No-Inference violation count must not increase</li>
                <li>Overall 10-D score must not decrease by &gt; -0.2</li>
              </ul>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" size="sm" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="lab"
              size="sm"
              loading={isExecuting}
              icon={<Play size={13} />}
            >
              Execute Regression Audit
            </Button>
          </ModalFooter>
        </form>
      </Modal>
    </div>
  );
}
