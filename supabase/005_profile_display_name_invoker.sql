-- Refine the display-name RPC to run with the caller's privileges.
-- RLS chooses the row; a column-level grant limits browser writes to display_name only.

create or replace function public.set_my_display_name(p_display_name text)
returns text
language plpgsql
security invoker
set search_path = public
as $$
declare
  cleaned text;
  caller uuid;
begin
  caller := auth.uid();
  if caller is null then
    raise exception 'Authentication required';
  end if;

  cleaned := nullif(btrim(coalesce(p_display_name, '')), '');

  if cleaned is not null and char_length(cleaned) > 60 then
    raise exception 'Display name must be 60 characters or fewer';
  end if;

  update public.profiles
  set display_name = cleaned
  where id = caller;

  if not found then
    raise exception 'Droop profile does not exist';
  end if;

  return cleaned;
end;
$$;

revoke update on table public.profiles from anon, authenticated;
grant update (display_name) on table public.profiles to authenticated;

drop policy if exists "profiles own update" on public.profiles;
drop policy if exists "profiles own display name update" on public.profiles;
create policy "profiles own display name update"
on public.profiles
for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute procedure public.set_updated_at();
