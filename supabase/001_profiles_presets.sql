-- Droop account and preset schema. Safe to run on a fresh project.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  plan text not null default 'free' check (plan in ('free','pro')),
  updated_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$ begin
  insert into public.profiles (id,email) values (new.id,new.email)
  on conflict (id) do update set email=excluded.email;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute procedure public.handle_new_user();

create table if not exists public.presets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  tool_slug text not null,
  name text not null,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists presets_user_tool_name_uidx on public.presets (user_id, tool_slug, name);
create index if not exists presets_user_updated_idx on public.presets (user_id, updated_at desc);

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = public
as $$ begin new.updated_at=now(); return new; end; $$;

drop trigger if exists presets_set_updated_at on public.presets;
create trigger presets_set_updated_at before update on public.presets
for each row execute procedure public.set_updated_at();

create or replace function public.enforce_preset_limit()
returns trigger language plpgsql security definer set search_path = public
as $$
declare account_plan text; preset_count bigint; preset_limit integer;
begin
  if auth.uid() is null or new.user_id <> auth.uid() then raise exception 'Preset owner mismatch'; end if;
  select plan into account_plan from public.profiles where id=new.user_id;
  preset_limit := case when account_plan='pro' then 100 else 5 end;
  select count(*) into preset_count from public.presets where user_id=new.user_id;
  if preset_count >= preset_limit then
    raise exception 'Preset limit reached for % plan (% presets).', coalesce(account_plan,'free'), preset_limit;
  end if;
  return new;
end; $$;

drop trigger if exists presets_enforce_limit on public.presets;
create trigger presets_enforce_limit before insert on public.presets
for each row execute procedure public.enforce_preset_limit();

alter table public.profiles enable row level security;
alter table public.presets enable row level security;
drop policy if exists "profiles own row" on public.profiles;
create policy "profiles own row" on public.profiles for select to authenticated using ((select auth.uid())=id);
drop policy if exists "profiles own update" on public.profiles;
create policy "profiles own update" on public.profiles for update to authenticated using ((select auth.uid())=id) with check ((select auth.uid())=id);
drop policy if exists "presets own rows" on public.presets;
create policy "presets own rows" on public.presets for all to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);

revoke all on table public.profiles from anon, authenticated;
grant select on table public.profiles to authenticated;
grant update (display_name) on table public.profiles to authenticated;
revoke all on table public.presets from anon, authenticated;
grant select, insert, update, delete on table public.presets to authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.enforce_preset_limit() from public, anon, authenticated;
revoke execute on function public.set_updated_at() from public, anon, authenticated;