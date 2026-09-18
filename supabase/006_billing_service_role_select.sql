-- Allow server-only Edge Functions to read billing subscriptions via the service role.
-- Browser roles remain fully revoked.

grant select on table public.billing_subscriptions to service_role;
