# droop / creator-tools

![Static regression checks](https://github.com/samuelpetebro/creator-tools/actions/workflows/tests.yml/badge.svg)

Droop is a static collection of browser-based creator tools for images, video, audio and social content.

Production: https://droopweb.lat/

## Architecture

- **Frontend / hosting:** plain HTML, CSS and JavaScript on GitHub Pages.
- **Media processing:** local in the browser for supported tools. Some tools download WASM, processing packages or models at runtime.
- **Accounts:** Supabase Auth.
- **Account data:** Supabase Postgres with Row Level Security.
- **Saved presets:** settings only; media files are not stored with presets.
- **Analytics:** Umami Cloud through the privacy-focused adapter in `js/analytics.js`.
- **PWA shell:** manifest + raster icons + standalone display metadata. Droop does not currently claim offline support.
- **Billing / Pro:** USD 5/month monthly-only launch price is accepted. The ready Pro value pack includes up to 100 presets, 20-file batch Image Converter, 20-file batch Metadata Cleaner and preset backup/restore. Lemon Squeezy checkout, signed webhooks, server-side subscription persistence and the customer-portal bridge are deployed in test mode; real-money checkout remains disabled until the Lemon store is activated and live credentials are configured.

## Important files

- `index.html` — homepage and catalog shell.
- `js/home-catalog.js` — catalog, search and homepage language handling.
- `js/tool-i18n.js` — shared tool translations.
- `account.html` / `js/account.js` — authentication and account workspace.
- `js/cloud.js` — saved preset client.
- `js/analytics.js` — allowlisted analytics adapter.
- `supabase/001_profiles_presets.sql` — account/preset schema.
- `supabase/003_billing_subscriptions.sql` — server-only subscription persistence and webhook idempotency.
- `supabase/functions/lemonsqueezy-checkout/` — authenticated checkout creation.
- `supabase/functions/lemonsqueezy-webhook/` — signed subscription webhook handler.
- `site.webmanifest` / `icons/` — install metadata and home-screen icons.
- `.github/workflows/production-smoke.yml` — live post-deploy HTTP smoke checks.
- `docs/launch-checklist.md` — pre-launch source of truth.
- `docs/billing-go-live.md` — live Lemon activation procedure.
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

`tests/analytics-provider.cjs` is an optional provider-contract test and requires a separately downloaded official Umami tracker file as its argument, so CI intentionally skips that one file.\n\nAfter shared CSS/JS changes, also smoke-test the public site on desktop and mobile.

## Security rules

- Never commit a Supabase `service_role` key, Lemon Squeezy webhook secret or other server credential.
- Browser code may contain the Supabase publishable key; access control must be enforced by RLS.
- A user's `plan` must only be changed by trusted server-side code.
- Keep Lemon billing in test mode until the store is activated and the live-mode checklist in `docs/billing-go-live.md` is completed.

## Deployment

Merging to `main` triggers GitHub Pages. The custom domain is configured through `CNAME`.

## License

The repository is currently MIT licensed. Copies already distributed under MIT retain those rights. If future sale exclusivity matters, review the licensing strategy before publishing substantial new proprietary code.
