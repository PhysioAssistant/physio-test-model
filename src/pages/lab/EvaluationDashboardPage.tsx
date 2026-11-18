import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Sparkles,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Cpu,
  Search,
  Filter,
  BarChart3,
  Layers,
  FileCode2,
  ArrowRight,
  RefreshCw,
  Sliders,
  ExternalLink,
} from 'lucide-react';
import {
  PageHeader,
  Button,
  Badge,
  Card,
  CardBody,
  Tabs,
  TabList,
  TabTrigger,
  TabContent,
  Modal,
  ModalHeader,
  ModalBody,
  useToast,
} from '@/components/ui';
import { EvaluationScoreCard } from '@/components/lab';
import {
  experimentsApi,
  casesApi,
  evaluationsApi,
} from '@/lib/api';
import type {
  Experiment,
  ExperimentRun,
  ComprehensiveEvaluation,
  EvaluationItemIssue,
  PatientCase,
} from '@/types';
import { getEvaluationDimensionsList } from '@/lib/evaluations';

export default function EvaluationDashboardPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [selectedExperimentId, setSelectedExperimentId] = useState<string>('exp-1042');
  const [runs, setRuns] = useState<ExperimentRun[]>([]);
  const [evaluations, setEvaluations] = useState<ComprehensiveEvaluation[]>([]);
  const [cases, setCases] = useState<PatientCase[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState<string>('all');

  const [isLoading, setIsLoading] = useState(true);
  const [isBatchEvaluating, setIsBatchEvaluating] = useState(false);
  const [selectedRunForInspect, setSelectedRunForInspect] = useState<{
    run: ExperimentRun;
    evalResult: ComprehensiveEvaluation;
  } | null>(null);

  // Filter state for issues feed
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');
  const [selectedTaxonomy, setSelectedTaxonomy] = useState<string>('all');

  // Load experiments & cases
  useEffect(() => {
    Promise.all([experimentsApi.list(), casesApi.list()])
      .then(([expList, caseList]) => {
        setExperiments(expList);
        setCases(caseList);
        if (expList.length > 0) {
          const expParam = searchParams.get('exp') || expList[0].id;
          setSelectedExperimentId(expParam);
        }
      })
      .catch((err) => console.error('Error loading baseline:', err));
  }, []);

  // Load runs and evaluations
  const loadData = async () => {
    if (!selectedExperimentId) return;
    setIsLoading(true);
    try {
      const runList = await experimentsApi.getRuns(
        selectedExperimentId,
        selectedCaseId === 'all' ? undefined : selectedCaseId
      );
      setRuns(runList);

      // Fetch or compute evaluations for all runs
      const evalList: ComprehensiveEvaluation[] = [];
      for (const r of runList) {
        const ev = await evaluationsApi.getByRunId(r.id);
        if (ev) evalList.push(ev);
      }
      setEvaluations(evalList);
    } catch (err: any) {
      console.error('Error loading evaluations:', err);
      toast({
        title: 'Evaluation Load Error',
        description: err.message || 'Could not load evaluations.',
        variant: 'danger',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedExperimentId, selectedCaseId]);

  // Batch re-evaluate all runs
  const handleBatchEvaluate = async () => {
    setIsBatchEvaluating(true);
    try {
      const refreshedEvals: ComprehensiveEvaluation[] = [];
      for (const r of runs) {
        const ev = await evaluationsApi.runEvaluation(r.id);
        refreshedEvals.push(ev);
      }
      setEvaluations(refreshedEvals);
      toast({
        title: 'Batch Evaluation Complete',
        description: `Successfully re-scored ${runs.length} model outputs across all 10 dimensions.`,
        variant: 'success',
      });
    } catch (err: any) {
      toast({
        title: 'Evaluation Failed',
        description: err.message || 'Could not complete batch evaluation.',
        variant: 'danger',
      });
    } finally {
      setIsBatchEvaluating(false);
    }
  };

  // Re-evaluate a single run
  const handleSingleReevaluate = async (runId: string) => {
    try {
      const updated = await evaluationsApi.runEvaluation(runId);
      setEvaluations((prev) => prev.map((e) => (e.runId === runId ? updated : e)));
      if (selectedRunForInspect?.run.id === runId) {
        setSelectedRunForInspect({
          ...selectedRunForInspect,
          evalResult: updated,
        });
      }
      toast({
        title: 'Re-Evaluation Completed',
        description: '10-dimensional profile updated with latest rubric.',
        variant: 'success',
      });
    } catch (err: any) {
      toast({
        title: 'Re-Evaluation Failed',
        description: err.message || 'Could not re-score output.',
        variant: 'danger',
      });
    }
  };

  // Compute composite score helper
  const getCompositeScore = (ev: ComprehensiveEvaluation) => {
    const dims = getEvaluationDimensionsList(ev);
    const sum = dims.reduce((acc, d) => acc + d.score, 0);
    return Number((sum / dims.length).toFixed(1));
  };

  // Collect all issues across runs
  const allIssues: { issue: EvaluationItemIssue; modelName: string; runId: string }[] = [];
  evaluations.forEach((ev) => {
    const run = runs.find((r) => r.id === ev.runId);
    const modelName = run?.model?.name || run?.modelId || 'AI Model';
    const dims = getEvaluationDimensionsList(ev);
    dims.forEach((d) => {
      d.issues.forEach((iss) => {
        allIssues.push({ issue: iss, modelName, runId: ev.runId });
      });
    });
  });

  // Filter issues
  const filteredIssues = allIssues.filter(({ issue }) => {
    if (selectedSeverity !== 'all' && issue.severity !== selectedSeverity) return false;
    if (selectedTaxonomy !== 'all' && issue.taxonomy !== selectedTaxonomy) return false;
    return true;
  });

  // Calculate 10-D average scores across all models
  const dimensionKeys = [
    { key: 'factAccuracy', label: 'Fact Accuracy' },
    { key: 'completeness', label: 'Completeness' },
    { key: 'groundedness', label: 'Groundedness' },
    { key: 'hallucinationRate', label: 'No-Inference Rule' },
    { key: 'clinicalAlignment', label: 'Clinical Alignment' },
    { key: 'treatmentAlignment', label: 'Treatment Alignment' },
    { key: 'exerciseRelevance', label: 'Exercise Relevance' },
    { key: 'safetyRating', label: 'Safety & Contraindications' },
    { key: 'formatCompliance', label: 'Format Compliance' },
    { key: 'doctorAlignment', label: 'Doctor Concordance' },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-fadeIn text-slate-100">
      {/* ── Page Header ── */}
      <PageHeader
        title="Automated Evaluation Engine"
        subtitle="Continuous 10-dimensional clinical quality benchmarking, deterministic checks, and Cardinal No-Inference violation tracking"
        action={
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="md"
              icon={<ExternalLink size={14} />}
              onClick={() => navigate(`/lab/comparison?exp=${selectedExperimentId}`)}
            >
              Side-by-Side Grid
            </Button>
            <Button
              variant="lab"
              size="md"
              loading={isBatchEvaluating}
              icon={<RefreshCw size={14} />}
              onClick={handleBatchEvaluate}
            >
              Run 10-D Benchmark
            </Button>
          </div>
        }
      />

      {/* ── Filters & Selectors Bar ── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-900 border border-slate-800">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-slate-400">Benchmark Experiment:</span>
            <select
              value={selectedExperimentId}
              onChange={(e) => setSelectedExperimentId(e.target.value)}
              className="px-3 py-1.5 text-xs rounded-lg border border-slate-700 bg-slate-950 text-slate-200 focus:outline-none focus:ring-1 focus:ring-lab-500"
            >
              {experiments.map((exp) => (
                <option key={exp.id} value={exp.id}>
                  {exp.name} ({exp.id})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-slate-400">Patient Case:</span>
            <select
              value={selectedCaseId}
              onChange={(e) => setSelectedCaseId(e.target.value)}
              className="px-3 py-1.5 text-xs rounded-lg border border-slate-700 bg-slate-950 text-slate-200 focus:outline-none focus:ring-1 focus:ring-lab-500"
            >
              <option value="all">All Cases (Aggregate)</option>
              {cases.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title} ({c.id})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
          <span className="flex items-center gap-1.5">
            <Cpu size={13} className="text-brand-400" />
            {runs.length} Models Evaluated
          </span>
          <span>•</span>
          <span className="flex items-center gap-1.5">
            <AlertTriangle size={13} className="text-amber-400" />
            {allIssues.length} Flagged Issues
          </span>
        </div>
      </div>

      {/* ── 10-Dimensional Quality Radar Cards ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <BarChart3 size={14} className="text-lab-400" />
            10-Dimensional Quality Radar (Cohort Average)
          </h3>
          <span className="text-[11px] font-mono text-slate-500">
            Automated Evaluation Pipeline v1.0
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {dimensionKeys.map(({ key, label }) => {
            // Compute average score across evaluations
            const scores = evaluations.map((ev) => (ev as any)[key]?.score || 0);
            const avg = scores.length > 0 ? Number((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1)) : 0;
            const issuesCount = evaluations.reduce((acc, ev) => acc + ((ev as any)[key]?.issues?.length || 0), 0);

            return (
              <div
                key={key}
                className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5 hover:border-slate-700 transition-all"
              >
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span className="truncate pr-1">{label}</span>
                  {issuesCount > 0 && (
                    <span className="text-[10px] font-mono text-rose-400 bg-rose-500/10 px-1 rounded">
                      {issuesCount}
                    </span>
                  )}
                </div>
                <div className="flex items-baseline justify-between">
                  <span className={`text-xl font-bold font-mono ${avg >= 9.0 ? 'text-emerald-400' : avg >= 7.5 ? 'text-blue-400' : 'text-amber-400'}`}>
                    {avg.toFixed(1)}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">/ 10.0</span>
                </div>
                {/* Visual bar */}
                <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${avg >= 9.0 ? 'bg-emerald-500' : avg >= 7.5 ? 'bg-blue-500' : 'bg-amber-500'}`}
                    style={{ width: `${avg * 10}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Main Comparison Matrix: Models vs 10 Dimensions ── */}
      <div className="space-y-4">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          Multi-Model Evaluation Matrix
        </h3>

        <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden shadow-lg">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/80 text-[11px] font-mono text-slate-400 border-b border-slate-800 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">AI Model</th>
                  <th className="py-3 px-3">Composite</th>
                  <th className="py-3 px-3">No-Inference</th>
                  <th className="py-3 px-3">Fact Acc</th>
                  <th className="py-3 px-3">Groundedness</th>
                  <th className="py-3 px-3">Clinical Align</th>
                  <th className="py-3 px-3">Safety Pass</th>
                  <th className="py-3 px-3">Doctor Align</th>
                  <th className="py-3 px-3">Issues</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 font-mono">
                {runs.map((run) => {
                  const ev = evaluations.find((e) => e.runId === run.id);
                  if (!ev) return null;
                  const compScore = getCompositeScore(ev);
                  const totalIssues = getEvaluationDimensionsList(ev).flatMap((d) => d.issues).length;

                  return (
                    <tr
                      key={run.id}
                      className="hover:bg-slate-800/40 transition-colors cursor-pointer group"
                      onClick={() => setSelectedRunForInspect({ run, evalResult: ev })}
                    >
                      <td className="py-3.5 px-4 font-sans">
                        <div className="flex items-center gap-2.5">
                          <div className="w-2.5 h-2.5 rounded-full bg-brand-500" />
                          <div>
                            <span className="font-semibold text-slate-200 group-hover:text-lab-300 transition-colors block">
                              {run.model?.name || run.modelId}
                            </span>
                            <span className="text-[11px] font-mono text-slate-500">
                              {run.model?.provider || 'LLM'} • {run.latencyMs}ms
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded text-xs font-bold border ${compScore >= 9.0 ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : compScore >= 7.5 ? 'text-blue-400 bg-blue-500/10 border-blue-500/20' : 'text-amber-400 bg-amber-500/10 border-amber-500/20'}`}>
                          {compScore} / 10
                        </span>
                      </td>

                      <td className="py-3 px-3">
                        <span className={`font-semibold ${ev.hallucinationRate.score >= 9.0 ? 'text-emerald-400' : 'text-rose-400 font-bold'}`}>
                          {ev.hallucinationRate.score.toFixed(1)}
                        </span>
                      </td>

                      <td className="py-3 px-3">
                        <span className="text-slate-300">
                          {ev.factAccuracy.score.toFixed(1)}
                        </span>
                      </td>

                      <td className="py-3 px-3">
                        <span className="text-slate-300">
                          {ev.groundedness.score.toFixed(1)}
                        </span>
                      </td>

                      <td className="py-3 px-3">
                        <span className="text-slate-300">
                          {ev.clinicalAlignment.score.toFixed(1)}
                        </span>
                      </td>

                      <td className="py-3 px-3">
                        {ev.criticalSafetyPassed ? (
                          <span className="text-emerald-400 flex items-center gap-1 text-[11px]">
                            <ShieldCheck size={13} />
                            PASS
                          </span>
                        ) : (
                          <span className="text-rose-400 flex items-center gap-1 text-[11px] font-bold">
                            <ShieldAlert size={13} />
                            FAIL
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-3">
                        <span className="text-slate-300">
                          {ev.doctorAlignment.score.toFixed(1)}
                        </span>
                      </td>

                      <td className="py-3 px-3">
                        {totalIssues === 0 ? (
                          <span className="text-slate-500 text-[11px]">0</span>
                        ) : (
                          <span className="text-rose-400 font-bold text-[11px] flex items-center gap-1">
                            <AlertTriangle size={11} />
                            {totalIssues}
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <Button
                          variant="ghost"
                          size="xs"
                          icon={<ArrowRight size={13} />}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedRunForInspect({ run, evalResult: ev });
                          }}
                        >
                          Inspect 10-D Profile
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── Error Taxonomy & Cardinal Violations Stream ── */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <AlertTriangle size={14} className="text-amber-400" />
              Automated Error Taxonomy & Penalties Log
            </h3>
            <p className="text-xs text-slate-500">
              Specific deviations from Ground Truth and Cardinal No-Inference checks
            </p>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedSeverity}
              onChange={(e) => setSelectedSeverity(e.target.value)}
              className="px-2.5 py-1 text-xs rounded-lg border border-slate-700 bg-slate-950 text-slate-300 focus:outline-none"
            >
              <option value="all">All Severities</option>
              <option value="critical">Critical Only</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>

            <select
              value={selectedTaxonomy}
              onChange={(e) => setSelectedTaxonomy(e.target.value)}
              className="px-2.5 py-1 text-xs rounded-lg border border-slate-700 bg-slate-950 text-slate-300 focus:outline-none"
            >
              <option value="all">All Taxonomies</option>
              <option value="UNSUPPORTED_INFERENCE">UNSUPPORTED_INFERENCE</option>
              <option value="FACTUAL_ERROR">FACTUAL_ERROR</option>
              <option value="SAFETY_CONCERN">SAFETY_CONCERN</option>
              <option value="EXERCISE_MISALIGNMENT">EXERCISE_MISALIGNMENT</option>
              <option value="CLINICAL_MISALIGNMENT">CLINICAL_MISALIGNMENT</option>
              <option value="RETRIEVAL_FAILURE">RETRIEVAL_FAILURE</option>
            </select>
          </div>
        </div>

        {filteredIssues.length === 0 ? (
          <div className="p-8 text-center rounded-xl border border-slate-800 bg-slate-900/40 text-slate-400 text-xs">
            <CheckCircle2 size={24} className="text-emerald-400 mx-auto mb-2" />
            No issues match the selected severity or taxonomy criteria.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredIssues.map(({ issue, modelName, runId }, idx) => (
              <div
                key={idx}
                className="p-4 rounded-xl border border-slate-800 bg-slate-900/90 space-y-2.5 hover:border-slate-700 transition-all text-xs"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-slate-300">
                      {issue.taxonomy}
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                      {modelName}
                    </span>
                  </div>

                  <Badge
                    variant={
                      issue.severity === 'critical'
                        ? 'danger'
                        : issue.severity === 'high'
                        ? 'warning'
                        : 'outline'
                    }
                    size="xs"
                  >
                    {issue.severity.toUpperCase()}
                  </Badge>
                </div>

                <p className="text-slate-300 leading-relaxed font-sans">
                  {issue.explanation}
                </p>

                <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800/80 font-mono text-[11px] space-y-1">
                  <div>
                    <span className="text-emerald-400 font-semibold">Doctor Ground Truth: </span>
                    <span className="text-slate-300">{issue.expected}</span>
                  </div>
                  <div>
                    <span className="text-rose-400 font-semibold">Model Inferred: </span>
                    <span className="text-slate-300">{issue.actual}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Inspection Modal: Full 10-D Breakdown ── */}
      {selectedRunForInspect && (
        <Modal
          open={!!selectedRunForInspect}
          onOpenChange={(open) => !open && setSelectedRunForInspect(null)}
          size="lg"
        >
          <ModalHeader
            title={`10-Dimensional Quality Profile — ${selectedRunForInspect.run.model?.name || selectedRunForInspect.run.modelId}`}
            description={`Evaluated against case ${selectedRunForInspect.run.caseId} and Physician Gold Standard`}
          />
          <ModalBody className="p-0">
            <EvaluationScoreCard
              evaluation={selectedRunForInspect.evalResult}
              modelName={selectedRunForInspect.run.model?.name || selectedRunForInspect.run.modelId}
              onReevaluate={() => handleSingleReevaluate(selectedRunForInspect.run.id)}
            />
          </ModalBody>
        </Modal>
      )}
    </div>
  );
}
