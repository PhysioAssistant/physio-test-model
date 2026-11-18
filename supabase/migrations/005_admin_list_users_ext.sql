-- ============================================================
-- Migration 005: Extended User Profile Admin View
-- ============================================================
-- This extends the previous admin_list_all_profiles function to
-- join with auth.users. This allows us to securely expose
-- the exact 'last_sign_in_at' timestamp maintained automatically
-- by Supabase Auth (GoTrue).
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
  last_login   timestamptz
)
language plpgsql
security definer
stable
as $$
declare
  caller_role text;
begin
  -- Verify the calling user is an admin
  select p.role into caller_role
  from public.profiles p
  where p.id = auth.uid();

  if caller_role is null or caller_role <> 'admin' then
    raise exception 'Access denied: admin role required';
  end if;

  -- Return all profiles, joining with auth.users to get last_sign_in_at
  return query
    select
      p.id,
      p.email,
      p.full_name,
      p.role,
      p.specialty,
      p.avatar_url,
      p.is_active,
      u.created_at as created_at,
      p.updated_at,
      u.last_sign_in_at as last_login
    from public.profiles p
    left join auth.users u on u.id = p.id
    order by u.created_at asc;
end;
$$;

grant execute on function public.admin_list_all_profiles() to authenticated;
