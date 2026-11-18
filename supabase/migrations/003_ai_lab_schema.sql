-- ============================================================
-- PHYSIO AI EVALUATION STUDIO
-- Migration 003: AI Lab Schema
-- Tables: ai_models, prompt_versions, rag_configs,
--         datasets, dataset_cases, experiments, experiment_runs,
--         retrieved_chunks, evaluations, doctor_reviews
-- ============================================================

-- ============================================================
-- AI MODELS REGISTRY
-- Provider-agnostic model configuration store
-- ============================================================
create table if not exists public.ai_models (
  id                          uuid        primary key default uuid_generate_v4(),
  name                        text        not null,
  provider                    text        not null
                              check (provider in ('anthropic','openai','bedrock','ollama','custom_http')),
  model_identifier            text        not null,   -- e.g. 'claude-3-5-sonnet-20241022'
  endpoint_url                text,                   -- for custom_http / ollama
  context_window              integer     not null default 200000,
  input_token_cost_per_1k     numeric(10,6) not null default 0,
  output_token_cost_per_1k    numeric(10,6) not null default 0,
  default_temperature         numeric(3,2) not null default 0.1,
  default_top_p               numeric(3,2),
  default_max_tokens          integer     not null default 4096,
  system_prompt_override      text,
  is_active                   boolean     not null default true,
  is_default_production       boolean     not null default false,
  created_by                  uuid        not null references public.profiles(id),
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now()
);

create trigger ai_models_updated_at
  before update on public.ai_models
  for each row execute function public.set_updated_at();

-- ============================================================
-- VERSIONED PROMPT LAB
-- ============================================================
create table if not exists public.prompt_versions (
  id                          uuid        primary key default uuid_generate_v4(),
  prompt_group_id             uuid        not null default uuid_generate_v4(), -- groups versions together
  name                        text        not null,
  version                     text        not null,    -- 'v1', 'v2', ...
  system_prompt               text        not null,
  user_prompt_template        text        not null,    -- contains {{patient_context}}, {{retrieved_context}}
  supported_variables         text[]      not null default '{}',
  expected_output_schema_json text,                    -- JSON schema string
  change_summary              text        not null default '',
  is_active                   boolean     not null default true,
  created_by                  uuid        not null references public.profiles(id),
  created_at                  timestamptz not null default now(),
  unique (prompt_group_id, version)
);

-- ============================================================
-- RAG CONFIGURATIONS
-- ============================================================
create table if not exists public.rag_configs (
  id                  uuid        primary key default uuid_generate_v4(),
  name                text        not null,
  version             text        not null,    -- 'kb-v12'
  knowledge_base_name text        not null,
  embedding_model     text        not null,
  chunk_size          integer     not null default 512,
  chunk_overlap       integer     not null default 64,
  retriever_type      text        not null default 'hybrid_rrf'
                      check (retriever_type in ('vector','bm25','hybrid_rrf')),
  top_k               integer     not null default 5,
  rrf_k_weight        numeric(6,3) not null default 60,
  reranker_enabled    boolean     not null default false,
  reranker_model      text,
  created_by          uuid        not null references public.profiles(id),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create trigger rag_configs_updated_at
  before update on public.rag_configs
  for each row execute function public.set_updated_at();

-- ============================================================
-- DATASETS
-- Named, versioned collections of patient cases
-- ============================================================
create table if not exists public.datasets (
  id                  uuid        primary key default uuid_generate_v4(),
  name                text        not null,
  version             text        not null default 'v1',
  description         text        not null default '',
  cohort              text        not null default 'mixed'
                      check (cohort in (
                        'knee','spine','shoulder','hip','geriatric',
                        'sports_rehab','post_op','mixed'
                      )),
  is_golden_dataset   boolean     not null default false,
  created_by          uuid        not null references public.profiles(id),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create trigger datasets_updated_at
  before update on public.datasets
  for each row execute function public.set_updated_at();

-- Join table: datasets ↔ patient_cases
create table if not exists public.dataset_cases (
  dataset_id  uuid not null references public.datasets(id) on delete cascade,
  case_id     uuid not null references public.patient_cases(id) on delete cascade,
  added_at    timestamptz not null default now(),
  primary key (dataset_id, case_id)
);

-- ============================================================
-- EXPERIMENTS
-- One experiment = one evaluation batch run configuration
-- ============================================================
create table if not exists public.experiments (
  id                  uuid        primary key default uuid_generate_v4(),
  name                text        not null,
  description         text,
  dataset_id          uuid        not null references public.datasets(id),
  model_ids           uuid[]      not null default '{}',
  prompt_version_id   uuid        not null references public.prompt_versions(id),
  rag_config_id       uuid        not null references public.rag_configs(id),
  status              text        not null default 'draft'
                      check (status in (
                        'draft','queued','running','completed',
                        'partial_failure','failed','cancelled'
                      )),
  total_cases         integer     not null default 0,
  completed_cases     integer     not null default 0,
  average_latency_ms  numeric(10,2),
  total_cost_usd      numeric(12,6),
  created_by          uuid        not null references public.profiles(id),
  created_at          timestamptz not null default now(),
  completed_at        timestamptz
);

-- ============================================================
-- EXPERIMENT RUNS
-- One row per case × model execution
-- ============================================================
create table if not exists public.experiment_runs (
  id                    uuid        primary key default uuid_generate_v4(),
  experiment_id         uuid        not null references public.experiments(id) on delete cascade,
  case_id               uuid        not null references public.patient_cases(id),
  model_id              uuid        not null references public.ai_models(id),
  prompt_version_id     uuid        not null references public.prompt_versions(id),
  rag_config_id         uuid        not null references public.rag_configs(id),

  rendered_prompt       text        not null default '',
  raw_output_text       text        not null default '',
  parsed_output_json    jsonb,      -- StructuredClinicalOutput as JSON

  latency_ms            integer     not null default 0,
  input_tokens          integer     not null default 0,
  output_tokens         integer     not null default 0,
  total_cost_usd        numeric(12,6) not null default 0,

  run_status            text        not null default 'success'
                        check (run_status in ('success','failure')),
  error_message         text,
  created_at            timestamptz not null default now()
);

-- Index for fast experiment → runs lookup
create index if not exists experiment_runs_experiment_idx
  on public.experiment_runs(experiment_id);

create index if not exists experiment_runs_case_idx
  on public.experiment_runs(case_id);

-- ============================================================
-- RETRIEVED CHUNKS
-- What RAG actually returned for each run
-- ============================================================
create table if not exists public.retrieved_chunks (
  id              uuid        primary key default uuid_generate_v4(),
  run_id          uuid        not null references public.experiment_runs(id) on delete cascade,
  chunk_id        text        not null,
  document_title  text        not null,
  source_chapter  text,
  page_number     integer,
  similarity_score numeric(5,4),
  keyword_score   numeric(5,4),
  rrf_score       numeric(5,4),
  rank            integer     not null,
  content         text        not null
);

create index if not exists retrieved_chunks_run_idx
  on public.retrieved_chunks(run_id);

-- ============================================================
-- EVALUATIONS (10-dimensional)
-- One row per experiment_run
-- ============================================================
create table if not exists public.evaluations (
  id                        uuid        primary key default uuid_generate_v4(),
  run_id                    uuid        not null unique references public.experiment_runs(id) on delete cascade,

  -- Each dimension stored as a JSONB object: {score, label, reasoning, issues[]}
  fact_accuracy             jsonb       not null default '{}',
  completeness              jsonb       not null default '{}',
  groundedness              jsonb       not null default '{}',
  hallucination_rate        jsonb       not null default '{}',
  clinical_alignment        jsonb       not null default '{}',
  treatment_alignment       jsonb       not null default '{}',
  exercise_relevance        jsonb       not null default '{}',
  safety_rating             jsonb       not null default '{}',
  format_compliance         jsonb       not null default '{}',
  doctor_alignment          jsonb       not null default '{}',

  overall_quality_summary   text        not null default '',
  critical_safety_passed    boolean     not null default true,
  evaluator_model           text,
  evaluated_at              timestamptz not null default now()
);

-- ============================================================
-- DOCTOR REVIEWS
-- Structured clinical feedback per run
-- ============================================================
create table if not exists public.doctor_reviews (
  id              uuid        primary key default uuid_generate_v4(),
  run_id          uuid        not null references public.experiment_runs(id) on delete cascade,
  case_id         uuid        not null references public.patient_cases(id),
  doctor_id       uuid        not null references public.profiles(id),

  decision        text        not null
                  check (decision in ('approved','corrected','rejected','flagged')),
  overall_comment text,
  corrections     jsonb       not null default '[]',   -- array of DoctorCorrection objects
  reviewed_at     timestamptz not null default now()
);

create index if not exists doctor_reviews_run_idx  on public.doctor_reviews(run_id);
create index if not exists doctor_reviews_case_idx on public.doctor_reviews(case_id);

-- ============================================================
-- RLS — AI LAB TABLES
-- All AI Lab tables: ai_user + admin can read; only admin writes.
-- In practice experiment_runs are created by the backend service role.
-- ============================================================

-- ai_models
alter table public.ai_models enable row level security;
create policy "ai_models_read_lab"  on public.ai_models for select
  using (public.current_user_role() in ('ai_user','admin'));
create policy "ai_models_write_admin" on public.ai_models for all
  using (public.current_user_role() = 'admin');

-- prompt_versions
alter table public.prompt_versions enable row level security;
create policy "prompt_versions_read_lab" on public.prompt_versions for select
  using (public.current_user_role() in ('ai_user','admin'));
create policy "prompt_versions_write_admin" on public.prompt_versions for all
  using (public.current_user_role() = 'admin');

-- rag_configs
alter table public.rag_configs enable row level security;
create policy "rag_configs_read_lab" on public.rag_configs for select
  using (public.current_user_role() in ('ai_user','admin'));
create policy "rag_configs_write_admin" on public.rag_configs for all
  using (public.current_user_role() = 'admin');

-- datasets
alter table public.datasets enable row level security;
create policy "datasets_read_lab" on public.datasets for select
  using (public.current_user_role() in ('ai_user','admin'));
create policy "datasets_write_lab" on public.datasets for insert
  with check (public.current_user_role() in ('ai_user','admin'));
create policy "datasets_update_lab" on public.datasets for update
  using (public.current_user_role() in ('ai_user','admin'));

-- dataset_cases
alter table public.dataset_cases enable row level security;
create policy "dataset_cases_read_lab" on public.dataset_cases for select
  using (public.current_user_role() in ('ai_user','admin'));
create policy "dataset_cases_write_lab" on public.dataset_cases for all
  using (public.current_user_role() in ('ai_user','admin'));

-- experiments
alter table public.experiments enable row level security;
create policy "experiments_read_lab" on public.experiments for select
  using (public.current_user_role() in ('ai_user','admin'));
create policy "experiments_write_lab" on public.experiments for insert
  with check (public.current_user_role() in ('ai_user','admin'));
create policy "experiments_update_lab" on public.experiments for update
  using (public.current_user_role() in ('ai_user','admin'));

-- experiment_runs (service role writes; lab users read)
alter table public.experiment_runs enable row level security;
create policy "experiment_runs_read_lab" on public.experiment_runs for select
  using (public.current_user_role() in ('ai_user','admin'));

-- retrieved_chunks
alter table public.retrieved_chunks enable row level security;
create policy "retrieved_chunks_read_lab" on public.retrieved_chunks for select
  using (public.current_user_role() in ('ai_user','admin'));

-- evaluations
alter table public.evaluations enable row level security;
create policy "evaluations_read_lab" on public.evaluations for select
  using (public.current_user_role() in ('ai_user','admin'));

-- doctor_reviews
alter table public.doctor_reviews enable row level security;
create policy "doctor_reviews_read_doctor_own"
  on public.doctor_reviews for select
  using (doctor_id = auth.uid());
create policy "doctor_reviews_insert_doctor"
  on public.doctor_reviews for insert
  with check (
    doctor_id = auth.uid()
    and public.current_user_role() in ('doctor','admin')
  );
create policy "doctor_reviews_update_doctor_own"
  on public.doctor_reviews for update
  using (doctor_id = auth.uid());
create policy "doctor_reviews_read_lab"
  on public.doctor_reviews for select
  using (public.current_user_role() in ('ai_user','admin'));
