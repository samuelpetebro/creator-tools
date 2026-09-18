# Supabase account security audit

Updated: 2026-09-18

This document records checks performed against the production Droop Supabase project without retaining test data.

## Account / profile integrity

At audit time:

- every Auth user had a matching `public.profiles` row
- there were no profile rows without a matching Auth user
- there were no orphan presets
- every profile plan was one of `free` or `pro`
- there were no duplicate preset names for the same user/tool
- the existing user account was email-confirmed and had completed a successful sign-in

## RLS and privileges

Validated as the `authenticated` role:

- an unrelated authenticated UUID could see zero profile rows and zero preset rows
- authenticated clients cannot update the `profiles` table broadly
- `profiles.plan` is not client-updatable
- `profiles.email` is not client-updatable
- only `profiles.display_name` has a column-level browser UPDATE grant
- display-name updates are still restricted by owner RLS
- `billing_subscriptions` and `billing_webhook_events` are not readable by authenticated browser clients
- browser roles no longer have `TRUNCATE`, `REFERENCES` or `TRIGGER` privileges on `profiles`, `presets` or billing tables; only the row-level app operations they actually need remain

## Display-name update path

The account page uses `set_my_display_name`.

Final security model:

- function is `SECURITY INVOKER`
- caller identity comes from `auth.uid()`
- RLS restricts the update to the caller's own row
- the database enforces a maximum display-name length of 60 characters
- profile `updated_at` is maintained by a trigger
- direct plan writes remain unavailable to browser clients

The RPC was tested in a transaction and the test value was rolled back.

## Preset limit

The Free-plan limit was tested in a rollback-safe transaction:

- presets 1 through 5 were accepted
- the sixth preset was rejected by the server-side limit trigger
- the test rows were rolled back and not retained

## Billing tables

Billing persistence tables are intentionally server-only.

Supabase's advisor reports `RLS enabled, no policy` as an informational notice for those two tables. This is expected because browser privileges are revoked and they are not intended to expose user-facing rows directly.

## Advisor status after privilege hardening

- performance advisor: no findings
- billing tables still show the expected informational `RLS enabled, no policy` notice because they are intentionally server-only

## Remaining advisor warning

Leaked-password protection remains disabled because the current hosted Supabase project is on a plan where that protection is unavailable. Password length is handled separately in Auth configuration and the Droop UI.

## Still requires browser/manual testing

- a brand-new second-account registration
- password reset / recovery link end-to-end
- account flows on a physical phone
- paid entitlement changes once Lemon Squeezy test mode is configured and Edge Functions are deployed
