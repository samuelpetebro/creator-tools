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
- **Billing:** Lemon Squeezy is planned. Hardened checkout/webhook source and billing persistence are in the repository, but the Edge Functions are intentionally not deployed until Lemon test-mode onboarding is complete.

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
- `docs/launch-checklist.md` — pre-launch source of truth.

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

After shared CSS/JS changes, also smoke-test the public site on desktop and mobile.

## Security rules

- Never commit a Supabase `service_role` key, Lemon Squeezy webhook secret or other server credential.
- Browser code may contain the Supabase publishable key; access control must be enforced by RLS.
- A user's `plan` must only be changed by trusted server-side code.
- Do not deploy the current Lemon Squeezy webhook until the billing checklist is completed.

## Deployment

Merging to `main` triggers GitHub Pages. The custom domain is configured through `CNAME`.

## License

The repository is currently MIT licensed. Copies already distributed under MIT retain those rights. If future sale exclusivity matters, review the licensing strategy before publishing substantial new proprietary code.
