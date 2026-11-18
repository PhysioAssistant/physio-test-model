import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  GitCompare,
  ArrowLeft,
  Clock,
  DollarSign,
  Cpu,
  FileCode2,
  Layers,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Copy,
  Check,
  Stethoscope,
  Dumbbell,
  ShieldAlert,
  BookOpen,
  Sparkles,
  Sliders,
  Code2,
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
  ModalFooter,
  useToast,
} from '@/components/ui';
import { OutputDiffViewer, EvaluationScoreCard, type DiffItem } from '@/components/lab';
import {
  experimentsApi,
  casesApi,
  groundTruthApi,
  modelsApi,
  evaluationsApi,
} from '@/lib/api';
import type {
  Experiment,
  ExperimentRun,
  PatientCase,
  DoctorGroundTruth,
  ComprehensiveEvaluation,
} from '@/types';

type ComparisonViewMode = 'clinical' | 'evaluations' | 'diff' | 'json' | 'telemetry';

export default function ComparisonPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [selectedExperimentId, setSelectedExperimentId] = useState<string>('exp-1042');
  const [cases, setCases] = useState<PatientCase[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState<string>('case-1');

  const [currentCase, setCurrentCase] = useState<PatientCase | null>(null);
  const [groundTruth, setGroundTruth] = useState<DoctorGroundTruth | null>(null);
  const [runs, setRuns] = useState<ExperimentRun[]>([]);
  const [evaluations, setEvaluations] = useState<Record<string, ComprehensiveEvaluation>>({});
  const [isLoading, setIsLoading] = useState(true);

  const [viewMode, setViewMode] = useState<ComparisonViewMode>('clinical');
  const [isPromptModalOpen, setIsPromptModalOpen] = useState(false);
  const [activeInspectRun, setActiveInspectRun] = useState<ExperimentRun | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

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
        if (caseList.length > 0) {
          const caseParam = searchParams.get('case') || caseList[0].id;
          setSelectedCaseId(caseParam);
        }
      })
      .catch((err) => console.error('Error loading comparison baseline:', err));
  }, []);

  // Load runs for selected experiment & case
  useEffect(() => {
    if (!selectedExperimentId || !selectedCaseId) return;
    setIsLoading(true);
    Promise.all([
      casesApi.getById(selectedCaseId),
      groundTruthApi.getByCase(selectedCaseId),
      experimentsApi.getRuns(selectedExperimentId, selectedCaseId),
    ])
      .then(async ([c, gt, runList]) => {
        setCurrentCase(c);
        setGroundTruth(gt);
        setRuns(runList);

        // Fetch evaluations for each run
        const evalMap: Record<string, ComprehensiveEvaluation> = {};
        for (const r of runList) {
          try {
            const ev = await evaluationsApi.getByRunId(r.id);
            if (ev) evalMap[r.id] = ev;
          } catch (e) {
            console.error('Error fetching run eval:', e);
          }
        }
        setEvaluations(evalMap);
      })
      .catch((err) => {
        console.error('Error loading comparison runs:', err);
        toast({
          title: 'Error loading runs',
          description: 'Could not load multi-model comparison data.',
          variant: 'danger',
        });
      })
      .finally(() => setIsLoading(false));
  }, [selectedExperimentId, selectedCaseId]);

  const copyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(label);
    setTimeout(() => setCopiedKey(null), 1500);
    toast({
      title: 'Copied',
      description: `${label} copied to clipboard.`,
      variant: 'info',
    });
  };

  // Generate automated semantic diff items between model and ground truth
  const generateDiffItems = (run: ExperimentRun): DiffItem[] => {
    const output = run.parsedOutput;
    const diffs: DiffItem[] = [];

    if (!output || !groundTruth) return diffs;

    // Check primary assessment
    const isPfpsMatched = output.primaryAssessment.toLowerCase().includes('patellofemoral');
    diffs.push({
      id: 'diff-assessment',
      label: 'Primary Pathology Diagnosis',
      status: isPfpsMatched ? 'matched' : 'contradiction',
      modelValue: output.primaryAssessment,
      groundTruthValue: groundTruth.assessmentText,
      explanation: isPfpsMatched
        ? 'Diagnostic pathology aligns with verified doctor assessment.'
        : 'Diagnosis diverges from doctor clinical interpretation.',
    });

    // Check exercise recommendations
    const exNames = output.exerciseRecommendations.map((e) => e.exerciseName.toLowerCase());

    // Wall Sit / Quad loading
    const hasWallSit = exNames.some((n) => n.includes('wall') || n.includes('quad') || n.includes('extension'));
    diffs.push({
      id: 'diff-quad',
      label: 'Quadriceps Closed-Chain Isometric',
      status: hasWallSit ? 'matched' : 'missing',
      modelValue: output.exerciseRecommendations[0]?.exerciseName || 'N/A',
      groundTruthValue: 'Wall Sits (45-60°) with adductor squeeze & Terminal Knee Extensions',
      explanation: hasWallSit
        ? 'Quadriceps recruitment within safe joint reaction forces.'
        : 'Doctor ground truth requires quadriceps / VMO retraining.',
    });

    // Clamshells / Hip abductors
    const hasClamshell = exNames.some((n) => n.includes('clam') || n.includes('abduct') || n.includes('glute'));
    diffs.push({
      id: 'diff-glute',
      label: 'Hip Abductor / Gluteus Medius Activation',
      status: hasClamshell ? 'matched' : 'missing',
      modelValue: exNames.find((n) => n.includes('clam') || n.includes('abduct')) || 'Not recommended',
      groundTruthValue: 'Side-lying Hip Abductions / Clamshells with resistance band',
      explanation: hasClamshell
        ? 'Addresses dynamic knee valgus collapse.'
        : 'Ground truth explicitly targets gluteus medius weakness.',
    });

    // Check for questionable additions (e.g. Lunges with weights in acute PFPS)
    const hasLunges = exNames.some((n) => n.includes('lunge'));
    if (hasLunges) {
      diffs.push({
        id: 'diff-lunge',
        label: 'Dynamic Lunges with Weight Loading',
        status: 'contradiction',
        modelValue: 'Forward Walking Lunges with Light Ankle Weights',
        groundTruthValue: 'Forbidden: Avoid deep knee flexion beyond 60° in acute phase',
        explanation: 'Dynamic lunges introduce excessive patellofemoral shear forces in irritable stage.',
      });
    }

    // Check contraindications
    const hasSquatLimit = output.contraindications.some((c) => c.toLowerCase().includes('squat') || c.toLowerCase().includes('flexion') || c.toLowerCase().includes('degrees'));
    diffs.push({
      id: 'diff-contra',
      label: 'Deep Flexion (>60°) Movement Restriction',
      status: hasSquatLimit ? 'matched' : 'missing',
      modelValue: output.contraindications.join('; '),
      groundTruthValue: 'Strictly avoid deep squats/flexion > 60° during initial 2 weeks',
      explanation: hasSquatLimit
        ? 'Complies with patellofemoral contact pressure limitations.'
        : 'Failed to specify the critical 60-degree flexion cutoff documented by doctor.',
    });

    return diffs;
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 animate-fadeIn text-slate-100">
      {/* ── Top Bar & Navigation ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => navigate('/doctor/lab/experiments')}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={14} />
          Back to Experiments
        </button>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
          <button
            type="button"
            onClick={() => setViewMode('clinical')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              viewMode === 'clinical'
                ? 'bg-lab-500 text-white shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Formatted Clinical View
          </button>
          <button
            type="button"
            onClick={() => setViewMode('evaluations')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              viewMode === 'evaluations'
                ? 'bg-lab-500 text-white shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            10-D Scores & Rubric
          </button>
          <button
            type="button"
            onClick={() => setViewMode('diff')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              viewMode === 'diff'
                ? 'bg-lab-500 text-white shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Semantic Diff & Concordance
          </button>
          <button
            type="button"
            onClick={() => setViewMode('json')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              viewMode === 'json'
                ? 'bg-lab-500 text-white shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Raw JSON View
          </button>
        </div>
      </div>

      {/* ── Page Header ── */}
      <PageHeader
        title="Multi-Model Comparison Grid"
        subtitle="Side-by-side synchronized evaluation of LLM outputs against doctor ground truth"
      />

      {/* ── Experiment & Case Switcher Ribbon ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-900 p-4 rounded-2xl border border-slate-800">
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <GitCompare size={13} className="text-lab-400" />
            Active Experiment Benchmark
          </label>
          <select
            value={selectedExperimentId}
            onChange={(e) => setSelectedExperimentId(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-700 bg-slate-950 text-slate-200 focus:outline-none focus:ring-1 focus:ring-lab-500 font-mono"
          >
            {experiments.map((exp) => (
              <option key={exp.id} value={exp.id}>
                {exp.name} ({exp.id})
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Stethoscope size={13} className="text-clinical-400" />
            Evaluation Patient Case
          </label>
          <select
            value={selectedCaseId}
            onChange={(e) => setSelectedCaseId(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-700 bg-slate-950 text-slate-200 focus:outline-none focus:ring-1 focus:ring-lab-500 font-mono"
          >
            {cases.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title} ({c.patient?.mrn || c.id})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Case Narrative Summary Card ── */}
      {currentCase && (
        <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800/80 text-xs text-slate-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <span className="font-mono text-slate-500 text-[11px] uppercase tracking-wider block">
              Patient Presentation ({currentCase.patient?.name}, {currentCase.patient?.age}y • {currentCase.bodyRegion.toUpperCase()})
            </span>
            <p className="line-clamp-2 text-slate-400 font-sans leading-relaxed">
              {currentCase.conditionFinalText || currentCase.conditionText}
            </p>
          </div>
          <Badge variant="outline" size="sm" className="shrink-0 self-start sm:self-center">
            {currentCase.difficulty.toUpperCase()}
          </Badge>
        </div>
      )}

      {/* ── Synchronized Comparison Grid ── */}
      {isLoading ? (
        <div className="py-24 text-center text-slate-500 text-sm">
          <div className="inline-block w-8 h-8 border-3 border-lab-500 border-t-transparent rounded-full animate-spin mb-3" />
          <p>Loading multi-model outputs...</p>
        </div>
      ) : (
        <div className="overflow-x-auto pb-4">
          <div
            className="grid gap-4 min-w-[1000px]"
            style={{
              gridTemplateColumns: `minmax(280px, 1fr) repeat(${runs.length}, minmax(280px, 1fr))`,
            }}
          >
            {/* ══════════════════════════════════════════════════════
               COLUMN 1: DOCTOR GROUND TRUTH (VERIFIED ANCHOR)
               ══════════════════════════════════════════════════════ */}
            <div className="space-y-4">
              {/* Column Header */}
              <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 space-y-2">
                <div className="flex items-center justify-between">
                  <Badge variant="success" size="sm" dot>
                    Ground Truth Reference
                  </Badge>
                  <span className="text-[11px] font-mono text-emerald-400 font-semibold">Doctor Validated</span>
                </div>
                <h3 className="text-sm font-bold text-emerald-100 flex items-center gap-1.5">
                  <Stethoscope size={15} className="text-emerald-400" />
                  Doctor Assessment & Treatment
                </h3>
                <p className="text-[11px] text-emerald-300/80 leading-snug">
                  Authoritative clinical benchmark against which all model derivations are judged.
                </p>
              </div>

              {/* Ground Truth Cards */}
              {viewMode === 'evaluations' ? (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-slate-900 border border-emerald-500/40 space-y-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 block">
                      Evaluation Anchor Standards
                    </span>
                    <p className="text-xs text-slate-300 leading-relaxed font-sans">
                      All models are scored against this physician ground truth across 10 clinical dimensions:
                    </p>
                    <ol className="space-y-1.5 text-xs text-slate-300 font-mono">
                      <li>1. <strong className="text-emerald-300">Fact Accuracy:</strong> Documented findings</li>
                      <li>2. <strong className="text-emerald-300">Completeness:</strong> Full clinical capture</li>
                      <li>3. <strong className="text-emerald-300">Groundedness:</strong> RAG guideline citation</li>
                      <li>4. <strong className="text-emerald-300">No-Inference:</strong> Zero invented metrics</li>
                      <li>5. <strong className="text-emerald-300">Clinical Align:</strong> Diagnosis matching</li>
                      <li>6. <strong className="text-emerald-300">Treatment Align:</strong> Phased protocol</li>
                      <li>7. <strong className="text-emerald-300">Exercise Relevance:</strong> Kinetic chain fit</li>
                      <li>8. <strong className="text-emerald-300">Safety Rating:</strong> Contraindication flags</li>
                      <li>9. <strong className="text-emerald-300">Format Compliance:</strong> Valid schema</li>
                      <li>10. <strong className="text-emerald-300">Doctor Concordance:</strong> Gold agreement</li>
                    </ol>
                  </div>

                  <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/30 text-xs text-emerald-300 space-y-1">
                    <span className="font-bold block">The Cardinal Rule</span>
                    <p className="text-[11px] text-emerald-400/90 leading-relaxed font-sans">
                      Any model fabricating ROM angles, tests, or patient history not documented in notes incurs a critical penalty under No-Inference Adherence.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Diagnostic Assessment */}
                  <div className="p-4 rounded-xl bg-slate-900 border border-emerald-500/30 space-y-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 block">
                      Diagnostic Assessment
                    </span>
                    <p className="text-xs text-slate-200 leading-relaxed font-sans">
                      {groundTruth?.assessmentText || 'No diagnostic assessment documented.'}
                    </p>
                  </div>

                  {/* Treatment Direction */}
                  <div className="p-4 rounded-xl bg-slate-900 border border-emerald-500/30 space-y-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 block">
                      Treatment Direction
                    </span>
                    <p className="text-xs text-slate-300 leading-relaxed font-sans">
                      {groundTruth?.treatmentPlanText || 'No treatment plan documented.'}
                    </p>
                  </div>

                  {/* Key Priorities / Anchors */}
                  <div className="p-4 rounded-xl bg-slate-900 border border-emerald-500/30 space-y-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 block">
                      Key Prescribed Anchors
                    </span>
                    <ul className="space-y-1.5 text-xs text-slate-300 font-sans">
                      {(groundTruth?.keyClinicalPriorities || [
                        'VMO quadriceps strengthening',
                        'Avoid deep squatting > 60°',
                        'Eccentric stair descent control',
                      ]).map((priority, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <CheckCircle2 size={12} className="text-emerald-400 mt-0.5 shrink-0" />
                          <span>{priority}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Strict Contraindications */}
                  <div className="p-4 rounded-xl bg-rose-950/20 border border-rose-500/30 space-y-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-rose-400 block">
                      Strict Contraindications
                    </span>
                    <ul className="space-y-1 text-xs text-rose-200">
                      {(groundTruth?.contraindicationsExclusions || [
                        'Open kinetic chain heavy leg extensions (0-45°)',
                        'Deep squats or lunges beyond 60° flexion in acute stage',
                      ]).map((c, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <XCircle size={12} className="text-rose-400 mt-0.5 shrink-0" />
                          <span>{c}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>

            {/* ══════════════════════════════════════════════════════
               COLUMNS 2..N: AI MODEL EXECUTION RUNS
               ══════════════════════════════════════════════════════ */}
            {runs.map((run, colIdx) => {
              const output = run.parsedOutput;
              const diffItems = generateDiffItems(run);

              return (
                <div key={run.id} className="space-y-4">
                  {/* Model Column Header */}
                  <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <Badge
                        variant={colIdx === 0 ? 'brand' : colIdx === 1 ? 'clinical' : 'warning'}
                        size="sm"
                      >
                        Model {String.fromCharCode(65 + colIdx)}
                      </Badge>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveInspectRun(run);
                          setIsPromptModalOpen(true);
                        }}
                        className="text-[11px] text-slate-400 hover:text-white font-mono flex items-center gap-1 transition-colors"
                      >
                        <Code2 size={11} />
                        Prompt / RAG
                      </button>
                    </div>

                    <h3 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                      <Cpu size={15} className="text-brand-400" />
                      {run.model?.name || run.modelId}
                    </h3>

                    {/* Telemetry pill */}
                    <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 bg-slate-950 p-2 rounded-lg border border-slate-800">
                      <span className="flex items-center gap-1">
                        <Clock size={11} />
                        {run.latencyMs}ms
                      </span>
                      <span>{run.inputTokens}in / {run.outputTokens}out</span>
                      <span className="text-emerald-400 font-semibold">${run.totalCostUsd.toFixed(3)}</span>
                    </div>
                  </div>

                  {/* ── Content by View Mode ── */}
                  {viewMode === 'clinical' && (
                    <div className="space-y-4">
                      {/* Diagnostic Assessment */}
                      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                          Diagnostic Assessment
                        </span>
                        <p className="text-xs text-slate-200 leading-relaxed font-sans">
                          {output?.primaryAssessment || 'No assessment generated.'}
                        </p>
                      </div>

                      {/* No-Inference Audit (Gaps) */}
                      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1">
                          <ShieldAlert size={12} />
                          Clinical Gaps Flagged
                        </span>
                        <ul className="space-y-1 text-[11px] text-slate-400 font-mono">
                          {output?.clinicalGaps.map((gap, i) => (
                            <li key={i} className="flex items-start gap-1">
                              <span className="text-amber-500">•</span>
                              <span>{gap}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Targeted Exercises */}
                      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                          <Dumbbell size={12} className="text-clinical-400" />
                          Exercise Prescriptions ({output?.exerciseRecommendations.length})
                        </span>
                        <div className="space-y-2">
                          {output?.exerciseRecommendations.map((ex, i) => (
                            <div key={i} className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80 text-xs space-y-1">
                              <p className="font-semibold text-slate-200">{ex.exerciseName}</p>
                              <p className="text-[11px] font-mono text-clinical-400">{ex.dosageSetsReps}</p>
                              <p className="text-[11px] text-slate-400 italic font-sans">{ex.clinicalRationale}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Contraindications */}
                      <div className="p-4 rounded-xl bg-rose-950/20 border border-rose-500/20 space-y-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-rose-400 block">
                          Contraindications
                        </span>
                        <ul className="space-y-1 text-xs text-rose-200">
                          {output?.contraindications.map((contra, i) => (
                            <li key={i} className="flex items-start gap-1.5">
                              <XCircle size={12} className="text-rose-400 mt-0.5 shrink-0" />
                              <span>{contra}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}

                  {viewMode === 'evaluations' && evaluations[run.id] && (
                    <EvaluationScoreCard
                      evaluation={evaluations[run.id]}
                      modelName={run.model?.name || run.modelId}
                      onReevaluate={async () => {
                        const updated = await evaluationsApi.runEvaluation(run.id);
                        setEvaluations((prev) => ({ ...prev, [run.id]: updated }));
                        toast({
                          title: 'Re-evaluation Done',
                          description: '10-D scores updated for this model.',
                          variant: 'success',
                        });
                      }}
                    />
                  )}

                  {viewMode === 'diff' && (
                    <OutputDiffViewer
                      title={`${run.model?.name} vs Ground Truth`}
                      items={diffItems}
                    />
                  )}

                  {viewMode === 'json' && (
                    <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 font-mono text-[11px] text-slate-300 max-h-[600px] overflow-y-auto">
                      <div className="flex justify-end mb-2">
                        <button
                          type="button"
                          onClick={() => copyText(JSON.stringify(output, null, 2), run.id)}
                          className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1"
                        >
                          {copiedKey === run.id ? <Check size={11} /> : <Copy size={11} />}
                          Copy JSON
                        </button>
                      </div>
                      <pre className="whitespace-pre-wrap">{JSON.stringify(output, null, 2)}</pre>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Modal: Inspect Prompt & Retrieved RAG Context ── */}
      <Modal open={isPromptModalOpen} onOpenChange={setIsPromptModalOpen} size="xl">
        <ModalHeader
          title={`Prompt & Retrieval Telemetry: ${activeInspectRun?.model?.name}`}
          description={`Run ID: ${activeInspectRun?.id} • Prompt: ${activeInspectRun?.promptVersionId} • RAG: ${activeInspectRun?.ragConfigId}`}
        />
        <ModalBody className="space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Rendered Prompt */}
          <div className="space-y-2">
            <h5 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <FileCode2 size={13} className="text-amber-400" />
              Rendered System & User Prompt
            </h5>
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">
              {activeInspectRun?.renderedPrompt}
            </div>
          </div>

          {/* Retrieved Chunks */}
          <div className="space-y-2">
            <h5 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Layers size={13} className="text-indigo-400" />
              Retrieved Knowledge Chunks ({activeInspectRun?.retrievedChunks.length ?? 0})
            </h5>
            {activeInspectRun?.retrievedChunks && activeInspectRun.retrievedChunks.length > 0 ? (
              <div className="space-y-2">
                {activeInspectRun.retrievedChunks.map((chunk) => (
                  <div key={chunk.chunkId} className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1 text-xs">
                    <div className="flex items-center justify-between text-indigo-400 font-mono text-[11px]">
                      <span>{chunk.documentTitle} ({chunk.sourceChapter})</span>
                      <span>Rank #{chunk.rank} • Sim: {chunk.similarityScore}</span>
                    </div>
                    <p className="text-slate-300 font-sans leading-relaxed">{chunk.content}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic p-3 bg-slate-950 rounded-xl border border-slate-800">
                No external retrieval chunks logged for this run.
              </p>
            )}
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="outline" size="sm" onClick={() => setIsPromptModalOpen(false)}>
            Close
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}

