-- ============================================================================
-- DoctorSakhi AI Evaluation Studio — Supabase Schema Migration
-- Run this in: Supabase Dashboard → SQL Editor → New Query → Run
-- ============================================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 1. PROFILES (extends Supabase auth.users)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email         TEXT NOT NULL,
  full_name     TEXT NOT NULL DEFAULT '',
  role          TEXT NOT NULL DEFAULT 'doctor' CHECK (role IN ('doctor', 'ai_user', 'admin')),
  avatar_url    TEXT,
  specialty     TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-create profile on new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'doctor')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- 2. PATIENTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.patients (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mrn         TEXT NOT NULL UNIQUE,
  name        TEXT NOT NULL,
  age         INTEGER NOT NULL CHECK (age > 0 AND age < 150),
  sex         TEXT NOT NULL DEFAULT 'unspecified' CHECK (sex IN ('male', 'female', 'other', 'unspecified')),
  weight_kg   NUMERIC(5,2),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 3. PATIENT CASES
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.patient_cases (
  id                     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id             UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  title                  TEXT NOT NULL,
  condition_text         TEXT NOT NULL DEFAULT '',
  condition_audio_url    TEXT,
  condition_transcript   TEXT,
  condition_final_text   TEXT NOT NULL DEFAULT '',
  body_region            TEXT NOT NULL DEFAULT 'knee'
                           CHECK (body_region IN ('knee','spine','shoulder','hip','neck','ankle','elbow','multi_region')),
  tags                   TEXT[]  NOT NULL DEFAULT '{}',
  difficulty             TEXT NOT NULL DEFAULT 'moderate'
                           CHECK (difficulty IN ('easy','moderate','complex','high_risk')),
  status                 TEXT NOT NULL DEFAULT 'draft'
                           CHECK (status IN ('draft','ground_truth_ready','evaluating','reviewed')),
  structured_facts       JSONB NOT NULL DEFAULT '[]',
  created_by             UUID REFERENCES public.profiles(id),
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 4. DOCTOR GROUND TRUTH
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.doctor_ground_truth (
  id                           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  case_id                      UUID NOT NULL UNIQUE REFERENCES public.patient_cases(id) ON DELETE CASCADE,
  assessment_text              TEXT NOT NULL DEFAULT '',
  treatment_plan_text          TEXT NOT NULL DEFAULT '',
  audio_url                    TEXT,
  transcript                   TEXT,
  key_clinical_priorities      TEXT[] NOT NULL DEFAULT '{}',
  prescribed_exercises         TEXT[] NOT NULL DEFAULT '{}',
  contraindications_exclusions TEXT[] NOT NULL DEFAULT '{}',
  expected_functional_goals    TEXT[] NOT NULL DEFAULT '{}',
  created_by                   UUID REFERENCES public.profiles(id),
  created_at                   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 5. AI MODELS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.ai_models (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name                    TEXT NOT NULL,
  provider                TEXT NOT NULL CHECK (provider IN ('anthropic','openai','bedrock','ollama','custom_http')),
  model_identifier        TEXT NOT NULL,
  endpoint_url            TEXT,
  context_window          INTEGER NOT NULL DEFAULT 128000,
  input_token_cost_per_1k NUMERIC(8,6) NOT NULL DEFAULT 0.003,
  output_token_cost_per_1k NUMERIC(8,6) NOT NULL DEFAULT 0.015,
  default_config          JSONB NOT NULL DEFAULT '{"temperature":0.1,"maxTokens":4096}',
  is_active               BOOLEAN NOT NULL DEFAULT TRUE,
  is_default_production   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 6. PROMPT VERSIONS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.prompt_versions (
  id                       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  prompt_id                TEXT NOT NULL DEFAULT 'physio-main',
  name                     TEXT NOT NULL,
  version                  TEXT NOT NULL,
  system_prompt            TEXT NOT NULL DEFAULT '',
  user_prompt_template     TEXT NOT NULL DEFAULT '',
  supported_variables      TEXT[] NOT NULL DEFAULT '{}',
  expected_output_schema_json TEXT NOT NULL DEFAULT '{}',
  change_summary           TEXT NOT NULL DEFAULT '',
  is_active                BOOLEAN NOT NULL DEFAULT FALSE,
  created_by               UUID REFERENCES public.profiles(id),
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 7. RAG CONFIGS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.rag_configs (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name                TEXT NOT NULL,
  version             TEXT NOT NULL,
  knowledge_base_name TEXT NOT NULL DEFAULT '',
  embedding_model     TEXT NOT NULL DEFAULT 'text-embedding-3-large',
  chunk_size          INTEGER NOT NULL DEFAULT 512,
  chunk_overlap       INTEGER NOT NULL DEFAULT 64,
  retriever_type      TEXT NOT NULL DEFAULT 'hybrid_rrf'
                        CHECK (retriever_type IN ('vector','bm25','hybrid_rrf')),
  top_k               INTEGER NOT NULL DEFAULT 8,
  rrf_k_weight        NUMERIC(4,2) NOT NULL DEFAULT 60,
  reranker_enabled    BOOLEAN NOT NULL DEFAULT TRUE,
  reranker_model      TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 8. DATASETS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.datasets (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  version     TEXT NOT NULL DEFAULT 'v1',
  description TEXT NOT NULL DEFAULT '',
  cohort      TEXT NOT NULL DEFAULT 'mixed'
                CHECK (cohort IN ('knee','spine','shoulder','hip','geriatric','sports_rehab','post_op','mixed')),
  case_ids    TEXT[] NOT NULL DEFAULT '{}',
  total_cases INTEGER NOT NULL DEFAULT 0,
  is_golden_dataset BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Dataset ↔ Case join table
CREATE TABLE IF NOT EXISTS public.dataset_cases (
  dataset_id UUID NOT NULL REFERENCES public.datasets(id) ON DELETE CASCADE,
  case_id    UUID NOT NULL REFERENCES public.patient_cases(id) ON DELETE CASCADE,
  PRIMARY KEY (dataset_id, case_id)
);

-- ============================================================================
-- 9. EXPERIMENTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.experiments (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name                TEXT NOT NULL,
  description         TEXT,
  dataset_id          UUID REFERENCES public.datasets(id),
  model_ids           TEXT[] NOT NULL DEFAULT '{}',
  prompt_version_id   UUID REFERENCES public.prompt_versions(id),
  rag_config_id       UUID REFERENCES public.rag_configs(id),
  status              TEXT NOT NULL DEFAULT 'draft'
                        CHECK (status IN ('draft','queued','running','completed','partial_failure','failed','cancelled')),
  total_cases         INTEGER NOT NULL DEFAULT 0,
  completed_cases     INTEGER NOT NULL DEFAULT 0,
  average_latency_ms  NUMERIC(10,2),
  total_cost_usd      NUMERIC(10,6),
  created_by          UUID REFERENCES public.profiles(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at        TIMESTAMPTZ
);

-- ============================================================================
-- 10. EXPERIMENT RUNS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.experiment_runs (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  experiment_id     UUID NOT NULL REFERENCES public.experiments(id) ON DELETE CASCADE,
  case_id           UUID NOT NULL REFERENCES public.patient_cases(id),
  model_id          UUID NOT NULL REFERENCES public.ai_models(id),
  prompt_version_id UUID REFERENCES public.prompt_versions(id),
  rag_config_id     UUID REFERENCES public.rag_configs(id),
  rendered_prompt   TEXT NOT NULL DEFAULT '',
  retrieved_chunks  JSONB NOT NULL DEFAULT '[]',
  raw_output_text   TEXT NOT NULL DEFAULT '',
  parsed_output     JSONB,
  latency_ms        INTEGER NOT NULL DEFAULT 0,
  input_tokens      INTEGER NOT NULL DEFAULT 0,
  output_tokens     INTEGER NOT NULL DEFAULT 0,
  total_cost_usd    NUMERIC(10,6) NOT NULL DEFAULT 0,
  status            TEXT NOT NULL DEFAULT 'success' CHECK (status IN ('success','failure')),
  error_message     TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 11. EVALUATIONS (10-Dimensional)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.evaluations (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  run_id                  UUID NOT NULL UNIQUE REFERENCES public.experiment_runs(id) ON DELETE CASCADE,
  fact_accuracy           JSONB NOT NULL DEFAULT '{}',
  completeness            JSONB NOT NULL DEFAULT '{}',
  groundedness            JSONB NOT NULL DEFAULT '{}',
  hallucination_rate      JSONB NOT NULL DEFAULT '{}',
  clinical_alignment      JSONB NOT NULL DEFAULT '{}',
  treatment_alignment     JSONB NOT NULL DEFAULT '{}',
  exercise_relevance      JSONB NOT NULL DEFAULT '{}',
  safety_rating           JSONB NOT NULL DEFAULT '{}',
  format_compliance       JSONB NOT NULL DEFAULT '{}',
  doctor_alignment        JSONB NOT NULL DEFAULT '{}',
  overall_quality_summary TEXT NOT NULL DEFAULT '',
  critical_safety_passed  BOOLEAN NOT NULL DEFAULT TRUE,
  evaluated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  evaluator_model         TEXT
);

-- ============================================================================
-- 12. DOCTOR REVIEWS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.doctor_reviews (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  run_id          UUID REFERENCES public.experiment_runs(id),
  case_id         UUID NOT NULL REFERENCES public.patient_cases(id),
  doctor_id       UUID NOT NULL REFERENCES public.profiles(id),
  doctor_name     TEXT NOT NULL DEFAULT '',
  decision        TEXT NOT NULL CHECK (decision IN ('approved','corrected','rejected','flagged')),
  overall_comment TEXT,
  corrections     JSONB NOT NULL DEFAULT '[]',
  reviewed_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- INDEXES for query performance
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_patient_cases_patient_id    ON public.patient_cases(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_cases_status        ON public.patient_cases(status);
CREATE INDEX IF NOT EXISTS idx_patient_cases_body_region   ON public.patient_cases(body_region);
CREATE INDEX IF NOT EXISTS idx_experiment_runs_experiment  ON public.experiment_runs(experiment_id);
CREATE INDEX IF NOT EXISTS idx_experiment_runs_case        ON public.experiment_runs(case_id);
CREATE INDEX IF NOT EXISTS idx_experiment_runs_model       ON public.experiment_runs(model_id);
CREATE INDEX IF NOT EXISTS idx_evaluations_run_id          ON public.evaluations(run_id);
CREATE INDEX IF NOT EXISTS idx_doctor_reviews_case_id      ON public.doctor_reviews(case_id);
CREATE INDEX IF NOT EXISTS idx_doctor_reviews_doctor_id    ON public.doctor_reviews(doctor_id);
CREATE INDEX IF NOT EXISTS idx_doctor_ground_truth_case    ON public.doctor_ground_truth(case_id);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================
-- Enable RLS on all tables
ALTER TABLE public.profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_cases     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctor_ground_truth ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_models         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prompt_versions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rag_configs       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.datasets          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dataset_cases     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.experiments       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.experiment_runs   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluations       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctor_reviews    ENABLE ROW LEVEL SECURITY;

-- Profiles: all authenticated users can view profiles; users can update own, admins can update any
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_all" ON public.profiles
  FOR SELECT TO authenticated USING (TRUE);

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_admin_or_own" ON public.profiles
  FOR UPDATE TO authenticated
  USING (
    auth.uid() = id OR 
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  );

-- All authenticated users can read shared resources
CREATE POLICY "authenticated_read_patients" ON public.patients
  FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "authenticated_write_patients" ON public.patients
  FOR ALL TO authenticated USING (TRUE);

CREATE POLICY "authenticated_read_cases" ON public.patient_cases
  FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "authenticated_write_cases" ON public.patient_cases
  FOR ALL TO authenticated USING (TRUE);

CREATE POLICY "authenticated_read_ground_truth" ON public.doctor_ground_truth
  FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "authenticated_write_ground_truth" ON public.doctor_ground_truth
  FOR ALL TO authenticated USING (TRUE);

CREATE POLICY "authenticated_read_models" ON public.ai_models
  FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "authenticated_write_models" ON public.ai_models
  FOR ALL TO authenticated USING (TRUE);

CREATE POLICY "authenticated_read_prompts" ON public.prompt_versions
  FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "authenticated_write_prompts" ON public.prompt_versions
  FOR ALL TO authenticated USING (TRUE);

CREATE POLICY "authenticated_read_rag" ON public.rag_configs
  FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "authenticated_write_rag" ON public.rag_configs
  FOR ALL TO authenticated USING (TRUE);

CREATE POLICY "authenticated_read_datasets" ON public.datasets
  FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "authenticated_write_datasets" ON public.datasets
  FOR ALL TO authenticated USING (TRUE);

CREATE POLICY "authenticated_read_dataset_cases" ON public.dataset_cases
  FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "authenticated_write_dataset_cases" ON public.dataset_cases
  FOR ALL TO authenticated USING (TRUE);

CREATE POLICY "authenticated_read_experiments" ON public.experiments
  FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "authenticated_write_experiments" ON public.experiments
  FOR ALL TO authenticated USING (TRUE);

CREATE POLICY "authenticated_read_runs" ON public.experiment_runs
  FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "authenticated_write_runs" ON public.experiment_runs
  FOR ALL TO authenticated USING (TRUE);

CREATE POLICY "authenticated_read_evaluations" ON public.evaluations
  FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "authenticated_write_evaluations" ON public.evaluations
  FOR ALL TO authenticated USING (TRUE);

CREATE POLICY "authenticated_read_reviews" ON public.doctor_reviews
  FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "authenticated_write_reviews" ON public.doctor_reviews
  FOR ALL TO authenticated USING (TRUE);

-- ============================================================================
-- UPDATED_AT auto-trigger helper
-- ============================================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_patients_updated_at
  BEFORE UPDATE ON public.patients
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE TRIGGER trg_patient_cases_updated_at
  BEFORE UPDATE ON public.patient_cases
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE TRIGGER trg_doctor_ground_truth_updated_at
  BEFORE UPDATE ON public.doctor_ground_truth
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE TRIGGER trg_ai_models_updated_at
  BEFORE UPDATE ON public.ai_models
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE TRIGGER trg_rag_configs_updated_at
  BEFORE UPDATE ON public.rag_configs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- Done! All 13 tables created with RLS, indexes, and triggers.
-- ============================================================================
