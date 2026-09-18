# Droop launch checklist

Updated: 2026-09-18

This file distinguishes **code present**, **deployed**, and **behavior actually tested**.

## Critical owner action

- [x] Namecheap registrant contact for `droopweb.lat` verified successfully before the 2026-09-22 deadline.

## Public site / GitHub Pages

- [x] Production smoke workflow now runs only after GitHub Pages reports a successful deployment, then checks core pages, manifest, icons, sitemap and custom 404.
- [x] Shared tool translation selectors fixed so tool i18n and cloud preset loading do not abort at runtime.
- [ ] Confirm the latest `main` commit is the GitHub Pages deployment currently serving `droopweb.lat`.
- [x] Automated Chromium smoke test covers desktop catalog rendering plus mobile homepage/search/language/account-signup/Pro/tool navigation.
- [ ] Manual phone visual smoke test remains pending; automated 390×844 Chromium layout checks and screenshots now run in CI.
- [x] All HTML entry points use `viewport-fit=cover` and expose the iOS home-screen icon.
- [ ] Verify a nested missing URL renders the 404 page with working CSS, navigation and analytics assets.
- [ ] Verify `/?q=image` pre-fills and filters the catalog; this is required by the homepage SearchAction structured data.

## Accounts / presets

- [x] Database integrity audit: no auth users without profiles, no orphan profiles/presets, no invalid plans and no duplicate preset names.
- [x] Account page is bilingual (EN/ES) and uses the shared `droop-language` preference.
- [x] Explicit “Create free account” CTAs open account signup mode directly.
- [x] Basic user flow previously confirmed: sign in → save preset → reload → load preset → delete preset.
- [ ] Fresh registration test with a second account remains pending.
- [x] Existing account is email-confirmed and has completed at least one successful sign-in; auth user/profile counts are aligned.
- [x] Browser automation covers forgot-password request, recovery-mode password update, signed-in password update and post-recovery return to the account workspace.
- [x] Display-name database path tested in a rollback-safe transaction and browser automation verifies the signed-in UI calls the dedicated RPC.
- [x] Verified in a rollback-safe database test that Free stops at 5 presets and the sixth insert is rejected.
- [x] Verified authenticated clients have no direct UPDATE privilege on `profiles` and no SELECT access to server-only billing tables.
- [x] Reconfirmed after the migration that authenticated users cannot directly update `profiles.plan`; unrelated authenticated user IDs see zero profile/preset rows.
- [ ] Physical-phone account/preset smoke test remains pending; automated 390×844 signed-in account coverage now includes profile, password and preset deletion flows.

## Analytics

- [ ] Confirm pageviews arrive in Umami after the tracker configuration update.
- [ ] Confirm `process_start`, `process_complete`, `process_error`, `download_click`, `cta_account`, `cta_plans`, `signup_success` and `login_success` arrive.
- [ ] Treat CTA events as intent, not completed conversion.
- [ ] Performance/Core Web Vitals tracking is **not claimed as enabled** until a privacy-compatible implementation is tested in the Umami dashboard.

## SEO

- [x] Sitemap source cleaned so it contains valid XML line breaks rather than literal `\\n` text.
- [x] FAQ metadata / social preview tags / structured FAQ copy aligned with current account and Pro status.
- [ ] Submit/re-check `https://droopweb.lat/sitemap.xml` in Search Console.
- [ ] Inspect homepage, FAQ, Pro and the highest-value tool URLs.
- [ ] Treat “Page with redirect” as informational until the redirect target is checked.
- [ ] Do not repeatedly request indexing without evidence it is needed.

## Privacy / PWA

- [x] Privacy page documents local media processing, Umami and Supabase account/preset data.
- [ ] Test installability in Chrome/Edge Android/desktop after deployment.
- [x] Added non-transparent 192px/512px raster icons, maskable 512px icon and iOS touch icon.
- [x] Manifest now includes stable `id`, standalone display, raster icons and shortcuts.
- [ ] Do not claim offline support; no service worker exists.

## Billing / Pro — do not go live yet

- [ ] Decide the first paid benefit that is already deliverable.
- [ ] Agree price and billing interval.
- [x] Lemon Squeezy test store/product/variant identified: store 477243, product 1371942, actual Pro variant 2143724.
- [x] Webhook hardened and deployed with store/variant/test-mode validation, persisted subscription ownership, idempotency and stale-event protection.
- [x] Lemon webhook Edge Function deployed with JWT verification disabled; HMAC signature validation remains inside the function.
- [x] Checkout Edge Function authenticates the bearer token inside the handler; browser checkout sends the current user JWT and publishable key explicitly and never accepts a browser-provided plan.
- [ ] Perform the first real Lemon test-mode checkout and verify persisted webhook/subscription rows; then exercise lifecycle/duplicate/out-of-order events.
- [ ] Only then enable live checkout.

## Product / acquisition

- [x] Free → account → plans funnel links are in place, with direct signup entry and a dedicated bilingual Pro comparison page.
- [x] Pro page clearly separates current Free features from planned Pro features and does not invent a price or live checkout.
- [ ] Use real Umami data to identify the most-used tools.
- [ ] Measure visit → tool use → account → Pro intent → payment.
- [ ] Create demos/content around the strongest tools instead of adding metadata indefinitely.

## Licensing / future sale

- [ ] Review the current MIT license before promising exclusivity to a future buyer. Existing MIT grants cannot simply be revoked from copies already distributed.
- [ ] Keep a service/dependency inventory and record real costs/revenue.
