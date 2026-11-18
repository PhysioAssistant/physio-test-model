import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Save,
  Play,
  User,
  Activity,
  Sparkles,
  FileCheck2,
  Stethoscope,
  Tag,
  Plus,
  X,
  Lock,
} from 'lucide-react';
import {
  PageHeader,
  Button,
  Card,
  CardBody,
  CardHeader,
  Badge,
  useToast,
} from '@/components/ui';
import { VoiceRecorderTextarea } from '@/components/clinical';
import { casesApi, groundTruthApi, patientsApi, regionsApi } from '@/lib/api';
import type { PatientCase, BiologicalSex } from '@/types';

export default function CreateCasePage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditMode = Boolean(id);
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Minimal Patient Details
  const [patientName, setPatientName] = useState('');
  const [patientMrn, setPatientMrn] = useState('');
  const [patientAge, setPatientAge] = useState<number>(40);
  const [patientSex, setPatientSex] = useState<BiologicalSex>('female');
  const [bodyRegion, setBodyRegion] = useState<string>('Knee');
  const [availableRegions, setAvailableRegions] = useState<string[]>([]);
  const [customRegionMode, setCustomRegionMode] = useState(false);
  const [customRegionValue, setCustomRegionValue] = useState('');
  const [isSavingRegion, setIsSavingRegion] = useState(false);
  const [caseTitle, setCaseTitle] = useState('');

  // Natural Language Inputs
  const [conditionText, setConditionText] = useState('');
  const [assessmentText, setAssessmentText] = useState('');
  const [treatmentPlanText, setTreatmentPlanText] = useState('');

  // Key Clinical Priorities / Tags
  const [priorities, setPriorities] = useState<string[]>([]);
  const [newPriorityInput, setNewPriorityInput] = useState('');

  // Load body regions from Supabase
  useEffect(() => {
    regionsApi.getAll().then((regions) => {
      if (regions.length > 0) setAvailableRegions(regions);
    });
  }, []);

  // Load existing case if edit mode
  useEffect(() => {
    if (isEditMode && id) {
      setIsLoading(true);
      Promise.all([casesApi.getById(id), groundTruthApi.getByCase(id)])
        .then(([c, gt]) => {
          if (c) {
            setCaseTitle(c.title);
            setBodyRegion(c.bodyRegion);
            setConditionText(c.conditionFinalText || c.conditionText || '');
            if (c.patient) {
              setPatientName(c.patient.name);
              setPatientMrn(c.patient.mrn);
              setPatientAge(c.patient.age);
              setPatientSex(c.patient.sex);
            }
          }
          if (gt) {
            setAssessmentText(gt.assessmentText || '');
            setTreatmentPlanText(gt.treatmentPlanText || '');
            setPriorities(gt.keyClinicalPriorities || []);
          }
        })
        .catch((err) => {
          console.error('Failed to load case for edit:', err);
          toast({
            title: 'Error loading case',
            description: 'Could not load existing case details.',
            variant: 'danger',
          });
        })
        .finally(() => setIsLoading(false));
    } else {
      // Auto-generate a default MRN for fresh case
      setPatientMrn(`MRN-${Math.floor(10000 + Math.random() * 90000)}`);
    }
  }, [id, isEditMode, toast]);

  // Priority tag management
  const addPriority = () => {
    if (newPriorityInput.trim() && !priorities.includes(newPriorityInput.trim())) {
      setPriorities([...priorities, newPriorityInput.trim()]);
      setNewPriorityInput('');
    }
  };

  const removePriority = (p: string) => {
    setPriorities(priorities.filter((item) => item !== p));
  };

  // Save handler
  const handleSave = async (runAiAfterwards = false, markReady = true) => {
    if (!patientName.trim()) {
      toast({
        title: 'Patient name required',
        description: 'Please enter the patient’s full name.',
        variant: 'warning',
      });
      return;
    }

    if (!conditionText.trim()) {
      toast({
        title: 'Patient condition required',
        description: 'Please dictate or type the patient’s condition.',
        variant: 'warning',
      });
      return;
    }

    setIsSaving(true);
    try {
      // 1. Create or use Patient
      const patient = await patientsApi.create({
        name: patientName.trim(),
        mrn: patientMrn.trim() || `MRN-${Date.now().toString().slice(-5)}`,
        age: Number(patientAge) || 35,
        sex: patientSex,
      });

      // 2. Title fallback
      const effectiveTitle =
        caseTitle.trim() ||
        `${bodyRegion.charAt(0).toUpperCase() + bodyRegion.slice(1)} Assessment - ${patientName}`;

      // 3. Create or update Case
      const casePayload = {
        patientId: patient.id,
        title: effectiveTitle,
        bodyRegion,
        conditionText,
        conditionFinalText: conditionText,
        status: (markReady && assessmentText.trim() ? 'ground_truth_ready' : 'draft') as PatientCase['status'],
        tags: [bodyRegion, ...priorities.slice(0, 3)],
      };

      let savedCase: PatientCase;
      if (isEditMode && id) {
        savedCase = await casesApi.update(id, casePayload);
      } else {
        savedCase = await casesApi.create(casePayload);
      }

      // 4. Save Ground Truth if provided
      if (assessmentText.trim() || treatmentPlanText.trim()) {
        await groundTruthApi.upsert({
          caseId: savedCase.id,
          assessmentText: assessmentText.trim(),
          treatmentPlanText: treatmentPlanText.trim(),
          keyClinicalpriorities: priorities,
        });
      }

      toast({
        title: isEditMode ? 'Case updated' : 'Case created successfully',
        description: markReady
          ? 'Case ground truth is ready for AI evaluation.'
          : 'Draft saved successfully.',
        variant: 'success',
      });

      if (runAiAfterwards) {
        navigate(`/doctor/cases/${savedCase.id}?autoRun=true`);
      } else {
        navigate(`/doctor/cases/${savedCase.id}`);
      }
    } catch (err: any) {
      console.error('Failed to save case:', err);
      toast({
        title: 'Save failed',
        description: err.message || 'An error occurred while saving the case.',
        variant: 'danger',
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="py-24 text-center">
        <div className="inline-block w-8 h-8 border-3 border-clinical-600 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-sm text-slate-500 font-medium">Loading clinical case intake...</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8 animate-fadeIn">
      {/* ── Top Navigation Bar ── */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate('/doctor/cases')}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft size={14} />
          Back to Cases
        </button>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            disabled={isSaving}
            onClick={() => handleSave(false, false)}
          >
            Save as Draft
          </Button>

          <Button
            variant="secondary"
            size="sm"
            disabled={isSaving}
            onClick={() => handleSave(false, true)}
            icon={<FileCheck2 size={14} />}
          >
            Save & Ready for AI
          </Button>

          <Button
            variant="clinical"
            size="sm"
            disabled={isSaving}
            onClick={() => toast({ title: 'Under Construction', description: 'AI Evaluation is currently under construction and will be available soon.', variant: 'warning' })}
            icon={<Lock size={14} />}
          >
            Save & Run AI Evaluation
          </Button>
        </div>
      </div>

      {/* ── Page Header ── */}
      <PageHeader
        title={isEditMode ? 'Edit Clinical Case' : 'New Clinical Case Intake'}
        subtitle="Dictate or describe patient presentation and clinical ground truth in your own natural words"
      />

      {/* ── Section 1: Minimal Patient Info (No Form Clutter) ── */}
      <Card className="border-slate-200">
        <CardHeader className="pb-3 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <User size={16} className="text-clinical-600" />
            <h3 className="text-sm font-semibold text-slate-900">Patient & Case Basics</h3>
          </div>
          <span className="text-[11px] text-slate-400 font-medium">
            Minimal clinical profile
          </span>
        </CardHeader>
        <CardBody className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
          <div className="md:col-span-2 space-y-1">
            <label className="text-xs font-medium text-slate-700">Patient Name *</label>
            <input
              type="text"
              placeholder="e.g. Priya Sharma"
              value={patientName}
              onChange={(e) => setPatientName(e.target.value)}
              className="w-full px-3 py-2 text-sm text-slate-900 font-medium rounded-lg border border-slate-200 bg-white hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-clinical-500/20 focus:border-clinical-600 transition-all placeholder:text-slate-400"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-700">Age</label>
            <input
              type="number"
              min={1}
              max={110}
              value={patientAge}
              onChange={(e) => setPatientAge(Number(e.target.value))}
              className="w-full px-3 py-2 text-sm text-slate-900 font-medium rounded-lg border border-slate-200 bg-white hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-clinical-500/20 focus:border-clinical-600 transition-all placeholder:text-slate-400"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-700">Sex</label>
            <select
              value={patientSex}
              onChange={(e) => setPatientSex(e.target.value as BiologicalSex)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-clinical-500/20 focus:border-clinical-600 transition-all text-slate-900 font-medium placeholder:text-slate-400"
            >
              <option value="female">Female</option>
              <option value="male">Male</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-700">Body Region</label>
            {!customRegionMode ? (
              <select
                value={bodyRegion}
                onChange={(e) => {
                  if (e.target.value === '__custom__') {
                    setCustomRegionMode(true);
                    setCustomRegionValue('');
                  } else {
                    setBodyRegion(e.target.value);
                  }
                }}
                className="w-full px-3 py-2 text-sm text-slate-900 font-medium rounded-lg border border-slate-200 bg-white hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-clinical-500/20 focus:border-clinical-600 transition-all"
              >
                {availableRegions.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
                <option value="__custom__">✏️  Write / Custom Region…</option>
              </select>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  autoFocus
                  placeholder="Enter custom body region…"
                  value={customRegionValue}
                  onChange={(e) => setCustomRegionValue(e.target.value)}
                  className="flex-1 px-3 py-2 text-sm text-slate-900 font-medium rounded-lg border border-clinical-400 bg-white focus:outline-none focus:ring-2 focus:ring-clinical-500/20 focus:border-clinical-600 transition-all"
                  onKeyDown={async (e) => {
                    if (e.key === 'Enter' && customRegionValue.trim()) {
                      setIsSavingRegion(true);
                      try {
                        const saved = await regionsApi.create(customRegionValue.trim());
                        setAvailableRegions((prev) =>
                          prev.includes(saved) ? prev : [...prev, saved].sort()
                        );
                        setBodyRegion(saved);
                        setCustomRegionMode(false);
                      } catch {
                        toast({ title: 'Failed to save region', variant: 'error' });
                      } finally {
                        setIsSavingRegion(false);
                      }
                    } else if (e.key === 'Escape') {
                      setCustomRegionMode(false);
                    }
                  }}
                />
                <button
                  type="button"
                  disabled={isSavingRegion || !customRegionValue.trim()}
                  onClick={async () => {
                    if (!customRegionValue.trim()) return;
                    setIsSavingRegion(true);
                    try {
                      const saved = await regionsApi.create(customRegionValue.trim());
                      setAvailableRegions((prev) =>
                        prev.includes(saved) ? prev : [...prev, saved].sort()
                      );
                      setBodyRegion(saved);
                      setCustomRegionMode(false);
                    } catch {
                      toast({ title: 'Failed to save region', variant: 'error' });
                    } finally {
                      setIsSavingRegion(false);
                    }
                  }}
                  className="px-3 py-2 text-xs font-semibold rounded-lg bg-clinical-600 text-white hover:bg-clinical-700 disabled:opacity-50 transition-colors"
                >
                  {isSavingRegion ? '…' : 'Save'}
                </button>
                <button
                  type="button"
                  onClick={() => setCustomRegionMode(false)}
                  className="px-3 py-2 text-xs font-semibold rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </CardBody>
      </Card>

      {/* ── Section 2: Patient Condition (Natural-Language & Voice-First) ── */}
      <Card className="border-slate-200 shadow-xs">
        <CardHeader className="pb-3 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity size={17} className="text-clinical-600" />
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                1. Patient Condition Presentation
              </h3>
              <p className="text-xs text-slate-500">
                Describe symptoms, history, functional limits, and exam findings freely
              </p>
            </div>
          </div>
          <Badge variant="clinical" size="sm">
            Voice Dictation Supported
          </Badge>
        </CardHeader>
        <CardBody className="pt-4">
          <VoiceRecorderTextarea
            id="patient-condition"
            label="Clinical Condition Description"
            required
            minRows={7}
            value={conditionText}
            onChange={setConditionText}
            placeholder="Type or click 'Record Voice' to dictate patient condition..."
            exampleText="Patient reports anterior right knee pain for approximately 3 months, around 4/10 in severity at rest, spiking to 7/10 during stair descent and prolonged sitting. Knee flexion is limited to 110 degrees due to tightness. Crepitus noted. No instability or locking reported. Radiography unremarkable for osteoarthritis."
            hint="Describe the condition in your own natural clinical words. Missing factors are safely preserved under the No-Inference principle."
          />
        </CardBody>
      </Card>

      {/* ── Section 3: Doctor Assessment & Treatment Ground Truth ── */}
      <Card className="border-slate-200 shadow-xs">
        <CardHeader className="pb-3 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Stethoscope size={17} className="text-clinical-700" />
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                2. Doctor Assessment & Treatment Plan (Ground Truth)
              </h3>
              <p className="text-xs text-slate-500">
                Your authoritative clinical judgment, exercise prescription, and safety bounds
              </p>
            </div>
          </div>
          <Badge variant="success" size="sm">
            Evaluation Ground Truth
          </Badge>
        </CardHeader>
        <CardBody className="pt-4 space-y-6">
          {/* Assessment */}
          <VoiceRecorderTextarea
            id="doctor-assessment"
            label="Doctor Diagnostic Assessment"
            minRows={4}
            value={assessmentText}
            onChange={setAssessmentText}
            placeholder="Dictate or type your diagnostic reasoning, suspected pathology, and mechanical driver..."
            exampleText="My assessment is that the main issue is functional knee limitation and patellofemoral tracking irritability associated with quadriceps weakness (VMO lag) and reduced hip abductor strength."
          />

          {/* Treatment & Exercises */}
          <VoiceRecorderTextarea
            id="doctor-treatment"
            label="Treatment Plan & Exercise Prescription"
            minRows={5}
            value={treatmentPlanText}
            onChange={setTreatmentPlanText}
            placeholder="Dictate or type recommended exercises, dosage, progressions, and movement precautions..."
            exampleText="Treatment should focus on progressive closed-kinetic chain quadriceps strengthening, terminal knee extensions, wall sits with adductor squeeze, and hip abductor work. Avoid deep squats beyond 60 degrees in initial 2 weeks."
          />

          {/* Key Clinical Priorities / Quick Tags */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                <Tag size={13} className="text-clinical-600" />
                Key Clinical Priorities & Precautions (Optional Ground Truth Anchors)
              </label>
              <span className="text-[11px] text-slate-400">Press enter to add tag</span>
            </div>

            <div className="flex flex-wrap items-center gap-2 p-2.5 rounded-xl border border-slate-200 bg-slate-50/50">
              {priorities.map((p, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-clinical-100 text-clinical-800 border border-clinical-200"
                >
                  {p}
                  <button
                    type="button"
                    onClick={() => removePriority(p)}
                    className="hover:text-danger-dark transition-colors"
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}

              <div className="inline-flex items-center gap-1">
                <input
                  type="text"
                  placeholder="e.g. Avoid squats > 60°..."
                  value={newPriorityInput}
                  onChange={(e) => setNewPriorityInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addPriority();
                    }
                  }}
                  className="px-2 py-1 text-xs bg-white rounded-md border border-slate-200 focus:outline-none focus:ring-1 focus:ring-clinical-500 w-44 placeholder:text-slate-400"
                />
                <button
                  type="button"
                  onClick={addPriority}
                  className="p-1 text-clinical-700 hover:bg-clinical-200 rounded-md transition-colors"
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* ── Bottom Action Row ── */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
        <Button
          variant="outline"
          size="md"
          disabled={isSaving}
          onClick={() => navigate('/doctor/cases')}
        >
          Cancel
        </Button>

        <Button
          variant="secondary"
          size="md"
          disabled={isSaving}
          onClick={() => handleSave(false, true)}
          icon={<Save size={15} />}
        >
          {isSaving ? 'Saving...' : 'Save Case & Ground Truth'}
        </Button>

        <Button
          variant="clinical"
          size="md"
          disabled={isSaving}
          onClick={() => toast({ title: 'Under Construction', description: 'AI Evaluation is currently under construction and will be available soon.', variant: 'warning' })}
          icon={<Lock size={15} />}
        >
          Save & Run AI Evaluation
        </Button>
      </div>
    </div>
  );
}
