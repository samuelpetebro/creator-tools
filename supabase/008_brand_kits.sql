-- Droop Pro Brand Kits: synced brand defaults for creator workflows.
-- Stores small account settings only; no media files or logo binaries.

create table if not exists public.brand_kits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 60),
  settings jsonb not null default '{}'::jsonb
    check (jsonb_typeof(settings) = 'object' and octet_length(settings::text) <= 8192),
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists brand_kits_user_name_uidx
  on public.brand_kits (user_id, lower(btrim(name)));

create unique index if not exists brand_kits_one_active_uidx
  on public.brand_kits (user_id)
  where is_active;

create index if not exists brand_kits_user_updated_idx
  on public.brand_kits (user_id, updated_at desc);

drop trigger if exists brand_kits_set_updated_at on public.brand_kits;
create trigger brand_kits_set_updated_at
before update on public.brand_kits
for each row execute procedure public.set_updated_at();

create or replace function public.enforce_brand_kit_write()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  account_plan text;
  current_count bigint;
begin
  if auth.uid() is null or new.user_id <> auth.uid() then
    raise exception 'Brand kit owner mismatch';
  end if;

  if tg_op = 'UPDATE' and old.user_id <> new.user_id then
    raise exception 'Brand kit owner cannot change';
  end if;

  select plan into account_plan
  from public.profiles
  where id = new.user_id;

  if account_plan is distinct from 'pro' then
    raise exception 'Droop Pro is required for Brand Kits';
  end if;

  if tg_op = 'INSERT' then
    select count(*) into current_count
    from public.brand_kits
    where user_id = new.user_id;

    if current_count >= 5 then
      raise exception 'Brand Kit limit reached (5)';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists brand_kits_enforce_write on public.brand_kits;
create trigger brand_kits_enforce_write
before insert or update on public.brand_kits
for each row execute procedure public.enforce_brand_kit_write();

alter table public.brand_kits enable row level security;

drop policy if exists "brand kits own select" on public.brand_kits;
create policy "brand kits own select"
on public.brand_kits for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "brand kits own insert" on public.brand_kits;
create policy "brand kits own insert"
on public.brand_kits for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "brand kits own update" on public.brand_kits;
create policy "brand kits own update"
on public.brand_kits for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "brand kits own delete" on public.brand_kits;
create policy "brand kits own delete"
on public.brand_kits for delete
to authenticated
using ((select auth.uid()) = user_id);

revoke all on table public.brand_kits from public, anon, authenticated;
grant select, insert, update, delete on table public.brand_kits to authenticated;
revoke execute on function public.enforce_brand_kit_write() from public, anon, authenticated;

create or replace function public.set_my_active_brand_kit(p_brand_kit_id uuid)
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
    raise exception 'Droop Pro is required for Brand Kits';
  end if;

  if not exists (
    select 1 from public.brand_kits
    where id = p_brand_kit_id and user_id = auth.uid()
  ) then
    raise exception 'Brand Kit not found';
  end if;

  update public.brand_kits
  set is_active = false
  where user_id = auth.uid() and is_active;

  update public.brand_kits
  set is_active = true
  where id = p_brand_kit_id and user_id = auth.uid();
end;
$$;

revoke execute on function public.set_my_active_brand_kit(uuid) from public, anon;
grant execute on function public.set_my_active_brand_kit(uuid) to authenticated;
