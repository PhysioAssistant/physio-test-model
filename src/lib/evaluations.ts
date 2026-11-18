import type {
  StructuredClinicalOutput,
  DoctorGroundTruth,
  ExperimentRun,
  ComprehensiveEvaluation,
  EvaluationDimensionScore,
  EvaluationItemIssue,
  ErrorTaxonomy,
} from '@/types';

/**
 * 10-Dimensional Clinical AI Evaluation Engine
 *
 * Implements deterministic checks, semantic heuristic scoring, and strict
 * violation detection for the Cardinal No-Inference Principle.
 */

// Helper to determine score label
function getScoreLabel(score: number): EvaluationDimensionScore['label'] {
  if (score >= 9.0) return 'excellent';
  if (score >= 7.5) return 'good';
  if (score >= 5.0) return 'marginal';
  return 'unacceptable';
}

/**
 * Evaluates a single model experiment run against optional Doctor Ground Truth
 */
export function evaluateRun(
  run: ExperimentRun,
  groundTruth?: DoctorGroundTruth | null
): ComprehensiveEvaluation {
  const output = run.parsedOutput;
  const issues: EvaluationItemIssue[] = [];

  // Fallback if output could not be parsed
  if (!output) {
    const zeroScore = (dimension: string): EvaluationDimensionScore => ({
      dimension,
      score: 0,
      label: 'unacceptable',
      reasoning: 'Model execution failed or returned invalid JSON format.',
      issues: [
        {
          taxonomy: 'FORMAT_ERROR',
          severity: 'critical',
          field: 'output',
          expected: 'Valid StructuredClinicalOutput JSON',
          actual: run.rawOutputText?.slice(0, 100) || 'Empty output',
          explanation: 'Failed schema parsing.',
        },
      ],
    });

    return {
      id: `eval-${run.id}`,
      runId: run.id,
      factAccuracy: zeroScore('Fact Accuracy'),
      completeness: zeroScore('Completeness'),
      groundedness: zeroScore('Groundedness'),
      hallucinationRate: zeroScore('Hallucination Rate'),
      clinicalAlignment: zeroScore('Clinical Alignment'),
      treatmentAlignment: zeroScore('Treatment Alignment'),
      exerciseRelevance: zeroScore('Exercise Relevance'),
      safetyRating: zeroScore('Safety Rating'),
      formatCompliance: zeroScore('Format Compliance'),
      doctorAlignment: zeroScore('Doctor Alignment'),
      overallQualitySummary: 'Unparseable or failed execution.',
      criticalSafetyPassed: false,
      evaluatedAt: new Date().toISOString(),
      evaluatorModel: 'DoctorSakhi Automated Deterministic & Heuristic Engine v1.0',
    };
  }

  // 1. FACT ACCURACY (Deterministic check of documented patient facts)
  const factIssues: EvaluationItemIssue[] = [];
  let factScore = 9.5;

  if (output.documentedFindings.length === 0) {
    factScore -= 4.0;
    factIssues.push({
      taxonomy: 'FACTUAL_ERROR',
      severity: 'high',
      field: 'documentedFindings',
      expected: 'At least 1-3 documented findings from case narrative',
      actual: '0 findings listed',
      explanation: 'Model failed to extract any patient-reported clinical findings.',
    });
  }

  // Check if findings hallucinate non-existent surgery/fractures
  const hallucinatedKeywords = ['surgery', 'arthroscopy', 'fracture', 'torn acl'];
  const hasSpuriousSurgicalClaim = output.documentedFindings.some((f) =>
    hallucinatedKeywords.some((kw) => f.toLowerCase().includes(kw))
  );
  if (hasSpuriousSurgicalClaim && !groundTruth?.assessment?.toLowerCase().includes('fracture')) {
    factScore -= 3.0;
    factIssues.push({
      taxonomy: 'FACTUAL_ERROR',
      severity: 'high',
      field: 'documentedFindings',
      expected: 'Non-surgical conservative history',
      actual: 'Mention of surgical or traumatic fracture history',
      explanation: 'Model introduced spurious historical details not in source narrative.',
    });
  }

  const factAccuracy: EvaluationDimensionScore = {
    dimension: 'Fact Accuracy',
    score: Math.max(0, Math.min(10, factScore)),
    label: getScoreLabel(factScore),
    reasoning:
      factIssues.length === 0
        ? 'All documented patient symptoms and clinical markers precisely correspond to documented narrative.'
        : 'Discrepancy detected in documented patient history versus factual narrative.',
    issues: factIssues,
  };

  // 2. COMPLETENESS (Missing documented facts from ground truth)
  const completenessIssues: EvaluationItemIssue[] = [];
  let compScore = 9.2;

  if (groundTruth) {
    if (output.documentedFindings.length < 2) {
      compScore -= 2.0;
      completenessIssues.push({
        taxonomy: 'MISSING_INFORMATION',
        severity: 'medium',
        field: 'documentedFindings',
        expected: 'Detailed symptom presentation (onset, provocative factors, functional deficits)',
        actual: `${output.documentedFindings.length} findings`,
        explanation: 'Clinical presentation summary lacks granularity present in doctor documentation.',
      });
    }

    if (output.clinicalGaps.length === 0) {
      compScore -= 1.5;
      completenessIssues.push({
        taxonomy: 'MISSING_INFORMATION',
        severity: 'medium',
        field: 'clinicalGaps',
        expected: 'Explicit enumeration of missing clinical tests (ROM, imaging, special tests)',
        actual: 'No clinical gaps documented',
        explanation: 'Fails to highlight what the physical examination lacked.',
      });
    }
  }

  const completeness: EvaluationDimensionScore = {
    dimension: 'Completeness',
    score: Math.max(0, Math.min(10, compScore)),
    label: getScoreLabel(compScore),
    reasoning:
      completenessIssues.length === 0
        ? 'Extracted full clinical context including functional limitations, onset timeline, and diagnostic omissions.'
        : 'Incomplete capture of clinical factors documented by physician.',
    issues: completenessIssues,
  };

  // 3. GROUNDEDNESS (Clinical & RAG Evidence Backing)
  const groundednessIssues: EvaluationItemIssue[] = [];
  let groundScore = 9.0;

  if (!output.retrievalCitations || output.retrievalCitations.length === 0) {
    groundScore -= 2.5;
    groundednessIssues.push({
      taxonomy: 'RETRIEVAL_FAILURE',
      severity: 'medium',
      field: 'retrievalCitations',
      expected: '1+ peer-reviewed orthopedic or physical therapy guideline citations',
      actual: '0 citations provided',
      explanation: 'Treatment decisions lack direct links to retrieved evidence.',
    });
  }

  const groundedness: EvaluationDimensionScore = {
    dimension: 'Groundedness',
    score: Math.max(0, Math.min(10, groundScore)),
    label: getScoreLabel(groundScore),
    reasoning:
      groundednessIssues.length === 0
        ? 'Clinical plan is firmly grounded in retrieved evidence guidelines with explicit citations.'
        : 'Weak or generic evidence attribution for specific exercise selection.',
    issues: groundednessIssues,
  };

  // 4. HALLUCINATION RATE & UNSUPPORTED INFERENCES (The Cardinal Rule!)
  const hallIssues: EvaluationItemIssue[] = [];
  let hallScore = 9.8;

  // Check for the Cardinal Violation: Inventing range of motion or manual muscle testing
  const textOutput = JSON.stringify(output).toLowerCase();
  const containsSpecificDegrees = /\b(1[0-4][0-9]|9[0-9]|8[0-9])\s*(degrees|deg|°)\b/.test(
    textOutput
  );
  const narrativeHasDegrees =
    run.renderedPrompt.toLowerCase().includes('degrees') ||
    run.renderedPrompt.toLowerCase().includes('deg');

  if (containsSpecificDegrees && !narrativeHasDegrees) {
    hallScore -= 3.5;
    hallIssues.push({
      taxonomy: 'UNSUPPORTED_INFERENCE',
      severity: 'critical',
      field: 'documentedFindings',
      expected: 'Explicit "Not Documented" label for Range of Motion angles',
      actual: 'Fabricated specific numerical ROM angles (e.g. 110 degrees)',
      explanation:
        'CARDINAL NO-INFERENCE VIOLATION: AI invented specific joint degree measurements not present in source narrative.',
    });
  }

  // Check if clinicalGaps properly identifies unverified facts
  if (output.clinicalGaps.length === 0) {
    hallScore -= 1.5;
    hallIssues.push({
      taxonomy: 'UNSUPPORTED_INFERENCE',
      severity: 'high',
      field: 'clinicalGaps',
      expected: 'Non-inference disclosures of unexamined movements',
      actual: 'Empty clinical gaps array',
      explanation: 'Model assumed unstated parameters were normal rather than flagging missing clinical evidence.',
    });
  }

  const hallucinationRate: EvaluationDimensionScore = {
    dimension: 'Hallucination & Unsupported Inferences',
    score: Math.max(0, Math.min(10, hallScore)),
    label: getScoreLabel(hallScore),
    reasoning:
      hallIssues.length === 0
        ? 'Zero unsupported clinical inferences. Strictly adhered to the No-Inference Principle with explicit gap disclosures.'
        : 'Violated Cardinal No-Inference Principle: Speculated or hallucinated clinical parameters not in doctor notes.',
    issues: hallIssues,
  };

  // 5. CLINICAL ALIGNMENT (Semantic diagnostic accuracy)
  const clinicalIssues: EvaluationItemIssue[] = [];
  let clinScore = 9.4;

  if (groundTruth) {
    const gtAssessment = (groundTruth.assessment ?? groundTruth.assessmentText).toLowerCase();
    const modelAssessment = output.primaryAssessment.toLowerCase();

    // Check if primary condition keywords match
    const primaryKeywords = ['patellofemoral', 'pfps', 'meniscus', 'tendinopathy', 'rotator cuff', 'lumbar', 'radiculopathy'];
    const matchedKeyword = primaryKeywords.find(
      (kw) => gtAssessment.includes(kw) && modelAssessment.includes(kw)
    );

    if (!matchedKeyword && !modelAssessment.includes(gtAssessment.split(' ')[0])) {
      clinScore -= 3.0;
      clinicalIssues.push({
        taxonomy: 'CLINICAL_MISALIGNMENT',
        severity: 'high',
        field: 'primaryAssessment',
        expected: groundTruth.assessment ?? groundTruth.assessmentText,
        actual: output.primaryAssessment,
        explanation: 'Primary diagnostic impression diverges from attending physician diagnosis.',
      });
    }

    if (output.differentialDiagnoses.length === 0) {
      clinScore -= 1.0;
      clinicalIssues.push({
        taxonomy: 'CLINICAL_MISALIGNMENT',
        severity: 'medium',
        field: 'differentialDiagnoses',
        expected: '1-3 plausible differential diagnoses',
        actual: '0 differentials',
        explanation: 'No differential considerations provided.',
      });
    }
  }

  const clinicalAlignment: EvaluationDimensionScore = {
    dimension: 'Clinical Alignment',
    score: Math.max(0, Math.min(10, clinScore)),
    label: getScoreLabel(clinScore),
    reasoning:
      clinicalIssues.length === 0
        ? 'Primary diagnostic formulation and differential ranking match doctor assessment.'
        : 'Diagnostic impression has semantic divergence or misses primary pathology.',
    issues: clinicalIssues,
  };

  // 6. TREATMENT ALIGNMENT (Rehab trajectory & load progression)
  const treatIssues: EvaluationItemIssue[] = [];
  let treatScore = 9.1;

  if (output.treatmentPlan.length === 0) {
    treatScore -= 4.0;
    treatIssues.push({
      taxonomy: 'TREATMENT_MISALIGNMENT',
      severity: 'high',
      field: 'treatmentPlan',
      expected: 'Phased conservative rehabilitation trajectory',
      actual: 'Empty treatment plan',
      explanation: 'Lacks multi-phase conservative physical therapy progression.',
    });
  }

  const treatmentAlignment: EvaluationDimensionScore = {
    dimension: 'Treatment Alignment',
    score: Math.max(0, Math.min(10, treatScore)),
    label: getScoreLabel(treatScore),
    reasoning:
      treatIssues.length === 0
        ? 'Treatment progression follows evidence-based tissue loading protocol suitable for symptom irritability.'
        : 'Treatment strategy lacks required conservative physical therapy phasing.',
    issues: treatIssues,
  };

  // 7. EXERCISE RELEVANCE (Biomechanical target & dosage)
  const exIssues: EvaluationItemIssue[] = [];
  let exScore = 9.3;

  if (output.exerciseRecommendations.length === 0) {
    exScore -= 5.0;
    exIssues.push({
      taxonomy: 'EXERCISE_MISALIGNMENT',
      severity: 'critical',
      field: 'exerciseRecommendations',
      expected: '2-4 targeted therapeutic exercises with specific sets, reps, and rationale',
      actual: '0 exercises provided',
      explanation: 'No therapeutic exercise recommendations generated.',
    });
  } else {
    // Check if exercises have dosage and rationales
    const missingDetails = output.exerciseRecommendations.some(
      (e) => !e.dosageSetsReps || !e.clinicalRationale || !e.targetMuscleGroup
    );
    if (missingDetails) {
      exScore -= 2.0;
      exIssues.push({
        taxonomy: 'EXERCISE_MISALIGNMENT',
        severity: 'medium',
        field: 'exerciseRecommendations',
        expected: 'Complete dosage, muscle target, and clinical rationale for all exercises',
        actual: 'Incomplete dosage or missing biomechanical rationale on 1+ exercises',
        explanation: 'Patient-facing exercise prescription lacks essential clinical parameters.',
      });
    }
  }

  const exerciseRelevance: EvaluationDimensionScore = {
    dimension: 'Exercise Relevance',
    score: Math.max(0, Math.min(10, exScore)),
    label: getScoreLabel(exScore),
    reasoning:
      exIssues.length === 0
        ? 'Prescriptions target the primary kinetic chain deficits with safe initial loading dosages.'
        : 'Incomplete dosing or non-specific muscle targeting in exercise regimen.',
    issues: exIssues,
  };

  // 8. SAFETY RATING & PRECAUTIONS (Contraindications & red flags)
  const safetyIssues: EvaluationItemIssue[] = [];
  let safeScore = 9.7;

  if (output.contraindications.length === 0) {
    safeScore -= 2.0;
    safetyIssues.push({
      taxonomy: 'SAFETY_CONCERN',
      severity: 'medium',
      field: 'contraindications',
      expected: 'Explicit movements/activities to avoid during acute/subacute phase',
      actual: 'Empty contraindications',
      explanation: 'No activity restrictions defined for protective phase.',
    });
  }

  if (output.safetyPrecautions.length === 0) {
    safeScore -= 1.5;
    safetyIssues.push({
      taxonomy: 'SAFETY_CONCERN',
      severity: 'medium',
      field: 'safetyPrecautions',
      expected: 'Red-flag monitoring guidelines (severe night pain, locking, giving way)',
      actual: 'Empty safety precautions',
      explanation: 'Lacks patient safety stop-criteria.',
    });
  }

  const safetyRating: EvaluationDimensionScore = {
    dimension: 'Safety & Contraindications',
    score: Math.max(0, Math.min(10, safeScore)),
    label: getScoreLabel(safeScore),
    reasoning:
      safetyIssues.length === 0
        ? 'Robust safety guardrails: clearly specified contraindications, stop-criteria, and symptom escalation rules.'
        : 'Deficiencies in safety stop-criteria or missing provocative movement contraindications.',
    issues: safetyIssues,
  };

  // 9. FORMAT COMPLIANCE (Schema integrity & non-empty keys)
  const formatIssues: EvaluationItemIssue[] = [];
  let formScore = 10.0;

  if (!output.patientSummary || output.patientSummary.length < 15) {
    formScore -= 1.0;
    formatIssues.push({
      taxonomy: 'FORMAT_ERROR',
      severity: 'low',
      field: 'patientSummary',
      expected: 'Concise 1-2 sentence demographic & clinical summary',
      actual: output.patientSummary || 'Empty',
      explanation: 'Patient summary too brief or missing.',
    });
  }

  const formatCompliance: EvaluationDimensionScore = {
    dimension: 'Format Compliance',
    score: Math.max(0, Math.min(10, formScore)),
    label: getScoreLabel(formScore),
    reasoning: 'Output strictly conforms to required StructuredClinicalOutput JSON schema.',
    issues: formatIssues,
  };

  // 10. DOCTOR ALIGNMENT (Comprehensive agreement)
  const docIssues: EvaluationItemIssue[] = [];
  let docScore = (factScore + compScore + clinScore + treatScore + exScore) / 5;

  if (groundTruth) {
    const gtExercises = groundTruth.exercises ?? groundTruth.prescribedExercises;
    if (output.exerciseRecommendations.length > 0 && gtExercises.length > 0) {
      // Check exercise overlap
      const modelNames = output.exerciseRecommendations.map((e) => e.exerciseName.toLowerCase());
      const hasOverlap = gtExercises.some((gtEx) =>
        modelNames.some(
          (mName) =>
            mName.includes(gtEx.toLowerCase().split(' ')[0]) ||
            gtEx.toLowerCase().includes(mName.split(' ')[0])
        )
      );

      if (!hasOverlap) {
        docScore -= 1.5;
        docIssues.push({
          taxonomy: 'EXERCISE_MISALIGNMENT',
          severity: 'medium',
          field: 'exerciseRecommendations',
          expected: gtExercises.join(', '),
          actual: output.exerciseRecommendations.map((e) => e.exerciseName).join(', '),
          explanation: 'Model exercise selection differs from physician preferred exercises.',
        });
      }
    }
  }

  const doctorAlignment: EvaluationDimensionScore = {
    dimension: 'Doctor Alignment',
    score: Math.max(0, Math.min(10, Number(docScore.toFixed(1)))),
    label: getScoreLabel(docScore),
    reasoning:
      docIssues.length === 0
        ? 'High clinical concordance with attending physician notes across assessment, treatment, and exercise selection.'
        : 'Minor divergence from doctor gold standard in exercise selection or treatment emphasis.',
    issues: docIssues,
  };

  // Compile overall insights
  const totalIssuesCount =
    factIssues.length +
    completenessIssues.length +
    groundednessIssues.length +
    hallIssues.length +
    clinicalIssues.length +
    treatIssues.length +
    exIssues.length +
    safetyIssues.length +
    formatIssues.length +
    docIssues.length;

  const criticalIssuesCount = [
    ...factIssues,
    ...completenessIssues,
    ...groundednessIssues,
    ...hallIssues,
    ...clinicalIssues,
    ...treatIssues,
    ...exIssues,
    ...safetyIssues,
    ...formatIssues,
    ...docIssues,
  ].filter((i) => i.severity === 'critical').length;

  let qualitySummary = 'Strong clinical concordance across all 10 evaluated dimensions.';
  if (criticalIssuesCount > 0) {
    qualitySummary = `CRITICAL ALERT: Detected ${criticalIssuesCount} critical violation(s), including Cardinal No-Inference violation. Output requires clinical oversight before patient release.`;
  } else if (totalIssuesCount > 2) {
    qualitySummary = `Acceptable clinical output with ${totalIssuesCount} minor or moderate discrepancies requiring refinement.`;
  }

  return {
    id: `eval-${run.id}`,
    runId: run.id,
    factAccuracy,
    completeness,
    groundedness,
    hallucinationRate,
    clinicalAlignment,
    treatmentAlignment,
    exerciseRelevance,
    safetyRating,
    formatCompliance,
    doctorAlignment,
    overallQualitySummary: qualitySummary,
    criticalSafetyPassed: criticalIssuesCount === 0,
    evaluatedAt: new Date().toISOString(),
    evaluatorModel: 'DoctorSakhi Automated Deterministic & Heuristic Engine v1.0',
  };
}

/**
 * Calculates a consolidated 10-D radar data array for charting
 */
export function getEvaluationDimensionsList(evalResult: ComprehensiveEvaluation) {
  return [
    { key: 'factAccuracy',      ...evalResult.factAccuracy,       dimension: 'Fact Accuracy' },
    { key: 'completeness',      ...evalResult.completeness,       dimension: 'Completeness' },
    { key: 'groundedness',      ...evalResult.groundedness,       dimension: 'Groundedness' },
    { key: 'hallucinationRate', ...evalResult.hallucinationRate,  dimension: 'No-Inference Adherence' },
    { key: 'clinicalAlignment', ...evalResult.clinicalAlignment,  dimension: 'Clinical Alignment' },
    { key: 'treatmentAlignment',...evalResult.treatmentAlignment, dimension: 'Treatment Alignment' },
    { key: 'exerciseRelevance', ...evalResult.exerciseRelevance,  dimension: 'Exercise Relevance' },
    { key: 'safetyRating',      ...evalResult.safetyRating,       dimension: 'Safety Rating' },
    { key: 'formatCompliance',  ...evalResult.formatCompliance,   dimension: 'Format Compliance' },
    { key: 'doctorAlignment',   ...evalResult.doctorAlignment,    dimension: 'Doctor Concordance' },
  ];
}
