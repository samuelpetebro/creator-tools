# droop / creator-tools

![Static regression checks](https://github.com/samuelpetebro/creator-tools/actions/workflows/tests.yml/badge.svg)

Droop is a static collection of browser-based creator tools for images, video, audio and social content.

Production: https://droopweb.lat/

## Architecture

- **Frontend / hosting:** plain HTML, CSS and JavaScript on GitHub Pages.
- **Media processing:** local in the browser for supported tools. Some tools download WASM, processing packages or models at runtime.
- **Accounts:** Supabase Auth with email/password and Google sign-in live in production. OAuth-only accounts use the same profile/onboarding flow without requiring a separate Droop password.
- **Account data:** Supabase Postgres with Row Level Security.
- **Saved presets / Creator Profiles / Workflow Recipes:** reusable settings only; media files are not stored with them.
- **Analytics:** Umami Cloud through the privacy-focused adapter in `js/analytics.js`.
- **PWA shell:** manifest + raster icons + standalone display metadata. Droop does not currently claim offline support.
- **Billing / Pro:** USD 5/month monthly-only launch price is accepted. The ready Pro value pack includes up to 100 presets, 20-file batch Image Converter, 20-file batch Metadata Cleaner, 20-file batch Make It Fit, 10-file batch Under X MB, batch Audio Converter, a custom Release Pack builder, up to 10 synced Creator Profiles, up to 20 synced Workflow Recipes, synced Brand Kits, local Recent Runs / Run Again and preset backup/restore. Billing is migrating from the rejected Lemon Squeezy merchant application to PayPal Subscriptions. PayPal persistence and Edge Functions are staged in sandbox mode; real-money checkout remains gated until sandbox checkout, verified webhooks and entitlement tests pass with the owner's PayPal app.

## Important files

- `index.html` — homepage and catalog shell.
- `js/home-catalog.js` — catalog, search and homepage language handling.
- `js/tool-i18n.js` — shared tool translations.
- `account.html` / `js/account.js` — authentication and account workspace.
- `js/cloud.js` — saved preset client.
- `workflows.html` / `js/workflow-recipes.js` — Pro Workflow Recipe editor and local batch runner.
- `js/workflow-history.js` — local-only recent-run snapshots for Run Again; no filenames or media.
- `js/brand-kits.js` / `js/brand-kit-apply.js` — synced Pro Brand Kits and local application helpers.
- `js/analytics.js` — allowlisted analytics adapter.
- `supabase/001_profiles_presets.sql` — account/preset schema.
- `supabase/003_billing_subscriptions.sql` — legacy Lemon test-mode subscription persistence.
- `supabase/009_paypal_billing.sql` — PayPal subscription persistence, webhook idempotency and entitlement bridge.
- `supabase/004_creator_profiles.sql` / `005_creator_profile_active_rpc.sql` — Pro Creator Profile storage, RLS, limits and atomic activation.
- `supabase/006_workflow_recipes.sql` — synced Pro Workflow Recipe definitions with RLS and server-side limits.
- `supabase/functions/paypal-checkout/` — authenticated PayPal subscription creation.
- `supabase/functions/paypal-webhook/` — PayPal webhook verification + subscription persistence.
- `supabase/functions/paypal-subscription/` — authenticated PayPal subscription status lookup.
- `supabase/functions/paypal-cancel/` — authenticated owner-only cancellation of future PayPal renewals.
- `supabase/functions/lemonsqueezy-*` — retained temporarily as rollback/history while PayPal is validated.
- `site.webmanifest` / `icons/` — install metadata and home-screen icons.
- `.github/workflows/production-smoke.yml` — live post-deploy HTTP smoke checks plus a daily production check.
- `.github/workflows/billing-endpoint-smoke.yml` — deployed billing security/availability smoke checks, also scheduled daily.
- `.github/workflows/browser-smoke.yml` — Chromium journey/layout smoke on PRs, pushes and a weekly scheduled run.
- `docs/launch-checklist.md` — pre-launch source of truth.
- `docs/operations-runbook.md` — routine monitoring, incident triage and launch-day operating procedure.
- `docs/billing-go-live.md` — PayPal sandbox → live billing runbook.
- `docs/google-oauth.md` — safe Google sign-in activation checklist.
- `docs/service-inventory.md` — operating services, runtime dependencies and cost/revenue ledger starter.
- `docs/licensing-and-sale.md` — MIT implications to keep in mind before a future sale.
- `docs/pricing-proposal.md` — accepted USD 5/month Pro launch-price decision and review rules.
- `docs/product-funnel.md` — event definitions and product-review funnel.

## Local checks

There is no build step for the static site. The repository includes Node-based checks in `tests/`, and GitHub Actions runs the whole suite on pull requests and pushes to `main`.

On macOS/Linux:

```bash
for test in tests/*.cjs; do node "$test" || exit 1; done
```

On PowerShell:

```powershell
Get-ChildItem tests/*.cjs | ForEach-Object { node $_.FullName; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE } }
```

`tests/analytics-provider.cjs` is an optional provider-contract test and requires a separately downloaded official Umami tracker file as its argument, so CI intentionally skips that one file.

After shared CSS/JS changes, also smoke-test the public site on desktop and mobile.

## Security rules

- Never commit a Supabase secret/service-role key, PayPal client secret, PayPal webhook ID or other server credential.
- Browser code may contain the Supabase publishable key; access control must be enforced by RLS.
- A user's `plan` must only be changed by trusted server-side code.
- Keep PayPal billing in sandbox and `billingLiveEnabled=false` until the PayPal runbook and controlled subscription smoke are completed.

## Deployment

Merging to `main` triggers GitHub Pages. The custom domain is configured through `CNAME`.

## License

The repository is currently MIT licensed. Copies already distributed under MIT retain those rights. If future sale exclusivity matters, review the licensing strategy before publishing substantial new proprietary code.
