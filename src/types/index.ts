/**
 * Physio AI Evaluation Studio (DoctorSakhi)
 * Core TypeScript Definitions & Domain Models
 */

// ============================================================================
// 1. Roles & Authentication
// ============================================================================

export type UserRole = 'doctor' | 'ai_user' | 'ai_operator' | 'admin';

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  avatarUrl?: string;
  specialty?: string;
  isActive?: boolean;
  lastLogin?: string;
  loginCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface AuthSession {
  user: UserProfile | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

// ============================================================================
// 2. Patient & Clinical Entities
// ============================================================================

export type BiologicalSex = 'male' | 'female' | 'other' | 'unspecified';

export interface Patient {
  id: string;
  mrn: string; // Medical Record Number / Patient ID
  name: string;
  age: number;
  sex: BiologicalSex;
  weightKg?: number;
  createdAt: string;
  updatedAt: string;
}

export type CaseDifficulty = 'easy' | 'moderate' | 'complex' | 'high_risk';
export type CaseStatus = 'draft' | 'ground_truth_ready' | 'evaluating' | 'reviewed';

export interface PatientCase {
  id: string;
  patientId: string;
  patient?: Patient;
  title: string;
  
  // Free-form / Voice clinical capture
  conditionText: string;
  conditionAudioUrl?: string;
  conditionTranscript?: string;
  conditionFinalText: string; // Authoritative doctor-reviewed clinical text
  
  // Metadata & Categorization
  bodyRegion: 'knee' | 'spine' | 'shoulder' | 'hip' | 'neck' | 'ankle' | 'elbow' | 'multi_region';
  tags: string[];
  difficulty: CaseDifficulty;
  status: CaseStatus;
  
  // Structured Representation (Extracted downstream, adhering to No-Inference principle)
  structuredFacts: StructuredClinicalFact[];
  
  groundTruth?: DoctorGroundTruth;
  doctorGroundTruth?: DoctorGroundTruth;

  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export type FactSource = 'patient' | 'doctor';
export type FactCategory = 
  | 'symptom' 
  | 'pain_severity' 
  | 'duration' 
  | 'body_side' 
  | 'aggravating_factor' 
  | 'relieving_factor' 
  | 'functional_limitation' 
  | 'objective_finding' 
  | 'past_medical_history' 
  | 'medication';

export interface StructuredClinicalFact {
  id: string;
  source: FactSource;
  category: FactCategory;
  name: string;
  value: string;
  isDocumented: boolean; // if false, value must be "Not documented", NEVER hallucinated as normal
  notes?: string;
}

// ============================================================================
// 3. Doctor Ground Truth
// ============================================================================

export interface DoctorGroundTruth {
  id: string;
  caseId: string;
  
  // Free-form clinical treatment text (typed or voice)
  assessmentText: string;
  treatmentPlanText: string;
  audioUrl?: string;
  transcript?: string;
  
  // Structured Reference Points for Evaluation
  keyClinicalPriorities: string[];
  prescribedExercises: string[];
  contraindicationsExclusions: string[];
  expectedFunctionalGoals: string[];
  
  // Convenience aliases used by various components
  assessment?: string;
  treatmentPlan?: string;
  exercises?: string[];

  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// 4. Provider-Agnostic Model Registry
// ============================================================================

export type ModelProviderType = 'anthropic' | 'openai' | 'bedrock' | 'ollama' | 'custom_http';

export interface AIModelParameterConfig {
  temperature: number;
  topP?: number;
  maxTokens: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  systemPromptOverride?: string;
}

export interface AIModel {
  id: string;
  name: string;
  provider: ModelProviderType;
  modelIdentifier: string; // e.g., 'claude-3-5-sonnet-20241022', 'gpt-4o', 'anthropic.claude-v2'
  endpointUrl?: string;
  contextWindow: number;
  inputTokenCostPer1k: number;
  outputTokenCostPer1k: number;
  defaultConfig: AIModelParameterConfig;
  isActive: boolean;
  isDefaultProduction: boolean;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// 5. Versioned Prompt Lab
// ============================================================================

export interface PromptVersion {
  id: string;
  promptId: string;
  name: string;
  version: string; // e.g., 'v1', 'v2', 'v8'
  systemPrompt: string;
  userPromptTemplate: string; // contains variables like {{patient_context}}, {{retrieved_context}}
  supportedVariables: string[];
  expectedOutputSchemaJson: string; // JSON schema string
  changeSummary: string;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
}

// ============================================================================
// 6. RAG Parameter Studio
// ============================================================================

export type RetrieverType = 'vector' | 'bm25' | 'hybrid_rrf';

export interface RAGConfig {
  id: string;
  name: string;
  version: string; // e.g., 'kb-v12'
  knowledgeBaseName: string;
  embeddingModel: string;
  chunkSize: number;
  chunkOverlap: number;
  retrieverType: RetrieverType;
  topK: number;
  rrfKWeight: number;
  rerankerEnabled: boolean;
  rerankerModel?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RetrievedChunk {
  chunkId: string;
  documentTitle: string;
  sourceChapter: string;
  pageNumber?: number;
  similarityScore: number;
  keywordScore?: number;
  rrfScore?: number;
  rank: number;
  content: string;
}

// ============================================================================
// 7. Structured AI Clinical Output
// ============================================================================

export interface StructuredClinicalOutput {
  patientSummary: string;
  documentedFindings: string[];
  clinicalGaps: string[]; // Undocumented fields flagged explicitly
  primaryAssessment: string;
  differentialDiagnoses: string[];
  treatmentPlan: string[];
  exerciseRecommendations: {
    exerciseName: string;
    dosageSetsReps: string;
    targetMuscleGroup: string;
    clinicalRationale: string;
  }[];
  safetyPrecautions: string[];
  contraindications: string[];
  retrievalCitations: string[];
}

// ============================================================================
// 8. Experimentation & Multi-Model Execution
// ============================================================================

export type ExperimentStatus = 'draft' | 'queued' | 'running' | 'completed' | 'partial_failure' | 'failed' | 'cancelled';

export interface Experiment {
  id: string;
  name: string;
  description?: string;
  datasetId: string;
  modelIds: string[];
  promptVersionId: string;
  ragConfigId: string;
  status: ExperimentStatus;
  totalCases: number;
  completedCases: number;
  averageLatencyMs?: number;
  totalCostUsd?: number;
  createdBy: string;
  createdAt: string;
  completedAt?: string;
}

export interface ExperimentRun {
  id: string;
  experimentId: string;
  caseId: string;
  modelId: string;
  model?: AIModel;
  promptVersionId: string;
  ragConfigId: string;
  
  // Execution Data
  renderedPrompt: string;
  retrievedChunks: RetrievedChunk[];
  rawOutputText: string;
  parsedOutput?: StructuredClinicalOutput;
  
  // Performance
  latencyMs: number;
  inputTokens: number;
  outputTokens: number;
  totalCostUsd: number;
  
  // Evaluation reference
  evaluation?: ComprehensiveEvaluation;
  doctorReview?: DoctorReview;
  
  status: 'success' | 'failure';
  errorMessage?: string;
  createdAt: string;
}

// ============================================================================
// 9. 10-Dimensional Evaluation Engine
// ============================================================================

export type ErrorTaxonomy = 
  | 'FACTUAL_ERROR'
  | 'MISSING_INFORMATION'
  | 'UNSUPPORTED_INFERENCE'
  | 'CONTRADICTION'
  | 'RETRIEVAL_FAILURE'
  | 'CLINICAL_MISALIGNMENT'
  | 'TREATMENT_MISALIGNMENT'
  | 'EXERCISE_MISALIGNMENT'
  | 'SAFETY_CONCERN'
  | 'FORMAT_ERROR'
  | 'OTHER';

export interface EvaluationItemIssue {
  taxonomy: ErrorTaxonomy;
  severity: 'low' | 'medium' | 'high' | 'critical';
  field: string;
  expected: string;
  actual: string;
  explanation: string;
}

export interface EvaluationDimensionScore {
  dimension: string;
  score: number; // 0.0 to 10.0 scale
  label: 'excellent' | 'good' | 'marginal' | 'unacceptable';
  reasoning: string;
  issues: EvaluationItemIssue[];
}

export interface ComprehensiveEvaluation {
  id: string;
  runId: string;
  
  // 10 Distinct Dimensions
  factAccuracy: EvaluationDimensionScore;        // Deterministic check
  completeness: EvaluationDimensionScore;        // Missing documented facts
  groundedness: EvaluationDimensionScore;        // Clinical/RAG evidence backing
  hallucinationRate: EvaluationDimensionScore;   // Unsupported inferences
  clinicalAlignment: EvaluationDimensionScore;   // Semantic alignment with doctor assessment
  treatmentAlignment: EvaluationDimensionScore;  // Semantic alignment with doctor treatment
  exerciseRelevance: EvaluationDimensionScore;   // Anatomical & functional match
  safetyRating: EvaluationDimensionScore;        // Contraindication checks & cautions
  formatCompliance: EvaluationDimensionScore;    // Schema adherence
  doctorAlignment: EvaluationDimensionScore;     // Direct match with doctor feedback
  
  // Composite insights (Not a single scalar score, but multidimensional profile)
  overallQualitySummary: string;
  criticalSafetyPassed: boolean;
  evaluatedAt: string;
  evaluatorModel?: string;
}

// ============================================================================
// 10. Doctor Feedback & Reviews
// ============================================================================

export type ReviewDecision = 'approved' | 'corrected' | 'rejected' | 'flagged';

export interface DoctorCorrection {
  id: string;
  category: ErrorTaxonomy;
  fieldAffected: string;
  originalAIValue: string;
  doctorCorrectedValue: string;
  comment: string;
}

export interface DoctorReview {
  id: string;
  runId: string;
  caseId: string;
  doctorId: string;
  doctorName: string;
  decision: ReviewDecision;
  overallComment?: string;
  corrections: DoctorCorrection[];
  reviewedAt: string;
}

// ============================================================================
// 11. Datasets & Regression Testing
// ============================================================================

export interface Dataset {
  id: string;
  name: string;
  version: string;
  description: string;
  cohort: 'knee' | 'spine' | 'shoulder' | 'hip' | 'geriatric' | 'sports_rehab' | 'post_op' | 'mixed' | string;
  caseIds: string[];
  totalCases: number;
  caseCount?: number;
  isBenchmark?: boolean;
  category?: string;
  isGoldenDataset: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface CaseRegressionDetail {
  caseId: string;
  caseTitle: string;
  baselineScore: number;
  candidateScore: number;
  delta: number;
  status: 'improved' | 'regressed' | 'stable';
  primaryIssue?: string;
  cardinalViolationNew?: boolean;
}

export interface RegressionGatekeeperRule {
  id: string;
  name: string;
  requirement: string;
  actualDelta: number;
  passed: boolean;
  isHardBlocker: boolean;
  explanation: string;
}

export interface RegressionComparison {
  id: string;
  name: string;
  baselineExperimentId: string;
  candidateExperimentId: string;
  datasetId: string;
  
  // Delta metrics (Candidate minus Baseline)
  compositeDelta: number;
  factAccuracyDelta: number;
  groundednessDelta: number;
  hallucinationDelta: number; // positive means less hallucination / better No-Inference adherence
  safetyDelta: number;
  clinicalAlignmentDelta: number;
  treatmentAlignmentDelta: number;
  latencyDeltaMs: number;
  costDeltaUsd: number;
  
  regressedCasesCount: number;
  improvedCasesCount: number;
  neutralCasesCount: number;
  
  caseDetails: CaseRegressionDetail[];
  gatekeeperRules: RegressionGatekeeperRule[];
  
  verdict: 'IMPROVED' | 'REGRESSED' | 'INCONCLUSIVE' | 'ACCEPTABLE';
  passedGatekeeper: boolean;
  summaryReport: string;
  createdAt: string;
}

// ============================================================================
// 12. Voice Recording & STT
// ============================================================================

export type VoiceState = 'idle' | 'recording' | 'paused' | 'stopping' | 'transcribing' | 'completed' | 'error';

export interface VoiceRecordingSession {
  state: VoiceState;
  durationSeconds: number;
  audioBlob?: Blob;
  audioUrl?: string;
  liveTranscript: string;
  finalTranscript: string;
  confidenceScore?: number;
  errorMessage?: string;
}

// ============================================================================
// 13. Analytics & Observability (Phase 10)
// ============================================================================

/** One bucket in an error taxonomy breakdown */
export interface ErrorTaxonomyBucket {
  category: string;       // e.g. 'Hallucination', 'Missing Fact', 'Safety Violation'
  subcategory?: string;
  count: number;
  percentage: number;
  trend: 'up' | 'down' | 'stable'; // vs. previous period
  severity: 'critical' | 'high' | 'medium' | 'low';
}

/** Latency histogram bucket */
export interface LatencyBucket {
  rangeLabel: string;  // e.g. '<500ms', '500–1000ms'
  minMs: number;
  maxMs: number;
  count: number;
  percentage: number;
}

/** Per-model latency statistics */
export interface ModelLatencyStats {
  modelId: string;
  modelName: string;
  p50Ms: number;
  p90Ms: number;
  p99Ms: number;
  meanMs: number;
  buckets: LatencyBucket[];
}

/** Token cost record for a time period */
export interface CostDataPoint {
  period: string;           // e.g. '2024-W01', '2024-01'
  periodLabel: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  costUsd: number;
  modelId: string;
  modelName: string;
  runCount: number;
}

/** Aggregated cost summary across all models */
export interface CostSummary {
  totalCostUsd: number;
  totalTokens: number;
  totalRuns: number;
  avgCostPerRun: number;
  costByModel: { modelId: string; modelName: string; costUsd: number; percentage: number }[];
  timeline: CostDataPoint[];
}

/** One observation point on the longitudinal quality radar */
export interface QualityRadarPoint {
  period: string;
  periodLabel: string;
  modelId: string;
  modelName: string;
  scores: {
    factAccuracy: number;
    groundedness: number;
    safetyCompliance: number;
    clinicalAlignment: number;
    treatmentAlignment: number;
    noInferenceAdherence: number;
    overallQuality: number;
  };
}

/** Full analytics snapshot for a time range */
export interface AnalyticsSnapshot {
  id: string;
  generatedAt: string;
  periodStart: string;
  periodEnd: string;
  totalEvaluations: number;
  totalRuns: number;
  avgCompositeScore: number;
  errorTaxonomy: ErrorTaxonomyBucket[];
  latencyStats: ModelLatencyStats[];
  costSummary: CostSummary;
  qualityTimeline: QualityRadarPoint[];
}

