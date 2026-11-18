-- ============================================================
-- PHYSIO AI EVALUATION STUDIO
-- Migration 002: Core Domain Schema
-- Tables: patients, patient_cases, doctor_ground_truth
-- ============================================================

-- ============================================================
-- PATIENTS
-- ============================================================
create table if not exists public.patients (
  id           uuid        primary key default uuid_generate_v4(),
  mrn          text        not null unique,   -- Medical Record Number
  name         text        not null,
  age          integer     not null check (age > 0 and age < 150),
  sex          text        not null default 'unspecified'
                           check (sex in ('male','female','other','unspecified')),
  weight_kg    numeric(5,2),
  created_by   uuid        not null references public.profiles(id),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create trigger patients_updated_at
  before update on public.patients
  for each row execute function public.set_updated_at();

-- ============================================================
-- PATIENT CASES
-- ============================================================
create table if not exists public.patient_cases (
  id                      uuid        primary key default uuid_generate_v4(),
  patient_id              uuid        not null references public.patients(id) on delete cascade,
  title                   text        not null,

  -- Free-form clinical input (text + voice)
  condition_text          text        not null default '',
  condition_audio_url     text,
  condition_transcript    text,
  condition_final_text    text        not null default '',   -- authoritative text

  -- Metadata
  body_region             text        not null default 'multi_region'
                          check (body_region in (
                            'knee','spine','shoulder','hip','neck',
                            'ankle','elbow','multi_region'
                          )),
  tags                    text[]      not null default '{}',
  difficulty              text        not null default 'moderate'
                          check (difficulty in ('easy','moderate','complex','high_risk')),
  status                  text        not null default 'draft'
                          check (status in (
                            'draft','ground_truth_ready','evaluating','reviewed'
                          )),

  created_by              uuid        not null references public.profiles(id),
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

create trigger patient_cases_updated_at
  before update on public.patient_cases
  for each row execute function public.set_updated_at();

-- Full-text search index on condition text
create index if not exists patient_cases_condition_fts
  on public.patient_cases
  using gin(to_tsvector('english', condition_final_text));

-- ============================================================
-- DOCTOR GROUND TRUTH
-- One ground truth record per case
-- ============================================================
create table if not exists public.doctor_ground_truth (
  id                          uuid        primary key default uuid_generate_v4(),
  case_id                     uuid        not null unique references public.patient_cases(id) on delete cascade,

  assessment_text             text        not null default '',
  treatment_plan_text         text        not null default '',
  audio_url                   text,
  transcript                  text,

  -- Structured reference arrays for evaluation
  key_clinical_priorities     text[]      not null default '{}',
  prescribed_exercises        text[]      not null default '{}',
  contraindications_exclusions text[]     not null default '{}',
  expected_functional_goals   text[]      not null default '{}',

  created_by                  uuid        not null references public.profiles(id),
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now()
);

create trigger ground_truth_updated_at
  before update on public.doctor_ground_truth
  for each row execute function public.set_updated_at();

-- ============================================================
-- RLS — PATIENTS
-- Doctors: manage their own patients
-- AI Users: read-only
-- Admins: full access
-- ============================================================
alter table public.patients enable row level security;

create policy "patients_select_doctor_own"
  on public.patients for select
  using (created_by = auth.uid());

create policy "patients_insert_doctor"
  on public.patients for insert
  with check (
    created_by = auth.uid()
    and public.current_user_role() in ('doctor','admin')
  );

create policy "patients_update_doctor_own"
  on public.patients for update
  using (created_by = auth.uid());

create policy "patients_select_ai_user"
  on public.patients for select
  using (public.current_user_role() in ('ai_user','admin'));

create policy "patients_all_admin"
  on public.patients for all
  using (public.current_user_role() = 'admin');

-- ============================================================
-- RLS — PATIENT CASES
-- ============================================================
alter table public.patient_cases enable row level security;

create policy "cases_select_doctor_own"
  on public.patient_cases for select
  using (created_by = auth.uid());

create policy "cases_insert_doctor"
  on public.patient_cases for insert
  with check (
    created_by = auth.uid()
    and public.current_user_role() in ('doctor','admin')
  );

create policy "cases_update_doctor_own"
  on public.patient_cases for update
  using (created_by = auth.uid());

create policy "cases_select_ai_lab"
  on public.patient_cases for select
  using (public.current_user_role() in ('ai_user','admin'));

create policy "cases_all_admin"
  on public.patient_cases for all
  using (public.current_user_role() = 'admin');

-- ============================================================
-- RLS — DOCTOR GROUND TRUTH
-- ============================================================
alter table public.doctor_ground_truth enable row level security;

create policy "ground_truth_select_doctor_own"
  on public.doctor_ground_truth for select
  using (created_by = auth.uid());

create policy "ground_truth_insert_doctor"
  on public.doctor_ground_truth for insert
  with check (
    created_by = auth.uid()
    and public.current_user_role() in ('doctor','admin')
  );

create policy "ground_truth_update_doctor_own"
  on public.doctor_ground_truth for update
  using (created_by = auth.uid());

create policy "ground_truth_select_ai_lab"
  on public.doctor_ground_truth for select
  using (public.current_user_role() in ('ai_user','admin'));

create policy "ground_truth_all_admin"
  on public.doctor_ground_truth for all
  using (public.current_user_role() = 'admin');
