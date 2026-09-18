-- Remove browser-role table administration privileges that are not needed by the app.
-- In particular, TRUNCATE is not row-scoped and should never be available to browser roles.

revoke truncate, references, trigger on table public.profiles from anon, authenticated;
revoke truncate, references, trigger on table public.presets from anon, authenticated;
revoke truncate, references, trigger on table public.billing_subscriptions from anon, authenticated;
revoke truncate, references, trigger on table public.billing_webhook_events from anon, authenticated;
