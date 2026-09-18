# Droop product funnel

Updated: 2026-09-18

This defines what to measure before adding more product complexity.

## Funnel

1. **Visit**
   - Umami pageview

2. **Use a tool**
   - `process_start`

3. **Get a successful result**
   - `process_complete`
   - separately watch `process_error` and `process_cancel`

4. **Keep the result**
   - `download_click`

5. **Show account intent**
   - `cta_account`

6. **Create / use an account**
   - `signup_success`
   - `login_success`

7. **Use the recurring-workflow benefit**
   - `preset_save`
   - `preset_load`
   - `preset_delete`

8. **Show paid-plan intent**
   - `cta_plans` — opened the plan comparison path
   - `cta_pro_early_access` — explicitly clicked “I’m interested in Pro” on the Pro page

9. **Become paid**
   - source of truth: Lemon live subscription + Supabase `profiles.plan = pro`
   - do not treat a CTA or checkout return URL as a completed payment

## Privacy rule

Umami events must never contain:

- filenames
- preset names
- preset settings
- caption/subtitle text
- email addresses
- query-string contents
- media metadata

The current adapter sends an allowlisted event name plus the page/tool slug only.

## Weekly product review

Once traffic is no longer dominated by owner/development testing, review:

- tools by pageviews
- tools by `process_start`
- completion rate: `process_complete / process_start`
- download rate: `download_click / process_complete`
- account-intent rate: `cta_account / tool visitors`
- signup rate
- preset activation: users who save or load at least one preset
- plans intent (`cta_plans`)
- explicit Pro interest (`cta_pro_early_access`)
- live paid subscribers from Lemon/Supabase

Do not optimize from single-digit impressions or a handful of development sessions.

## Decision rule

Prioritize the tools that show both:

1. real usage, and
2. successful completion/download behavior.

Create demos/content around those tools first. Add new product features only when they improve a measured drop-off or a repeated user workflow.
