# Droop product funnel

Updated: 2026-09-20

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
   - `oauth_google_start` — started the Google OAuth path
   - `signup_success`
   - `login_success`

7. **Use the recurring-workflow benefit**
   - `preset_save`
   - `preset_load`
   - `preset_delete`

8. **Show paid-plan intent**
   - `cta_plans` — opened the plan comparison path
   - `cta_pro_early_access` — explicitly clicked “I’m interested in Pro” on the Pro page

9. **Use a Pro workflow**
   - `pro_batch_use` — completed a Pro batch workflow
   - `pro_custom_pack_use` — completed a custom Release Pack
   - `pro_creator_profile_save` / `pro_creator_profile_activate` / `pro_creator_profile_apply` / `pro_creator_profile_delete`
   - `pro_brand_kit_save` / `pro_brand_kit_activate` / `pro_brand_kit_apply` / `pro_brand_kit_delete`
   - `pro_recipe_save` / `pro_recipe_run` / `pro_recipe_delete`
   - `pro_run_again` — repeated a recent local workflow
   - `pro_backup_export` — exported a preset library backup
   - `pro_backup_import` — restored a preset library backup

10. **Become paid**
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
- Pro feature activation by family: batch, custom pack, Creator Profiles, Brand Kits, Workflow Recipes, Run Again and backup/restore
- live paid subscribers from Lemon/Supabase

Do not optimize from single-digit impressions or a handful of development sessions.

## Decision rule

Prioritize the tools that show both:

1. real usage, and
2. successful completion/download behavior.

Create demos/content around those tools first. Add new product features only when they improve a measured drop-off or a repeated user workflow.


## Event contract audit

As of 2026-09-20, the repository-level analytics audit verifies:

- the shared adapter allowlists the funnel/auth/preset/Pro events above;
- all 15 active processing tools emit lifecycle start + complete/error signals;
- auth emits signup/login and Google OAuth-start signals;
- preset save/load/delete emit only after successful actions;
- each shipped Pro workflow family has a success-side event emitter;
- trusted download controls use the shared `download_click` path, including individual Release Pack outputs and ZIP downloads;
- analytics payloads contain only the allowlisted event name plus page/tool slug, language and origin-only external referrer.

This code-level contract does **not** prove that every event has already appeared in the Umami dashboard. Provider receipt remains a separate live-data check.


## Live provider receipt

Verified in Umami on 2026-09-21 for the production Free funnel:

- `process_start`
- `process_complete`
- `download_click`
- `signup_success`
- `login_success`
- `oauth_google_start`
- `preset_save`
- `preset_load`
- `preset_delete`
- `cta_account`
- `cta_plans`
- `cta_pro_early_access`

`process_error` is not treated as missing simply because it has not been deliberately forced; it is expected only after a real processing failure. Pro-only event receipt remains a launch-day validation item because there is no Live Pro account yet.
