-- Atomically switch the active Creator Profile for the signed-in Pro user.
create or replace function public.set_my_active_creator_profile(p_profile_id uuid)
returns void
language plpgsql
set search_path = public
as $$
declare
  account_plan text;
begin
  if auth.uid() is null then
    raise exception 'Sign in first';
  end if;

  select plan into account_plan
  from public.profiles
  where id = auth.uid();

  if account_plan is distinct from 'pro' then
    raise exception 'Droop Pro is required for creator profiles';
  end if;

  if not exists (
    select 1 from public.creator_profiles
    where id = p_profile_id and user_id = auth.uid()
  ) then
    raise exception 'Creator profile not found';
  end if;

  update public.creator_profiles
  set is_active = false
  where user_id = auth.uid() and is_active;

  update public.creator_profiles
  set is_active = true
  where id = p_profile_id and user_id = auth.uid();
end;
$$;

revoke execute on function public.set_my_active_creator_profile(uuid) from public, anon;
grant execute on function public.set_my_active_creator_profile(uuid) to authenticated;
