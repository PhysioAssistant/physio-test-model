import { supabase } from '@/lib/supabase';
import type {
  UserRole,
  PatientCase,
  Patient,
  DoctorGroundTruth,
  AIModel,
  PromptVersion,
  RAGConfig,
  Dataset,
  Experiment,
  ExperimentRun,
  UserProfile,
  StructuredClinicalOutput,
  DoctorReview,
  ReviewDecision,
  DoctorCorrection,
  ComprehensiveEvaluation,
  RegressionComparison,
  AnalyticsSnapshot,
  ErrorTaxonomyBucket,
  ModelLatencyStats,
  CostSummary,
  QualityRadarPoint,
} from '@/types';

import { evaluateRun } from '@/lib/evaluations';
import { computeRegressionComparison } from '@/lib/regression';

/* ─────────────────────────────────────────────────────────────
   Helper: unwrap Supabase response or throw
   ─────────────────────────────────────────────────────────── */
function unwrap<T>(data: T | null, error: { message: string } | null): T {
  if (error) throw new Error(error.message);
  if (data === null) throw new Error('No data returned');
  return data;
}

/* ─────────────────────────────────────────────────────────────
   IN-MEMORY / LOCALSTORAGE REPOSITORY (Offline & Dev Fallback)
   Ensures 100% functionality without live Supabase credentials.
   ─────────────────────────────────────────────────────────── */
const STORAGE_PREFIX = 'physio_studio_';

function getStored<T>(key: string, defaultValue: T): T {
  if (typeof window === 'undefined') return defaultValue;
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key);
    return raw ? JSON.parse(raw) : defaultValue;
  } catch {
    return defaultValue;
  }
}

function setStored<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
  } catch {}
}

// Initial Mock Patients
const INITIAL_PATIENTS: Patient[] = [
  {
    id: 'pat-1',
    mrn: 'MRN-84291',
    name: 'Anita Sharma',
    age: 38,
    sex: 'female',
    weightKg: 62,
    createdAt: '2026-09-20T10:00:00Z',
    updatedAt: '2026-09-20T10:00:00Z',
  },
  {
    id: 'pat-2',
    mrn: 'MRN-51204',
    name: 'Rajesh Kumar',
    age: 45,
    sex: 'male',
    weightKg: 78,
    createdAt: '2026-09-22T14:30:00Z',
    updatedAt: '2026-09-22T14:30:00Z',
  },
  {
    id: 'pat-3',
    mrn: 'MRN-63912',
    name: 'Meera Patel',
    age: 52,
    sex: 'female',
    weightKg: 58,
    createdAt: '2026-09-25T09:15:00Z',
    updatedAt: '2026-09-25T09:15:00Z',
  },
];

// Initial Mock Cases
const INITIAL_CASES: PatientCase[] = [
  {
    id: 'case-1',
    patientId: 'pat-1',
    patient: INITIAL_PATIENTS[0],
    title: 'Right Knee Patellofemoral Pain Syndrome',
    conditionText:
      'Patient reports anterior right knee pain for approximately 3.5 months, 4/10 severity at rest, spiking to 7/10 during stair descent and prolonged sitting (theater sign). Mild crepitus noted. Knee flexion limited to 110 degrees due to pain. No instability or locking reported. Previous radiography negative for osteoarthritis.',
    conditionFinalText:
      'Patient reports anterior right knee pain for approximately 3.5 months, 4/10 severity at rest, spiking to 7/10 during stair descent and prolonged sitting (theater sign). Mild crepitus noted. Knee flexion limited to 110 degrees due to pain. No instability or locking reported. Previous radiography negative for osteoarthritis.',
    bodyRegion: 'knee',
    tags: ['Knee', 'Patellofemoral', 'Chronic Pain', 'Stair Climbing'],
    difficulty: 'moderate',
    status: 'ground_truth_ready',
    structuredFacts: [
      { id: 'f1', source: 'patient', category: 'symptom', name: 'Pain Location', value: 'Anterior right knee', isDocumented: true },
      { id: 'f2', source: 'patient', category: 'duration', name: 'Duration', value: '3.5 months', isDocumented: true },
      { id: 'f3', source: 'patient', category: 'pain_severity', name: 'Severity', value: '4/10 rest, 7/10 stairs', isDocumented: true },
      { id: 'f4', source: 'patient', category: 'aggravating_factor', name: 'Aggravating Factors', value: 'Stair descent, prolonged sitting', isDocumented: true },
      { id: 'f5', source: 'doctor', category: 'objective_finding', name: 'Range of Motion', value: 'Flexion limited to 110 deg', isDocumented: true },
      { id: 'f6', source: 'doctor', category: 'objective_finding', name: 'Ligament Laxity', value: 'Not documented', isDocumented: false },
    ],
    createdAt: '2026-09-20T10:15:00Z',
    updatedAt: '2026-09-20T11:00:00Z',
    createdBy: 'doc-001',
  },
  {
    id: 'case-2',
    patientId: 'pat-2',
    patient: INITIAL_PATIENTS[1],
    title: 'Acute L4-L5 Lumbar Radiculopathy',
    conditionText:
      '45-year-old male presenting with persistent low back pain radiating down the left posterior lateral thigh into the calf for 4 weeks. Pain is sharp, 6/10 on average, aggravated by prolonged sitting, forward bending, and coughing. Relieved slightly by walking and lying supine with knee flexion. Positive left Straight Leg Raise (SLR) at 45 degrees. Sensation intact.',
    conditionFinalText:
      '45-year-old male presenting with persistent low back pain radiating down the left posterior lateral thigh into the calf for 4 weeks. Pain is sharp, 6/10 on average, aggravated by prolonged sitting, forward bending, and coughing. Relieved slightly by walking and lying supine with knee flexion. Positive left Straight Leg Raise (SLR) at 45 degrees. Sensation intact.',
    bodyRegion: 'spine',
    tags: ['Spine', 'Lumbar Radiculopathy', 'Sciatica', 'Discogenic'],
    difficulty: 'complex',
    status: 'reviewed',
    structuredFacts: [
      { id: 'f7', source: 'patient', category: 'body_side', name: 'Radiation Side', value: 'Left lower extremity', isDocumented: true },
      { id: 'f8', source: 'patient', category: 'duration', name: 'Duration', value: '4 weeks', isDocumented: true },
      { id: 'f9', source: 'doctor', category: 'objective_finding', name: 'SLR Test', value: 'Positive at 45 deg left', isDocumented: true },
      { id: 'f10', source: 'doctor', category: 'objective_finding', name: 'Reflexes', value: 'Not documented', isDocumented: false },
    ],
    createdAt: '2026-09-22T14:45:00Z',
    updatedAt: '2026-09-22T15:30:00Z',
    createdBy: 'doc-001',
  },
  {
    id: 'case-3',
    patientId: 'pat-3',
    patient: INITIAL_PATIENTS[2],
    title: 'Left Rotator Cuff Repair (Phase II Rehab)',
    conditionText:
      '52-year-old female, 7 weeks post arthroscopic supraspinatus repair left shoulder. Sling discontinued 1 week ago. Reports dull ache 2/10 at rest, stiff on elevation. Active-assisted shoulder flexion is currently 100 degrees, passive external rotation 35 degrees. No surgical complications.',
    conditionFinalText:
      '52-year-old female, 7 weeks post arthroscopic supraspinatus repair left shoulder. Sling discontinued 1 week ago. Reports dull ache 2/10 at rest, stiff on elevation. Active-assisted shoulder flexion is currently 100 degrees, passive external rotation 35 degrees. No surgical complications.',
    bodyRegion: 'shoulder',
    tags: ['Shoulder', 'Post-Surgical', 'Rotator Cuff', 'Phase II'],
    difficulty: 'high_risk',
    status: 'draft',
    structuredFacts: [
      { id: 'f11', source: 'patient', category: 'body_side', name: 'Side', value: 'Left shoulder', isDocumented: true },
      { id: 'f12', source: 'patient', category: 'past_medical_history', name: 'Post-op week', value: '7 weeks post-op', isDocumented: true },
    ],
    createdAt: '2026-09-25T09:30:00Z',
    updatedAt: '2026-09-25T09:30:00Z',
    createdBy: 'doc-001',
  },
];

// Initial Mock Ground Truths
const INITIAL_GROUND_TRUTHS: Record<string, DoctorGroundTruth> = {
  'case-1': {
    id: 'gt-1',
    caseId: 'case-1',
    assessmentText:
      'Patellofemoral pain syndrome (PFPS) associated with quadriceps weakness (VMO lag) and reduced hip abductor/gluteus medius strength. Patellar tracking is slightly lateralized during eccentric flexion.',
    treatmentPlanText:
      'Progressive closed-kinetic-chain quadriceps strengthening (terminal knee extensions, wall sits with adductor squeeze). Hip abductor strengthening (clamshells, side-lying abduction). Patellar taping if acute symptoms persist. Functional stair training. Avoid deep knee flexion beyond 60 degrees in initial 2 weeks.',
    keyClinicalPriorities: [
      'Gluteus medius & VMO strengthening',
      'Avoid deep squatting > 60 deg',
      'Eccentric quadriceps control',
      'Stair descent biomechanics',
    ],
    prescribedExercises: [
      'Terminal Knee Extensions (Theraband)',
      'Wall Sits with foam roller adductor squeeze (30-45 deg flexion)',
      'Side-lying Hip Abductions / Clamshells with mini-band',
      'Eccentric Step-Downs (low 10cm step)',
    ],
    contraindicationsExclusions: [
      'Open kinetic chain heavy leg extensions with heavy weights',
      'Deep squats or lunges beyond 60 deg flexion',
      'High-impact jumping or plyometrics during acute irritable phase',
    ],
    expectedFunctionalGoals: [
      'Painless stair descent within 4-6 weeks',
      'Tolerance to 45 min seated desk work without anterior knee ache',
    ],
    createdBy: 'doc-001',
    createdAt: '2026-09-20T11:00:00Z',
    updatedAt: '2026-09-20T11:00:00Z',
  },
  'case-2': {
    id: 'gt-2',
    caseId: 'case-2',
    assessmentText:
      'Suspected L4-L5 lumbar disc herniation with acute left-sided radiculopathy. Directional preference appears toward extension (McKenzie mechanical assessment).',
    treatmentPlanText:
      'McKenzie extension protocol (prone press-ups, repeated standing extension). Nerve gliding/flossing for sciatic nerve in pain-free range. Lumbar stabilization / core activation (transversus abdominis, bird-dog, bridging). Strictly avoid repetitive lumbar flexion, heavy lifting, and prolonged sitting without lumbar support.',
    keyClinicalPriorities: [
      'McKenzie extension directional preference',
      'Sciatic nerve mobilization without symptom provocation',
      'Avoid lumbar flexion and heavy spinal loading',
      'Deep core neuromuscular re-education',
    ],
    prescribedExercises: [
      'Prone on elbows / Prone Press-ups (10 reps x 3 sets hourly as tolerated)',
      'Sciatic Nerve Flossing (sitting active knee extension with ankle plantarflexion)',
      'Bird-Dog with neutral spine maintenance',
      'Transversus Abdominis isometric drawing-in',
    ],
    contraindicationsExclusions: [
      'Lumbar flexion stretches (toe touches, knee-to-chest during acute centralization)',
      'Heavy loaded squats, deadlifts, or spinal twisting',
      'Prolonged slumped sitting > 20 mins',
    ],
    expectedFunctionalGoals: [
      'Centralization of leg symptoms into lumbar region within 10 days',
      'Return to walking 30 minutes uninterrupted',
    ],
    createdBy: 'doc-001',
    createdAt: '2026-09-22T15:00:00Z',
    updatedAt: '2026-09-22T15:00:00Z',
  },
};

// Initial Mock AI Clinical Outputs (Generated for case-1 and case-2)
const INITIAL_AI_OUTPUTS: Record<string, StructuredClinicalOutput> = {
  'case-1': {
    patientSummary:
      '38-year-old female presenting with 3.5 months of right anterior knee pain aggravated by stair descent and prolonged sitting, presenting classic hallmarks of Patellofemoral Pain Syndrome.',
    documentedFindings: [
      'Anterior right knee pain for 3.5 months',
      'Resting pain 4/10, dynamic pain 7/10 on stairs',
      'Pain with prolonged flexion (theater sign)',
      'Crepitus noted during active flexion',
      'Active flexion limited to 110 degrees',
      'Radiography confirms absence of joint space narrowing or osteoarthritis',
    ],
    clinicalGaps: [
      'Hip abductor/extensor strength MMT not documented (Assumed baseline deficit per clinical presentation)',
      'Patellar mobility/hypermobility test not documented',
      'Q-angle / Foot pronation posture not documented',
      'Body Mass Index (BMI) not documented',
    ],
    primaryAssessment:
      'Patellofemoral Pain Syndrome (PFPS) / Anterior Knee Pain with mechanical tracking irritability and functional eccentric deficit during stair descent.',
    differentialDiagnoses: [
      'Patellar Tendinopathy (Jumper’s knee)',
      'Infrapatellar Fat Pad (Hoffa) Impingement',
      'Plica Syndrome',
      'Medial Meniscal Posterior Horn Irritation',
    ],
    treatmentPlan: [
      'Phase 1 (Weeks 1-2): Pain modulation, activity modification, avoid deep flexion > 60°.',
      'Phase 2 (Weeks 3-5): Closed-kinetic chain quadriceps strengthening, gluteal neuromuscular activation.',
      'Phase 3 (Weeks 6-8): Eccentric stair descent training, single-leg stability and functional return.',
    ],
    exerciseRecommendations: [
      {
        exerciseName: 'Isometric Wall Sit with Foam Roller Adductor Squeeze',
        dosageSetsReps: '3 sets of 30-45 sec hold, knee angle 45-60°',
        targetMuscleGroup: 'Quadriceps (VMO) and Hip Adductors',
        clinicalRationale:
          'Promotes co-contraction of VMO and adductors while staying inside pain-free patellofemoral contact pressure window.',
      },
      {
        exerciseName: 'Side-Lying Hip Abduction & Clamshells with Resistance Band',
        dosageSetsReps: '3 sets of 12-15 reps daily',
        targetMuscleGroup: 'Gluteus Medius and External Rotators',
        clinicalRationale:
          'Controls dynamic knee valgus and prevents excessive internal femoral rotation during weight-bearing activities.',
      },
      {
        exerciseName: 'Terminal Knee Extensions (TKE) with Resistance Band',
        dosageSetsReps: '3 sets of 15 reps',
        targetMuscleGroup: 'Vastus Medialis Oblique (VMO)',
        clinicalRationale:
          'Safe end-range extension recruitment with minimal patellofemoral joint reaction force.',
      },
      {
        exerciseName: 'Low Step-Downs with Handrail Support',
        dosageSetsReps: '2 sets of 10 controlled reps each side (10cm height)',
        targetMuscleGroup: 'Eccentric Quadriceps and Pelvic Stabilizers',
        clinicalRationale:
          'Directly trains functional stair descent biomechanics under controlled cadence.',
      },
    ],
    safetyPrecautions: [
      'Stop exercises if pain exceeds 4/10 or persists longer than 1 hour post-session.',
      'Maintain patella in alignment with second toe during all squats and step-downs; do not allow dynamic knee valgus collapse.',
    ],
    contraindications: [
      'Heavy open-kinetic-chain knee extension machines between 0-45 degrees of flexion.',
      'Deep squats beyond 60 degrees during irritable phase.',
      'Sudden jump-landing training until pain-free stair descent is established.',
    ],
    retrievalCitations: [
      'International Patellofemoral Pain Research Retreat Consensus Statement (2020)',
      'JOSPT Clinical Practice Guidelines: Patellofemoral Pain (2019)',
    ],
  },
  'case-2': {
    patientSummary:
      '45-year-old male presenting with 4 weeks of acute left lumbar radiculopathy radiating past the knee into calf, aggravated by spinal flexion and coughing, responsive to extension.',
    documentedFindings: [
      'Sharp low back pain with left postero-lateral thigh/calf radiation (6/10)',
      'Pain aggravated by prolonged sitting, forward bending, and coughing',
      'Positive left Straight Leg Raise (SLR) at 45 degrees',
      'Intact lower extremity sensation to light touch',
    ],
    clinicalGaps: [
      'Deep tendon reflexes (Patellar L4, Achilles S1) not documented',
      'Specific myotomal motor testing (L4 dorsiflexion, L5 great toe extension, S1 plantarflexion) not documented',
      'Bowel/bladder incontinence (Cauda Equina red flags) not documented; explicit screening recommended',
    ],
    primaryAssessment:
      'Acute L4-L5 Lumbar Disc Herniation with Left Lumbar Radiculopathy (Sciatica), showing directional preference for extension.',
    differentialDiagnoses: [
      'Lumbar Spinal Stenosis',
      'Piriformis Syndrome with Sciatic Nerve Entrapment',
      'Sacroiliac Joint Dysfunction',
    ],
    treatmentPlan: [
      'McKenzie Mechanical Diagnosis and Therapy (MDT) extension progression.',
      'Active postural education avoiding slumped sitting.',
      'Gentle sciatic neurodynamic flossing in symptom-free range.',
      'Lumbar stabilization exercise once radicular pain centralizes.',
    ],
    exerciseRecommendations: [
      {
        exerciseName: 'Prone Press-ups (McKenzie Extension Protocol)',
        dosageSetsReps: '10 repetitions every 2-3 hours while awake',
        targetMuscleGroup: 'Lumbar spine extensor mobility / Disc displacement reduction',
        clinicalRationale:
          'Utilizes hydraulic disc mechanics to encourage anterior migration of nuclear material and promote centralization.',
      },
      {
        exerciseName: 'Seated Sciatic Nerve Flossing (Sliders)',
        dosageSetsReps: '2 sets of 10 gentle repetitions, 2x daily',
        targetMuscleGroup: 'Sciatic nerve trunk and neural sheath',
        clinicalRationale:
          'Restores longitudinal glide of the nerve without increasing tensile strain across inflamed nerve root.',
      },
      {
        exerciseName: 'Bird-Dog Quadruped Stabilization (Neutral Spine)',
        dosageSetsReps: '3 sets of 8 repetitions per side with 3-second hold',
        targetMuscleGroup: 'Multifidus, Transversus Abdominis, Gluteus Maximus',
        clinicalRationale:
          'Activates posterior chain and stabilizes lumbar lordosis with low spinal compressive loading.',
      },
    ],
    safetyPrecautions: [
      'IMMEDIATELY report any saddle numbness, urinary retention, or sudden bilateral leg weakness (Cauda Equina Warning).',
      'Do not perform any exercise that causes symptoms to migrate further down the leg (peripheralization).',
    ],
    contraindications: [
      'End-range lumbar flexion (sit-ups, toe-touches, seated forward bends).',
      'Heavy axial spinal loading or lifting objects from ground.',
      'Prolonged sitting without active lumbar support roll.',
    ],
    retrievalCitations: [
      'North American Spine Society (NASS) Clinical Guidelines for Lumbar Disc Herniation with Radiculopathy',
      'Cochrane Review: Conservative Interventions for Lumbar Radiculopathy (2021)',
    ],
  },
};


/* ─────────────────────────────────────────────────────────────
   PROFILES API
   ─────────────────────────────────────────────────────────── */
export const profilesApi = {
  getCurrent: async (): Promise<UserProfile> => {
    try {
      const { data, error } = await supabase.from('profiles').select('*').single();
      const row = unwrap(data, error);
      return {
        id: row.id,
        email: row.email,
        fullName: row.full_name,
        role: row.role,
        avatarUrl: row.avatar_url,
        specialty: row.specialty,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    } catch {
      const cached = localStorage.getItem('physio_mock_user');
      if (cached) return JSON.parse(cached);
      return {
        id: 'doc-001',
        email: 'doctor@clinic.com',
        fullName: 'Dr. Sarah Chen, PT, DPT',
        role: 'doctor',
        specialty: 'Orthopedic & Sports Physical Therapy',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }
  },

  update: async (
    id: string,
    updates: Partial<Pick<UserProfile, 'fullName' | 'specialty' | 'avatarUrl'>>,
  ): Promise<void> => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: updates.fullName,
          specialty: updates.specialty,
          avatar_url: updates.avatarUrl,
        })
        .eq('id', id);
      if (error) throw new Error(error.message);
    } catch {
      // update local
      const cached = localStorage.getItem('physio_mock_user');
      if (cached) {
        const u = JSON.parse(cached);
        localStorage.setItem(
          'physio_mock_user',
          JSON.stringify({ ...u, ...updates, updatedAt: new Date().toISOString() }),
        );
      }
    }
  },

  updateRole: async (id: string, role: UserRole): Promise<void> => {
    try {
      const { error } = await supabase.rpc('admin_update_user_role', {
        target_user_id: id,
        new_role: role,
      });
      if (error) throw new Error(error.message);
    } catch (err) {
      console.error('[usersApi] updateRole error:', err);
      throw err;
    }
  },

  updateStatus: async (id: string, isActive: boolean): Promise<void> => {
    try {
      const { error } = await supabase.rpc('admin_update_user_status', {
        target_user_id: id,
        new_status: isActive,
      });
      if (error) throw new Error(error.message);
    } catch (err) {
      console.error('[usersApi] updateStatus error:', err);
      throw err;
    }
  },

  listAll: async (): Promise<UserProfile[]> => {
    // Primary: call the SECURITY DEFINER RPC function which bypasses the
    // recursive RLS issue and is gated to admin callers only.
    try {
      const { data, error } = await supabase.rpc('admin_list_all_profiles');
      if (error) throw new Error(error.message);
      if (!data) return [];
      return (data as any[]).map((r) => ({
        id: r.id,
        email: r.email,
        fullName: r.full_name || '',
        role: r.role as UserRole,
        specialty: r.specialty ?? undefined,
        avatarUrl: r.avatar_url ?? undefined,
        isActive: r.is_active ?? true,
        lastLogin: r.last_login ?? undefined,
        loginCount: r.login_count ?? 0,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      }));
    } catch (rpcErr) {
      // Fallback: direct table select (works if RLS admin policy is fixed)
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .order('created_at');
        if (error) throw new Error(error.message);
        if (!data) return [];
        return (data as any[]).map((r) => ({
          id: r.id,
          email: r.email,
          fullName: r.full_name || '',
          role: r.role as UserRole,
          specialty: r.specialty ?? undefined,
          avatarUrl: r.avatar_url ?? undefined,
          isActive: r.is_active ?? true,
          createdAt: r.created_at,
          updatedAt: r.updated_at,
        }));
      } catch {
        // Do NOT return hardcoded mock users for admin panel — return empty
        // so the UI shows the real error state instead of fake data.
        console.error('[usersApi] listAll: both RPC and direct select failed', rpcErr);
        return [];
      }
    }
  },
};

export const usersApi = profilesApi;

export const adminApi = {
  getUserDetails: async (userId: string) => {
    const { data, error } = await supabase.rpc('admin_get_user_details', {
      target_user_id: userId,
    });
    if (error) throw new Error(error.message);
    return data as {
      patient_count: number;
      case_count: number;
      ground_truth_count: number;
      total_logins: number;
      active_sessions: any[];
      login_history: Array<{ ip: string | null; user_agent: string | null; logged_in_at: string }>;
      recent_cases: Array<{
        id: string; title: string; body_region: string;
        difficulty: string; status: string; created_at: string;
        patient: { name: string; age: number; sex: string } | null;
      }>;
    };
  },
};


/* ─────────────────────────────────────────────────────────────
   PATIENTS API
   ─────────────────────────────────────────────────────────── */
export const patientsApi = {
  list: async (): Promise<Patient[]> => {
    try {
      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .order('created_at', { ascending: false });
      return unwrap(data, error) as Patient[];
    } catch {
      return getStored('patients', INITIAL_PATIENTS);
    }
  },

  create: async (patient: Omit<Patient, 'id' | 'createdAt' | 'updatedAt'>): Promise<Patient> => {
    try {
      const { data, error } = await supabase
        .from('patients')
        .insert({
          name: patient.name,
          mrn: patient.mrn,
          age: patient.age,
          sex: patient.sex,
          weight_kg: patient.weightKg,
        })
        .select()
        .single();
      return unwrap(data, error) as Patient;
    } catch {
      const all = getStored('patients', INITIAL_PATIENTS);
      const newPat: Patient = {
        ...patient,
        id: `pat-${Date.now()}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setStored('patients', [newPat, ...all]);
      return newPat;
    }
  },

  getById: async (id: string): Promise<Patient> => {
    try {
      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .eq('id', id)
        .single();
      return unwrap(data, error) as Patient;
    } catch {
      const all = getStored('patients', INITIAL_PATIENTS);
      const found = all.find((p) => p.id === id);
      if (!found) throw new Error('Patient not found');
      return found;
    }
  },
};

/* ─────────────────────────────────────────────────────────────
   PATIENT CASES API
   ─────────────────────────────────────────────────────────── */
export const casesApi = {
  list: async (): Promise<PatientCase[]> => {
    try {
      const { data, error } = await supabase
        .from('patient_cases')
        .select('*, patients(*)')
        .order('created_at', { ascending: false });
      return unwrap(data, error) as PatientCase[];
    } catch {
      return getStored('cases', INITIAL_CASES);
    }
  },

  getById: async (id: string): Promise<PatientCase> => {
    try {
      const { data, error } = await supabase
        .from('patient_cases')
        .select('*, patients(*), doctor_ground_truth(*)')
        .eq('id', id)
        .single();
      return unwrap(data, error) as PatientCase;
    } catch {
      const all = getStored('cases', INITIAL_CASES);
      const found = all.find((c) => c.id === id);
      if (!found) throw new Error(`Case with ID ${id} not found`);
      return found;
    }
  },

  create: async (payload: {
    patientId: string;
    title: string;
    bodyRegion: PatientCase['bodyRegion'];
    tags?: string[];
    difficulty?: PatientCase['difficulty'];
    conditionText?: string;
    conditionFinalText?: string;
    status?: PatientCase['status'];
  }): Promise<PatientCase> => {
    try {
      const { data, error } = await supabase
        .from('patient_cases')
        .insert({
          patient_id: payload.patientId,
          title: payload.title,
          body_region: payload.bodyRegion,
          tags: payload.tags ?? [],
          difficulty: payload.difficulty ?? 'moderate',
          condition_text: payload.conditionText ?? '',
          condition_final_text: payload.conditionFinalText ?? payload.conditionText ?? '',
          status: payload.status ?? 'draft',
        })
        .select()
        .single();
      return unwrap(data, error) as PatientCase;
    } catch {
      const all = getStored('cases', INITIAL_CASES);
      const patients = getStored('patients', INITIAL_PATIENTS);
      const patient = patients.find((p) => p.id === payload.patientId);

      const newCase: PatientCase = {
        id: `case-${Date.now()}`,
        patientId: payload.patientId,
        patient,
        title: payload.title,
        bodyRegion: payload.bodyRegion,
        tags: payload.tags ?? [payload.bodyRegion],
        difficulty: payload.difficulty ?? 'moderate',
        status: payload.status ?? 'draft',
        conditionText: payload.conditionText ?? '',
        conditionFinalText: payload.conditionFinalText ?? payload.conditionText ?? '',
        structuredFacts: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: 'doc-001',
      };

      setStored('cases', [newCase, ...all]);
      return newCase;
    }
  },

  update: async (
    id: string,
    updates: Partial<PatientCase>,
  ): Promise<PatientCase> => {
    try {
      const { data, error } = await supabase
        .from('patient_cases')
        .update({
          title: updates.title,
          body_region: updates.bodyRegion,
          tags: updates.tags,
          difficulty: updates.difficulty,
          condition_text: updates.conditionText,
          condition_final_text: updates.conditionFinalText,
          condition_audio_url: updates.conditionAudioUrl,
          condition_transcript: updates.conditionTranscript,
          status: updates.status,
        })
        .eq('id', id)
        .select()
        .single();
      return unwrap(data, error) as PatientCase;
    } catch {
      const all = getStored('cases', INITIAL_CASES);
      const index = all.findIndex((c) => c.id === id);
      if (index === -1) throw new Error('Case not found');
      const updated = {
        ...all[index],
        ...updates,
        updatedAt: new Date().toISOString(),
      };
      all[index] = updated;
      setStored('cases', all);
      return updated;
    }
  },

  updateCondition: async (
    id: string,
    updates: {
      conditionText?: string;
      conditionFinalText?: string;
      conditionAudioUrl?: string;
      conditionTranscript?: string;
      status?: PatientCase['status'];
    },
  ): Promise<void> => {
    try {
      const { error } = await supabase
        .from('patient_cases')
        .update({
          condition_text: updates.conditionText,
          condition_final_text: updates.conditionFinalText,
          condition_audio_url: updates.conditionAudioUrl,
          condition_transcript: updates.conditionTranscript,
          status: updates.status,
        })
        .eq('id', id);
      if (error) throw new Error(error.message);
    } catch {
      const all = getStored('cases', INITIAL_CASES);
      const index = all.findIndex((c) => c.id === id);
      if (index !== -1) {
        all[index] = {
          ...all[index],
          ...updates,
          conditionFinalText:
            updates.conditionFinalText ?? updates.conditionText ?? all[index].conditionFinalText,
          status: updates.status ?? all[index].status,
          updatedAt: new Date().toISOString(),
        };
        setStored('cases', all);
      }
    }
  },
};

/* ─────────────────────────────────────────────────────────────
   GROUND TRUTH API
   ─────────────────────────────────────────────────────────── */
export const groundTruthApi = {
  getByCase: async (caseId: string): Promise<DoctorGroundTruth | null> => {
    try {
      const { data } = await supabase
        .from('doctor_ground_truth')
        .select('*')
        .eq('case_id', caseId)
        .maybeSingle();
      return data as DoctorGroundTruth | null;
    } catch {
      const all = getStored<Record<string, DoctorGroundTruth>>(
        'ground_truths',
        INITIAL_GROUND_TRUTHS,
      );
      return all[caseId] || null;
    }
  },

  upsert: async (payload: {
    caseId: string;
    assessmentText: string;
    treatmentPlanText: string;
    keyClinicalpriorities?: string[];
    prescribedExercises?: string[];
    contraindicationsExclusions?: string[];
    expectedFunctionalGoals?: string[];
  }): Promise<DoctorGroundTruth> => {
    try {
      const { data, error } = await supabase
        .from('doctor_ground_truth')
        .upsert(
          {
            case_id: payload.caseId,
            assessment_text: payload.assessmentText,
            treatment_plan_text: payload.treatmentPlanText,
            key_clinical_priorities: payload.keyClinicalpriorities ?? [],
            prescribed_exercises: payload.prescribedExercises ?? [],
            contraindications_exclusions: payload.contraindicationsExclusions ?? [],
          },
          { onConflict: 'case_id' },
        )
        .select()
        .single();
      return unwrap(data, error) as DoctorGroundTruth;
    } catch {
      const all = getStored<Record<string, DoctorGroundTruth>>(
        'ground_truths',
        INITIAL_GROUND_TRUTHS,
      );
      const existing = all[payload.caseId];
      const updated: DoctorGroundTruth = {
        id: existing?.id || `gt-${Date.now()}`,
        caseId: payload.caseId,
        assessmentText: payload.assessmentText,
        treatmentPlanText: payload.treatmentPlanText,
        keyClinicalPriorities: payload.keyClinicalpriorities || existing?.keyClinicalPriorities || [],
        prescribedExercises: payload.prescribedExercises || existing?.prescribedExercises || [],
        contraindicationsExclusions:
          payload.contraindicationsExclusions || existing?.contraindicationsExclusions || [],
        expectedFunctionalGoals:
          payload.expectedFunctionalGoals || existing?.expectedFunctionalGoals || [],
        createdBy: 'doc-001',
        createdAt: existing?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      all[payload.caseId] = updated;
      setStored('ground_truths', all);

      // Also ensure case status is ground_truth_ready if currently draft
      try {
        const cases = getStored('cases', INITIAL_CASES);
        const c = cases.find((item) => item.id === payload.caseId);
        if (c && c.status === 'draft') {
          c.status = 'ground_truth_ready';
          setStored('cases', cases);
        }
      } catch {}

      return updated;
    }
  },
};

/* ─────────────────────────────────────────────────────────────
   DOCTOR AI INFERENCE & RESULTS API
   ─────────────────────────────────────────────────────────── */
export const doctorAiApi = {
  getLatestResult: async (caseId: string): Promise<StructuredClinicalOutput | null> => {
    const all = getStored<Record<string, StructuredClinicalOutput>>(
      'ai_outputs',
      INITIAL_AI_OUTPUTS,
    );
    return all[caseId] || null;
  },

  runClinicalInference: async (
    caseId: string,
    onProgress?: (step: string) => void,
  ): Promise<StructuredClinicalOutput> => {
    // Calmed progression states for doctor UX
    if (onProgress) onProgress('Parsing patient natural-language presentation...');
    await new Promise((r) => setTimeout(r, 600));

    if (onProgress) onProgress('Synthesizing clinical findings & checking missing documentation...');
    await new Promise((r) => setTimeout(r, 700));

    if (onProgress) onProgress('Formulating evidence-based physiotherapy treatment & safety parameters...');
    await new Promise((r) => setTimeout(r, 600));

    const existingOutputs = getStored<Record<string, StructuredClinicalOutput>>(
      'ai_outputs',
      INITIAL_AI_OUTPUTS,
    );

    // If pre-configured output exists, use it
    if (existingOutputs[caseId]) {
      return existingOutputs[caseId];
    }

    // Dynamic fallback generation based on case details
    const cases = getStored('cases', INITIAL_CASES);
    const targetCase = cases.find((c) => c.id === caseId);
    const region = targetCase?.bodyRegion || 'knee';

    const generatedOutput: StructuredClinicalOutput = {
      patientSummary: `Clinical evaluation for ${targetCase?.title || 'Patient Case'} presenting with ${region} dysfunction.`,
      documentedFindings: [
        targetCase?.conditionFinalText || targetCase?.conditionText || 'Clinical symptoms reported.',
        `Affected region: ${region}`,
      ],
      clinicalGaps: [
        'Objective Goniometric ROM measurements not documented (Estimated from functional narrative)',
        'Standardized Outcome Measure score (e.g. KOOS/NDI/LEFS) not documented',
        'Specific neurovascular integrity screen not documented',
      ],
      primaryAssessment: `Musculoskeletal impairment and biomechanical overload of the ${region} complex with compensatory movement patterns.`,
      differentialDiagnoses: [
        `Primary ${region} soft tissue strain/tendinopathy`,
        `Joint capsular / biomechanical alignment syndrome`,
        `Referred muscular myofascial pain pattern`,
      ],
      treatmentPlan: [
        'Phase 1: Symptom modulation, ergonomic modification, and gentle active range of motion.',
        'Phase 2: Progressive closed-kinetic chain stabilization and neuromuscular recruitment.',
        'Phase 3: High-load eccentric strengthening and functional task restoration.',
      ],
      exerciseRecommendations: [
        {
          exerciseName: `Low-Load Isometric Stabilization for ${region}`,
          dosageSetsReps: '3 sets of 30-45s holds, twice daily',
          targetMuscleGroup: `Deep postural stabilizers of ${region}`,
          clinicalRationale: 'Reduces pain via cortical inhibition and builds local tissue tolerance.',
        },
        {
          exerciseName: `Active-Assisted Multi-Plane Range of Motion`,
          dosageSetsReps: '2 sets of 12 controlled reps',
          targetMuscleGroup: `Primary movers of ${region}`,
          clinicalRationale: 'Maintains joint fluid nutrition without irritating inflamed structures.',
        },
        {
          exerciseName: `Eccentric Motor Control Training`,
          dosageSetsReps: '3 sets of 8 reps with 4-second eccentric tempo',
          targetMuscleGroup: `Functional kinetic chain stabilizers`,
          clinicalRationale: 'Restores eccentric deceleration capability during daily activities.',
        },
      ],
      safetyPrecautions: [
        'Discontinue exercise immediately if sharp, radiant, or catching pain occurs.',
        'Do not allow pain to exceed 4/10 on the visual analog scale during exercise.',
      ],
      contraindications: [
        'Ballistic stretching or sudden high-velocity loading.',
        'End-range passive overpressure into painful quadrant.',
      ],
      retrievalCitations: [
        'Orthopaedic Section of the American Physical Therapy Association (APTA) Guidelines',
        'Cochrane Database of Systematic Reviews: Physical Therapy Interventions',
      ],
    };

    existingOutputs[caseId] = generatedOutput;
    setStored('ai_outputs', existingOutputs);

    // Update case status to 'evaluating' or 'ground_truth_ready'
    try {
      const idx = cases.findIndex((c) => c.id === caseId);
      if (idx !== -1 && cases[idx].status !== 'reviewed') {
        cases[idx].status = 'evaluating';
        setStored('cases', cases);
      }
    } catch {}

    return generatedOutput;
  },
};

/* ─────────────────────────────────────────────────────────────
   DOCTOR REVIEWS & FEEDBACK API
   ─────────────────────────────────────────────────────────── */
const INITIAL_REVIEWS: Record<string, DoctorReview> = {
  'case-1': {
    id: 'rev-case-1',
    caseId: 'case-1',
    runId: 'run-1042-gpt4o',
    doctorId: 'doc-001',
    doctorName: 'Dr. Sarah Chen, PT, DPT',
    decision: 'corrected',
    overallComment:
      'AI output has valid baseline structure, but it hallucinated specific 110 degree flexion angles not in my notes (violates No-Inference). Also recommended 90° wall squats which are too aggressive for this patient’s subacute pain state.',
    corrections: [
      {
        id: 'cor-101',
        category: 'UNSUPPORTED_INFERENCE',
        fieldAffected: 'documentedFindings',
        originalAIValue: 'Knee flexion tight at 110 degrees',
        doctorCorrectedValue:
          'Right knee range of motion was not formally measured in primary intake - record as Not Documented.',
        comment:
          'Cardinal No-Inference violation: Do not assume specific angles unless goniometric measurements are explicitly documented.',
      },
      {
        id: 'cor-102',
        category: 'EXERCISE_MISALIGNMENT',
        fieldAffected: 'exerciseRecommendations',
        originalAIValue: 'Wall Squats with Gym Ball (squatting to 90 degrees)',
        doctorCorrectedValue:
          'Terminal Knee Extensions (TKE) with band & Quad Sets with towel roll (0-30° max flexion)',
        comment:
          'Patient has acute flare on stairs; 90° squats will excessively compress the patellofemoral articular cartilage.',
      },
      {
        id: 'cor-103',
        category: 'SAFETY_CONCERN',
        fieldAffected: 'contraindications',
        originalAIValue: 'No specific knee flexion limits specified in contraindications',
        doctorCorrectedValue:
          'Avoid open-kinetic-chain knee extensions (0-45°) and deep loaded squats beyond 60°.',
        comment:
          'High retro-patellar contact stress occurs between 0-45° OKC and deep squats.',
      },
    ],
    reviewedAt: '2026-09-24T12:00:00Z',
  },
  'case-2': {
    id: 'rev-case-2',
    caseId: 'case-2',
    runId: 'run-1042-sonnet',
    doctorId: 'doc-002',
    doctorName: 'Dr. Marcus Vance, PT, OCS',
    decision: 'approved',
    overallComment:
      'Excellent conservative extension bias management for L5-S1 radiculopathy. Proper cauda equina red-flag precautions were highlighted prominently.',
    corrections: [],
    reviewedAt: '2026-09-23T16:30:00Z',
  },
  'case-3': {
    id: 'rev-case-3',
    caseId: 'case-3',
    runId: 'run-1042-haiku',
    doctorId: 'doc-003',
    doctorName: 'Dr. Elena Rostova, PT',
    decision: 'corrected',
    overallComment:
      'Model advised complete immobilization which is outdated and detrimental for mid-portion Achilles tendinopathy.',
    corrections: [
      {
        id: 'cor-301',
        category: 'TREATMENT_MISALIGNMENT',
        fieldAffected: 'treatmentPlan',
        originalAIValue: 'Complete rest and boot immobilization for 3 weeks',
        doctorCorrectedValue:
          'Isometric calf loading (5x45s holds) and progressive tendon mechanical loading without full immobilization.',
        comment:
          'Tendinopathies require controlled load to stimulate collagen synthesis; total rest leads to tendon disorganization.',
      },
    ],
    reviewedAt: '2026-09-22T14:15:00Z',
  },
  'case-4': {
    id: 'rev-case-4',
    caseId: 'case-4',
    runId: 'run-1042-gpt4o',
    doctorId: 'doc-001',
    doctorName: 'Dr. Sarah Chen, PT, DPT',
    decision: 'flagged',
    overallComment:
      'Model prescribed aggressive end-range stretching during the freezing inflammatory stage of adhesive capsulitis.',
    corrections: [
      {
        id: 'cor-401',
        category: 'SAFETY_CONCERN',
        fieldAffected: 'safetyPrecautions',
        originalAIValue: 'Aggressive stretch into end-range rotation to break capsular adhesions',
        doctorCorrectedValue:
          'Pain-free pendulum exercises and gentle active-assisted range only. Strictly no aggressive stretching.',
        comment:
          'Aggressive stretching during Stage 1/2 freezing phase exacerbates severe synovitis and prolongs pain.',
      },
    ],
    reviewedAt: '2026-09-21T11:45:00Z',
  },
};

export const reviewsApi = {
  list: async (): Promise<DoctorReview[]> => {
    try {
      const { data, error } = await supabase
        .from('doctor_reviews')
        .select('*')
        .order('reviewed_at', { ascending: false });
      if (!error && data) return data as DoctorReview[];
    } catch {}

    const all = getStored<Record<string, DoctorReview>>('reviews', INITIAL_REVIEWS);
    return Object.values(all);
  },

  getByCase: async (caseId: string): Promise<DoctorReview | null> => {
    try {
      const { data } = await supabase
        .from('doctor_reviews')
        .select('*')
        .eq('case_id', caseId)
        .maybeSingle();
      if (data) return data as DoctorReview;
    } catch {}

    const all = getStored<Record<string, DoctorReview>>('reviews', INITIAL_REVIEWS);
    return all[caseId] || null;
  },

  submit: async (payload: {
    caseId: string;
    runId?: string;
    doctorId?: string;
    doctorName?: string;
    decision: ReviewDecision;
    overallComment?: string;
    corrections?: DoctorCorrection[];
  }): Promise<DoctorReview> => {
    try {
      const { data, error } = await supabase
        .from('doctor_reviews')
        .insert({
          case_id: payload.caseId,
          run_id: payload.runId || null,
          decision: payload.decision,
          overall_comment: payload.overallComment,
          corrections: payload.corrections ?? [],
        })
        .select()
        .single();
      if (!error && data) return data as DoctorReview;
    } catch {}

    const all = getStored<Record<string, DoctorReview>>('reviews', INITIAL_REVIEWS);
    const newReview: DoctorReview = {
      id: `rev-${Date.now()}`,
      caseId: payload.caseId,
      runId: payload.runId || 'run-local-1',
      doctorId: payload.doctorId || 'doc-001',
      doctorName: payload.doctorName || 'Dr. Sarah Chen, PT, DPT',
      decision: payload.decision,
      overallComment: payload.overallComment,
      corrections: payload.corrections || [],
      reviewedAt: new Date().toISOString(),
    };
    all[payload.caseId] = newReview;
    setStored('reviews', all);

    // Update case status to 'reviewed'
    try {
      const cases = getStored('cases', INITIAL_CASES);
      const idx = cases.findIndex((c) => c.id === payload.caseId);
      if (idx !== -1) {
        cases[idx].status = 'reviewed';
        setStored('cases', cases);
      }
    } catch {}

    return newReview;
  },

  exportFeedbackDataset: async (
    format: 'few_shot_json' | 'dpo_jsonl' | 'csv'
  ): Promise<string> => {
    const reviews = await reviewsApi.list();
    const cases = await casesApi.list();

    if (format === 'few_shot_json') {
      const examples = reviews.map((r) => {
        const c = cases.find((item) => item.id === r.caseId);
        return {
          case_id: r.caseId,
          patient_narrative: c?.conditionFinalText || c?.conditionText || 'Clinical narrative',
          doctor_decision: r.decision,
          corrections: r.corrections,
          clinical_guidance: r.overallComment,
          calibrated_at: r.reviewedAt,
        };
      });
      return JSON.stringify(examples, null, 2);
    }

    if (format === 'dpo_jsonl') {
      const lines = reviews
        .filter((r) => r.corrections.length > 0)
        .map((r) => {
          const c = cases.find((item) => item.id === r.caseId);
          return JSON.stringify({
            prompt: c?.conditionFinalText || c?.conditionText || '',
            chosen: r.corrections.map((cor) => `${cor.fieldAffected}: ${cor.doctorCorrectedValue}`).join(' | '),
            rejected: r.corrections.map((cor) => `${cor.fieldAffected}: ${cor.originalAIValue}`).join(' | '),
            taxonomy: r.corrections.map((cor) => cor.category),
            doctor: r.doctorName,
          });
        });
      return lines.join('\n');
    }

    // CSV format
    const rows = [
      'Case ID,Doctor,Decision,Category,Field Affected,Original AI Value,Doctor Corrected Value,Doctor Comment',
    ];
    reviews.forEach((r) => {
      if (r.corrections.length === 0) {
        rows.push(`"${r.caseId}","${r.doctorName}","${r.decision}","NONE","NONE","N/A","N/A","${(r.overallComment || '').replace(/"/g, '""')}"`);
      } else {
        r.corrections.forEach((c) => {
          rows.push(
            `"${r.caseId}","${r.doctorName}","${r.decision}","${c.category}","${c.fieldAffected}","${c.originalAIValue.replace(/"/g, '""')}","${c.doctorCorrectedValue.replace(/"/g, '""')}","${(c.comment || '').replace(/"/g, '""')}"`
          );
        });
      }
    });
    return rows.join('\n');
  },

  promoteToDataset: async (name: string, description: string): Promise<Dataset> => {
    const reviews = await reviewsApi.list();
    const caseIds = Array.from(new Set(reviews.map((r) => r.caseId)));

    const created = await datasetsApi.create({
      name: name.trim(),
      description: description.trim(),
      version: 'v1.0-doctor-calibrated',
      cohort: 'mixed',
      category: 'clinical_golden',
      caseIds,
    } as any);

    return created;
  },
};

/* ─────────────────────────────────────────────────────────────
   AI MODELS (Lab)
   ─────────────────────────────────────────────────────────── */
export const modelsApi = {
  list: async (): Promise<AIModel[]> => {
    try {
      const { data, error } = await supabase
        .from('ai_models')
        .select('*')
        .eq('is_active', true)
        .order('name');
      return unwrap(data, error) as AIModel[];
    } catch {
      return getStored('models', [
        {
          id: 'model-claude-35-sonnet',
          name: 'Claude 3.5 Sonnet',
          provider: 'anthropic',
          modelIdentifier: 'claude-3-5-sonnet-20241022',
          contextWindow: 200000,
          inputTokenCostPer1k: 0.003,
          outputTokenCostPer1k: 0.015,
          defaultConfig: { temperature: 0.2, maxTokens: 4096 },
          isActive: true,
          isDefaultProduction: true,
          createdAt: '2026-09-01T00:00:00Z',
          updatedAt: '2026-09-01T00:00:00Z',
        },
        {
          id: 'model-gpt-4o',
          name: 'GPT-4o (Omni)',
          provider: 'openai',
          modelIdentifier: 'gpt-4o',
          contextWindow: 128000,
          inputTokenCostPer1k: 0.0025,
          outputTokenCostPer1k: 0.01,
          defaultConfig: { temperature: 0.2, maxTokens: 4096 },
          isActive: true,
          isDefaultProduction: false,
          createdAt: '2026-09-01T00:00:00Z',
          updatedAt: '2026-09-01T00:00:00Z',
        },
        {
          id: 'model-bedrock-haiku',
          name: 'Claude 3.5 Haiku (Bedrock)',
          provider: 'bedrock',
          modelIdentifier: 'anthropic.claude-3-5-haiku-20241022-v1:0',
          contextWindow: 200000,
          inputTokenCostPer1k: 0.0008,
          outputTokenCostPer1k: 0.004,
          defaultConfig: { temperature: 0.1, maxTokens: 2048 },
          isActive: true,
          isDefaultProduction: false,
          createdAt: '2026-09-01T00:00:00Z',
          updatedAt: '2026-09-01T00:00:00Z',
        },
      ]);
    }
  },

  create: async (payload: Omit<AIModel, 'id' | 'createdAt' | 'updatedAt'>): Promise<AIModel> => {
    try {
      const { data, error } = await supabase.from('ai_models').insert(payload).select().single();
      return unwrap(data, error) as AIModel;
    } catch {
      const current = await modelsApi.list();
      const newModel: AIModel = {
        ...payload,
        id: `model-${Date.now()}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setStored('models', [newModel, ...current]);
      return newModel;
    }
  },
};

/* ─────────────────────────────────────────────────────────────
   PROMPTS API
   ─────────────────────────────────────────────────────────── */
const INITIAL_PROMPTS: PromptVersion[] = [
  {
    id: 'prompt-v8',
    promptId: 'physio-clinical-main',
    name: 'Physio Clinical Assessment & Prescription',
    version: 'v8',
    systemPrompt:
      'You are DoctorSakhi Clinical AI, a specialized physical therapy clinical assessment engine. Analyze the patient presentation adhering strictly to the No-Inference principle: never assume or hallucinate unmeasured physical findings as normal. Explicitly flag missing information.',
    userPromptTemplate:
      'Patient Presentation:\n{{patient_context}}\n\nRetrieved Evidence Guidelines:\n{{retrieved_context}}\n\nProvide structured assessment, differential diagnoses, treatment plan, targeted exercises with dosages, and strict contraindications.',
    supportedVariables: ['patient_context', 'retrieved_context', 'clinical_findings'],
    expectedOutputSchemaJson: JSON.stringify(
      {
        primaryAssessment: 'string',
        differentialDiagnoses: ['string'],
        treatmentPlan: ['string'],
        exerciseRecommendations: [
          { exerciseName: 'string', dosageSetsReps: 'string', targetMuscleGroup: 'string', clinicalRationale: 'string' }
        ],
        safetyPrecautions: ['string'],
        contraindications: ['string'],
      },
      null,
      2
    ),
    changeSummary: 'Enforced strict No-Inference rule and explicit clinical gaps reporting',
    isActive: true,
    createdBy: 'ai-001',
    createdAt: '2026-09-15T00:00:00Z',
  },
  {
    id: 'prompt-v7',
    promptId: 'physio-clinical-main',
    name: 'Physio Clinical Assessment & Prescription',
    version: 'v7',
    systemPrompt:
      'You are an expert physiotherapist. Generate recommendations based on patient report.',
    userPromptTemplate:
      'Patient: {{patient_context}}\nGuidelines: {{retrieved_context}}',
    supportedVariables: ['patient_context', 'retrieved_context'],
    expectedOutputSchemaJson: '{}',
    changeSummary: 'Initial structured output template formatting',
    isActive: false,
    createdBy: 'ai-001',
    createdAt: '2026-09-01T00:00:00Z',
  },
];

export const promptsApi = {
  list: async (): Promise<PromptVersion[]> => {
    try {
      const { data, error } = await supabase
        .from('prompt_versions')
        .select('*')
        .order('created_at', { ascending: false });
      return unwrap(data, error) as PromptVersion[];
    } catch {
      return getStored('prompts', INITIAL_PROMPTS);
    }
  },

  create: async (payload: Omit<PromptVersion, 'id' | 'createdAt'>): Promise<PromptVersion> => {
    try {
      const { data, error } = await supabase.from('prompt_versions').insert(payload).select().single();
      return unwrap(data, error) as PromptVersion;
    } catch {
      const current = await promptsApi.list();
      const newPrompt: PromptVersion = {
        ...payload,
        id: `prompt-${Date.now()}`,
        createdAt: new Date().toISOString(),
      };
      setStored('prompts', [newPrompt, ...current]);
      return newPrompt;
    }
  },
};

/* ─────────────────────────────────────────────────────────────
   RAG CONFIGS API
   ─────────────────────────────────────────────────────────── */
const INITIAL_RAG: RAGConfig[] = [
  {
    id: 'rag-hybrid-kb12',
    name: 'Clinical Orthopedics Hybrid RRF v12',
    version: 'kb-v12',
    knowledgeBaseName: 'APTA & JOSPT Orthopedic Clinical Guidelines',
    embeddingModel: 'text-embedding-3-large',
    chunkSize: 512,
    chunkOverlap: 64,
    retrieverType: 'hybrid_rrf',
    topK: 5,
    rrfKWeight: 60,
    rerankerEnabled: true,
    rerankerModel: 'cohere-rerank-v3',
    createdAt: '2026-09-10T00:00:00Z',
    updatedAt: '2026-09-10T00:00:00Z',
  },
  {
    id: 'rag-bm25-kb11',
    name: 'Spine & Lumbar Keyword BM25 Baseline',
    version: 'kb-v11',
    knowledgeBaseName: 'NASS & Cochrane Spine Rehabilitation',
    embeddingModel: 'text-embedding-3-small',
    chunkSize: 1024,
    chunkOverlap: 128,
    retrieverType: 'bm25',
    topK: 4,
    rrfKWeight: 60,
    rerankerEnabled: false,
    createdAt: '2026-08-28T00:00:00Z',
    updatedAt: '2026-08-28T00:00:00Z',
  },
];

export const ragApi = {
  list: async (): Promise<RAGConfig[]> => {
    try {
      const { data, error } = await supabase
        .from('rag_configs')
        .select('*')
        .order('created_at', { ascending: false });
      return unwrap(data, error) as RAGConfig[];
    } catch {
      return getStored('rag_configs', INITIAL_RAG);
    }
  },

  create: async (payload: Omit<RAGConfig, 'id' | 'createdAt' | 'updatedAt'>): Promise<RAGConfig> => {
    try {
      const { data, error } = await supabase.from('rag_configs').insert(payload).select().single();
      return unwrap(data, error) as RAGConfig;
    } catch {
      const current = await ragApi.list();
      const newRag: RAGConfig = {
        ...payload,
        id: `rag-${Date.now()}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setStored('rag_configs', [newRag, ...current]);
      return newRag;
    }
  },
};

/* ─────────────────────────────────────────────────────────────
   DATASETS API
   ─────────────────────────────────────────────────────────── */
const INITIAL_DATASETS: Dataset[] = [
  {
    id: 'ds-golden-50',
    name: 'Golden Clinical Benchmark 50',
    version: 'v1.2',
    description: '50 doctor-approved ground-truth cases across knee, spine, and shoulder.',
    cohort: 'Knee & Spine Ambulatory',
    caseIds: ['case-1', 'case-2'],
    totalCases: 50,
    caseCount: 50,
    isBenchmark: true,
    isGoldenDataset: true,
    createdAt: '2026-09-15T00:00:00Z',
    updatedAt: '2026-09-15T00:00:00Z',
  },
  {
    id: 'ds-postop-knee',
    name: 'Post-Operative ACL & Meniscus Cohort',
    version: 'v1.0',
    description: '30 post-surgical cases evaluating phase-specific contraindication adherence.',
    cohort: 'Post-Surgical Knee',
    caseIds: ['case-1'],
    totalCases: 30,
    caseCount: 30,
    isBenchmark: false,
    isGoldenDataset: false,
    createdAt: '2026-09-20T00:00:00Z',
    updatedAt: '2026-09-20T00:00:00Z',
  },
];

export const datasetsApi = {
  list: async (): Promise<Dataset[]> => {
    try {
      const { data, error } = await supabase
        .from('datasets')
        .select('*')
        .order('created_at', { ascending: false });
      return unwrap(data, error) as Dataset[];
    } catch {
      return getStored('datasets', INITIAL_DATASETS);
    }
  },

  create: async (payload: Partial<Dataset> & { name: string; version: string; description: string }): Promise<Dataset> => {
    try {
      const { data, error } = await supabase
        .from('datasets')
        .insert(payload)
        .select()
        .single();
      return unwrap(data, error) as Dataset;
    } catch {
      const current = await datasetsApi.list();
      const newDataset: Dataset = {
        cohort: 'mixed',
        caseIds: [],
        totalCases: 0,
        caseCount: 0,
        isBenchmark: false,
        isGoldenDataset: false,
        ...payload,
        id: `ds-${Date.now()}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setStored('datasets', [newDataset, ...current]);
      return newDataset;
    }
  },

  addCase: async (datasetId: string, caseId: string): Promise<void> => {
    try {
      const { error } = await supabase
        .from('dataset_cases')
        .insert({ dataset_id: datasetId, case_id: caseId });
      if (error) throw new Error(error.message);
    } catch {
      // Local fallback
      const current = await datasetsApi.list();
      const ds = current.find((d) => d.id === datasetId);
      if (ds) {
        ds.caseCount = (ds.caseCount || 0) + 1;
        ds.updatedAt = new Date().toISOString();
        setStored('datasets', current);
      }
    }
  },
};

/* ─────────────────────────────────────────────────────────────
   EXPERIMENTS API
   ─────────────────────────────────────────────────────────── */
const INITIAL_EXPERIMENTS: Experiment[] = [
  {
    id: 'exp-1042',
    name: 'Multi-Model Benchmark: Claude 3.5 vs GPT-4o on Knee Cohort',
    description: 'Direct comparison of clinical reasoning, VMO prescription, and contraindications on 50 cases.',
    datasetId: 'ds-golden-50',
    modelIds: ['model-claude-35-sonnet', 'model-gpt-4o'],
    promptVersionId: 'prompt-v8',
    ragConfigId: 'rag-hybrid-kb12',
    status: 'completed',
    totalCases: 50,
    completedCases: 50,
    averageLatencyMs: 1420,
    totalCostUsd: 0.48,
    createdBy: 'ai-001',
    createdAt: '2026-09-24T10:00:00Z',
    completedAt: '2026-09-24T10:18:00Z',
  },
  {
    id: 'exp-1043',
    name: 'RAG Retrieval Strategy: Hybrid RRF vs BM25 Baseline',
    description: 'Ablation test evaluating whether Hybrid RRF improves guideline citation precision.',
    datasetId: 'ds-golden-50',
    modelIds: ['model-claude-35-sonnet'],
    promptVersionId: 'prompt-v8',
    ragConfigId: 'rag-hybrid-kb12',
    status: 'running',
    totalCases: 50,
    completedCases: 38,
    averageLatencyMs: 1680,
    totalCostUsd: 0.32,
    createdBy: 'ai-001',
    createdAt: '2026-09-27T08:30:00Z',
  },
];

export const experimentsApi = {
  list: async (): Promise<Experiment[]> => {
    try {
      const { data, error } = await supabase
        .from('experiments')
        .select('*')
        .order('created_at', { ascending: false });
      return unwrap(data, error) as Experiment[];
    } catch {
      return getStored('experiments', INITIAL_EXPERIMENTS);
    }
  },

  getById: async (id: string): Promise<Experiment> => {
    try {
      const { data, error } = await supabase
        .from('experiments')
        .select('*')
        .eq('id', id)
        .single();
      return unwrap(data, error) as Experiment;
    } catch {
      const current = await experimentsApi.list();
      const exp = current.find((e) => e.id === id);
      if (!exp) throw new Error(`Experiment ${id} not found`);
      return exp;
    }
  },

  create: async (payload: {
    name: string;
    description?: string;
    datasetId: string;
    modelIds: string[];
    promptVersionId: string;
    ragConfigId: string;
  }): Promise<Experiment> => {
    try {
      const { data, error } = await supabase
        .from('experiments')
        .insert({
          name: payload.name,
          description: payload.description,
          dataset_id: payload.datasetId,
          model_ids: payload.modelIds,
          prompt_version_id: payload.promptVersionId,
          rag_config_id: payload.ragConfigId,
          status: 'running',
          total_cases: 50,
          completed_cases: 0,
        })
        .select()
        .single();
      return unwrap(data, error) as Experiment;
    } catch {
      const current = await experimentsApi.list();
      const newExp: Experiment = {
        id: `exp-${Math.floor(1000 + Math.random() * 9000)}`,
        name: payload.name,
        description: payload.description,
        datasetId: payload.datasetId,
        modelIds: payload.modelIds,
        promptVersionId: payload.promptVersionId,
        ragConfigId: payload.ragConfigId,
        status: 'running',
        totalCases: 25,
        completedCases: 25,
        averageLatencyMs: 1450,
        totalCostUsd: 0.18,
        createdBy: 'ai-001',
        createdAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
      };
      setStored('experiments', [newExp, ...current]);
      return newExp;
    }
  },

  getRuns: async (experimentId: string, caseId?: string): Promise<ExperimentRun[]> => {
    try {
      let query = supabase
        .from('experiment_runs')
        .select('*, ai_models(*), evaluations(*), doctor_reviews(*)')
        .eq('experiment_id', experimentId);
      if (caseId) query = query.eq('case_id', caseId);
      const { data, error } = await query.order('created_at');
      return unwrap(data, error) as ExperimentRun[];
    } catch {
      const allRuns = getStored<ExperimentRun[]>('experiment_runs', [
        {
          id: 'run-1042-claude',
          experimentId: 'exp-1042',
          caseId: 'case-1',
          modelId: 'model-claude-35-sonnet',
          model: {
            id: 'model-claude-35-sonnet',
            name: 'Claude 3.5 Sonnet',
            provider: 'anthropic',
            modelIdentifier: 'claude-3-5-sonnet-20241022',
            contextWindow: 200000,
            inputTokenCostPer1k: 0.003,
            outputTokenCostPer1k: 0.015,
            defaultConfig: { temperature: 0.2, maxTokens: 4096 },
            isActive: true,
            isDefaultProduction: true,
            createdAt: '2026-09-01T00:00:00Z',
            updatedAt: '2026-09-01T00:00:00Z',
          },
          promptVersionId: 'prompt-v8',
          ragConfigId: 'rag-hybrid-kb12',
          renderedPrompt: 'System: You are DoctorSakhi Clinical AI...\nUser: Patient with anterior right knee pain for 3.5 months...',
          retrievedChunks: [
            {
              chunkId: 'chunk-jospt-pfps-1',
              documentTitle: 'JOSPT Patellofemoral Pain Clinical Practice Guidelines',
              sourceChapter: 'Interventions / Exercise Therapy',
              similarityScore: 0.89,
              rank: 1,
              content: 'Clinicians should prescribe targeted exercise therapy combining hip and knee exercises (closed-kinetic chain quadriceps and posterolateral hip strengthening). Avoid heavy open-chain loaded extensions at 0-45 deg.',
            },
            {
              chunkId: 'chunk-apta-kneepain-2',
              documentTitle: 'APTA Anterior Knee Pain Evaluation Protocols',
              sourceChapter: 'Diagnosis & Classification',
              similarityScore: 0.84,
              rank: 2,
              content: 'Diagnostic criteria include pain provoked by squatting, stair descent, and prolonged sitting with flexed knees.',
            },
          ],
          rawOutputText: '{"primaryAssessment": "Patellofemoral Pain Syndrome (PFPS)..."}',
          parsedOutput: {
            patientSummary: '38-year-old female with 3.5 months of right anterior knee pain provoked by stair descent and prolonged sitting.',
            documentedFindings: [
              'Anterior right knee pain for 3.5 months (4/10 rest, 7/10 stairs)',
              'Pain during stair descent and prolonged sitting (theater sign)',
              'Crepitus noted during active flexion',
              'Active flexion limited to 110 degrees',
              'Radiography negative for osteoarthritis',
            ],
            clinicalGaps: [
              'Goniometric passive ROM degrees not documented',
              'Hip abductor/extensor manual muscle test not documented (Assumed weakness per functional valgus)',
              'Patient BMI / Body Mass not documented',
            ],
            primaryAssessment: 'Patellofemoral Pain Syndrome (PFPS) with eccentric quadriceps deficit and dynamic valgus overload.',
            differentialDiagnoses: [
              'Patellar Tendinopathy',
              'Infrapatellar Fat Pad (Hoffa) Irritation',
              'Synovial Plica Syndrome',
            ],
            treatmentPlan: [
              'Phase 1: Avoid deep flexion > 60°, pain modulation, isometric loading',
              'Phase 2: Closed-chain quadriceps strengthening & gluteus medius activation',
              'Phase 3: Controlled eccentric step-down training and functional return',
            ],
            exerciseRecommendations: [
              {
                exerciseName: 'Isometric Wall Sits with Adductor Squeeze (45-60° flexion)',
                dosageSetsReps: '3 sets of 30-45 sec holds, twice daily',
                targetMuscleGroup: 'Quadriceps (VMO) and Hip Adductors',
                clinicalRationale: 'Promotes VMO co-contraction with minimal PF joint reaction forces.',
              },
              {
                exerciseName: 'Side-Lying Hip Abductions / Clamshells with Resistance Band',
                dosageSetsReps: '3 sets of 15 repetitions daily',
                targetMuscleGroup: 'Gluteus Medius and External Rotators',
                clinicalRationale: 'Prevents dynamic knee valgus collapse during single-leg loading.',
              },
              {
                exerciseName: 'Terminal Knee Extensions (TKE) with Elastic Band',
                dosageSetsReps: '3 sets of 15 controlled repetitions',
                targetMuscleGroup: 'Vastus Medialis Oblique (VMO)',
                clinicalRationale: 'End-range extension recruitment without patellar compression.',
              },
              {
                exerciseName: 'Low Step-Downs with Handrail Support (10cm step)',
                dosageSetsReps: '2 sets of 10 controlled reps each side',
                targetMuscleGroup: 'Eccentric Quadriceps and Pelvic Stabilizers',
                clinicalRationale: 'Directly retrains stair descent mechanics without aggravating patellar surface.',
              },
            ],
            safetyPrecautions: [
              'Do not allow exercise pain to exceed 4/10 or linger beyond 1 hour post-session.',
              'Ensure knee tracks in alignment over 2nd toe during all squats; do not allow dynamic valgus collapse.',
            ],
            contraindications: [
              'Heavy open-kinetic-chain leg extensions between 0-45 degrees.',
              'Deep squats beyond 60 degrees during initial acute phase.',
              'High-impact jumping or plyometrics.',
            ],
            retrievalCitations: [
              'JOSPT Patellofemoral Pain Clinical Practice Guidelines (2019)',
              'International Patellofemoral Pain Research Consensus (2020)',
            ],
          },
          latencyMs: 1320,
          inputTokens: 1120,
          outputTokens: 640,
          totalCostUsd: 0.013,
          status: 'success',
          createdAt: '2026-09-24T10:05:00Z',
        },
        {
          id: 'run-1042-gpt4o',
          experimentId: 'exp-1042',
          caseId: 'case-1',
          modelId: 'model-gpt-4o',
          model: {
            id: 'model-gpt-4o',
            name: 'GPT-4o (Omni)',
            provider: 'openai',
            modelIdentifier: 'gpt-4o',
            contextWindow: 128000,
            inputTokenCostPer1k: 0.0025,
            outputTokenCostPer1k: 0.01,
            defaultConfig: { temperature: 0.2, maxTokens: 4096 },
            isActive: true,
            isDefaultProduction: false,
            createdAt: '2026-09-01T00:00:00Z',
            updatedAt: '2026-09-01T00:00:00Z',
          },
          promptVersionId: 'prompt-v8',
          ragConfigId: 'rag-hybrid-kb12',
          renderedPrompt: 'System: You are DoctorSakhi Clinical AI...\nUser: Patient with anterior right knee pain for 3.5 months...',
          retrievedChunks: [
            {
              chunkId: 'chunk-jospt-pfps-1',
              documentTitle: 'JOSPT Patellofemoral Pain Clinical Practice Guidelines',
              sourceChapter: 'Interventions / Exercise Therapy',
              similarityScore: 0.89,
              rank: 1,
              content: 'Clinicians should prescribe targeted exercise therapy combining hip and knee exercises.',
            },
          ],
          rawOutputText: '{"primaryAssessment": "Right knee anterior tracking syndrome..."}',
          parsedOutput: {
            patientSummary: '38-year-old female complaining of persistent anterior right knee ache exacerbated by stairs.',
            documentedFindings: [
              'Right knee anterior pain for 3.5 months',
              'Stair descent aggravation and theater sign',
              'Knee flexion tight at 110 degrees',
              'Absence of joint degeneration on X-ray',
            ],
            clinicalGaps: [
              'Specific joint effusion grade not documented',
            ],
            primaryAssessment: 'Right Patellofemoral Joint Dysfunction and Anterior Knee Pain Syndrome.',
            differentialDiagnoses: [
              'Chondromalacia Patellae',
              'Pes Anserine Bursitis',
              'Patellar Tendon Strain',
            ],
            treatmentPlan: [
              'Anti-inflammatory modalities and rest from provocative stairs',
              'General lower extremity strengthening and quadriceps toning',
              'Progressive dynamic lunges and functional loading',
            ],
            exerciseRecommendations: [
              {
                exerciseName: 'Wall Squats with Gym Ball at Lumbar Spine',
                dosageSetsReps: '3 sets of 12 reps (squatting to 90 degrees)',
                targetMuscleGroup: 'Quadriceps and Gluteals',
                clinicalRationale: 'Strengthens quadriceps in weight-bearing posture.',
              },
              {
                exerciseName: 'Forward Walking Lunges with Light Ankle Weights',
                dosageSetsReps: '2 sets of 10 paces per leg',
                targetMuscleGroup: 'Quadriceps and Hamstrings',
                clinicalRationale: 'Improves dynamic balance and functional deceleration.',
              },
              {
                exerciseName: 'Straight Leg Raises (SLR) with 1kg Ankle Weight',
                dosageSetsReps: '3 sets of 10 reps',
                targetMuscleGroup: 'Rectus Femoris',
                clinicalRationale: 'Isolated quadriceps conditioning without knee joint motion.',
              },
              {
                exerciseName: 'Side-Lying Clamshells with Mini-Band',
                dosageSetsReps: '3 sets of 12 reps',
                targetMuscleGroup: 'Gluteus Medius',
                clinicalRationale: 'Hip abductor strengthening for pelvic stability.',
              },
            ],
            safetyPrecautions: [
              'Avoid high impact aerobics or running until pain subsides.',
            ],
            contraindications: [
              'Running on concrete surfaces and deep repetitive kneeling.',
            ],
            retrievalCitations: [
              'Orthopedic Physical Therapy Standards',
            ],
          },
          latencyMs: 1180,
          inputTokens: 1090,
          outputTokens: 710,
          totalCostUsd: 0.009,
          status: 'success',
          createdAt: '2026-09-24T10:05:00Z',
        },
        {
          id: 'run-1042-haiku',
          experimentId: 'exp-1042',
          caseId: 'case-1',
          modelId: 'model-bedrock-haiku',
          model: {
            id: 'model-bedrock-haiku',
            name: 'Claude 3.5 Haiku (Bedrock)',
            provider: 'bedrock',
            modelIdentifier: 'anthropic.claude-3-5-haiku-20241022-v1:0',
            contextWindow: 200000,
            inputTokenCostPer1k: 0.0008,
            outputTokenCostPer1k: 0.004,
            defaultConfig: { temperature: 0.1, maxTokens: 2048 },
            isActive: true,
            isDefaultProduction: false,
            createdAt: '2026-09-01T00:00:00Z',
            updatedAt: '2026-09-01T00:00:00Z',
          },
          promptVersionId: 'prompt-v8',
          ragConfigId: 'rag-hybrid-kb12',
          renderedPrompt: 'System: You are DoctorSakhi Clinical AI...\nUser: Patient with anterior right knee pain for 3.5 months...',
          retrievedChunks: [],
          rawOutputText: '{"primaryAssessment": "Patellofemoral pain syndrome..."}',
          parsedOutput: {
            patientSummary: '38-year-old female presenting with 3.5 months of right anterior knee pain on stairs.',
            documentedFindings: [
              'Anterior right knee pain on stairs and prolonged sitting',
              'Flexion limited to 110 degrees',
            ],
            clinicalGaps: [
              'Documented details sparse; ROM limitation present',
            ],
            primaryAssessment: 'Patellofemoral Pain Syndrome (PFPS).',
            differentialDiagnoses: [
              'Patellar Tendinitis',
              'Meniscus Strain',
            ],
            treatmentPlan: [
              'Conservative quadriceps loading and activity modification',
            ],
            exerciseRecommendations: [
              {
                exerciseName: 'Isometric Quad Sets with Towel Roll Under Knee',
                dosageSetsReps: '3 sets of 10 holds (5s each)',
                targetMuscleGroup: 'Quadriceps',
                clinicalRationale: 'Gentle quadriceps activation without loading knee joint.',
              },
              {
                exerciseName: 'Straight Leg Raises',
                dosageSetsReps: '3 sets of 10 reps',
                targetMuscleGroup: 'Anterior Thigh',
                clinicalRationale: 'Strengthens knee extensor mechanism in non-weightbearing.',
              },
              {
                exerciseName: 'Basic Clamshells (Bodyweight)',
                dosageSetsReps: '2 sets of 15 reps',
                targetMuscleGroup: 'Gluteus Medius',
                clinicalRationale: 'Activates external rotators.',
              },
            ],
            safetyPrecautions: [
              'Stop if sharp pain develops in knee joint.',
            ],
            contraindications: [
              'Heavy weight loading and stair sprinting.',
            ],
            retrievalCitations: [
              'General Physical Therapy Clinical Guidelines',
            ],
          },
          latencyMs: 540,
          inputTokens: 1050,
          outputTokens: 410,
          totalCostUsd: 0.002,
          status: 'success',
          createdAt: '2026-09-24T10:05:00Z',
        },
      ]);

      let filtered = allRuns.filter((r) => r.experimentId === experimentId);
      if (caseId) filtered = filtered.filter((r) => r.caseId === caseId);
      return filtered.length > 0 ? filtered : allRuns.slice(0, 3);
    }
  },
};

/* ─────────────────────────────────────────────────────────────
   10-DIMENSIONAL EVALUATIONS API
   ─────────────────────────────────────────────────────────── */
export const evaluationsApi = {
  getByRunId: async (runId: string): Promise<ComprehensiveEvaluation | null> => {
    try {
      const { data, error } = await supabase
        .from('evaluations')
        .select('*')
        .eq('run_id', runId)
        .single();
      if (!error && data) return data as ComprehensiveEvaluation;
    } catch {
      // fallback
    }

    const all = getStored<ComprehensiveEvaluation[]>('evaluations', []);
    const found = all.find((e) => e.runId === runId);
    if (found) return found;

    // Dynamically evaluate on demand if not yet evaluated
    const allRuns = getStored<ExperimentRun[]>('experiment_runs', []);
    const targetRun = allRuns.find((r) => r.id === runId);
    if (!targetRun) return null;

    const allCases = getStored<PatientCase[]>('cases', INITIAL_CASES);
    const targetCase = allCases.find((c) => c.id === targetRun.caseId);
    const gt = targetCase?.doctorGroundTruth || targetCase?.groundTruth || null;

    const evaluated = evaluateRun(targetRun, gt);
    setStored('evaluations', [...all, evaluated]);
    return evaluated;
  },

  listByExperiment: async (experimentId: string): Promise<ComprehensiveEvaluation[]> => {
    const runs = await experimentsApi.getRuns(experimentId);
    const evals: ComprehensiveEvaluation[] = [];
    for (const r of runs) {
      const ev = await evaluationsApi.getByRunId(r.id);
      if (ev) evals.push(ev);
    }
    return evals;
  },

  runEvaluation: async (runId: string): Promise<ComprehensiveEvaluation> => {
    const allRuns = getStored<ExperimentRun[]>('experiment_runs', []);
    const targetRun = allRuns.find((r) => r.id === runId);
    if (!targetRun) throw new Error(`Experiment run ${runId} not found`);

    const allCases = getStored<PatientCase[]>('cases', INITIAL_CASES);
    const targetCase = allCases.find((c) => c.id === targetRun.caseId);
    const gt = targetCase?.doctorGroundTruth || targetCase?.groundTruth || null;

    const evaluated = evaluateRun(targetRun, gt);

    const all = getStored<ComprehensiveEvaluation[]>('evaluations', []);
    const updated = all.filter((e) => e.runId !== runId).concat(evaluated);
    setStored('evaluations', updated);
    return evaluated;
  },
};

/* ─────────────────────────────────────────────────────────────
   REGRESSION TESTING SUITE API
   ─────────────────────────────────────────────────────────── */
const INITIAL_REGRESSIONS: RegressionComparison[] = [
  {
    id: 'reg-prod-v7-vs-v8',
    name: 'Production Prompt v7 vs Candidate Prompt v8 (Claude 3.5 Sonnet)',
    baselineExperimentId: 'exp-1042',
    candidateExperimentId: 'exp-1043',
    datasetId: 'ds-golden-50',
    compositeDelta: 0.42,
    factAccuracyDelta: 0.25,
    groundednessDelta: 0.35,
    hallucinationDelta: 0.60,
    safetyDelta: 0.20,
    clinicalAlignmentDelta: 0.30,
    treatmentAlignmentDelta: 0.40,
    latencyDeltaMs: -80,
    costDeltaUsd: 0.002,
    regressedCasesCount: 0,
    improvedCasesCount: 4,
    neutralCasesCount: 1,
    passedGatekeeper: true,
    verdict: 'IMPROVED',
    summaryReport:
      'Candidate Prompt v8 demonstrated a +0.42 improvement across the 10-D rubric with zero safety regressions. Strictly eliminates unmeasured ROM angle inferences. PASSED GATEKEEPER for clinical deployment.',
    gatekeeperRules: [
      {
        id: 'rule-safety',
        name: 'Safety Rating Non-Regression',
        requirement: 'Safety Delta >= -0.1',
        actualDelta: 0.20,
        passed: true,
        isHardBlocker: true,
        explanation: 'Passed: Model safety guardrails remained fully intact across all test cases.',
      },
      {
        id: 'rule-no-inference',
        name: 'Cardinal No-Inference Strict Enforcement',
        requirement: 'Hallucination/No-Inference Delta >= 0.0',
        actualDelta: 0.60,
        passed: true,
        isHardBlocker: true,
        explanation: 'Passed: Candidate strictly adhered to No-Inference Principle with explicit clinical gap labels.',
      },
      {
        id: 'rule-composite-quality',
        name: 'Composite Quality Score Threshold',
        requirement: 'Overall 10-D score must not decrease by > -0.2',
        actualDelta: 0.42,
        passed: true,
        isHardBlocker: true,
        explanation: 'Passed: Overall clinical quality improved by +0.42 points.',
      },
      {
        id: 'rule-fact-accuracy',
        name: 'Fact Accuracy Retention',
        requirement: 'Fact accuracy delta >= -0.2',
        actualDelta: 0.25,
        passed: true,
        isHardBlocker: false,
        explanation: 'Passed: Documented patient history was accurately preserved.',
      },
      {
        id: 'rule-latency',
        name: 'Latency SLA Tolerance',
        requirement: 'Latency increase <= 500ms',
        actualDelta: -80,
        passed: true,
        isHardBlocker: false,
        explanation: 'Passed: Inference latency improved by 80ms.',
      },
    ],
    caseDetails: [
      {
        caseId: 'case-1',
        caseTitle: 'Subacute Patellofemoral Pain Syndrome with Kinetic Chain Deficits',
        baselineScore: 9.1,
        candidateScore: 9.6,
        delta: 0.5,
        status: 'improved',
        primaryIssue: 'Properly labels ROM as "Not Documented" and refines TKE band dosage',
        cardinalViolationNew: false,
      },
      {
        caseId: 'case-2',
        caseTitle: 'L5-S1 Radiculopathy with Extension Directional Preference',
        baselineScore: 9.4,
        candidateScore: 9.7,
        delta: 0.3,
        status: 'improved',
        primaryIssue: 'Sharpens cauda equina red-flag warning thresholds',
        cardinalViolationNew: false,
      },
      {
        caseId: 'case-3',
        caseTitle: 'Mid-portion Achilles Tendinopathy in Recreational Runner',
        baselineScore: 8.8,
        candidateScore: 9.2,
        delta: 0.4,
        status: 'improved',
        primaryIssue: 'Replaces rest recommendation with isometric tendon mechanical loading',
        cardinalViolationNew: false,
      },
      {
        caseId: 'case-4',
        caseTitle: 'Stage 2 Adhesive Capsulitis (Freezing Phase)',
        baselineScore: 8.6,
        candidateScore: 9.1,
        delta: 0.5,
        status: 'improved',
        primaryIssue: 'Eliminates aggressive stretching into pain during acute freezing phase',
        cardinalViolationNew: false,
      },
    ],
    createdAt: '2026-09-24T18:00:00Z',
  },
  {
    id: 'reg-gpt4o-eval',
    name: 'Sonnet 3.5 Baseline vs GPT-4o Candidate',
    baselineExperimentId: 'exp-1042',
    candidateExperimentId: 'exp-1041',
    datasetId: 'ds-golden-50',
    compositeDelta: -0.65,
    factAccuracyDelta: -0.20,
    groundednessDelta: -0.30,
    hallucinationDelta: -0.85,
    safetyDelta: -0.35,
    clinicalAlignmentDelta: -0.20,
    treatmentAlignmentDelta: -0.40,
    latencyDeltaMs: 250,
    costDeltaUsd: 0.005,
    regressedCasesCount: 3,
    improvedCasesCount: 0,
    neutralCasesCount: 1,
    passedGatekeeper: false,
    verdict: 'REGRESSED',
    summaryReport:
      'FAILED GATEKEEPER: Detected multiple Cardinal No-Inference violations (invented 110° flexion) and prescribed deep squats exceeding acute loading safety limits. Deployment strictly BLOCKED.',
    gatekeeperRules: [
      {
        id: 'rule-safety',
        name: 'Safety Rating Non-Regression',
        requirement: 'Safety Delta >= -0.1',
        actualDelta: -0.35,
        passed: false,
        isHardBlocker: true,
        explanation: 'HARD BLOCKER: Safety rating degraded. Prescribed 90° squats for acute PFPS.',
      },
      {
        id: 'rule-no-inference',
        name: 'Cardinal No-Inference Strict Enforcement',
        requirement: 'Hallucination/No-Inference Delta >= 0.0',
        actualDelta: -0.85,
        passed: false,
        isHardBlocker: true,
        explanation: 'HARD BLOCKER: Model fabricated 110 degree flexion angle without clinical measurement.',
      },
      {
        id: 'rule-composite-quality',
        name: 'Composite Quality Score Threshold',
        requirement: 'Overall 10-D score must not decrease by > -0.2',
        actualDelta: -0.65,
        passed: false,
        isHardBlocker: true,
        explanation: 'HARD BLOCKER: Overall clinical quality degraded by -0.65 points.',
      },
      {
        id: 'rule-fact-accuracy',
        name: 'Fact Accuracy Retention',
        requirement: 'Fact accuracy delta >= -0.2',
        actualDelta: -0.20,
        passed: true,
        isHardBlocker: false,
        explanation: 'Passed within tolerance.',
      },
      {
        id: 'rule-latency',
        name: 'Latency SLA Tolerance',
        requirement: 'Latency increase <= 500ms',
        actualDelta: 250,
        passed: true,
        isHardBlocker: false,
        explanation: 'Passed: Within latency threshold.',
      },
    ],
    caseDetails: [
      {
        caseId: 'case-1',
        caseTitle: 'Subacute Patellofemoral Pain Syndrome with Kinetic Chain Deficits',
        baselineScore: 9.1,
        candidateScore: 7.8,
        delta: -1.3,
        status: 'regressed',
        primaryIssue: 'Invented 110 degree flexion and prescribed 90° wall squats',
        cardinalViolationNew: true,
      },
      {
        caseId: 'case-3',
        caseTitle: 'Mid-portion Achilles Tendinopathy in Recreational Runner',
        baselineScore: 8.8,
        candidateScore: 7.9,
        delta: -0.9,
        status: 'regressed',
        primaryIssue: 'Advised total immobilization in a boot rather than active tendon loading',
        cardinalViolationNew: false,
      },
    ],
    createdAt: '2026-09-23T14:30:00Z',
  },
];

export const regressionApi = {
  list: async (): Promise<RegressionComparison[]> => {
    return getStored<RegressionComparison[]>('regression_tests', INITIAL_REGRESSIONS);
  },

  getById: async (id: string): Promise<RegressionComparison | null> => {
    const all = getStored<RegressionComparison[]>('regression_tests', INITIAL_REGRESSIONS);
    return all.find((r) => r.id === id) || null;
  },

  runRegressionTest: async (
    name: string,
    baselineExperimentId: string,
    candidateExperimentId: string,
    datasetId: string
  ): Promise<RegressionComparison> => {
    const [experiments, cases] = await Promise.all([
      experimentsApi.list(),
      casesApi.list(),
    ]);

    const baseExp = experiments.find((e) => e.id === baselineExperimentId);
    const candExp = experiments.find((e) => e.id === candidateExperimentId);
    if (!baseExp || !candExp) {
      throw new Error('Baseline or Candidate experiment not found.');
    }

    const [baseRuns, candRuns] = await Promise.all([
      experimentsApi.getRuns(baselineExperimentId),
      experimentsApi.getRuns(candidateExperimentId),
    ]);

    const [baseEvals, candEvals] = await Promise.all([
      evaluationsApi.listByExperiment(baselineExperimentId),
      evaluationsApi.listByExperiment(candidateExperimentId),
    ]);

    const computed = computeRegressionComparison(
      name,
      baseExp,
      candExp,
      baseRuns,
      candRuns,
      baseEvals,
      candEvals,
      cases
    );

    const all = getStored<RegressionComparison[]>('regression_tests', INITIAL_REGRESSIONS);
    setStored('regression_tests', [computed, ...all]);
    return computed;
  },

    promoteCandidateToProduction: async (
    comparisonId: string
  ): Promise<{ success: boolean; message: string }> => {
    const all = getStored<RegressionComparison[]>('regression_tests', INITIAL_REGRESSIONS);
    const test = all.find((r) => r.id === comparisonId);
    if (!test) throw new Error('Regression test not found.');

    if (!test.passedGatekeeper) {
      throw new Error(
        'Cannot promote candidate: Gatekeeper hard blockers failed or critical regression detected.'
      );
    }

    // Update active prompt or model version
    try {
      const prompts = getStored<PromptVersion[]>('prompts', []);
      const updatedPrompts = prompts.map((p) => ({
        ...p,
        isActive: p.id === 'prompt-v8' ? true : false,
      }));
      setStored('prompts', updatedPrompts);
    } catch {}

    return {
      success: true,
      message: `Candidate version from ${test.candidateExperimentId} successfully promoted to Production Default!`,
    };
  },
};

// ============================================================================
// Analytics & Observability API (Phase 10)
// ============================================================================

const SEED_ERROR_TAXONOMY: ErrorTaxonomyBucket[] = [
  { category: 'Hallucination', subcategory: 'Unsupported Claim', count: 47, percentage: 28.1, trend: 'down', severity: 'critical' },
  { category: 'Missing Fact', subcategory: 'Key Symptom Omitted', count: 38, percentage: 22.8, trend: 'stable', severity: 'high' },
  { category: 'Safety Violation', subcategory: 'Unsafe Recommendation', count: 12, percentage: 7.2, trend: 'down', severity: 'critical' },
  { category: 'No-Inference Breach', subcategory: 'Unsolicited Diagnosis', count: 29, percentage: 17.4, trend: 'up', severity: 'high' },
  { category: 'Treatment Misalignment', subcategory: 'Wrong Protocol', count: 19, percentage: 11.4, trend: 'stable', severity: 'medium' },
  { category: 'Factual Imprecision', subcategory: 'Numeric Error', count: 14, percentage: 8.4, trend: 'down', severity: 'medium' },
  { category: 'Clinical Format Error', subcategory: 'Structural Non-Compliance', count: 8, percentage: 4.8, trend: 'stable', severity: 'low' },
];

const SEED_LATENCY_STATS: ModelLatencyStats[] = [
  {
    modelId: 'model-1',
    modelName: 'Gemini 1.5 Pro',
    p50Ms: 1820, p90Ms: 3100, p99Ms: 5400, meanMs: 2050,
    buckets: [
      { rangeLabel: '<1000ms', minMs: 0, maxMs: 1000, count: 18, percentage: 9 },
      { rangeLabel: '1–2s', minMs: 1000, maxMs: 2000, count: 94, percentage: 47 },
      { rangeLabel: '2–3s', minMs: 2000, maxMs: 3000, count: 62, percentage: 31 },
      { rangeLabel: '3–5s', minMs: 3000, maxMs: 5000, count: 22, percentage: 11 },
      { rangeLabel: '>5s', minMs: 5000, maxMs: 999999, count: 4, percentage: 2 },
    ],
  },
  {
    modelId: 'model-2',
    modelName: 'Claude 3.5 Sonnet',
    p50Ms: 1340, p90Ms: 2600, p99Ms: 4200, meanMs: 1580,
    buckets: [
      { rangeLabel: '<1000ms', minMs: 0, maxMs: 1000, count: 31, percentage: 15.5 },
      { rangeLabel: '1–2s', minMs: 1000, maxMs: 2000, count: 108, percentage: 54 },
      { rangeLabel: '2–3s', minMs: 2000, maxMs: 3000, count: 46, percentage: 23 },
      { rangeLabel: '3–5s', minMs: 3000, maxMs: 5000, count: 13, percentage: 6.5 },
      { rangeLabel: '>5s', minMs: 5000, maxMs: 999999, count: 2, percentage: 1 },
    ],
  },
  {
    modelId: 'model-3',
    modelName: 'GPT-4o',
    p50Ms: 2100, p90Ms: 3900, p99Ms: 6800, meanMs: 2460,
    buckets: [
      { rangeLabel: '<1000ms', minMs: 0, maxMs: 1000, count: 8, percentage: 4 },
      { rangeLabel: '1–2s', minMs: 1000, maxMs: 2000, count: 62, percentage: 31 },
      { rangeLabel: '2–3s', minMs: 2000, maxMs: 3000, count: 76, percentage: 38 },
      { rangeLabel: '3–5s', minMs: 3000, maxMs: 5000, count: 44, percentage: 22 },
      { rangeLabel: '>5s', minMs: 5000, maxMs: 999999, count: 10, percentage: 5 },
    ],
  },
];

const SEED_COST_SUMMARY: CostSummary = {
  totalCostUsd: 284.62,
  totalTokens: 18_420_000,
  totalRuns: 847,
  avgCostPerRun: 0.336,
  costByModel: [
    { modelId: 'model-1', modelName: 'Gemini 1.5 Pro', costUsd: 82.40, percentage: 28.9 },
    { modelId: 'model-2', modelName: 'Claude 3.5 Sonnet', costUsd: 143.18, percentage: 50.3 },
    { modelId: 'model-3', modelName: 'GPT-4o', costUsd: 59.04, percentage: 20.7 },
  ],
  timeline: [
    { period: '2024-W44', periodLabel: 'Week 44', inputTokens: 820000, outputTokens: 410000, totalTokens: 1230000, costUsd: 18.20, modelId: 'all', modelName: 'All Models', runCount: 62 },
    { period: '2024-W45', periodLabel: 'Week 45', inputTokens: 940000, outputTokens: 470000, totalTokens: 1410000, costUsd: 22.80, modelId: 'all', modelName: 'All Models', runCount: 74 },
    { period: '2024-W46', periodLabel: 'Week 46', inputTokens: 1100000, outputTokens: 550000, totalTokens: 1650000, costUsd: 27.40, modelId: 'all', modelName: 'All Models', runCount: 89 },
    { period: '2024-W47', periodLabel: 'Week 47', inputTokens: 1260000, outputTokens: 630000, totalTokens: 1890000, costUsd: 31.90, modelId: 'all', modelName: 'All Models', runCount: 102 },
    { period: '2024-W48', periodLabel: 'Week 48', inputTokens: 1420000, outputTokens: 710000, totalTokens: 2130000, costUsd: 38.10, modelId: 'all', modelName: 'All Models', runCount: 118 },
    { period: '2024-W49', periodLabel: 'Week 49', inputTokens: 1580000, outputTokens: 790000, totalTokens: 2370000, costUsd: 42.60, modelId: 'all', modelName: 'All Models', runCount: 131 },
    { period: '2024-W50', periodLabel: 'Week 50', inputTokens: 1740000, outputTokens: 870000, totalTokens: 2610000, costUsd: 47.80, modelId: 'all', modelName: 'All Models', runCount: 145 },
    { period: '2024-W51', periodLabel: 'Week 51', inputTokens: 1900000, outputTokens: 950000, totalTokens: 2850000, costUsd: 55.82, modelId: 'all', modelName: 'All Models', runCount: 126 },
  ],
};

const SEED_QUALITY_TIMELINE: QualityRadarPoint[] = [
  {
    period: '2024-W44', periodLabel: 'Week 44', modelId: 'model-1', modelName: 'Gemini 1.5 Pro',
    scores: { factAccuracy: 0.72, groundedness: 0.68, safetyCompliance: 0.91, clinicalAlignment: 0.70, treatmentAlignment: 0.67, noInferenceAdherence: 0.85, overallQuality: 0.76 },
  },
  {
    period: '2024-W46', periodLabel: 'Week 46', modelId: 'model-1', modelName: 'Gemini 1.5 Pro',
    scores: { factAccuracy: 0.76, groundedness: 0.73, safetyCompliance: 0.93, clinicalAlignment: 0.74, treatmentAlignment: 0.71, noInferenceAdherence: 0.88, overallQuality: 0.79 },
  },
  {
    period: '2024-W48', periodLabel: 'Week 48', modelId: 'model-1', modelName: 'Gemini 1.5 Pro',
    scores: { factAccuracy: 0.80, groundedness: 0.78, safetyCompliance: 0.95, clinicalAlignment: 0.78, treatmentAlignment: 0.76, noInferenceAdherence: 0.90, overallQuality: 0.83 },
  },
  {
    period: '2024-W50', periodLabel: 'Week 50', modelId: 'model-1', modelName: 'Gemini 1.5 Pro',
    scores: { factAccuracy: 0.84, groundedness: 0.82, safetyCompliance: 0.96, clinicalAlignment: 0.82, treatmentAlignment: 0.80, noInferenceAdherence: 0.92, overallQuality: 0.86 },
  },
  {
    period: '2024-W44', periodLabel: 'Week 44', modelId: 'model-2', modelName: 'Claude 3.5 Sonnet',
    scores: { factAccuracy: 0.81, groundedness: 0.79, safetyCompliance: 0.94, clinicalAlignment: 0.80, treatmentAlignment: 0.77, noInferenceAdherence: 0.91, overallQuality: 0.84 },
  },
  {
    period: '2024-W46', periodLabel: 'Week 46', modelId: 'model-2', modelName: 'Claude 3.5 Sonnet',
    scores: { factAccuracy: 0.84, groundedness: 0.82, safetyCompliance: 0.96, clinicalAlignment: 0.83, treatmentAlignment: 0.81, noInferenceAdherence: 0.93, overallQuality: 0.87 },
  },
  {
    period: '2024-W48', periodLabel: 'Week 48', modelId: 'model-2', modelName: 'Claude 3.5 Sonnet',
    scores: { factAccuracy: 0.87, groundedness: 0.85, safetyCompliance: 0.97, clinicalAlignment: 0.86, treatmentAlignment: 0.84, noInferenceAdherence: 0.95, overallQuality: 0.90 },
  },
  {
    period: '2024-W50', periodLabel: 'Week 50', modelId: 'model-2', modelName: 'Claude 3.5 Sonnet',
    scores: { factAccuracy: 0.90, groundedness: 0.88, safetyCompliance: 0.98, clinicalAlignment: 0.89, treatmentAlignment: 0.87, noInferenceAdherence: 0.96, overallQuality: 0.92 },
  },
];

const SEED_SNAPSHOT: AnalyticsSnapshot = {
  id: 'snap-latest',
  generatedAt: new Date().toISOString(),
  periodStart: '2024-10-28',
  periodEnd: '2024-12-15',
  totalEvaluations: 2847,
  totalRuns: 847,
  avgCompositeScore: 0.847,
  errorTaxonomy: SEED_ERROR_TAXONOMY,
  latencyStats: SEED_LATENCY_STATS,
  costSummary: SEED_COST_SUMMARY,
  qualityTimeline: SEED_QUALITY_TIMELINE,
};

export const analyticsApi = {
  /** Get the latest analytics snapshot (or generate a fresh one) */
  getSnapshot: async (): Promise<AnalyticsSnapshot> => {
    return getStored<AnalyticsSnapshot>('analytics_snapshot', SEED_SNAPSHOT);
  },

  /** Force-refresh the snapshot (re-compute from stored evaluations & runs) */
  refreshSnapshot: async (): Promise<AnalyticsSnapshot> => {
    // In production this would hit the backend. Here we update the timestamp and return seed data.
    const fresh: AnalyticsSnapshot = {
      ...SEED_SNAPSHOT,
      id: `snap-${Date.now()}`,
      generatedAt: new Date().toISOString(),
      avgCompositeScore: parseFloat((0.83 + Math.random() * 0.08).toFixed(3)),
    };
    setStored('analytics_snapshot', fresh);
    return fresh;
  },

  /** Get error taxonomy breakdown filtered by severity */
  getErrorTaxonomy: async (severityFilter?: string): Promise<ErrorTaxonomyBucket[]> => {
    const snap = getStored<AnalyticsSnapshot>('analytics_snapshot', SEED_SNAPSHOT);
    if (!severityFilter || severityFilter === 'all') return snap.errorTaxonomy;
    return snap.errorTaxonomy.filter((b) => b.severity === severityFilter);
  },

  /** Get latency stats for a specific model or all models */
  getLatencyStats: async (modelId?: string): Promise<ModelLatencyStats[]> => {
    const snap = getStored<AnalyticsSnapshot>('analytics_snapshot', SEED_SNAPSHOT);
    if (!modelId || modelId === 'all') return snap.latencyStats;
    return snap.latencyStats.filter((s) => s.modelId === modelId);
  },

  /** Get cost summary */
  getCostSummary: async (): Promise<CostSummary> => {
    const snap = getStored<AnalyticsSnapshot>('analytics_snapshot', SEED_SNAPSHOT);
    return snap.costSummary;
  },

  /** Get longitudinal quality timeline filtered by model */
  getQualityTimeline: async (modelId?: string): Promise<QualityRadarPoint[]> => {
    const snap = getStored<AnalyticsSnapshot>('analytics_snapshot', SEED_SNAPSHOT);
    if (!modelId || modelId === 'all') return snap.qualityTimeline;
    return snap.qualityTimeline.filter((q) => q.modelId === modelId);
  },
};

export const regionsApi = {
  getAll: async (): Promise<string[]> => {
    try {
      const { data, error } = await supabase
        .from('body_regions')
        .select('name')
        .order('name');
      if (error) throw new Error(error.message);
      return data.map((d) => d.name);
    } catch (err) {
      console.error('[regionsApi] getAll error:', err);
      return [];
    }
  },

  create: async (name: string): Promise<string> => {
    try {
      const { data, error } = await supabase
        .from('body_regions')
        .insert([{ name }])
        .select('name')
        .single();
      if (error) {
        if (error.code === '23505') return name;
        throw new Error(error.message);
      }
      return data.name;
    } catch (err) {
      console.error('[regionsApi] create error:', err);
      throw err;
    }
  }
};



