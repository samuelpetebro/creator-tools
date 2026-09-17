-- Droop Supabase hardening + preset limits.
-- Run once after 001_profiles_presets.sql.

-- Users may read their profile, but browser clients cannot change plan.
drop policy if exists "profiles own update" on public.profiles;
revoke update on table public.profiles from anon, authenticated;
grant select on table public.profiles to authenticated;

-- Presets are account-only and protected by RLS.
revoke all on table public.presets from anon;
grant select, insert, update, delete on table public.presets to authenticated;

-- Saving an existing preset name should replace it instead of creating duplicates.
create unique index if not exists presets_user_tool_name_uidx
  on public.presets (user_id, tool_slug, name);

create index if not exists presets_user_updated_idx
  on public.presets (user_id, updated_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists presets_set_updated_at on public.presets;
create trigger presets_set_updated_at
before update on public.presets
for each row execute procedure public.set_updated_at();

-- Server-side limits: Free = 5 presets, Pro = 100.
create or replace function public.enforce_preset_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  account_plan text;
  preset_count bigint;
  preset_limit integer;
begin
  if auth.uid() is null or new.user_id <> auth.uid() then
    raise exception 'Preset owner mismatch';
  end if;

  select plan into account_plan
  from public.profiles
  where id = new.user_id;

  preset_limit := case when account_plan = 'pro' then 100 else 5 end;

  select count(*) into preset_count
  from public.presets
  where user_id = new.user_id;

  if preset_count >= preset_limit then
    raise exception 'Preset limit reached for % plan (% presets).',
      coalesce(account_plan, 'free'), preset_limit;
  end if;

  return new;
end;
$$;

drop trigger if exists presets_enforce_limit on public.presets;
create trigger presets_enforce_limit
before insert on public.presets
for each row execute procedure public.enforce_preset_limit();
