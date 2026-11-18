# MASTER DEVELOPMENT PROMPT

## Physio AI Evaluation Studio / DoctorSakhi

You are acting as a **Senior Full-Stack Architect, Senior Frontend Engineer, AI Evaluation Engineer, Prompt Engineer, UX Engineer, and Healthcare AI Platform Engineer**.

Your task is to design and implement a production-quality frontend and supporting application architecture for a platform called:

**Physio AI Evaluation Studio**

The platform belongs to a larger physiotherapy AI product called **DoctorSakhi / Physio Assistant**.

The purpose of this platform is to allow:

1. Doctors/physiotherapists to enter patient clinical information and doctor-approved treatment information through a very simple, clean interface.
2. Internal AI/engineering users to test multiple AI models, prompts, RAG configurations, and AI system versions against the same patient cases.
3. Internal users to compare model outputs side-by-side.
4. Compare AI outputs against doctor-provided ground truth.
5. Automatically evaluate outputs using deterministic checks, semantic evaluation, LLM-based evaluation, and safety/grounding checks.
6. Allow doctors to review, correct, approve, or reject AI outputs.
7. Preserve every experiment, configuration, model version, prompt version, RAG version, evaluation result, and doctor feedback so that AI quality can be measured over time.
8. Eventually use the platform as an evaluation and regression-testing system for the production Physio Assistant.

The UI must be **magnificent, modern, professional, highly usable, responsive, clean, intuitive, and suitable for healthcare professionals**.

Do NOT build this as a generic CRUD dashboard.

Build it as a polished **Healthcare AI Evaluation Studio**.

---

# 1. CORE PRODUCT PHILOSOPHY

The platform must separate two completely different experiences.

## A. DOCTOR EXPERIENCE

Doctors should have an extremely simple workflow.

They should primarily see:

* Login
* Dashboard
* Patient Cases
* Create/Edit Patient Case
* Patient Condition
* Doctor Assessment / Treatment Ground Truth
* Run AI
* AI Result
* Review AI Result
* Approve / Correct / Reject
* Patient history

The doctor-facing clinical input must **NOT feel like a traditional medical data-entry form**.

Do NOT force the doctor to fill many individual fields such as:

* Pain location
* Pain severity
* Duration
* Aggravating factors
* ROM
* Strength
* Gait
* etc.

Instead, provide a **very simple natural-language clinical input experience**.

The doctor should be able to simply describe the patient's condition in their own words.

### Patient Condition Input

Provide one large, clean text area where the doctor can type or speak.

The text area must include a useful example/placeholder explaining what kind of information the doctor can provide.

Example:

```text
Patient Condition

Example:
"Patient reports right knee pain for approximately
3 months, around 4/10 in severity. Pain increases
while climbing stairs. Knee flexion is limited..."
```

The doctor can:

* Type directly
* Paste text
* Speak using a Record Voice button
* Continue speaking
* Pause
* Stop recording
* Edit the generated text
* Correct transcription manually

Voice input should be converted to text **in real time** and appear naturally inside the same text area.

The experience should feel smooth and conversational.

### Doctor Assessment / Ground Truth Input

Provide a second large, clean text area where the doctor can describe:

* Their assessment
* Clinical interpretation
* Treatment plan
* Exercises
* Important considerations
* Restrictions
* Other relevant clinical guidance

Again, the doctor should be able to either:

* Type
* Paste
* Record voice
* Speak naturally
* See real-time transcription
* Edit the resulting text

Example placeholder:

```text
Doctor Assessment & Treatment

Example:
"My assessment is that the main issue is functional
knee limitation. Treatment should focus on progressive
quadriceps strengthening, ROM work and functional
stair training. Avoid aggressive progression..."
```

Provide a clear **Record Voice** control directly inside or immediately adjacent to the text area.

The voice experience must show:

* Recording state
* Recording duration
* Stop control
* Transcribing state
* Real-time transcript
* Error state
* Retry option

Do not make the doctor navigate to another page to record audio.

The doctor should feel like they are simply **talking to DoctorSakhi**.

### VERY IMPORTANT

The simple doctor input experience is only a **frontend UX simplification**.

Internally, the system must still be capable of extracting structured clinical facts from the doctor's free-text/voice input.

Therefore:

```text
Doctor natural language / voice
        ↓
Real-time transcription
        ↓
Clinical text
        ↓
Internal structured extraction
        ↓
Ground Truth / Evaluation representation
```

Do not lose structured information simply because the doctor input is free-form.

The system must preserve the original doctor text as the source of truth.

---

Doctors should NOT see:

* Prompt engineering
* Model parameters
* Model selection
* Temperature
* Token counts
* RAG configuration
* Retrieved documents
* Embeddings
* Vector search
* BM25
* RRF
* Prompt versions
* Model versions
* Experiment IDs
* Internal evaluation metrics
* Internal AI logs
* Internal datasets
* Cost information
* Other models
* Internal testing controls

The doctor interface must remain clinically focused.

---

## B. INTERNAL AI LAB EXPERIENCE

Authorized internal users should have a separate AI Lab.

The AI Lab should provide:

* Dataset management
* Patient case management
* Ground-truth management
* Model management
* Prompt management
* RAG configuration management
* Experiment creation
* Multi-model execution
* Side-by-side comparison
* Output diff
* Automated evaluation
* LLM-as-judge evaluation
* Deterministic evaluation
* Grounding evaluation
* Hallucination detection
* Clinical alignment evaluation
* Treatment alignment evaluation
* Exercise relevance evaluation
* Safety evaluation
* Completeness evaluation
* Doctor feedback
* Experiment history
* Versioning
* Regression testing
* Analytics
* Cost/latency/token tracking
* Export/reporting

The AI Lab is an internal engineering/research interface.

---

# 2. AUTHENTICATION AND AUTHORIZATION

Use **Supabase** as the initial database and authentication platform.

Do not implement fake authentication.

Use:

* Supabase Auth
* Supabase PostgreSQL
* Supabase Row Level Security (RLS)

The application must distinguish between:

### Doctor

Normal doctor-facing user.

### Internal AI User

Authorized user who can access the AI Evaluation Lab.

### Admin

User who can manage authorized users, roles, models, prompts, datasets, and platform settings.

Use a secure role-based authorization design.

Recommended conceptual structure:

```text
users
profiles
roles
user_roles
```

or another clean Supabase-compatible RBAC design.

---

# 3. IMPORTANT SECURITY REQUIREMENT

Never rely only on frontend conditional rendering.

This is NOT sufficient:

```javascript
if (authorizedEmail) {
    showAILab();
}
```

Frontend hiding is only a UX feature.

Actual authorization must be enforced through:

* Supabase Auth
* Supabase database policies
* RLS
* Backend/API authorization

If a doctor manually changes frontend state, URL, JavaScript, or API requests, they must still be unable to access internal AI data.

Internal AI data must be protected server-side.

---

# 4. LOGIN FLOW

Create a simple and elegant login page.

The login page should be minimal and professional.

Example:

```text
             DoctorSakhi

       Physio AI Evaluation Platform

       Email
       [_____________________]

       Password
       [_____________________]

             [ Sign In ]

       Forgot password?
```

After authentication:

```text
User authenticated
       ↓
Load profile
       ↓
Determine role
       ↓
Doctor
   → Doctor Dashboard

Internal AI User
   → AI Lab Dashboard

Admin
   → Admin + AI Lab
```

Do not expose internal AI features to unauthorized users.

---

# 5. ROLE-BASED ROUTING

Create protected routes.

Conceptually:

```text
/login

/doctor
/doctor/cases
/doctor/cases/:id
/doctor/cases/:id/results

/ai-lab
/ai-lab/dashboard
/ai-lab/cases
/ai-lab/datasets
/ai-lab/models
/ai-lab/prompts
/ai-lab/rag
/ai-lab/experiments
/ai-lab/evaluation
/ai-lab/comparison
/ai-lab/regression
/ai-lab/analytics

/admin
/admin/users
/admin/roles
/admin/settings
```

Routes must be protected both:

1. In frontend routing
2. At backend/database authorization level

---

# 6. DOCTOR DASHBOARD

Create a beautiful, simple dashboard.

Do not overwhelm doctors.

Show only useful information:

```text
Good morning, Dr. ...

Patients
Active Cases
Pending Reviews
Recent Assessments
Recent Treatment Plans
```

Use large readable cards.

Prioritize usability over decorative complexity.

---

# 7. DOCTOR PATIENT CASE CREATION

Doctors should be able to create a patient case.

The doctor-facing experience should **not use a long structured medical form**.

Instead, create a simple conversational clinical-entry screen.

The main interaction should be:

```text
Patient Information
        ↓
Patient Condition
        ↓
Doctor Assessment & Treatment
        ↓
Run AI
```

Patient identification information may still use simple fields where required, such as:

* Patient ID
* Name
* Age
* Sex
* Weight

However, the **clinical information itself should primarily be captured through natural-language text and voice**.

---

# 8. DOCTOR CLINICAL INPUT EXPERIENCE

Create a highly polished clinical input screen.

It should contain two primary input areas.

## A. Patient Condition

Large text editor.

Features:

* Natural text input
* Voice recording
* Real-time transcription
* Editable transcript
* Placeholder/example
* Character/text guidance where useful
* Clear recording state
* Stop recording
* Retry recording
* Transcription status

Example:

```text
┌─────────────────────────────────────────────────────────────┐
│ Patient Condition                                           │
│                                                             │
│ Example:                                                    │
│ "Patient reports right knee pain for approximately          │
│ 3 months, around 4/10 in severity. Pain increases while     │
│  climbing stairs. Knee flexion is limited..."               │
│                                                             │
│                                                             │
│                                          🎙 Record Voice     │
└─────────────────────────────────────────────────────────────┘
```

When recording:

```text
┌─────────────────────────────────────────────────────────────┐
│ Patient Condition                                           │
│                                                             │
│ Patient reports right knee pain for approximately 3 months │
│ ...                                                         │
│                                                             │
│ 🔴 Recording  00:24                         [ Stop ]        │
└─────────────────────────────────────────────────────────────┘
```

During transcription:

```text
🔄 Transcribing...
```

Text should appear in the textbox progressively where the underlying speech service supports streaming transcription.

---

## B. Doctor Assessment & Treatment Ground Truth

Second large text editor.

Features:

* Natural text input
* Voice recording
* Real-time transcription
* Editable transcript
* Placeholder/example
* Recording status
* Transcription status
* Retry

Example:

```text
┌─────────────────────────────────────────────────────────────┐
│ Doctor Assessment & Treatment                               │
│                                                             │
│ Example:                                                    │
│ "My assessment is that the main issue is functional knee    │
│ limitation. Treatment should focus on progressive           │
│ quadriceps strengthening, ROM work and functional           │
│ stair training..."                                          │
│                                                             │
│                                          🎙 Record Voice     │
└─────────────────────────────────────────────────────────────┘
```

The doctor must be able to edit any generated transcription before submitting.

---

# 9. VOICE INPUT ARCHITECTURE

Voice input must be designed as a reusable component.

Create a reusable component such as:

```text
VoiceRecorderTextarea
```

It should support:

```text
idle
recording
paused
stopping
transcribing
completed
error
```

The component should be reusable for:

```text
Patient Condition
Doctor Assessment & Treatment
Future clinical notes
```

Do not duplicate voice-recording logic.

The frontend should communicate with the backend for speech processing.

Do not expose sensitive AWS credentials in the browser.

If real-time transcription is not yet connected during early development, create a clearly isolated mock transcription provider.

Do not fake production AI results.

---

# 10. PRESERVE ORIGINAL CLINICAL INPUT

Always preserve:

1. Original typed text
2. Original recorded audio where appropriate and authorized
3. Transcribed text
4. Doctor-edited final text

The final doctor-edited text is the authoritative textual input for downstream AI processing.

Do not silently overwrite the original input.

---

# 11. INTERNAL STRUCTURED REPRESENTATION

Although the doctor enters natural language, the backend should be able to extract structured clinical information.

For example:

```text
Doctor Input
     ↓
Clinical Extraction
     ↓
Structured Facts
     ↓
Ground Truth Representation
```

The structured representation may include:

```text
Symptoms
Pain
Duration
Body region
Laterality
Functional limitations
Clinical findings
Assessment
Treatment
Exercises
Restrictions
Other relevant facts
```

However:

**Do not invent missing values.**

If something was not documented:

```text
Not documented
```

not:

```text
No
Normal
Absent
```

---

# 12. DOCTOR GROUND TRUTH

This is one of the most important components of the platform.

The doctor should be able to explicitly provide, through the natural-language treatment/assessment text:

## Doctor Assessment

What the doctor believes based on the clinical information.

## Doctor Treatment Plan

The treatment plan the doctor intends to use.

## Exercise Plan

Exercises prescribed or considered appropriate.

## Clinical Priorities

Important problems that the AI should address.

## Important exclusions / restrictions

Things the AI must avoid or consider.

The system must clearly label this information internally as:

**Doctor-provided ground truth / reference**

Do not automatically convert AI suggestions into ground truth.

---

# 13. GROUND TRUTH PRINCIPLE

The system must distinguish between:

```text
PATIENT-STATED FACT
DOCTOR-DOCUMENTED FACT
DOCTOR ASSESSMENT
DOCTOR TREATMENT PLAN
AI INFERENCE
AI RECOMMENDATION
```

Never mix these categories.

Every piece of information should have a source/category when practical.

Example:

```json
{
  "value": "knee pain 4/10",
  "source": "patient",
  "type": "reported_symptom"
}
```

and:

```json
{
  "value": "quadriceps strengthening",
  "source": "doctor",
  "type": "treatment_plan"
}
```

---

# 14. AI EXECUTION

The doctor should have a simple action:

**Generate AI Assessment**

or:

**Run DoctorSakhi**

The doctor should NOT have to choose models.

The production/default configuration should be selected internally.

The system should internally execute the configured AI pipeline.

---

# 15. INTERNAL AI LAB — CASE DATASET

Internal users must be able to view and manage evaluation cases.

A case should contain:

```text
Case ID
Patient/Case information
Original clinical text
Transcript
Structured patient facts
Clinical findings
Doctor assessment
Doctor treatment plan
Doctor ground truth
Expected outputs
Tags
Dataset version
Created by
Created date
Updated date
```

Cases should be reusable across experiments.

---

# 16. EXPERIMENT CONCEPT

Introduce the concept of an:

**Experiment**

An experiment represents one complete AI execution against one or more test cases.

Example:

```text
Experiment #1042

Dataset:
Physio Evaluation Dataset v3

Model:
Claude Sonnet

Prompt:
clinical_prompt_v8

RAG:
Physio KB v12

Retriever:
Hybrid RRF v4

Temperature:
0

Cases:
100

Created:
...
```

Every experiment must be reproducible.

---

# 17. MODEL CONFIGURATION

The AI Lab must support multiple models.

Do not hard-code the entire UI around one model.

Create a model abstraction.

Example:

```text
Model Provider
Model Name
Model Version
Context Window
Configuration
Active/Inactive
```

Potential future models may include:

```text
Claude
Amazon Nova
Other Bedrock models
Other approved providers
```

Do not assume that every model has identical parameters.

Create a provider/model abstraction.

---

# 18. PROMPT MANAGEMENT

Create a dedicated Prompt Lab.

Prompts must be versioned.

Example:

```text
Clinical Assessment Prompt

v1
v2
v3
...
v8
```

Each prompt version should preserve:

* System prompt
* User prompt template
* Variables
* Instructions
* Output schema
* Created by
* Created date
* Change description
* Active/inactive status

Never silently overwrite a prompt used by an old experiment.

Experiments must retain the exact prompt version used.

---

# 19. PROMPT VARIABLES

Prompts should support variables such as:

```text
{{patient_context}}
{{clinical_findings}}
{{doctor_ground_truth}}
{{retrieved_context}}
{{conversation_transcript}}
```

The actual rendered prompt used in an experiment should be stored.

This is important for reproducibility.

---

# 20. RAG CONFIGURATION

Create a RAG configuration abstraction.

Track:

```text
Knowledge Base Version
Embedding Model
Chunking Version
Retriever
Vector Search Configuration
Keyword/BM25 Search
RRF configuration
Top-K
Metadata filters
Reranker
```

Do not assume that RAG is static.

RAG itself is a variable in an experiment.

Example:

```text
Experiment A
Model = Claude
Prompt = V8
RAG = V12

Experiment B
Model = Claude
Prompt = V8
RAG = V13
```

This allows us to determine whether improvement came from the model, prompt, or retrieval.

---

# 21. RETRIEVED CONTEXT STORAGE

For each experiment, store the retrieved context used by the model where appropriate.

Store:

```text
Document ID
Chunk ID
Source
Book
Chapter
Page
Similarity score
Keyword score
RRF score
Final ranking
Retrieved text/reference
```

This enables debugging.

The AI Lab should allow engineers to inspect:

**What information did the model actually receive?**

---

# 22. MULTI-MODEL COMPARISON

This is a core feature.

Allow internal users to select:

```text
Case
Models
Prompt
RAG configuration
Evaluation configuration
```

Then run the same input through multiple configurations.

Example:

```text
Case: PT-0001

Model A:
Claude Sonnet
Prompt V8
RAG V12

Model B:
Model X
Prompt V8
RAG V12

Model C:
Claude Sonnet
Prompt V7
RAG V13
```

The input case must remain identical unless the experiment explicitly changes it.

---

# 23. SIDE-BY-SIDE OUTPUT VIEW

Create a powerful comparison interface.

Example:

```text
                 MODEL A        MODEL B        MODEL C

Assessment       ...            ...            ...

Clinical Gaps    ...            ...            ...

Treatment Plan   ...            ...            ...

Exercises        ...            ...            ...

Safety           ...            ...            ...
```

The UI should support:

* Synchronized scrolling
* Expand/collapse sections
* Highlight differences
* Copy output
* View raw JSON
* View formatted output
* View prompt
* View retrieved context
* View evaluation
* View doctor feedback

---

# 24. OUTPUT DIFF

Implement semantic and textual difference visualization.

The system should identify:

```text
Added
Removed
Changed
Missing
Unsupported
```

Example:

```text
Ground Truth:
Pain = 4/10

Model A:
Pain = 4/10          ✓

Model B:
Pain = 6/10          ✗

Model C:
Pain severity not mentioned   ⚠
```

Use visual highlighting, but do not rely only on colors.

Always provide labels/icons/text for accessibility.

---

# 25. EVALUATION FRAMEWORK

Do NOT use only one overall score.

Create independent evaluation dimensions.

Required dimensions:

1. Fact Accuracy
2. Completeness
3. Groundedness
4. Hallucination / Unsupported Claims
5. Clinical Alignment
6. Treatment Alignment
7. Exercise Relevance
8. Safety
9. Format Compliance
10. Doctor Alignment

Also track:

11. Latency
12. Input Tokens
13. Output Tokens
14. Cost
15. Model Version
16. Prompt Version
17. RAG Version

---

# 26. FACT ACCURACY

Check whether the AI correctly represents documented information.

Example:

Ground Truth:

```text
Pain = 4/10
Duration = 3 months
Side = right
```

Model:

```text
Pain = 4/10
Duration = 3 months
Side = left
```

Result:

```text
Pain → PASS
Duration → PASS
Side → FAIL
```

Prefer structured comparison whenever possible.

---

# 27. COMPLETENESS

Determine whether important documented information was omitted.

Example:

Ground Truth:

```text
Pain 4/10
Right knee
3 months
Stair aggravation
Limited flexion
```

Model:

```text
Pain 4/10
Right knee
```

The system should identify missing clinically relevant facts.

Do not treat every omitted detail as equally important.

Support severity/importance levels.

---

# 28. GROUNDEDNESS

Determine whether the output is supported by:

* Patient-provided information
* Doctor-provided information
* Retrieved RAG information

Every important clinical statement should ideally have a support source.

---

# 29. HALLUCINATION / UNSUPPORTED INFORMATION

This is a critical metric.

Example:

Patient says:

```text
"Knee pain"
```

Model says:

```text
"Patient has confirmed osteoarthritis."
```

If osteoarthritis was not documented or supported, mark it as:

```text
Unsupported claim
```

Do not automatically call every clinical inference a hallucination.

Classify:

```text
Documented fact
Supported inference
Reasonable recommendation
Unsupported claim
Contradiction
```

The evaluation system must distinguish these.

---

# 30. CLINICAL ALIGNMENT

Compare the AI's assessment with the doctor's documented assessment.

Do not simply compare exact text.

Use semantic evaluation.

Example:

Doctor:

```text
Focus on functional knee limitation and progressive strengthening.
```

AI:

```text
Focus on improving knee function through progressive strengthening.
```

These may be semantically aligned even though wording differs.

---

# 31. TREATMENT ALIGNMENT

Compare AI recommendations with the doctor's intended treatment.

Evaluate:

* Relevant
* Missing
* Contradictory
* Unsupported
* Potentially unsafe
* Additional reasonable recommendation

Do not assume that the doctor's plan is the only clinically valid answer.

The evaluator must distinguish:

```text
Different but reasonable
```

from:

```text
Incorrect
```

---

# 32. EXERCISE RELEVANCE

Evaluate whether suggested exercises are relevant to the documented patient condition.

Consider:

* Documented impairment
* Functional limitations
* Patient restrictions
* Doctor plan
* Available clinical information

Do not invent patient abilities or contraindications.

---

# 33. SAFETY EVALUATION

Safety must be a separate evaluation dimension.

Look for:

* Unsupported high-risk recommendations
* Contradictions with documented restrictions
* Incorrect patient assumptions
* Excessive progression
* Missing important caution
* Dangerous or inappropriate recommendations

Safety evaluation must not be reduced to a generic LLM score.

Use deterministic rules where possible and an evaluator model where necessary.

---

# 34. DETERMINISTIC EVALUATION

Use code-based evaluation for objective checks.

Examples:

```text
Age matches?
Pain score matches?
Body side matches?
Duration matches?
Required fields present?
Output JSON valid?
Required sections present?
Forbidden claims present?
```

Do not ask an LLM to evaluate something that can be checked exactly with code.

---

# 35. SEMANTIC EVALUATION

Use semantic comparison for:

* Similar wording
* Equivalent clinical concepts
* Treatment concept matching
* Exercise concept matching
* Assessment alignment

Avoid simple string matching for clinical language.

---

# 36. LLM-AS-JUDGE

Use an evaluator model for complex qualitative evaluation.

However:

**Never ask the evaluator for only:**

```text
"Is this answer good?"
```

Instead provide a strict evaluation rubric and require structured JSON.

Example:

```json
{
  "fact_accuracy": {
    "score": 0,
    "reason": "",
    "errors": []
  },
  "completeness": {
    "score": 0,
    "reason": "",
    "missing_items": []
  },
  "groundedness": {
    "score": 0,
    "reason": "",
    "unsupported_claims": []
  },
  "clinical_alignment": {
    "score": 0,
    "reason": ""
  },
  "treatment_alignment": {
    "score": 0,
    "reason": ""
  },
  "safety": {
    "score": 0,
    "reason": "",
    "issues": []
  }
}
```

Use a clearly defined scoring scale.

Do not allow the evaluator to invent information.

---

# 37. EVALUATOR INPUT

The evaluator should receive:

```text
Patient facts
Clinical findings
Doctor ground truth
AI output
Retrieved context
Evaluation rubric
```

The evaluator must be instructed:

* Do not infer undocumented patient facts.
* Do not assume missing data.
* Do not reward verbose answers simply for being verbose.
* Do not penalize different wording when meaning is equivalent.
* Distinguish reasonable clinical variation from actual errors.
* Identify unsupported claims explicitly.
* Provide evidence for each finding.

---

# 38. DOCTOR REVIEW

Doctors must be able to review AI outputs.

Actions:

```text
Approve
Edit
Reject
Flag
Add comment
```

For each correction, allow:

```text
Reason
Category
Corrected value
Doctor comment
```

Categories may include:

```text
Incorrect fact
Missing information
Unsupported inference
Treatment issue
Exercise issue
Safety issue
Formatting issue
Other
```

---

# 39. DOCTOR FEEDBACK AS DATA

Every doctor correction should become structured evaluation data.

Store:

```text
Case
Experiment
Model
Output
Doctor decision
Correction
Reason
Timestamp
Reviewer
```

This data should later be usable for:

* Prompt improvement
* Retrieval improvement
* Model comparison
* Regression testing
* Evaluation calibration

---

# 40. VERSION CONTROL

Version all important AI components:

```text
Model
Prompt
RAG
Dataset
Evaluation rubric
Output schema
Application version
```

An experiment must always be reproducible.

Never modify historical experiment configuration.

---

#model part need to add:
Voice & Model Integration
Voice Input: Use Whisper for speech-to-text. The voice component should support recording, pause/resume, stop, transcription, editing, and retry. The transcribed text must appear directly inside the same textbox.
Model Integration: Build the Model UI as a provider-agnostic, plug-and-play system. Do not hardcode a specific AI provider or model. The UI should allow an authorized user to add/connect any compatible model by providing the required API token/key, endpoint, model name, provider, and optional parameters/configuration. Support different authentication methods and model-specific parameters through a flexible configuration system.
Keep all API keys/tokens backend-only; never expose secrets in the frontend.
The architecture should make adding a new model/provider possible without changing the core comparison, experiment, or evaluation UI.

------
# 41. REGRESSION TESTING

Create a regression testing feature.

Example:

```text
Dataset:
100 validated physiotherapy cases

Current Production Configuration
vs
New Configuration
```

Run both.

Then compare:

```text
Fact Accuracy
Groundedness
Hallucination
Clinical Alignment
Treatment Alignment
Safety
Latency
Cost
```

The system should identify regressions.

Example:

```text
Previous:
Hallucination rate = X

New:
Hallucination rate = Y

Status:
Improved / Regressed / Unchanged
```

Do not hide the underlying case-level evidence.

---

# 42. ERROR ANALYSIS

Create an error-analysis dashboard.

Show categories such as:

```text
Incorrect facts
Missing facts
Hallucinations
Unsupported treatment
Safety issues
Retrieval failures
Formatting failures
```

Allow filtering by:

```text
Model
Prompt version
RAG version
Patient condition
Body region
Case difficulty
Date
```

This should help us discover WHY the model performs poorly.

---

# 43. RAG DEBUGGING

The AI Lab should allow engineers to inspect:

```text
User query
Patient context
Retrieved chunks
Ranking
Final context
Model answer
```

This allows us to distinguish:

```text
Model problem
```

from:

```text
Retrieval problem
```

For example:

If the correct physiotherapy information exists in the knowledge base but wasn't retrieved:

```text
Retrieval failure
```

If the correct information was retrieved but the model ignored it:

```text
Generation/reasoning failure
```

This distinction is extremely important.

---

# 44. EXPERIMENT RESULT STORAGE

Each experiment run should preserve:

```text
Experiment ID
Case ID
Model
Model version
Prompt version
RAG version
Input
Rendered prompt
Retrieved context
Raw output
Parsed output
Evaluation
Doctor feedback
Latency
Token usage
Cost
Timestamp
```

Never lose historical results.

---

# 45. DATABASE DESIGN

Use Supabase PostgreSQL initially.

Design normalized but practical tables.

Potential entities:

```text
profiles
roles
user_roles

patients
patient_cases
clinical_facts
clinical_findings

ground_truth
doctor_assessments
doctor_treatment_plans

datasets
dataset_cases
dataset_versions

models
model_versions

prompts
prompt_versions

rag_configs
rag_versions

experiments
experiment_runs

retrieved_context
model_outputs

evaluations
evaluation_metrics
evaluation_errors

doctor_reviews
doctor_corrections

regression_runs
regression_results
```

Do not blindly create every table if a simpler schema is more appropriate.

First design relationships carefully.

---

# 46. DATABASE SECURITY

Enable Supabase RLS.

Doctor users should only access data they are authorized to access.

Internal AI users can access AI evaluation data.

Admin can manage authorized users and configurations.

Do not expose service-role credentials in the frontend.

Never put:

```text
SUPABASE_SERVICE_ROLE_KEY
AWS_SECRET_ACCESS_KEY
MODEL_PROVIDER_SECRET
```

into browser code.

---

# 47. FRONTEND TECHNOLOGY

Use:

```text
React
TypeScript
Vite
```

Use a modern component system such as:

```text
Tailwind CSS
shadcn/ui
```

Use:

```text
React Router
TanStack Query
React Hook Form
Zod
```

or equivalent well-maintained libraries.

Keep dependencies purposeful.

Do not install unnecessary libraries just for decoration.

---

# 48. UI/UX REQUIREMENTS

The UI MUST be:

* Magnificent
* Modern
* Professional
* Clean
* Responsive
* Fast
* Accessible
* Intuitive
* Healthcare appropriate
* Desktop optimized
* Tablet friendly
* Mobile usable

Avoid:

* Clutter
* Excessive animations
* Giant dashboards with meaningless charts
* Too many colors
* Tiny text
* Excessive gradients
* Generic AI-looking interfaces
* Unnecessary cards everywhere

Use visual hierarchy.

The doctor interface should feel like a professional clinical application.

The AI Lab can be more technical and analytical.

---

# 49. DESIGN LANGUAGE

Create two related visual modes:

## Clinical Mode

For doctors:

```text
Clean
Calm
Minimal
Highly readable
Focused
Professional
```

## AI Lab Mode

For internal users:

```text
Analytical
Information dense
Powerful
Technical
Comparison focused
Data rich
```

They should still feel like the same product.

---

# 50. RESPONSIVE DESIGN

Desktop:

```text
Sidebar
Main workspace
Optional right-side context panel
```

Tablet:

```text
Collapsible sidebar
Responsive panels
```

Mobile:

```text
Bottom navigation or compact navigation
Stacked content
Horizontal scrolling comparison where appropriate
```

Never allow critical information to become unreadable.

---

# 51. AI LAB NAVIGATION

Recommended sidebar:

```text
AI LAB

Overview
Cases
Datasets
Models
Prompts
RAG
Experiments
Compare
Evaluation
Doctor Reviews
Regression
Analytics

SYSTEM

Settings
Users
```

Keep navigation intuitive.

---

# 52. CASE DETAIL PAGE

Create a powerful case detail page.

Sections:

```text
Patient
Clinical Information
Original Doctor Input
Transcript
Structured Facts
Doctor Assessment
Doctor Treatment Plan
Ground Truth
AI Experiments
Evaluation
Doctor Reviews
History
```

Use tabs or a well-designed section layout.

---

# 53. EXPERIMENT DETAIL PAGE

Show:

```text
Experiment metadata
Input
Prompt
Model
RAG
Retrieved context
Output
Evaluation
Doctor review
```

Use expandable sections.

Technical details should be visible to internal users but not doctors.

---

# 54. COMPARISON PAGE

This should be one of the strongest pages in the application.

Allow:

```text
Select Case
Select Models
Select Prompt Versions
Select RAG Versions
Run Comparison
```

Then display:

```text
Ground Truth
Model A
Model B
Model C
```

side-by-side.

Include:

```text
Metric comparison
Output diff
Error comparison
Latency
Cost
Doctor feedback
```

---

# 55. EVALUATION DASHBOARD

Display trends over time:

```text
Fact Accuracy
Groundedness
Hallucination Rate
Safety
Clinical Alignment
Treatment Alignment
```

Also:

```text
Model performance
Prompt performance
RAG performance
```

Provide filters.

Do not create misleading aggregate scores.

Always allow users to drill down to individual cases.

---

# 56. DO NOT CREATE A SINGLE "BEST MODEL" SCORE

The platform must not blindly reduce clinical AI quality to:

```text
Model A = 91
Model B = 87
Model C = 84
```

Instead show a multidimensional profile.

For example:

```text
Model A
Accuracy       strong
Grounding      strong
Safety         strong
Latency        moderate

Model B
Accuracy       moderate
Grounding      strong
Safety         strong
Latency        strong
```

The platform is an evaluation tool, not a simplistic leaderboard.

---

# 57. PATIENT PRIVACY

Treat all patient information as sensitive.

Use:

* Authentication
* Authorization
* RLS
* Least privilege
* Secure API communication
* No secrets in frontend
* Audit logging where appropriate

Do not display unnecessary patient information in analytics.

Prefer patient/case IDs in internal dashboards.

---

# 58. AUDITABILITY

Track important actions:

```text
Who created case?
Who modified ground truth?
Who ran experiment?
Who changed prompt?
Who approved output?
Who edited output?
Who changed evaluation?
```

This is important for a healthcare-oriented platform.

---

# 59. API ARCHITECTURE

Do not put AI execution logic directly inside React.

Use backend APIs.

Conceptually:

```text
React
  ↓
FastAPI
  ↓
AI orchestration
  ↓
Model provider
  ↓
Evaluation engine
  ↓
Supabase
```

The frontend should be responsible for:

```text
UI
State
Navigation
Forms
Visualization
```

Backend should handle:

```text
Authentication verification
Authorization
AI execution
Model calls
Prompt rendering
RAG
Evaluation
Database operations
Secrets
```

---

# 60. AI ORCHESTRATION ABSTRACTION

Create a clean abstraction such as:

```text
ModelProvider
PromptEngine
RAGRetriever
ExperimentRunner
EvaluationEngine
DoctorReviewService
```

Do not tightly couple the application to one model provider.

---

# 61. CONFIGURATION MANAGEMENT

Do not hard-code:

```text
model IDs
prompt text
RAG IDs
evaluation thresholds
```

into random frontend files.

Use configuration management.

Sensitive configuration belongs on the backend.

---

# 62. OUTPUT SCHEMA

AI outputs should preferably be structured.

Example:

```json
{
  "patient_summary": {},
  "documented_findings": [],
  "clinical_gaps": [],
  "assessment": [],
  "treatment_plan": [],
  "exercise_plan": [],
  "safety_considerations": [],
  "evidence": []
}
```

The exact schema can evolve.

Keep it versioned.

---

# 63. NO-INFERENCE PRINCIPLE

This is a fundamental project rule.

The AI must distinguish:

```text
Documented
Not documented
Unknown
Inferred
Recommended
```

Never convert:

```text
Not mentioned
```

into:

```text
No
Normal
Absent
```

Example:

If the doctor did not document ROM:

Correct:

```text
ROM: Not documented
```

Incorrect:

```text
ROM: Normal
```

---

# 64. EVIDENCE TRACEABILITY

Where practical, important AI claims should be traceable to:

```text
Patient transcript
Doctor input
FHIR data
RAG document
```

The internal AI Lab should allow engineers to inspect this evidence.

The doctor UI should show only useful evidence, not technical retrieval internals.

---

# 65. ERROR CLASSIFICATION

Create a standardized taxonomy:

```text
FACTUAL_ERROR
MISSING_INFORMATION
UNSUPPORTED_INFERENCE
CONTRADICTION
RETRIEVAL_FAILURE
CLINICAL_MISALIGNMENT
TREATMENT_MISALIGNMENT
EXERCISE_MISALIGNMENT
SAFETY_CONCERN
FORMAT_ERROR
OTHER
```

Use these consistently across evaluations.

---

# 66. TEST DATASET

Create support for datasets such as:

```text
Knee cases
Hip cases
Shoulder cases
Back pain cases
Neurological cases
Post-operative cases
Geriatric cases
Sports rehabilitation cases
```

Do not hard-code these categories.

Allow configurable tags.

---

# 67. CASE DIFFICULTY

Allow internal users to classify cases:

```text
Easy
Moderate
Complex
High-risk
```

Also allow custom tags.

This enables evaluation by case difficulty.

---

# 68. EXPERIMENT REPRODUCIBILITY

Every experiment must answer:

```text
What input was used?
Which model?
Which model version?
Which prompt?
Which prompt version?
Which RAG?
Which retrieved documents?
Which configuration?
What output?
What evaluation?
What doctor feedback?
```

If any of these are missing, reproducibility is compromised.

---

# 69. PERFORMANCE

The frontend should feel fast.

Use:

* Lazy loading
* Pagination
* Virtualized long lists where appropriate
* Cached queries
* Optimistic UI only where safe
* Skeleton loading
* Error states
* Retry states
* Empty states

Do not load thousands of experiment results at once.

---

# 70. ERROR HANDLING

Every API call must have clear:

```text
Loading
Success
Empty
Error
Retry
```

states.

Never leave the doctor staring at a blank screen.

For AI execution errors, show a human-readable message.

Do not expose secrets or internal stack traces.

---

# 71. AI EXECUTION STATUS

For long-running experiments, support statuses:

```text
Queued
Running
Completed
Partially Completed
Failed
Cancelled
```

For multi-case experiments:

```text
37 / 100 cases completed
```

Show progress.

---

# 72. COST AND LATENCY

Track:

```text
Input tokens
Output tokens
Total tokens
Latency
Estimated cost
```

These are internal-only fields.

Doctors should not normally see them.

---

# 73. RAW DATA ACCESS

Internal users should be able to inspect:

```text
Raw AI response
Parsed response
Evaluation JSON
Retrieved context
Rendered prompt
```

Provide a clean JSON viewer.

Do not expose raw technical data to doctors unless explicitly authorized.

---

# 74. EXPORT

Allow internal users to export evaluation results.

Potential formats:

```text
CSV
JSON
PDF/report
```

Exports should respect authorization and patient privacy.

---

# 75. FUTURE EXTENSIBILITY

Design the architecture so that later we can add:

```text
AWS Bedrock
Amazon HealthLake
Amazon Transcribe Medical
Amazon Comprehend Medical
Bedrock Knowledge Bases
Custom RAG
Multiple vector stores
Multiple model providers
Voice input
FHIR data
Production DoctorSakhi
Mobile application
```

Do not implement all of these immediately.

Create clean extension points.

---

# 76. DEVELOPMENT PHASES

Do NOT attempt to build everything in one step.

Follow this sequence.

## Phase 1 — Architecture

First inspect the existing project.

Identify:

```text
Existing files
Existing frontend
Existing backend
Existing database
Existing environment variables
Existing components
Existing routes
```

Do not destroy existing functionality.

Then propose the architecture.

---

## Phase 2 — Design System

Create:

* Theme
* Typography
* Spacing
* Components
* Buttons
* Inputs
* Cards
* Tables
* Tabs
* Modals
* Toasts
* Badges
* Status indicators
* Empty states
* Error states
* Loading states

The result must look like a real professional product.

---

## Phase 3 — Supabase

Set up:

```text
Authentication
Profiles
Roles
RLS
Core database schema
```

Create migration files.

Never expose service-role credentials.

---

## Phase 4 — Doctor Experience

Build:

```text
Login
Doctor Dashboard
Patient Cases
Create Case
Simple Patient Condition text/voice input
Simple Doctor Assessment & Treatment text/voice input
Real-time voice transcription
Ground Truth
Run AI
AI Result
Doctor Review
```

Make this experience extremely simple.

The doctor should be able to complete the clinical input without navigating through a large form.

---

## Phase 5 — AI Lab

Build:

```text
AI Lab Dashboard
Cases
Datasets
Models
Prompts
RAG
Experiments
```

---

## Phase 6 — Comparison

Build:

```text
Multi-model execution
Side-by-side output
Ground Truth comparison
Output diff
```

---

## Phase 7 — Evaluation

Implement:

```text
Deterministic evaluation
Semantic evaluation
LLM-as-judge
Safety evaluation
Groundedness
Hallucination
Clinical alignment
Treatment alignment
```

---

## Phase 8 — Doctor feedback

Implement:

```text
Approve
Reject
Edit
Correction
Reason
Comment
```

Store all feedback.

---

## Phase 9 — Regression

Implement:

```text
Dataset runs
Version comparison
Regression detection
Historical trends
```

---

## Phase 10 — Analytics

Implement:

```text
Model analytics
Prompt analytics
RAG analytics
Error analysis
Cost
Latency
Quality trends
```

---

# 77. IMPORTANT DEVELOPMENT RULE

Before writing large amounts of code:

1. Inspect the existing repository.
2. Understand existing architecture.
3. Identify reusable components.
4. Identify existing environment variables.
5. Identify current Supabase configuration.
6. Identify existing backend/API.
7. Produce a concise implementation plan.
8. Then implement incrementally.

Do not rewrite the entire project unnecessarily.

---

# 78. CODE QUALITY

Use:

* TypeScript strict mode
* Strong typing
* Reusable components
* Clean folder structure
* Small focused modules
* Clear naming
* Error handling
* Validation
* Secure environment handling
* Meaningful comments only where necessary

Avoid:

* Giant components
* Duplicate code
* Hard-coded secrets
* Hard-coded authorization
* Magic strings everywhere
* Unnecessary dependencies
* Fake API responses in production code

---

# 79. FRONTEND FOLDER STRUCTURE

Use a scalable structure similar to:

```text
src/
├── app/
│   ├── router/
│   ├── providers/
│   └── config/
│
├── components/
│   ├── ui/
│   ├── clinical/
│   ├── ai-lab/
│   ├── comparison/
│   └── evaluation/
│
├── features/
│   ├── auth/
│   ├── patients/
│   ├── cases/
│   ├── ground-truth/
│   ├── models/
│   ├── prompts/
│   ├── rag/
│   ├── experiments/
│   ├── evaluation/
│   ├── reviews/
│   └── analytics/
│
├── pages/
│   ├── doctor/
│   ├── ai-lab/
│   └── admin/
│
├── services/
│   ├── supabase/
│   ├── api/
│   └── ai/
│
├── hooks/
├── types/
├── utils/
└── styles/
```

Adapt this to the existing project instead of blindly enforcing it.

---

# 80. ENVIRONMENT VARIABLES

Use environment variables appropriately.

Frontend:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
VITE_API_BASE_URL
```

Backend:

```text
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
AWS_REGION
MODEL_CONFIGURATION
```

Never expose backend secrets through Vite/frontend variables.

---

# 81. MOCK MODE

During early UI development, create a clean mock-data layer.

This allows the frontend to be developed before the full AI backend exists.

However:

Clearly separate:

```text
mock mode
```

from:

```text
production mode
```

Never pretend mocked AI output is real evaluation data.

For voice transcription during early UI development, a mock transcription provider may also be used if the real streaming transcription backend is not yet connected.

Clearly label mock behavior internally.

---

# 82. DEMO DATA

Create realistic but clearly synthetic physiotherapy test cases.

Example:

```text
PT-DEMO-001
PT-DEMO-002
PT-DEMO-003
```

Never use real patient information in demo data.

---

# 83. IMPORTANT CLINICAL PRINCIPLE

This platform is an AI evaluation and decision-support system.

Do not design the UI to imply that AI output is automatically correct.

Always make the distinction clear:

```text
Doctor Ground Truth
AI Output
AI Evaluation
Doctor Review
```

The doctor remains the reviewer/decision-maker.

---

# 84. ACCEPTANCE CRITERIA

The implementation is not complete until:

### Authentication

* Login works.
* Unauthorized users cannot access AI Lab.
* Roles are enforced server-side.
* RLS protects data.

### Doctor

* Doctor can create a case.
* Doctor can enter basic patient information.
* Doctor can enter patient condition using natural-language text.
* Doctor can record patient condition by voice.
* Voice is transcribed in real time where supported.
* Doctor can edit the transcription.
* Doctor can enter assessment/treatment using natural-language text.
* Doctor can record assessment/treatment by voice.
* Voice is transcribed in real time where supported.
* Doctor can edit the transcription.
* Doctor can enter ground truth.
* Doctor can run AI.
* Doctor can review AI output.
* Doctor can correct AI output.

### AI Lab

* Internal user can manage cases.
* Internal user can manage datasets.
* Internal user can manage models.
* Internal user can manage prompts.
* Internal user can manage RAG configurations.
* Internal user can run experiments.
* Internal user can compare models.
* Internal user can inspect retrieved context.
* Internal user can inspect rendered prompts.
* Internal user can evaluate outputs.
* Internal user can inspect errors.
* Internal user can view doctor feedback.
* Internal user can run regression tests.

### Evaluation

* Deterministic metrics work.
* Semantic evaluation works.
* LLM-as-judge produces structured output.
* Hallucination/unsupported claims are captured.
* Safety issues are captured.
* Clinical/treatment alignment is measured.
* Results are reproducible.

### UI

* UI is responsive.
* UI is accessible.
* UI is visually polished.
* Loading states exist.
* Error states exist.
* Empty states exist.
* Large datasets do not make the UI unusable.
* Doctor voice/text input feels smooth and natural.
* Recording and transcription states are clearly communicated.
* The doctor does not need to navigate through a complex clinical form.

---

# 85. FINAL PRODUCT GOAL

The final platform should allow this workflow:

```text
                DOCTOR
                  │
                  ▼
          Create Patient Case
                  │
                  ▼
      Enter Patient Condition
       Text OR Voice Recording
                  │
                  ▼
       Real-Time Transcription
                  │
                  ▼
       Doctor Reviews / Edits
                  │
                  ▼
    Enter Doctor Assessment &
        Treatment Ground Truth
       Text OR Voice Recording
                  │
                  ▼
       Real-Time Transcription
                  │
                  ▼
       Doctor Reviews / Edits
                  │
                  ▼
              Run AI
                  │
                  ▼
             AI OUTPUT
                  │
                  ▼
           Doctor Review
                  │
                  ▼
        Approved / Corrected Data
                  │
                  ▼
        ───────────────────────

             INTERNAL AI LAB

                  │
                  ▼
          Select Test Dataset
                  │
                  ▼
        Select Models / Prompts
                  │
                  ▼
          Select RAG Versions
                  │
                  ▼
           Run Experiments
                  │
                  ▼
      ┌───────────┼────────────┐
      ▼           ▼            ▼
    Model A     Model B      Model C
      │           │            │
      └───────────┼────────────┘
                  ▼
        Side-by-Side Comparison
                  │
                  ▼
       Ground Truth Comparison
                  │
                  ▼
       Automated Evaluation
                  │
                  ▼
          Doctor Feedback
                  │
                  ▼
           Error Analysis
                  │
                  ▼
        Prompt/RAG Improvement
                  │
                  ▼
        Regression Testing
                  │
                  ▼
       Improved DoctorSakhi AI
```

The ultimate purpose is:

**Build an evidence-driven development loop for the Physio AI system.**

Instead of manually asking whether an AI response "looks good", the platform must help us systematically determine:

```text
What was provided?
What did the doctor expect?
What did each model produce?
What information did the model receive?
What was correct?
What was missing?
What was unsupported?
What was unsafe?
What differed from the doctor?
Why did it fail?
Which configuration produced the improvement?
Does the improvement remain consistent across the dataset?
Did a new change cause regression?
```

Build the system around these principles from the beginning.

Do not sacrifice correctness, security, reproducibility, or usability for visual effects.

**The UI must be magnificent, but the evaluation architecture must be even stronger.**

Start by inspecting the existing project and producing:

1. Current architecture summary
2. Gap analysis
3. Proposed architecture
4. Database schema proposal
5. Route map
6. Component architecture
7. Authentication/RBAC design
8. AI evaluation architecture
9. Voice/transcription architecture
10. Development phases
11. Implementation plan

Do NOT immediately rewrite the entire application.

After presenting the plan, implement the project phase-by-phase, validating each phase before moving to the next.


<ADDITIONAL_METADATA>
The current local time is: 2026-09-27T17:41:48+05:30.

The user's current state is as follows:
Other open documents:
- c:\Users\DIKSHANT PATEL\Physio_assistant\physio_model_testing\src\index.css (LANGUAGE_CSS)
- c:\Users\DIKSHANT PATEL\Physio_assistant\physio_model_testing\vite.config.ts (LANGUAGE_TYPESCRIPT)
- c:\Users\DIKSHANT PATEL\Physio_assistant\physio_model_testing\tsconfig.json (LANGUAGE_UNSPECIFIED)
- c:\Users\DIKSHANT PATEL\Physio_assistant\physio_model_testing\tsconfig.app.json (LANGUAGE_JSON)
</ADDITIONAL_METADATA>