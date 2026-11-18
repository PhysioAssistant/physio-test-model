-- ============================================================
-- Migration 006: User Activity Logging + User Details RPC
-- Adds persistent login/activity tracking for Admin dashboards
-- ============================================================

-- ============================================================
-- Step 1: Create user_activity_logs table
-- Tracks every login event with metadata
-- ============================================================
create table if not exists public.user_activity_logs (
  id            uuid        primary key default uuid_generate_v4(),
  user_id       uuid        not null references public.profiles(id) on delete cascade,
  event_type    text        not null default 'login'
                            check (event_type in ('login', 'logout', 'page_view', 'action')),
  ip_address    text,
  user_agent    text,
  metadata      jsonb       default '{}',
  created_at    timestamptz not null default now()
);

-- Index for fast per-user queries
create index if not exists user_activity_logs_user_id_idx
  on public.user_activity_logs (user_id, created_at desc);

-- ============================================================
-- Step 2: Enable RLS on user_activity_logs
-- Only admins can read all logs; users can insert their own
-- ============================================================
alter table public.user_activity_logs enable row level security;

-- Users can insert their own activity
create policy "activity_logs_insert_own"
  on public.user_activity_logs for insert
  with check (auth.uid() = user_id);

-- Users can read their own logs
create policy "activity_logs_select_own"
  on public.user_activity_logs for select
  using (auth.uid() = user_id);

-- Admins can read all logs (using SECURITY DEFINER helper to avoid recursion)
create policy "activity_logs_select_admin"
  on public.user_activity_logs for select
  using (public.current_user_role() = 'admin');

-- ============================================================
-- Step 3: Admin RPC — get complete details for one user
-- Returns usage stats, login history, and patient cases
-- ============================================================
create or replace function public.admin_get_user_details(target_user_id uuid)
returns jsonb
language plpgsql
security definer
stable
as $$
declare
  caller_role    text;
  result         jsonb;
  p_count        int;
  c_count        int;
  gt_count       int;
  log_count      int;
  recent_logs    jsonb;
  recent_cases   jsonb;
begin
  -- Gate: only admins may call this
  select role into caller_role
  from public.profiles
  where id = auth.uid();

  if caller_role is null or caller_role <> 'admin' then
    raise exception 'Access denied: admin role required';
  end if;

  -- Patient count
  select count(*) into p_count
  from public.patients
  where created_by = target_user_id;

  -- Cases count
  select count(*) into c_count
  from public.patient_cases
  where created_by = target_user_id;

  -- Ground truth count
  select count(*) into gt_count
  from public.doctor_ground_truth
  where created_by = target_user_id;

  -- Login count from activity logs
  select count(*) into log_count
  from public.user_activity_logs
  where user_id = target_user_id and event_type = 'login';

  -- Recent login history (last 10)
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'ip',           l.ip_address,
        'user_agent',   l.user_agent,
        'logged_in_at', l.created_at
      ) order by l.created_at desc
    ),
    '[]'::jsonb
  )
  into recent_logs
  from (
    select ip_address, user_agent, created_at
    from public.user_activity_logs
    where user_id = target_user_id and event_type = 'login'
    order by created_at desc
    limit 10
  ) l;

  -- Recent patient cases with patient info (last 5)
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id',          pc.id,
        'title',       pc.title,
        'body_region', pc.body_region,
        'difficulty',  pc.difficulty,
        'status',      pc.status,
        'created_at',  pc.created_at,
        'patient',     case
                         when p.id is not null then jsonb_build_object(
                           'name', p.name,
                           'age',  p.age,
                           'sex',  p.sex
                         )
                         else null
                       end
      ) order by pc.created_at desc
    ),
    '[]'::jsonb
  )
  into recent_cases
  from (
    select id, title, body_region, difficulty, status, created_at, patient_id
    from public.patient_cases
    where created_by = target_user_id
    order by created_at desc
    limit 5
  ) pc
  left join public.patients p on p.id = pc.patient_id;

  -- Assemble result
  result := jsonb_build_object(
    'patient_count',       p_count,
    'case_count',          c_count,
    'ground_truth_count',  gt_count,
    'total_logins',        log_count,
    'active_sessions',     '[]'::jsonb,
    'login_history',       coalesce(recent_logs,  '[]'::jsonb),
    'recent_cases',        coalesce(recent_cases, '[]'::jsonb)
  );

  return result;
end;
$$;

grant execute on function public.admin_get_user_details(uuid) to authenticated;

-- ============================================================
-- Step 4: Update admin_list_all_profiles to include login count
-- (Drop and recreate with is_active column guaranteed to exist)
-- ============================================================
drop function if exists public.admin_list_all_profiles();

create or replace function public.admin_list_all_profiles()
returns table (
  id           uuid,
  email        text,
  full_name    text,
  role         text,
  specialty    text,
  avatar_url   text,
  is_active    boolean,
  created_at   timestamptz,
  updated_at   timestamptz,
  last_login   timestamptz,
  login_count  bigint
)
language plpgsql
security definer
stable
as $$
declare
  caller_role text;
begin
  select p.role into caller_role
  from public.profiles p
  where p.id = auth.uid();

  if caller_role is null or caller_role <> 'admin' then
    raise exception 'Access denied: admin role required';
  end if;

  return query
    select
      p.id,
      p.email,
      p.full_name,
      p.role,
      p.specialty,
      p.avatar_url,
      coalesce(p.is_active, true) as is_active,
      u.created_at as created_at,
      p.updated_at,
      u.last_sign_in_at as last_login,
      coalesce(lc.login_count, 0) as login_count
    from public.profiles p
    left join auth.users u on u.id = p.id
    left join (
      select user_id, count(*) as login_count
      from public.user_activity_logs
      where event_type = 'login'
      group by user_id
    ) lc on lc.user_id = p.id
    order by u.created_at asc;
end;
$$;

grant execute on function public.admin_list_all_profiles() to authenticated;

-- ============================================================
-- Step 5: Ensure is_active column exists (idempotent)
-- ============================================================
alter table public.profiles
  add column if not exists is_active boolean not null default true;
