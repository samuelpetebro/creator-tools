-- Droop Pro Workflow Recipes: synced definitions, local media execution.
create table if not exists public.workflow_recipes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 60),
  recipe jsonb not null default '{}'::jsonb
    check (jsonb_typeof(recipe) = 'object' and octet_length(recipe::text) <= 16384),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists workflow_recipes_user_name_uidx
  on public.workflow_recipes (user_id, lower(btrim(name)));

drop trigger if exists workflow_recipes_set_updated_at on public.workflow_recipes;
create trigger workflow_recipes_set_updated_at
before update on public.workflow_recipes
for each row execute procedure public.set_updated_at();

create or replace function public.enforce_workflow_recipe_write()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  account_plan text;
  current_count bigint;
begin
  if auth.uid() is null or new.user_id <> auth.uid() then
    raise exception 'Workflow recipe owner mismatch';
  end if;
  if tg_op = 'UPDATE' and old.user_id <> new.user_id then
    raise exception 'Workflow recipe owner cannot change';
  end if;

  select plan into account_plan from public.profiles where id = new.user_id;
  if account_plan is distinct from 'pro' then
    raise exception 'Droop Pro is required for Workflow Recipes';
  end if;

  if tg_op = 'INSERT' then
    select count(*) into current_count from public.workflow_recipes where user_id = new.user_id;
    if current_count >= 20 then
      raise exception 'Workflow Recipe limit reached (20)';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists workflow_recipes_enforce_write on public.workflow_recipes;
create trigger workflow_recipes_enforce_write
before insert or update on public.workflow_recipes
for each row execute procedure public.enforce_workflow_recipe_write();

alter table public.workflow_recipes enable row level security;

drop policy if exists "workflow recipes own select" on public.workflow_recipes;
create policy "workflow recipes own select" on public.workflow_recipes
for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "workflow recipes own insert" on public.workflow_recipes;
create policy "workflow recipes own insert" on public.workflow_recipes
for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists "workflow recipes own update" on public.workflow_recipes;
create policy "workflow recipes own update" on public.workflow_recipes
for update to authenticated using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "workflow recipes own delete" on public.workflow_recipes;
create policy "workflow recipes own delete" on public.workflow_recipes
for delete to authenticated using ((select auth.uid()) = user_id);

revoke all on table public.workflow_recipes from public, anon, authenticated;
grant select, insert, update, delete on table public.workflow_recipes to authenticated;
revoke execute on function public.enforce_workflow_recipe_write() from public, anon, authenticated;
