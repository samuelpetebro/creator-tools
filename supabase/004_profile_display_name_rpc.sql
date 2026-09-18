-- Keep profile plan server-owned while allowing a user to edit only their display name.

drop policy if exists "profiles own update" on public.profiles;
revoke update on table public.profiles from anon, authenticated;

alter table public.profiles
  drop constraint if exists profiles_display_name_length;

alter table public.profiles
  add constraint profiles_display_name_length
  check (display_name is null or char_length(display_name) <= 60);

create or replace function public.set_my_display_name(p_display_name text)
returns text
language plpgsql
security definer
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
  set display_name = cleaned,
      updated_at = now()
  where id = caller;

  if not found then
    raise exception 'Droop profile does not exist';
  end if;

  return cleaned;
end;
$$;

revoke all on function public.set_my_display_name(text) from public, anon;
grant execute on function public.set_my_display_name(text) to authenticated;
