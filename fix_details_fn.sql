create or replace function public.admin_get_user_details(target_user_id uuid)
returns jsonb language plpgsql security definer stable as $$
declare
  caller_role text;
  log_count   int;
  recent_logs jsonb;
begin
  select role into caller_role from public.profiles where id = auth.uid();
  if caller_role is null or caller_role <> 'admin' then
    raise exception 'Access denied';
  end if;
  select count(*) into log_count from public.user_activity_logs
  where user_id = target_user_id and event_type = 'login';
  select coalesce(
    jsonb_agg(
      jsonb_build_object('ip', l.ip_address, 'user_agent', l.user_agent, 'logged_in_at', l.created_at)
      order by l.created_at desc
    ), '[]'::jsonb)
  into recent_logs
  from (
    select ip_address, user_agent, created_at from public.user_activity_logs
    where user_id = target_user_id and event_type = 'login'
    order by created_at desc limit 10
  ) l;
  return jsonb_build_object(
    'patient_count', 0,
    'case_count', 0,
    'ground_truth_count', 0,
    'total_logins', log_count,
    'active_sessions', '[]'::jsonb,
    'login_history', coalesce(recent_logs, '[]'::jsonb),
    'recent_cases', '[]'::jsonb
  );
end;
$$;

grant execute on function public.admin_get_user_details(uuid) to authenticated;
