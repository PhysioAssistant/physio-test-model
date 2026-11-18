import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FolderOpen,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  User,
  Activity,
  Stethoscope,
  ShieldAlert,
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
} from '@/components/ui';
import { casesApi, groundTruthApi } from '@/lib/api';
import type { PatientCase, DoctorGroundTruth } from '@/types';

export default function LabCasesPage() {
  const navigate = useNavigate();
  const [cases, setCases] = useState<PatientCase[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState('all');

  // Inspection modal
  const [inspectCase, setInspectCase] = useState<PatientCase | null>(null);
  const [inspectGroundTruth, setInspectGroundTruth] = useState<DoctorGroundTruth | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    casesApi
      .list()
      .then(setCases)
      .catch((err) => console.error('Failed to load lab cases:', err))
      .finally(() => setIsLoading(false));
  }, []);

  const handleInspect = async (c: PatientCase) => {
    setInspectCase(c);
    setIsModalOpen(true);
    try {
      const gt = await groundTruthApi.getByCase(c.id);
      setInspectGroundTruth(gt);
    } catch {
      setInspectGroundTruth(null);
    }
  };

  const filtered = cases.filter((c) => {
    const matchesSearch =
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.patient?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.patient?.mrn.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRegion = selectedRegion === 'all' || c.bodyRegion === selectedRegion;
    const matchesDiff = selectedDifficulty === 'all' || c.difficulty === selectedDifficulty;
    return matchesSearch && matchesRegion && matchesDiff;
  });

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 animate-fadeIn text-slate-100">
      {/* ── Page Header ── */}
      <PageHeader
        title="Clinical Case Repository"
        subtitle="Inspect raw clinical narratives, verified doctor ground truth, and structured evaluation facts"
        action={
          <Badge variant="lab" size="md">
            {cases.length} Total Cases
          </Badge>
        }
      />

      {/* ── Search & Filter Controls ── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900 p-4 rounded-xl border border-slate-800">
        <div className="relative w-full sm:w-80">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search by case title, MRN, patient..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-700 bg-slate-950 text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-lab-500 focus:border-lab-500 transition-all font-mono"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
            <Filter size={13} />
            <span>Region:</span>
          </div>
          <select
            value={selectedRegion}
            onChange={(e) => setSelectedRegion(e.target.value)}
            className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-700 bg-slate-950 text-slate-300 focus:outline-none focus:ring-1 focus:ring-lab-500"
          >
            <option value="all">All Regions</option>
            <option value="knee">Knee</option>
            <option value="spine">Spine</option>
            <option value="shoulder">Shoulder</option>
            <option value="hip">Hip</option>
          </select>

          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium ml-2">
            <span>Difficulty:</span>
          </div>
          <select
            value={selectedDifficulty}
            onChange={(e) => setSelectedDifficulty(e.target.value)}
            className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-700 bg-slate-950 text-slate-300 focus:outline-none focus:ring-1 focus:ring-lab-500"
          >
            <option value="all">All Levels</option>
            <option value="easy">Easy</option>
            <option value="moderate">Moderate</option>
            <option value="complex">Complex</option>
            <option value="high_risk">High Risk</option>
          </select>
        </div>
      </div>

      {/* ── Table View ── */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xs">
        <table className="w-full text-left text-xs text-slate-300 divide-y divide-slate-800">
          <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider text-[11px] font-mono">
            <tr>
              <th className="px-5 py-3.5">Case Title / MRN</th>
              <th className="px-5 py-3.5">Patient Info</th>
              <th className="px-5 py-3.5">Body Region</th>
              <th className="px-5 py-3.5">Difficulty</th>
              <th className="px-5 py-3.5">Status</th>
              <th className="px-5 py-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-sans">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="px-5 py-12 text-center text-slate-500">
                  Loading case repository...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-12 text-center text-slate-500">
                  No evaluation cases match the filter.
                </td>
              </tr>
            ) : (
              filtered.map((c) => (
                <tr
                  key={c.id}
                  className="hover:bg-slate-850/50 transition-colors cursor-pointer"
                  onClick={() => handleInspect(c)}
                >
                  <td className="px-5 py-4">
                    <div className="space-y-0.5">
                      <p className="font-semibold text-slate-200 hover:text-lab-300 transition-colors">
                        {c.title}
                      </p>
                      <p className="text-[11px] font-mono text-slate-500">{c.patient?.mrn || c.id}</p>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-slate-400">
                    <span>{c.patient?.name}</span>
                    <span className="text-slate-600 mx-1.5">•</span>
                    <span>{c.patient?.age} yrs</span>
                  </td>
                  <td className="px-5 py-4">
                    <Badge variant="outline" size="sm">
                      {c.bodyRegion.toUpperCase()}
                    </Badge>
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={`text-[11px] font-mono font-medium px-2 py-0.5 rounded ${
                        c.difficulty === 'high_risk'
                          ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          : c.difficulty === 'complex'
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {c.difficulty.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <Badge
                      variant={
                        c.status === 'reviewed'
                          ? 'success'
                          : c.status === 'ground_truth_ready'
                          ? 'lab'
                          : 'neutral'
                      }
                      size="sm"
                      dot
                    >
                      {c.status.replace(/_/g, ' ')}
                    </Badge>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleInspect(c);
                      }}
                      className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
                    >
                      Inspect Data
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ── Inspection Modal (Engineering Provenance Lens) ── */}
      <Modal open={isModalOpen} onOpenChange={setIsModalOpen} size="xl">
        <ModalHeader
          title={inspectCase?.title || 'Case Provenance & Ground Truth'}
          description={`MRN: ${inspectCase?.patient?.mrn || 'N/A'} • Region: ${inspectCase?.bodyRegion.toUpperCase()} • Status: ${inspectCase?.status}`}
        />
        <ModalBody className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          {/* Patient Narrative */}
          <div className="space-y-1.5 bg-slate-950 p-4 rounded-xl border border-slate-800">
            <h5 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Activity size={13} className="text-clinical-400" />
              Patient Clinical Narrative (Natural Language / Voice)
            </h5>
            <p className="text-xs text-slate-400 leading-relaxed font-sans">
              {inspectCase?.conditionFinalText || inspectCase?.conditionText || 'No narrative.'}
            </p>
          </div>

          {/* Doctor Ground Truth */}
          <div className="space-y-2 bg-slate-950 p-4 rounded-xl border border-slate-800">
            <h5 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Stethoscope size={13} className="text-emerald-400" />
              Doctor Ground Truth (Verified Benchmark Anchor)
            </h5>
            {inspectGroundTruth ? (
              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-slate-500 font-semibold block">Assessment:</span>
                  <p className="text-slate-300 leading-relaxed font-sans">
                    {inspectGroundTruth.assessmentText}
                  </p>
                </div>
                <div>
                  <span className="text-slate-500 font-semibold block">Intended Treatment & Precautions:</span>
                  <p className="text-slate-300 leading-relaxed font-sans">
                    {inspectGroundTruth.treatmentPlanText}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic">No ground truth submitted for this case yet.</p>
            )}
          </div>

          {/* Structured Evaluation Facts */}
          {inspectCase?.structuredFacts && inspectCase.structuredFacts.length > 0 && (
            <div className="space-y-2 bg-slate-950 p-4 rounded-xl border border-slate-800">
              <h5 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldAlert size={13} className="text-amber-400" />
                Extracted Clinical Evaluation Facts (No-Inference Adherence)
              </h5>
              <div className="divide-y divide-slate-800 text-xs">
                {inspectCase.structuredFacts.map((fact) => (
                  <div key={fact.id} className="py-2 flex items-center justify-between font-mono">
                    <span className="text-slate-400">{fact.name}</span>
                    <span
                      className={
                        fact.isDocumented
                          ? 'text-slate-200'
                          : 'text-amber-400 italic bg-amber-500/10 px-2 py-0.5 rounded'
                      }
                    >
                      {fact.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </ModalBody>
        <ModalFooter>
          <Button variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
            Close
          </Button>
          <Button
            variant="lab"
            size="sm"
            onClick={() => {
              setIsModalOpen(false);
              navigate(`/doctor/cases/${inspectCase?.id}`);
            }}
          >
            Open in Doctor View
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
