-- Droop PayPal subscription billing foundation.
-- Safe to apply while PayPal remains in sandbox. Browser roles get no direct access.

create table if not exists public.paypal_billing_subscriptions (
  paypal_subscription_id text primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  plan_id text not null,
  status text not null check (status in ('approval_pending','approved','active','suspended','cancelled','expired')),
  sandbox boolean not null default true,
  next_billing_at timestamptz,
  paypal_updated_at timestamptz not null,
  last_event_hash text not null,
  last_event_name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists paypal_billing_subscriptions_user_idx
  on public.paypal_billing_subscriptions (user_id, sandbox, status);

create table if not exists public.paypal_billing_webhook_events (
  event_hash text primary key,
  paypal_subscription_id text not null,
  event_name text not null,
  payload_updated_at timestamptz not null,
  received_at timestamptz not null default now()
);

alter table public.paypal_billing_subscriptions enable row level security;
alter table public.paypal_billing_webhook_events enable row level security;

revoke all on table public.paypal_billing_subscriptions from public, anon, authenticated;
revoke all on table public.paypal_billing_webhook_events from public, anon, authenticated;
grant select, insert, update, delete on table public.paypal_billing_subscriptions to service_role;
grant select, insert, update, delete on table public.paypal_billing_webhook_events to service_role;

create or replace function public.apply_paypal_subscription_event(
  p_event_hash text,
  p_subscription_id text,
  p_user_id uuid,
  p_plan_id text,
  p_status text,
  p_sandbox boolean,
  p_next_billing_at timestamptz,
  p_paypal_updated_at timestamptz,
  p_event_name text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  existing public.paypal_billing_subscriptions%rowtype;
  resolved_user_id uuid;
  resulting_plan text;
begin
  if p_event_hash is null or length(p_event_hash) < 32 then
    raise exception 'Invalid event hash';
  end if;
  if p_subscription_id is null or btrim(p_subscription_id) = '' then
    raise exception 'Missing subscription id';
  end if;
  if p_plan_id is null or btrim(p_plan_id) = '' then
    raise exception 'Missing plan id';
  end if;
  if p_status not in ('approval_pending','approved','active','suspended','cancelled','expired') then
    raise exception 'Unexpected PayPal subscription status: %', p_status;
  end if;

  if exists (select 1 from public.paypal_billing_webhook_events where event_hash = p_event_hash) then
    return jsonb_build_object('ok', true, 'duplicate', true);
  end if;

  select * into existing
  from public.paypal_billing_subscriptions
  where paypal_subscription_id = p_subscription_id
  for update;

  if found then
    if p_user_id is not null and p_user_id <> existing.user_id then
      raise exception 'Subscription user mismatch';
    end if;
    if p_plan_id <> existing.plan_id then
      raise exception 'Subscription plan mismatch';
    end if;
    resolved_user_id := existing.user_id;
  else
    if p_user_id is null then
      raise exception 'First PayPal subscription event is missing user_id';
    end if;
    resolved_user_id := p_user_id;
  end if;

  if not exists (select 1 from public.profiles where id = resolved_user_id) then
    raise exception 'Droop profile does not exist';
  end if;

  insert into public.paypal_billing_webhook_events (
    event_hash, paypal_subscription_id, event_name, payload_updated_at
  ) values (
    p_event_hash, p_subscription_id, p_event_name, p_paypal_updated_at
  );

  if existing.paypal_subscription_id is not null
     and p_paypal_updated_at < existing.paypal_updated_at then
    return jsonb_build_object('ok', true, 'stale', true);
  end if;

  insert into public.paypal_billing_subscriptions (
    paypal_subscription_id, user_id, plan_id, status, sandbox,
    next_billing_at, paypal_updated_at, last_event_hash, last_event_name
  ) values (
    p_subscription_id, resolved_user_id, p_plan_id, p_status, p_sandbox,
    p_next_billing_at, p_paypal_updated_at, p_event_hash, p_event_name
  )
  on conflict (paypal_subscription_id) do update set
    user_id = excluded.user_id,
    plan_id = excluded.plan_id,
    status = excluded.status,
    sandbox = excluded.sandbox,
    next_billing_at = coalesce(excluded.next_billing_at, public.paypal_billing_subscriptions.next_billing_at),
    paypal_updated_at = excluded.paypal_updated_at,
    last_event_hash = excluded.last_event_hash,
    last_event_name = excluded.last_event_name,
    updated_at = now();

  -- Sandbox never grants production Pro.
  -- A cancelled subscription keeps access only when we still know its paid-through boundary.
  if exists (
    select 1
    from public.paypal_billing_subscriptions
    where user_id = resolved_user_id
      and sandbox = false
      and (
        status = 'active'
        or (status = 'cancelled' and next_billing_at is not null and next_billing_at > now())
      )
  ) or exists (
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

revoke execute on function public.apply_paypal_subscription_event(
  text,text,uuid,text,text,boolean,timestamptz,timestamptz,text
) from public, anon, authenticated;

grant execute on function public.apply_paypal_subscription_event(
  text,text,uuid,text,text,boolean,timestamptz,timestamptz,text
) to service_role;
