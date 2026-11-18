-- ============================================================
-- RESET AUTHORIZATION — Run in Supabase Dashboard → SQL Editor
-- Clears all user records and resets the authorization database.
-- Does NOT drop tables, functions, triggers, or RLS policies.
-- After this, users must register through the login page.
-- ============================================================

-- 1. Clear all application data (foreign-key dependency order)
DELETE FROM public.doctor_reviews;
DELETE FROM public.evaluations;
DELETE FROM public.experiment_runs;
DELETE FROM public.experiments;
DELETE FROM public.dataset_cases;
DELETE FROM public.datasets;
DELETE FROM public.doctor_ground_truth;
DELETE FROM public.patient_cases;
DELETE FROM public.patients;
DELETE FROM public.prompt_versions;
DELETE FROM public.rag_configs;
DELETE FROM public.ai_models;

-- 2. Clear user profiles
DELETE FROM public.profiles;

-- 3. Clear all Supabase Auth users
DELETE FROM auth.users;

-- 4. Fix missing INSERT policy on profiles (allows trigger + manual insert)
DROP POLICY IF EXISTS "profiles_insert_self"    ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_trigger" ON public.profiles;
CREATE POLICY "profiles_insert_trigger" ON public.profiles
  FOR INSERT WITH CHECK (true);

-- 5. Ensure UPDATE policy has WITH CHECK clause
DROP POLICY IF EXISTS "profiles_update_admin_or_own" ON public.profiles;
CREATE POLICY "profiles_update_admin_or_own" ON public.profiles
  FOR UPDATE TO authenticated
  USING (
    auth.uid() = id OR
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  )
  WITH CHECK (
    auth.uid() = id OR
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  );

-- ============================================================
-- Done. Authorization database is now empty.
-- 
-- After your first signup via the app, promote yourself to admin:
--   UPDATE public.profiles
--   SET role = 'admin'
--   WHERE email = 'dikshantpatel2210@gmail.com';
-- ============================================================
