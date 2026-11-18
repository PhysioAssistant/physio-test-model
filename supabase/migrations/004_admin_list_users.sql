-- ============================================================
-- Migration 004: Admin-Safe User Listing Function
-- ============================================================
-- The original profiles_select_admin RLS policy has a recursive
-- self-join problem (querying public.profiles inside an RLS policy
-- on public.profiles). This migration:
--   1. Drops the broken recursive policy.
--   2. Creates a SECURITY DEFINER function that admins can call via
--      rpc('admin_list_all_profiles') to safely fetch all user profiles.
--      The function checks the caller is an admin before returning data.
-- ============================================================

-- Step 1: Drop the broken recursive admin select policy
drop policy if exists "profiles_select_admin" on public.profiles;

-- Step 2: Create a safe, admin-gated function to list all profiles
-- SECURITY DEFINER runs as the function owner (bypasses RLS safely).
-- The explicit admin check inside guards against misuse.
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
  updated_at   timestamptz
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

  -- Return all profiles
  return query
    select
      p.id,
      p.email,
      p.full_name,
      p.role,
      p.specialty,
      p.avatar_url,
      p.is_active,
      p.created_at,
      p.updated_at
    from public.profiles p
    order by p.created_at asc;
end;
$$;

-- Grant execute permission to authenticated users
-- (the function itself checks for admin role internally)
grant execute on function public.admin_list_all_profiles() to authenticated;

-- ============================================================
-- Verify: Run the following in SQL Editor to test after migration:
--   select * from public.admin_list_all_profiles();
-- (Must be logged in as an admin user)
-- ============================================================
