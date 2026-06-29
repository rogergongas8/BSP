create or replace function public.increment_activities(p_user_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.profiles
  set activities_completed = activities_completed + 1
  where id = p_user_id;
$$;
