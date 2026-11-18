-- ============================================================
-- SEED: Development Test Users
-- Run AFTER migrations 001-003.
-- Creates 3 test accounts via Supabase Auth.
-- NOTE: In production, create users via the Supabase Dashboard
--       or invite flow. This seed is for local dev only.
-- ============================================================

-- To create test users via Supabase SQL Editor use this pattern:
-- (Supabase handles the auth.users row; profiles auto-created by trigger)

-- 1. Doctor user
-- Dashboard → Authentication → Users → Add User:
--   Email: doctor@physio.dev
--   Password: PhysioDoc123!
--   user_metadata: { "full_name": "Dr. Ananya Sharma", "role": "doctor" }

-- 2. AI Researcher user  
-- Dashboard → Authentication → Users → Add User:
--   Email: researcher@physio.dev
--   Password: PhysioLab123!
--   user_metadata: { "full_name": "Rahul Verma", "role": "ai_user" }

-- 3. Admin user
-- Dashboard → Authentication → Users → Add User:
--   Email: admin@physio.dev
--   Password: PhysioAdmin123!
--   user_metadata: { "full_name": "Platform Admin", "role": "admin" }

-- ============================================================
-- SEED: Sample AI Model entries
-- ============================================================
insert into public.ai_models (
  name, provider, model_identifier, context_window,
  input_token_cost_per_1k, output_token_cost_per_1k,
  default_temperature, default_max_tokens, is_active, is_default_production,
  created_by
)
select
  'Claude 3.5 Sonnet', 'anthropic', 'claude-3-5-sonnet-20241022', 200000,
  0.003, 0.015, 0.10, 4096, true, true,
  (select id from public.profiles limit 1)
where exists (select 1 from public.profiles limit 1)
on conflict do nothing;

insert into public.ai_models (
  name, provider, model_identifier, context_window,
  input_token_cost_per_1k, output_token_cost_per_1k,
  default_temperature, default_max_tokens, is_active, is_default_production,
  created_by
)
select
  'GPT-4o', 'openai', 'gpt-4o', 128000,
  0.0025, 0.010, 0.10, 4096, true, false,
  (select id from public.profiles limit 1)
where exists (select 1 from public.profiles limit 1)
on conflict do nothing;

insert into public.ai_models (
  name, provider, model_identifier, context_window,
  input_token_cost_per_1k, output_token_cost_per_1k,
  default_temperature, default_max_tokens, is_active, is_default_production,
  created_by
)
select
  'Claude 3 Haiku (Fast)', 'anthropic', 'claude-3-haiku-20240307', 200000,
  0.00025, 0.00125, 0.10, 4096, true, false,
  (select id from public.profiles limit 1)
where exists (select 1 from public.profiles limit 1)
on conflict do nothing;

-- ============================================================
-- SEED: Sample RAG Configuration
-- ============================================================
insert into public.rag_configs (
  name, version, knowledge_base_name, embedding_model,
  chunk_size, chunk_overlap, retriever_type, top_k, rrf_k_weight,
  reranker_enabled, created_by
)
select
  'Physio KB Hybrid v1', 'kb-v1', 'physiotherapy_textbooks',
  'text-embedding-3-small', 512, 64, 'hybrid_rrf', 5, 60,
  false, (select id from public.profiles limit 1)
where exists (select 1 from public.profiles limit 1)
on conflict do nothing;

-- ============================================================
-- SEED: Sample Prompt Version
-- ============================================================
insert into public.prompt_versions (
  name, version, system_prompt, user_prompt_template,
  supported_variables, change_summary, is_active, created_by
)
select
  'Physio Assessment Prompt', 'v1',
  'You are DoctorSakhi, an expert physiotherapy AI assistant. Your role is to analyze clinical information and generate evidence-based physiotherapy assessments and treatment plans.

CRITICAL RULES:
1. Only document what is explicitly stated in the patient information.
2. Never infer or hallucinate clinical findings as Normal or Negative unless explicitly documented.
3. If information is missing, state "Not documented" — never guess.
4. Always cite retrieved clinical evidence where relevant.
5. Maintain strict anatomical precision — body side, severity, and duration must be exact.',
  '{{patient_context}}

RETRIEVED CLINICAL EVIDENCE:
{{retrieved_context}}

Generate a structured physiotherapy assessment and treatment plan.',
  ARRAY['patient_context', 'retrieved_context'],
  'Initial baseline prompt',
  true,
  (select id from public.profiles limit 1)
where exists (select 1 from public.profiles limit 1)
on conflict do nothing;
