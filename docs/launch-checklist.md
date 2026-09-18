# Droop launch checklist

Updated: 2026-09-18

This file distinguishes **code present**, **deployed**, and **behavior actually tested**.

## Critical owner action

- [x] **Verify the Namecheap registrant contact for `droopweb.lat` before 2026-09-22.** User confirmed the verification link was completed on 2026-09-17.
- [x] Namecheap registrant contact verification confirmed complete by the user on 2026-09-17.

## Public site / GitHub Pages

- [ ] Confirm the latest `main` commit is the GitHub Pages deployment currently serving `droopweb.lat`.
- [ ] Desktop smoke test: homepage, catalog search/filter, language switch, FAQ, Pro, account.
- [ ] Mobile smoke test: navigation remains accessible, catalog scrolls correctly, account/plan links are reachable.
- [ ] Verify a nested missing URL renders the 404 page with working CSS, navigation and analytics assets.
- [ ] Verify `/?q=image` pre-fills and filters the catalog; this is required by the homepage SearchAction structured data.

## Accounts / presets

- [x] Basic user flow previously confirmed: sign in → save preset → reload → load preset → delete preset.
- [ ] Fresh registration test with email confirmation as currently configured.
- [ ] Password reset/recovery test.
- [ ] Display-name update test.
- [ ] Verify Free stops at 5 presets and cannot change its own `plan`.
- [ ] Repeat the account/preset smoke test on a phone.

## Analytics

- [ ] Confirm pageviews arrive in Umami after the tracker configuration update.
- [ ] Confirm `process_start`, `process_complete`, `process_error`, `download_click`, `cta_account`, `cta_plans`, `signup_success` and `login_success` arrive.
- [ ] Treat CTA events as intent, not completed conversion.
- [ ] Performance/Core Web Vitals tracking is **not claimed as enabled** until a privacy-compatible implementation is tested in the Umami dashboard.

## SEO

- [ ] Submit/re-check `https://droopweb.lat/sitemap.xml` in Search Console.
- [ ] Inspect homepage, FAQ, Pro and the highest-value tool URLs.
- [ ] Treat “Page with redirect” as informational until the redirect target is checked.
- [ ] Do not repeatedly request indexing without evidence it is needed.

## Privacy / PWA

- [x] Privacy page documents local media processing, Umami and Supabase account/preset data.
- [ ] Test installability in Chrome/Edge Android/desktop.
- [ ] Add raster PWA icons / iOS touch icon before promoting Droop as an installable app.
- [ ] Do not claim offline support; no service worker exists.

## Billing / Pro — do not go live yet

- [ ] Decide the first paid benefit that is already deliverable.
- [ ] Agree price and billing interval.
- [ ] Confirm Lemon Squeezy account/store/product/variant in test mode.
- [ ] Harden the webhook before deployment: fail closed on missing variant, validate store + test/live mode, model real subscription statuses, persist subscription ownership, add idempotency/out-of-order protection, and verify profile updates affect a row.
- [ ] Confirm the Edge Function accepts Lemon webhooks without requiring a Supabase user JWT.
- [ ] Build authenticated checkout linkage; do not trust a browser-provided plan change.
- [ ] Test create/update/cancel/resume/expire/refund/payment-failure and duplicate/out-of-order events.
- [ ] Only then enable live checkout.

## Product / acquisition

- [ ] Use real Umami data to identify the most-used tools.
- [ ] Measure visit → tool use → account → Pro intent → payment.
- [ ] Create demos/content around the strongest tools instead of adding metadata indefinitely.

## Licensing / future sale

- [ ] Review the current MIT license before promising exclusivity to a future buyer. Existing MIT grants cannot simply be revoked from copies already distributed.
- [ ] Keep a service/dependency inventory and record real costs/revenue.
