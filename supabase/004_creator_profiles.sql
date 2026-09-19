-- Droop Pro creator profiles: reusable account-synced workflow defaults.
-- Media files are never stored here; settings are small JSON objects only.

create table if not exists public.creator_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 60),
  settings jsonb not null default '{}'::jsonb
    check (jsonb_typeof(settings) = 'object' and octet_length(settings::text) <= 8192),
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists creator_profiles_user_name_uidx
  on public.creator_profiles (user_id, lower(btrim(name)));

create unique index if not exists creator_profiles_one_active_uidx
  on public.creator_profiles (user_id)
  where is_active;

create index if not exists creator_profiles_user_updated_idx
  on public.creator_profiles (user_id, updated_at desc);

drop trigger if exists creator_profiles_set_updated_at on public.creator_profiles;
create trigger creator_profiles_set_updated_at
before update on public.creator_profiles
for each row execute procedure public.set_updated_at();

create or replace function public.enforce_creator_profile_write()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  account_plan text;
  current_count bigint;
begin
  if auth.uid() is null or new.user_id <> auth.uid() then
    raise exception 'Creator profile owner mismatch';
  end if;

  if tg_op = 'UPDATE' and old.user_id <> new.user_id then
    raise exception 'Creator profile owner cannot change';
  end if;

  select plan into account_plan
  from public.profiles
  where id = new.user_id;

  if account_plan is distinct from 'pro' then
    raise exception 'Droop Pro is required for creator profiles';
  end if;

  if tg_op = 'INSERT' then
    select count(*) into current_count
    from public.creator_profiles
    where user_id = new.user_id;

    if current_count >= 10 then
      raise exception 'Creator profile limit reached (10)';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists creator_profiles_enforce_write on public.creator_profiles;
create trigger creator_profiles_enforce_write
before insert or update on public.creator_profiles
for each row execute procedure public.enforce_creator_profile_write();

alter table public.creator_profiles enable row level security;

drop policy if exists "creator profiles own select" on public.creator_profiles;
create policy "creator profiles own select"
on public.creator_profiles for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "creator profiles own insert" on public.creator_profiles;
create policy "creator profiles own insert"
on public.creator_profiles for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "creator profiles own update" on public.creator_profiles;
create policy "creator profiles own update"
on public.creator_profiles for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "creator profiles own delete" on public.creator_profiles;
create policy "creator profiles own delete"
on public.creator_profiles for delete
to authenticated
using ((select auth.uid()) = user_id);

revoke all on table public.creator_profiles from public, anon, authenticated;
grant select, insert, update, delete on table public.creator_profiles to authenticated;

revoke execute on function public.enforce_creator_profile_write() from public, anon, authenticated;
