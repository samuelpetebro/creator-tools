-- Droop billing foundation for Lemon Squeezy.
-- This migration is safe to apply before billing goes live.
-- Browser users receive no direct access to these tables/functions.

create table if not exists public.billing_subscriptions (
  lemon_subscription_id text primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  store_id bigint not null,
  variant_id bigint not null,
  status text not null check (status in ('on_trial','active','paused','past_due','unpaid','cancelled','expired')),
  test_mode boolean not null default false,
  renews_at timestamptz,
  ends_at timestamptz,
  lemon_updated_at timestamptz not null,
  last_event_hash text not null,
  last_event_name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists billing_subscriptions_user_idx
  on public.billing_subscriptions (user_id, test_mode, status);

create table if not exists public.billing_webhook_events (
  event_hash text primary key,
  lemon_subscription_id text not null,
  event_name text not null,
  payload_updated_at timestamptz not null,
  received_at timestamptz not null default now()
);

alter table public.billing_subscriptions enable row level security;
alter table public.billing_webhook_events enable row level security;

revoke all on table public.billing_subscriptions from public, anon, authenticated;
revoke all on table public.billing_webhook_events from public, anon, authenticated;

create or replace function public.apply_lemon_subscription_event(
  p_event_hash text,
  p_subscription_id text,
  p_user_id uuid,
  p_store_id bigint,
  p_variant_id bigint,
  p_status text,
  p_test_mode boolean,
  p_renews_at timestamptz,
  p_ends_at timestamptz,
  p_lemon_updated_at timestamptz,
  p_event_name text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  existing public.billing_subscriptions%rowtype;
  resolved_user_id uuid;
  resulting_plan text;
begin
  if p_event_hash is null or length(p_event_hash) < 32 then
    raise exception 'Invalid event hash';
  end if;
  if p_subscription_id is null or p_subscription_id = '' then
    raise exception 'Missing subscription id';
  end if;
  if p_status not in ('on_trial','active','paused','past_due','unpaid','cancelled','expired') then
    raise exception 'Unexpected subscription status: %', p_status;
  end if;

  if exists (select 1 from public.billing_webhook_events where event_hash = p_event_hash) then
    return jsonb_build_object('ok', true, 'duplicate', true);
  end if;

  select * into existing
  from public.billing_subscriptions
  where lemon_subscription_id = p_subscription_id
  for update;

  if found then
    if p_user_id is not null and p_user_id <> existing.user_id then
      raise exception 'Subscription user mismatch';
    end if;
    resolved_user_id := existing.user_id;
  else
    if p_user_id is null then
      raise exception 'First subscription event is missing user_id';
    end if;
    resolved_user_id := p_user_id;
  end if;

  if not exists (select 1 from public.profiles where id = resolved_user_id) then
    raise exception 'Droop profile does not exist';
  end if;

  insert into public.billing_webhook_events (
    event_hash, lemon_subscription_id, event_name, payload_updated_at
  ) values (
    p_event_hash, p_subscription_id, p_event_name, p_lemon_updated_at
  );

  if existing.lemon_subscription_id is not null
     and p_lemon_updated_at < existing.lemon_updated_at then
    return jsonb_build_object('ok', true, 'stale', true);
  end if;

  insert into public.billing_subscriptions (
    lemon_subscription_id, user_id, store_id, variant_id, status, test_mode,
    renews_at, ends_at, lemon_updated_at, last_event_hash, last_event_name
  ) values (
    p_subscription_id, resolved_user_id, p_store_id, p_variant_id, p_status, p_test_mode,
    p_renews_at, p_ends_at, p_lemon_updated_at, p_event_hash, p_event_name
  )
  on conflict (lemon_subscription_id) do update set
    user_id = excluded.user_id,
    store_id = excluded.store_id,
    variant_id = excluded.variant_id,
    status = excluded.status,
    test_mode = excluded.test_mode,
    renews_at = excluded.renews_at,
    ends_at = excluded.ends_at,
    lemon_updated_at = excluded.lemon_updated_at,
    last_event_hash = excluded.last_event_hash,
    last_event_name = excluded.last_event_name,
    updated_at = now();

  -- Test-mode purchases never grant the production Pro entitlement.
  if exists (
    select 1
    from public.billing_subscriptions
    where user_id = resolved_user_id
      and test_mode = false
      and status in ('on_trial','active','paused','past_due','cancelled')
  ) then
    resulting_plan := 'pro';
  else
    resulting_plan := 'free';
  end if;

  update public.profiles
  set plan = resulting_plan,
      updated_at = now()
  where id = resolved_user_id;

  if not found then
    raise exception 'Droop profile update affected zero rows';
  end if;

  return jsonb_build_object(
    'ok', true,
    'duplicate', false,
    'stale', false,
    'user_id', resolved_user_id,
    'plan', resulting_plan
  );
end;
$$;

revoke execute on function public.apply_lemon_subscription_event(
  text,text,uuid,bigint,bigint,text,boolean,timestamptz,timestamptz,timestamptz,text
) from public, anon, authenticated;

grant execute on function public.apply_lemon_subscription_event(
  text,text,uuid,bigint,bigint,text,boolean,timestamptz,timestamptz,timestamptz,text
) to service_role;
