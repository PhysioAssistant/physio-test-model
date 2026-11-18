import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  Play,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Sparkles,
  Stethoscope,
  Activity,
  User,
  ShieldAlert,
  Dumbbell,
  BookOpen,
  Edit3,
  Check,
  RotateCcw,
  Clock,
  HelpCircle,
} from 'lucide-react';
import {
  PageHeader,
  Button,
  Card,
  CardBody,
  CardHeader,
  Badge,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useToast,
} from '@/components/ui';
import { casesApi, groundTruthApi, doctorAiApi, reviewsApi } from '@/lib/api';
import type {
  PatientCase,
  DoctorGroundTruth,
  StructuredClinicalOutput,
  DoctorReview,
  ReviewDecision,
  ErrorTaxonomy,
  DoctorCorrection,
} from '@/types';

export default function CaseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const autoRun = searchParams.get('autoRun') === 'true';
  const navigate = useNavigate();
  const { toast } = useToast();

  const [patientCase, setPatientCase] = useState<PatientCase | null>(null);
  const [groundTruth, setGroundTruth] = useState<DoctorGroundTruth | null>(null);
  const [aiOutput, setAiOutput] = useState<StructuredClinicalOutput | null>(null);
  const [review, setReview] = useState<DoctorReview | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isAiRunning, setIsAiRunning] = useState(false);
  const [aiProgressStep, setAiProgressStep] = useState<string>('');

  // Review & Correction state
  const [isCorrectionModalOpen, setIsCorrectionModalOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [reviewComment, setReviewComment] = useState('');
  const [correctionCategory, setCorrectionCategory] = useState<ErrorTaxonomy>('CLINICAL_MISALIGNMENT');
  const [correctionField, setCorrectionField] = useState('exerciseRecommendations');
  const [doctorCorrectedValue, setDoctorCorrectedValue] = useState('');

  // Load all case data
  const loadCaseData = async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const [c, gt, existingAi, existingRev] = await Promise.all([
        casesApi.getById(id),
        groundTruthApi.getByCase(id),
        doctorAiApi.getLatestResult(id),
        reviewsApi.getByCase(id),
      ]);
      setPatientCase(c);
      setGroundTruth(gt);
      setAiOutput(existingAi);
      setReview(existingRev);

      // Auto run if requested via URL param and not already evaluated
      if (autoRun && !existingAi) {
        runAiInference(id);
      }
    } catch (err) {
      console.error('Error loading case detail:', err);
      toast({
        title: 'Error loading case',
        description: 'Could not load clinical case data.',
        variant: 'danger',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCaseData();
  }, [id]);

  // Execute AI Inference
  const runAiInference = async (caseIdToRun?: string) => {
    const targetId = caseIdToRun || id;
    if (!targetId) return;

    setIsAiRunning(true);
    try {
      const result = await doctorAiApi.runClinicalInference(targetId, (step) => {
        setAiProgressStep(step);
      });
      setAiOutput(result);
      setPatientCase((prev) => (prev ? { ...prev, status: 'evaluating' } : prev));
      toast({
        title: 'AI Clinical Evaluation Complete',
        description: 'Clinical recommendations and safety checks generated.',
        variant: 'success',
      });
    } catch (err: any) {
      console.error('Error running AI inference:', err);
      toast({
        title: 'AI Evaluation Failed',
        description: err.message || 'An error occurred during evaluation.',
        variant: 'danger',
      });
    } finally {
      setIsAiRunning(false);
      setAiProgressStep('');
    }
  };

  // Submit Doctor Approval
  const handleApprove = async () => {
    if (!id) return;
    try {
      const submitted = await reviewsApi.submit({
        caseId: id,
        decision: 'approved',
        overallComment: reviewComment || 'Clinically validated and approved as appropriate.',
      });
      setReview(submitted);
      setPatientCase((prev) => (prev ? { ...prev, status: 'reviewed' } : prev));
      toast({
        title: 'Clinical Output Approved',
        description: 'Case marked as clinically verified.',
        variant: 'success',
      });
    } catch (err) {
      toast({
        title: 'Review Submission Failed',
        description: 'Unable to submit doctor approval.',
        variant: 'danger',
      });
    }
  };

  // Submit Doctor Correction
  const handleCorrectionSubmit = async () => {
    if (!id) return;
    if (!doctorCorrectedValue.trim()) {
      toast({
        title: 'Correction details required',
        description: 'Please describe the necessary clinical correction.',
        variant: 'warning',
      });
      return;
    }

    try {
      const newCorrection: DoctorCorrection = {
        id: `cor-${Date.now()}`,
        category: correctionCategory,
        fieldAffected: correctionField,
        originalAIValue: 'Refer to AI Output',
        doctorCorrectedValue: doctorCorrectedValue.trim(),
        comment: reviewComment,
      };

      const submitted = await reviewsApi.submit({
        caseId: id,
        decision: 'corrected',
        overallComment: reviewComment,
        corrections: [newCorrection],
      });

      setReview(submitted);
      setPatientCase((prev) => (prev ? { ...prev, status: 'reviewed' } : prev));
      setIsCorrectionModalOpen(false);
      setDoctorCorrectedValue('');
      setReviewComment('');

      toast({
        title: 'Clinical Correction Recorded',
        description: 'Doctor corrections saved into the evaluation audit store.',
        variant: 'success',
      });
    } catch (err) {
      toast({
        title: 'Submission Failed',
        description: 'Unable to save correction.',
        variant: 'danger',
      });
    }
  };

  // Submit Doctor Rejection
  const handleRejectSubmit = async () => {
    if (!id) return;
    try {
      const submitted = await reviewsApi.submit({
        caseId: id,
        decision: 'rejected',
        overallComment: reviewComment || 'Rejected due to clinical misalignment or unsafe parameters.',
      });
      setReview(submitted);
      setPatientCase((prev) => (prev ? { ...prev, status: 'reviewed' } : prev));
      setIsRejectModalOpen(false);
      toast({
        title: 'Clinical Output Rejected',
        description: 'Case marked as rejected by doctor.',
        variant: 'warning',
      });
    } catch (err) {
      toast({
        title: 'Submission Failed',
        description: 'Unable to reject case.',
        variant: 'danger',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="py-24 text-center">
        <div className="inline-block w-8 h-8 border-3 border-clinical-600 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-sm text-slate-500 font-medium">Loading clinical case file...</p>
      </div>
    );
  }

  if (!patientCase) {
    return (
      <div className="p-8 max-w-4xl mx-auto text-center py-24 space-y-4">
        <AlertTriangle size={36} className="mx-auto text-amber-500" />
        <h2 className="text-lg font-semibold text-slate-800">Case Not Found</h2>
        <p className="text-sm text-slate-500">The requested clinical case could not be located.</p>
        <Button variant="outline" size="sm" onClick={() => navigate('/doctor/cases')}>
          Return to Cases
        </Button>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8 animate-fadeIn">
      {/* ── Top Nav ── */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate('/doctor/cases')}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft size={14} />
          Back to Patient Cases
        </button>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/doctor/cases/new?id=${patientCase.id}`)}
            icon={<Edit3 size={13} />}
          >
            Edit Ground Truth
          </Button>
          {!aiOutput && (
            <Button
              variant="clinical"
              size="sm"
              loading={isAiRunning}
              onClick={() => runAiInference()}
              icon={<Play size={13} fill="currentColor" />}
            >
              Run AI Evaluation
            </Button>
          )}
        </div>
      </div>

      {/* ── Case Header & Patient Profile Banner ── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-medium text-slate-400">
                {patientCase.patient?.mrn || 'MRN-PENDING'}
              </span>
              <span className="text-slate-300">•</span>
              <Badge variant="neutral" size="sm">
                {patientCase.bodyRegion.toUpperCase()}
              </Badge>
              {patientCase.status === 'reviewed' ? (
                <Badge variant="success" size="sm" dot>
                  Doctor Reviewed
                </Badge>
              ) : patientCase.status === 'ground_truth_ready' ? (
                <Badge variant="clinical" size="sm" dot>
                  Ground Truth Ready
                </Badge>
              ) : (
                <Badge variant="neutral" size="sm" dot>
                  Draft
                </Badge>
              )}
            </div>
            <h1 className="text-2xl font-bold font-display text-slate-900">{patientCase.title}</h1>
          </div>

          {/* Quick patient metadata badge cluster */}
          <div className="flex items-center gap-3 text-xs bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-100">
            <div className="w-8 h-8 rounded-full bg-clinical-100 flex items-center justify-center text-clinical-700">
              <User size={15} />
            </div>
            <div>
              <p className="font-semibold text-slate-800">{patientCase.patient?.name}</p>
              <p className="text-slate-400">
                {patientCase.patient?.age} yrs • <span className="capitalize">{patientCase.patient?.sex}</span>
              </p>
            </div>
          </div>
        </div>

        {/* ── Patient Condition Free Text Display ── */}
        <div className="pt-3 border-t border-slate-100">
          <div className="flex items-center justify-between mb-1.5">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Activity size={13} className="text-clinical-600" />
              Patient Clinical Condition
            </h4>
            <span className="text-[11px] text-slate-400">Source: Patient/Doctor Natural Language</span>
          </div>
          <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-100 text-sm leading-relaxed text-slate-800">
            {patientCase.conditionFinalText || patientCase.conditionText || (
              <span className="italic text-slate-400">No condition notes documented.</span>
            )}
          </div>
        </div>

        {/* ── Doctor Ground Truth Display ── */}
        {groundTruth && (
          <div className="pt-3 border-t border-slate-100 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Stethoscope size={13} className="text-clinical-700" />
                Doctor Assessment & Ground Truth Treatment Plan
              </h4>
              <Badge variant="clinical" size="sm">
                Verified Clinical Reference
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-xl bg-clinical-50/50 border border-clinical-100 space-y-1">
                <span className="font-semibold text-clinical-900">Doctor Diagnostic Assessment</span>
                <p className="text-slate-700 leading-relaxed">{groundTruth.assessmentText}</p>
              </div>
              <div className="p-3.5 rounded-xl bg-clinical-50/50 border border-clinical-100 space-y-1">
                <span className="font-semibold text-clinical-900">Intended Treatment & Exercise Direction</span>
                <p className="text-slate-700 leading-relaxed">{groundTruth.treatmentPlanText}</p>
              </div>
            </div>

            {groundTruth.keyClinicalPriorities && groundTruth.keyClinicalPriorities.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[11px] font-semibold text-slate-500 mr-1">Key Clinical Anchors:</span>
                {groundTruth.keyClinicalPriorities.map((item, idx) => (
                  <Badge key={idx} variant="outline" size="sm">
                    {item}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── AI Evaluation Trigger Callout (If Not Run Yet) ── */}
      {!aiOutput && !isAiRunning && (
        <Card className="border-clinical-200 bg-gradient-to-r from-clinical-50/60 to-white">
          <CardBody className="py-8 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="space-y-1 max-w-xl text-center sm:text-left">
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-clinical-700 uppercase tracking-wider mb-1">
                <Sparkles size={14} className="text-clinical-600" />
                AI Physiotherapy Assistant Ready
              </div>
              <h3 className="text-lg font-bold text-slate-900">
                Execute AI Clinical Evaluation & Exercise Prescription
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Click below to synthesize a structured assessment, contraindications review, and evidence-aligned
                exercise regimen against this patient case.
              </p>
            </div>

            <Button
              variant="clinical"
              size="lg"
              onClick={() => runAiInference()}
              icon={<Play size={16} fill="currentColor" />}
              className="shadow-sm"
            >
              Run AI Evaluation
            </Button>
          </CardBody>
        </Card>
      )}

      {/* ── AI Running Stepper Screen ── */}
      {isAiRunning && (
        <Card className="border-clinical-300 bg-clinical-50/30 p-8 text-center space-y-4 animate-pulse">
          <div className="w-12 h-12 rounded-full bg-clinical-100 flex items-center justify-center mx-auto text-clinical-700">
            <Sparkles size={22} className="animate-spin" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-900">Synthesizing Clinical AI Output...</h3>
            <p className="text-xs font-medium text-clinical-700">{aiProgressStep || 'Processing clinical input...'}</p>
          </div>
          <p className="text-[11px] text-slate-400">
            Zero technical clutter • Strict adherence to the No-Inference principle
          </p>
        </Card>
      )}

      {/* ── Structured AI Result View ── */}
      {aiOutput && (
        <div className="space-y-6">
          {/* Result Header & Doctor Review Action Bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-clinical-500"></span>
                <h2 className="text-base font-bold text-slate-900">AI Clinical Diagnostic & Prescription Output</h2>
              </div>
              <p className="text-xs text-slate-500">
                Generated against clinical presentation and verified evidence guidelines
              </p>
            </div>

            {/* Doctor Review Buttons */}
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              {review ? (
                <div className="flex items-center gap-2">
                  <Badge
                    variant={
                      review.decision === 'approved'
                        ? 'success'
                        : review.decision === 'corrected'
                        ? 'warning'
                        : 'danger'
                    }
                    size="md"
                    dot
                  >
                    Reviewed: {review.decision.toUpperCase()} by {review.doctorName}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsCorrectionModalOpen(true)}
                    className="text-xs text-slate-500"
                  >
                    Update Review
                  </Button>
                </div>
              ) : (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsRejectModalOpen(true)}
                    icon={<XCircle size={14} className="text-rose-500" />}
                  >
                    Reject Output
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setIsCorrectionModalOpen(true)}
                    icon={<Edit3 size={14} className="text-amber-600" />}
                  >
                    Submit Correction
                  </Button>
                  <Button
                    variant="clinical"
                    size="sm"
                    onClick={handleApprove}
                    icon={<Check size={14} />}
                  >
                    Approve Output
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Review Banner if already submitted */}
          {review && (
            <div
              className={`p-4 rounded-xl border text-xs flex items-start gap-3 ${
                review.decision === 'approved'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : review.decision === 'corrected'
                  ? 'bg-amber-50 border-amber-200 text-amber-900'
                  : 'bg-rose-50 border-rose-200 text-rose-900'
              }`}
            >
              <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold">
                  Doctor Feedback Logged: {review.decision.toUpperCase()} on{' '}
                  {new Date(review.reviewedAt).toLocaleDateString()}
                </p>
                {review.overallComment && <p className="italic">"{review.overallComment}"</p>}
                {review.corrections && review.corrections.length > 0 && (
                  <div className="mt-2 space-y-1">
                    <p className="font-semibold underline">Doctor Clinical Corrections:</p>
                    {review.corrections.map((cor, idx) => (
                      <div key={idx} className="bg-white/80 p-2 rounded-lg border border-amber-200">
                        <span className="font-semibold text-amber-900">[{cor.category}]: </span>
                        <span>{cor.doctorCorrectedValue}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Section: Diagnostic Assessment & Differential */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="border-slate-200">
              <CardHeader className="pb-2 border-b border-slate-100 flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Stethoscope size={14} className="text-clinical-600" />
                  Primary Assessment
                </h4>
                <Badge variant="clinical" size="sm">
                  Clinical Synthesis
                </Badge>
              </CardHeader>
              <CardBody className="space-y-3">
                <p className="text-sm font-semibold text-slate-900 leading-snug">
                  {aiOutput.primaryAssessment}
                </p>
                <p className="text-xs text-slate-600 leading-relaxed">{aiOutput.patientSummary}</p>
              </CardBody>
            </Card>

            <Card className="border-slate-200">
              <CardHeader className="pb-2 border-b border-slate-100 flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <HelpCircle size={14} className="text-clinical-700" />
                  Differential Diagnoses Considered
                </h4>
                <span className="text-[11px] text-slate-400">Rule-outs</span>
              </CardHeader>
              <CardBody>
                <ul className="space-y-2 text-xs text-slate-700">
                  {aiOutput.differentialDiagnoses.map((diff, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-clinical-500 mt-1.5 shrink-0" />
                      <span>{diff}</span>
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>
          </div>

          {/* Section: No-Inference Principle (Documented Facts vs Clinical Gaps) */}
          <Card className="border-slate-200 shadow-xs">
            <CardHeader className="pb-2 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2">
                <ShieldAlert size={15} className="text-amber-600" />
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Documented Findings & Clinical Gaps (The No-Inference Principle)
                </h4>
              </div>
              <Badge variant="warning" size="sm">
                Strict Provenance Audit
              </Badge>
            </CardHeader>
            <CardBody className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
              {/* Documented */}
              <div className="space-y-2">
                <h5 className="text-xs font-semibold text-emerald-800 flex items-center gap-1.5">
                  <CheckCircle2 size={13} className="text-emerald-600" />
                  Documented In Clinical Record:
                </h5>
                <ul className="space-y-1.5 text-xs text-slate-700 bg-emerald-50/40 p-3 rounded-xl border border-emerald-100">
                  {aiOutput.documentedFindings.map((fact, idx) => (
                    <li key={idx} className="flex items-start gap-1.5">
                      <span className="text-emerald-600 font-bold">•</span>
                      <span>{fact}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Undocumented Gaps */}
              <div className="space-y-2">
                <h5 className="text-xs font-semibold text-amber-800 flex items-center gap-1.5">
                  <AlertTriangle size={13} className="text-amber-600" />
                  Undocumented / Clinical Information Gaps:
                </h5>
                <ul className="space-y-1.5 text-xs text-slate-700 bg-amber-50/40 p-3 rounded-xl border border-amber-100">
                  {aiOutput.clinicalGaps.map((gap, idx) => (
                    <li key={idx} className="flex items-start gap-1.5">
                      <span className="text-amber-600 font-bold">•</span>
                      <span className="font-mono text-[11px]">{gap}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </CardBody>
          </Card>

          {/* Section: Prescribed Exercise Program */}
          <Card className="border-slate-200">
            <CardHeader className="pb-3 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Dumbbell size={16} className="text-clinical-600" />
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Prescribed Exercise Recommendations
                </h4>
              </div>
              <span className="text-xs text-slate-400 font-medium">
                {aiOutput.exerciseRecommendations.length} Targeted Exercises
              </span>
            </CardHeader>
            <CardBody className="p-0 divide-y divide-slate-100">
              {aiOutput.exerciseRecommendations.map((ex, idx) => (
                <div key={idx} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-start justify-between gap-4 hover:bg-slate-50/50 transition-colors">
                  <div className="space-y-1.5 max-w-xl">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-clinical-100 text-clinical-800 flex items-center justify-center font-bold text-xs">
                        {idx + 1}
                      </span>
                      <h5 className="text-sm font-bold text-slate-900">{ex.exerciseName}</h5>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed pl-7">
                      <span className="font-medium text-slate-800">Clinical Rationale: </span>
                      {ex.clinicalRationale}
                    </p>
                    <div className="pl-7 pt-1">
                      <Badge variant="outline" size="sm">
                        Target: {ex.targetMuscleGroup}
                      </Badge>
                    </div>
                  </div>

                  <div className="sm:text-right shrink-0 pl-7 sm:pl-0">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                      Dosage / Frequency
                    </span>
                    <span className="text-xs font-semibold text-clinical-700 bg-clinical-50 px-2.5 py-1 rounded-lg border border-clinical-100 inline-block mt-0.5">
                      {ex.dosageSetsReps}
                    </span>
                  </div>
                </div>
              ))}
            </CardBody>
          </Card>

          {/* Section: Treatment Plan Phases & Contraindications */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="border-slate-200">
              <CardHeader className="pb-2 border-b border-slate-100">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Phased Treatment Strategy
                </h4>
              </CardHeader>
              <CardBody>
                <ol className="space-y-2 text-xs text-slate-700">
                  {aiOutput.treatmentPlan.map((phase, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="font-bold text-clinical-700">{idx + 1}.</span>
                      <span>{phase}</span>
                    </li>
                  ))}
                </ol>
              </CardBody>
            </Card>

            <Card className="border-rose-200 bg-rose-50/20">
              <CardHeader className="pb-2 border-b border-rose-100 flex items-center justify-between">
                <h4 className="text-xs font-bold text-rose-900 uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldAlert size={14} className="text-rose-600" />
                  Contraindications & Strict Restrictions
                </h4>
                <Badge variant="danger" size="sm">
                  Patient Safety
                </Badge>
              </CardHeader>
              <CardBody className="space-y-2">
                <ul className="space-y-1.5 text-xs text-rose-900">
                  {aiOutput.contraindications.map((contra, idx) => (
                    <li key={idx} className="flex items-start gap-1.5">
                      <XCircle size={13} className="text-rose-600 mt-0.5 shrink-0" />
                      <span>{contra}</span>
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>
          </div>

          {/* Section: Evidence Guidelines & Citations */}
          {aiOutput.retrievalCitations && aiOutput.retrievalCitations.length > 0 && (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen size={14} className="text-slate-400" />
                <span className="font-medium">Evidence Citations & Guidelines Grounding:</span>
                <span className="text-slate-500 italic">
                  {aiOutput.retrievalCitations.join(' • ')}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Modal: Submit Clinical Correction ── */}
      <Modal
        open={isCorrectionModalOpen}
        onOpenChange={setIsCorrectionModalOpen}
        size="lg"
      >
        <ModalHeader
          title="Submit Doctor Clinical Correction"
          description="Provide clinical adjustments to help refine model accuracy and log active feedback"
        />
        <ModalBody className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700">Correction Category (Taxonomy)</label>
              <select
                value={correctionCategory}
                onChange={(e) => setCorrectionCategory(e.target.value as ErrorTaxonomy)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white"
              >
                <option value="CLINICAL_MISALIGNMENT">Clinical Misalignment</option>
                <option value="EXERCISE_MISALIGNMENT">Exercise Misalignment / Inappropriate</option>
                <option value="SAFETY_CONCERN">Safety Concern / Contraindication</option>
                <option value="FACTUAL_ERROR">Factual Error (Side, Age, Severity)</option>
                <option value="MISSING_INFORMATION">Missing Crucial Information</option>
                <option value="UNSUPPORTED_INFERENCE">Unsupported Inference (Hallucination)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700">Field Affected</label>
              <select
                value={correctionField}
                onChange={(e) => setCorrectionField(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white"
              >
                <option value="exerciseRecommendations">Exercise Recommendations</option>
                <option value="primaryAssessment">Primary Diagnostic Assessment</option>
                <option value="contraindications">Contraindications & Safety</option>
                <option value="treatmentPlan">Treatment Plan Phases</option>
                <option value="documentedFindings">Documented Findings</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-700">
              Doctor-Corrected Value / Clinical Override *
            </label>
            <textarea
              rows={4}
              placeholder="State what the AI should have recommended or how it should be corrected..."
              value={doctorCorrectedValue}
              onChange={(e) => setDoctorCorrectedValue(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-clinical-500 leading-relaxed"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-700">
              Overall Clinical Rationale / Comment (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Exercises must prioritize eccentric control without pain provocation..."
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-clinical-500"
            />
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="outline" size="sm" onClick={() => setIsCorrectionModalOpen(false)}>
            Cancel
          </Button>
          <Button variant="clinical" size="sm" onClick={handleCorrectionSubmit}>
            Save & Submit Correction
          </Button>
        </ModalFooter>
      </Modal>

      {/* ── Modal: Reject Output ── */}
      <Modal open={isRejectModalOpen} onOpenChange={setIsRejectModalOpen} size="md">
        <ModalHeader
          title="Reject AI Clinical Output"
          description="Mark this output as clinically unacceptable or unsafe for patient care"
        />
        <ModalBody className="space-y-3">
          <p className="text-xs text-slate-600 leading-relaxed">
            Rejecting this evaluation flags it for review by the AI research lab team and excludes it from
            production adoption.
          </p>
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-700">Reason for Rejection *</label>
            <textarea
              rows={3}
              placeholder="Please provide the clinical rationale for rejecting this output..."
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-rose-500"
            />
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="outline" size="sm" onClick={() => setIsRejectModalOpen(false)}>
            Cancel
          </Button>
          <Button variant="danger" size="sm" onClick={handleRejectSubmit}>
            Confirm Rejection
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
