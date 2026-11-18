create or replace function public.admin_update_user_role(target_user_id uuid, new_role text)
returns void language plpgsql security definer as $$
declare
  caller_role text;
begin
  -- 1. Check if caller is admin
  select role into caller_role from public.profiles where id = auth.uid();
  if caller_role is null or caller_role <> 'admin' then
    raise exception 'Access denied: admin role required';
  end if;

  -- 2. Validate role
  if new_role not in ('doctor', 'ai_user', 'ai_operator', 'admin') then
    raise exception 'Invalid role: %', new_role;
  end if;

  -- 3. Update the profile
  update public.profiles
  set role = new_role, updated_at = now()
  where id = target_user_id;
end;
$$;
grant execute on function public.admin_update_user_role(uuid, text) to authenticated;

create or replace function public.admin_update_user_status(target_user_id uuid, new_status boolean)
returns void language plpgsql security definer as $$
declare
  caller_role text;
begin
  -- 1. Check if caller is admin
  select role into caller_role from public.profiles where id = auth.uid();
  if caller_role is null or caller_role <> 'admin' then
    raise exception 'Access denied: admin role required';
  end if;

  -- 2. Update the profile
  update public.profiles
  set is_active = new_status, updated_at = now()
  where id = target_user_id;
end;
$$;
grant execute on function public.admin_update_user_status(uuid, boolean) to authenticated;
