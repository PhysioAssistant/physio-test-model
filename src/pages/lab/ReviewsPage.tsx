import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Stethoscope,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Flag,
  Download,
  Database,
  Search,
  Filter,
  Copy,
  Check,
  Sparkles,
  ArrowRight,
  FileCode2,
  ShieldAlert,
  Dumbbell,
  BookOpen,
  Layers,
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
import { reviewsApi, casesApi, datasetsApi } from '@/lib/api';
import type {
  DoctorReview,
  PatientCase,
  ErrorTaxonomy,
  DoctorCorrection,
} from '@/types';

export default function ReviewsPage() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [reviews, setReviews] = useState<DoctorReview[]>([]);
  const [cases, setCases] = useState<PatientCase[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [decisionFilter, setDecisionFilter] = useState<string>('all');
  const [taxonomyFilter, setTaxonomyFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<'few_shot_json' | 'dpo_jsonl' | 'csv'>('few_shot_json');
  const [exportedData, setExportedData] = useState<string>('');
  const [hasCopied, setHasCopied] = useState(false);

  const [isPromoteModalOpen, setIsPromoteModalOpen] = useState(false);
  const [datasetName, setDatasetName] = useState('Doctor-Calibrated Benchmark Cohort v1.0');
  const [datasetDescription, setDatasetDescription] = useState('Golden dataset generated from physician-approved and doctor-corrected clinical cases.');
  const [isPromoting, setIsPromoting] = useState(false);

  // Load reviews & cases
  const loadData = async () => {
    setIsLoading(true);
    try {
      const [revs, cs] = await Promise.all([reviewsApi.list(), casesApi.list()]);
      setReviews(revs);
      setCases(cs);
    } catch (err) {
      console.error('Error loading reviews:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Update export preview
  useEffect(() => {
    if (isExportModalOpen) {
      reviewsApi.exportFeedbackDataset(exportFormat).then((res) => setExportedData(res));
    }
  }, [isExportModalOpen, exportFormat]);

  // Statistics
  const totalReviews = reviews.length;
  const approvedCount = reviews.filter((r) => r.decision === 'approved').length;
  const correctedCount = reviews.filter((r) => r.decision === 'corrected').length;
  const flaggedCount = reviews.filter((r) => r.decision === 'flagged').length;
  const rejectedCount = reviews.filter((r) => r.decision === 'rejected').length;

  const approvalRate = totalReviews > 0 ? Math.round((approvedCount / totalReviews) * 100) : 0;
  const correctionRate = totalReviews > 0 ? Math.round((correctedCount / totalReviews) * 100) : 0;

  const allCorrections: (DoctorCorrection & { caseId: string; doctorName: string })[] = [];
  reviews.forEach((r) => {
    r.corrections.forEach((c) => {
      allCorrections.push({ ...c, caseId: r.caseId, doctorName: r.doctorName });
    });
  });

  // Taxonomy distribution counts
  const taxonomyCounts: Record<string, number> = {};
  allCorrections.forEach((c) => {
    taxonomyCounts[c.category] = (taxonomyCounts[c.category] || 0) + 1;
  });

  // Filter reviews
  const filteredReviews = reviews.filter((r) => {
    if (decisionFilter !== 'all' && r.decision !== decisionFilter) return false;
    if (taxonomyFilter !== 'all') {
      const hasTax = r.corrections.some((c) => c.category === taxonomyFilter);
      if (!hasTax) return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchDoc = r.doctorName.toLowerCase().includes(q);
      const matchComment = (r.overallComment || '').toLowerCase().includes(q);
      const c = cases.find((item) => item.id === r.caseId);
      const matchCase = (c?.title || '').toLowerCase().includes(q) || r.caseId.toLowerCase().includes(q);
      if (!matchDoc && !matchComment && !matchCase) return false;
    }
    return true;
  });

  const copyToClipboard = () => {
    navigator.clipboard.writeText(exportedData);
    setHasCopied(true);
    setTimeout(() => setHasCopied(false), 2000);
    toast({
      title: 'Copied to Clipboard',
      description: `Dataset exported in ${exportFormat} format.`,
      variant: 'success',
    });
  };

  const downloadExportedFile = () => {
    const extensions = {
      few_shot_json: 'json',
      dpo_jsonl: 'jsonl',
      csv: 'csv',
    };
    const mimeTypes = {
      few_shot_json: 'application/json',
      dpo_jsonl: 'application/x-ndjson',
      csv: 'text/csv',
    };

    const blob = new Blob([exportedData], { type: mimeTypes[exportFormat] });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `doctor_feedback_dataset_${Date.now()}.${extensions[exportFormat]}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: 'Download Initiated',
      description: 'Dataset file downloaded successfully.',
      variant: 'success',
    });
  };

  const handlePromoteToDataset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!datasetName.trim()) return;
    setIsPromoting(true);
    try {
      const created = await reviewsApi.promoteToDataset(datasetName, datasetDescription);
      toast({
        title: 'Benchmark Dataset Created',
        description: `Registered "${created.name}" with ${created.caseCount} doctor-calibrated cases.`,
        variant: 'success',
      });
      setIsPromoteModalOpen(false);
    } catch (err: any) {
      toast({
        title: 'Promotion Failed',
        description: err.message || 'Could not register dataset.',
        variant: 'danger',
      });
    } finally {
      setIsPromoting(false);
    }
  };

  const getDecisionBadge = (decision: DoctorReview['decision']) => {
    switch (decision) {
      case 'approved':
        return (
          <Badge variant="success" size="sm" dot>
            APPROVED
          </Badge>
        );
      case 'corrected':
        return (
          <Badge variant="warning" size="sm" dot>
            CORRECTED
          </Badge>
        );
      case 'flagged':
        return (
          <Badge variant="lab" size="sm" dot>
            FLAGGED
          </Badge>
        );
      case 'rejected':
        return (
          <Badge variant="danger" size="sm" dot>
            REJECTED
          </Badge>
        );
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-fadeIn text-slate-100">
      {/* ── Page Header ── */}
      <PageHeader
        title="Doctor Clinical Review & Feedback Loop"
        subtitle="Physician validation decisions, error taxonomy breakdown, and Active Learning Dataset generation for prompt calibration & DPO fine-tuning"
        action={
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="md"
              icon={<Download size={14} />}
              onClick={() => setIsExportModalOpen(true)}
            >
              Export Feedback Dataset
            </Button>
            <Button
              variant="lab"
              size="md"
              icon={<Database size={14} />}
              onClick={() => setIsPromoteModalOpen(true)}
            >
              Promote to Golden Benchmark
            </Button>
          </div>
        }
      />

      {/* ── Statistical Metric Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
          <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block">
            Total Reviews
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono text-white">{totalReviews}</span>
            <span className="text-xs text-slate-500">cases</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
          <span className="text-[11px] font-mono text-emerald-400 uppercase tracking-wider block">
            Approval Rate
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono text-emerald-400">{approvalRate}%</span>
            <span className="text-xs text-slate-500">{approvedCount} approved</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
          <span className="text-[11px] font-mono text-amber-400 uppercase tracking-wider block">
            Correction Rate
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono text-amber-400">{correctionRate}%</span>
            <span className="text-xs text-slate-500">{correctedCount} modified</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
          <span className="text-[11px] font-mono text-rose-400 uppercase tracking-wider block">
            Rejection / Flagged
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono text-rose-400">
              {flaggedCount + rejectedCount}
            </span>
            <span className="text-xs text-slate-500">safety / errors</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
          <span className="text-[11px] font-mono text-lab-400 uppercase tracking-wider block">
            Tagged Corrections
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono text-lab-400">{allCorrections.length}</span>
            <span className="text-xs text-slate-500">pairs</span>
          </div>
        </div>
      </div>

      {/* ── Error Taxonomy Distribution (The Clinical Breakdown) ── */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <AlertTriangle size={14} className="text-amber-400" />
              Doctor Correction Taxonomy Distribution
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Identifies which cognitive & clinical failure modes doctors are correcting most frequently
            </p>
          </div>
          <span className="text-[11px] font-mono text-slate-400">
            {allCorrections.length} Total Specific Corrections Tagged
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2.5">
          {Object.entries(taxonomyCounts).map(([cat, count]) => {
            const isCardinal = cat === 'UNSUPPORTED_INFERENCE';
            const pct = allCorrections.length > 0 ? Math.round((count / allCorrections.length) * 100) : 0;

            return (
              <div
                key={cat}
                onClick={() => setTaxonomyFilter(taxonomyFilter === cat ? 'all' : cat)}
                className={`p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                  taxonomyFilter === cat
                    ? 'bg-lab-500/15 border-lab-500 text-white'
                    : isCardinal
                    ? 'bg-rose-950/20 border-rose-500/40 text-rose-300 hover:border-rose-400'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-mono uppercase font-bold truncate">
                    {cat.replace(/_/g, ' ')}
                  </span>
                  <span className="font-mono font-bold text-xs">{count}</span>
                </div>
                <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden mt-1.5">
                  <div
                    className={`h-full rounded-full ${isCardinal ? 'bg-rose-500' : 'bg-lab-500'}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-[10px] font-mono text-slate-500 block mt-1 text-right">
                  {pct}% of errors
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Filters & Search ── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 rounded-xl bg-slate-900 border border-slate-800 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[240px]">
            <Search size={13} className="absolute left-3 top-2.5 text-slate-500" />
            <input
              type="text"
              placeholder="Search case, doctor name, or notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-700 bg-slate-950 text-slate-200 focus:outline-none focus:ring-1 focus:ring-lab-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-mono">Decision:</span>
            <select
              value={decisionFilter}
              onChange={(e) => setDecisionFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-700 bg-slate-950 text-slate-200 focus:outline-none"
            >
              <option value="all">All Decisions</option>
              <option value="approved">Approved</option>
              <option value="corrected">Corrected</option>
              <option value="flagged">Flagged</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-mono">Taxonomy:</span>
            <select
              value={taxonomyFilter}
              onChange={(e) => setTaxonomyFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-700 bg-slate-950 text-slate-200 focus:outline-none"
            >
              <option value="all">All Taxonomies</option>
              {Object.keys(taxonomyCounts).map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>

        <span className="text-slate-400 font-mono">
          Showing {filteredReviews.length} of {reviews.length} reviews
        </span>
      </div>

      {/* ── Reviews Feed / List ── */}
      <div className="space-y-4">
        {filteredReviews.length === 0 ? (
          <div className="p-12 text-center rounded-2xl border border-slate-800 bg-slate-900/50 text-slate-400 text-xs">
            <CheckCircle2 size={32} className="text-emerald-400 mx-auto mb-2" />
            No reviews match the current filter selection.
          </div>
        ) : (
          filteredReviews.map((rev) => {
            const patientCase = cases.find((c) => c.id === rev.caseId);

            return (
              <div
                key={rev.id}
                className="p-5 rounded-2xl border border-slate-800 bg-slate-900 space-y-4 hover:border-slate-700 transition-all"
              >
                {/* Review Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-clinical-400">
                      <Stethoscope size={15} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-200 text-sm">
                          {patientCase?.title || rev.caseId}
                        </span>
                        <span className="text-xs font-mono text-slate-500">({rev.caseId})</span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Reviewed by <strong className="text-slate-300">{rev.doctorName}</strong> •{' '}
                        {new Date(rev.reviewedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {getDecisionBadge(rev.decision)}
                    <Button
                      variant="ghost"
                      size="xs"
                      icon={<ArrowRight size={13} />}
                      onClick={() => navigate(`/doctor/cases/${rev.caseId}`)}
                    >
                      View Case
                    </Button>
                  </div>
                </div>

                {/* Overall Doctor Comment */}
                {rev.overallComment && (
                  <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs text-slate-300 leading-relaxed font-sans italic">
                    "{rev.overallComment}"
                  </div>
                )}

                {/* Specific Doctor Corrections */}
                {rev.corrections.length > 0 && (
                  <div className="space-y-2.5">
                    <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-semibold block">
                      Targeted Corrections ({rev.corrections.length}):
                    </span>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {rev.corrections.map((cor) => {
                        const isNoInference = cor.category === 'UNSUPPORTED_INFERENCE';

                        return (
                          <div
                            key={cor.id}
                            className={`p-3.5 rounded-xl border text-xs space-y-2 ${
                              isNoInference
                                ? 'bg-rose-950/20 border-rose-500/30'
                                : 'bg-slate-950/90 border-slate-800'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <Badge
                                variant={isNoInference ? 'danger' : 'outline'}
                                size="xs"
                              >
                                {cor.category}
                              </Badge>
                              <span className="text-[10px] font-mono text-slate-400">
                                Field: {cor.fieldAffected}
                              </span>
                            </div>

                            <p className="text-slate-300 text-xs">{cor.comment}</p>

                            <div className="space-y-1 font-mono text-[11px] pt-1 border-t border-slate-800/80">
                              <div className="text-rose-400">
                                <span className="font-semibold text-rose-500">Original AI: </span>
                                {cor.originalAIValue}
                              </div>
                              <div className="text-emerald-300">
                                <span className="font-semibold text-emerald-400">Doctor Correction: </span>
                                {cor.doctorCorrectedValue}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* ── Modal: Export Feedback Dataset ── */}
      <Modal open={isExportModalOpen} onOpenChange={setIsExportModalOpen} size="xl">
        <ModalHeader
          title="Export Active Learning Feedback Dataset"
          description="Transform doctor reviews and corrections into calibration datasets for prompt engineering or DPO fine-tuning"
        />
        <ModalBody className="space-y-4">
          {/* Format Selector */}
          <div className="grid grid-cols-3 gap-3">
            <div
              onClick={() => setExportFormat('few_shot_json')}
              className={`p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                exportFormat === 'few_shot_json'
                  ? 'bg-lab-500/15 border-lab-500 text-white'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              <span className="font-bold block text-slate-200">Few-Shot Prompt JSON</span>
              <span className="text-[11px] text-slate-500">For injection in prompt templates</span>
            </div>

            <div
              onClick={() => setExportFormat('dpo_jsonl')}
              className={`p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                exportFormat === 'dpo_jsonl'
                  ? 'bg-lab-500/15 border-lab-500 text-white'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              <span className="font-bold block text-slate-200">DPO / RLHF Pairs (JSONL)</span>
              <span className="text-[11px] text-slate-500">Prompt + Chosen + Rejected</span>
            </div>

            <div
              onClick={() => setExportFormat('csv')}
              className={`p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                exportFormat === 'csv'
                  ? 'bg-lab-500/15 border-lab-500 text-white'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              <span className="font-bold block text-slate-200">Clinical Audit CSV</span>
              <span className="text-[11px] text-slate-500">Spreadsheet for clinical reviewers</span>
            </div>
          </div>

          {/* Preview Window */}
          <div className="relative">
            <div className="absolute right-3 top-3 z-10 flex items-center gap-2">
              <Button
                variant="outline"
                size="xs"
                onClick={copyToClipboard}
                icon={hasCopied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
              >
                {hasCopied ? 'Copied!' : 'Copy Payload'}
              </Button>
            </div>
            <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 font-mono text-[11px] text-slate-300 max-h-96 overflow-y-auto whitespace-pre-wrap leading-relaxed">
              {exportedData}
            </pre>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" size="sm" onClick={() => setIsExportModalOpen(false)}>
            Close
          </Button>
          <Button
            variant="lab"
            size="sm"
            onClick={downloadExportedFile}
            icon={<Download size={13} />}
          >
            Download Dataset File
          </Button>
        </ModalFooter>
      </Modal>

      {/* ── Modal: Promote to Golden Benchmark Dataset ── */}
      <Modal open={isPromoteModalOpen} onOpenChange={setIsPromoteModalOpen} size="md">
        <ModalHeader
          title="Promote to Golden Benchmark Dataset"
          description="Register doctor-reviewed cases as a curated benchmark dataset in the AI Lab"
        />
        <form onSubmit={handlePromoteToDataset}>
          <ModalBody className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-300">Dataset Name *</label>
              <input
                type="text"
                required
                value={datasetName}
                onChange={(e) => setDatasetName(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-700 bg-slate-950 text-slate-200 focus:outline-none focus:ring-1 focus:ring-lab-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-300">Description</label>
              <textarea
                rows={3}
                value={datasetDescription}
                onChange={(e) => setDatasetDescription(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-700 bg-slate-950 text-slate-200 focus:outline-none focus:ring-1 focus:ring-lab-500"
              />
            </div>

            <div className="p-3 rounded-lg bg-emerald-950/20 border border-emerald-500/20 text-xs text-emerald-300 flex items-center gap-2">
              <Sparkles size={14} className="text-emerald-400 shrink-0" />
              <span>
                Will bundle <strong>{reviews.length}</strong> reviewed cases into the benchmark registry for future regression tests.
              </span>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" size="sm" onClick={() => setIsPromoteModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="lab"
              size="sm"
              loading={isPromoting}
              icon={<Database size={13} />}
            >
              Create Benchmark Dataset
            </Button>
          </ModalFooter>
        </form>
      </Modal>
    </div>
  );
}
