# Droop launch checklist

Updated: 2026-09-18

This file distinguishes **code present**, **deployed**, and **behavior actually tested**.

## Critical owner action

- [x] Namecheap registrant contact for `droopweb.lat` verified successfully before the 2026-09-22 deadline.

## Public site / GitHub Pages

- [x] Production smoke workflow now runs only after GitHub Pages reports a successful deployment, then checks core pages, manifest, icons, sitemap and custom 404.
- [x] Shared tool translation selectors fixed so tool i18n and cloud preset loading do not abort at runtime.
- [x] Latest `main` analytics coverage commit deployed successfully to GitHub Pages and passed the matching production smoke workflow.
- [x] Automated Chromium smoke test covers desktop catalog rendering plus mobile homepage/search/language/account-signup/Pro navigation, all 17 active tool pages, runtime page errors, horizontal overflow, and guest preset-widget mounting on supported tools.
- [ ] Manual phone visual smoke test remains pending; automated 390×844 Chromium layout checks and screenshots now run in CI.
- [x] All HTML entry points use `viewport-fit=cover` and expose the iOS home-screen icon.
- [x] Automated production smoke verifies a nested missing URL returns the custom 404 page.
- [x] Fixed the nested `/extract-audio/` page to use root-relative production assets/navigation instead of resolving CSS/JS/links under `/extract-audio/`.
- [x] Browser smoke verifies `/?q=image` pre-fills the search and only returns image-category catalog cards.

## Accounts / presets

- [x] Database integrity audit: no auth users without profiles, no orphan profiles/presets, no invalid plans and no duplicate preset names.
- [x] Account page is bilingual (EN/ES) and uses the shared `droop-language` preference.
- [x] Explicit “Create free account” CTAs open account signup mode directly.
- [x] Basic user flow previously confirmed: sign in → save preset → reload → load preset → delete preset.
- [x] Saved-preset controls are wired into all 14 active tools that expose reusable settings; signed-in users can save/load/delete settings without leaving the tool.
- [ ] Fresh registration test with a second account remains pending.
- [x] Existing account is email-confirmed and has completed at least one successful sign-in; auth user/profile counts are aligned.
- [x] Browser automation covers forgot-password request, recovery-mode password update, signed-in password update and post-recovery return to the account workspace.
- [x] Display-name database path tested in a rollback-safe transaction and browser automation verifies the signed-in UI calls the dedicated RPC.
- [x] Verified in a rollback-safe database test that Free stops at 5 presets and the sixth insert is rejected.
- [x] Verified authenticated clients have no direct UPDATE privilege on `profiles` and no SELECT access to server-only billing tables.
- [x] Reconfirmed after the migration that authenticated users cannot directly update `profiles.plan`; unrelated authenticated user IDs see zero profile/preset rows.
- [x] Browser roles were stripped of unnecessary `TRUNCATE`, `REFERENCES` and `TRIGGER` privileges on account/preset/billing tables; row-level app access remains unchanged.
- [ ] Physical-phone account/preset smoke test remains pending; automated 390×844 signed-in account coverage now includes profile, password and preset deletion flows.

## Analytics

- [x] Pageviews confirmed in the Umami dashboard after the tracker configuration update. Owner-observed 24h baseline on 2026-09-18: 11 visitors, 17 visits, 94 views, 47% bounce rate and 7m 41s visit duration. Treat this as mixed development/test traffic, not a clean acquisition baseline.
- [ ] Confirm `process_start`, `process_complete`, `process_error`, `download_click`, `signup_success`, `login_success`, `preset_save`, `preset_load` and `preset_delete` arrive in Umami. `cta_account` and `cta_plans` are already visible. Processing lifecycle instrumentation is deployed across 15 active processing tools, download tracking ignores synthetic clicks, and preset engagement is now instrumented on tools that support saved presets.
- [ ] Treat CTA events as intent, not completed conversion.
- [ ] Performance/Core Web Vitals tracking is **not claimed as enabled** until a privacy-compatible implementation is tested in the Umami dashboard.

## SEO

- [x] Sitemap source cleaned so it contains valid XML line breaks rather than literal `\\n` text.
- [x] FAQ metadata / social preview tags / structured FAQ copy aligned with current account and Pro status.
- [x] Search Console sitemap re-check: submitted 2026-09-17, downloaded successfully, 0 warnings/errors, 21 URLs submitted. The sitemap-level indexed counter still shows 0, so URL Inspection is treated as the more current signal.
- [x] URL Inspection completed for homepage, image converter, Under X MB, video trimmer, FAQ and Pro. Homepage, Image Converter and Under X MB are `Submitted and indexed`; Video Trimmer, FAQ and Pro are currently `URL is unknown to Google`.
- [ ] Treat “Page with redirect” as informational until the redirect target is checked.
- [x] No repeated indexing requests issued. The currently unknown URLs are indexable, return 200, have self-canonicals and are allowed by robots; we will let discovery/crawling catch up before forcing more action.

## Privacy / PWA

- [x] Privacy page documents local media processing, Umami and Supabase account/preset data.
- [ ] Test installability in Chrome/Edge Android/desktop after deployment.
- [x] Added non-transparent 192px/512px raster icons, maskable 512px icon and iOS touch icon.
- [x] Manifest now includes stable `id`, standalone display, raster icons and shortcuts.
- [ ] Do not claim offline support; no service worker exists.

## Billing / Pro — do not go live yet

- [x] First paid benefit decided: Pro raises saved presets from 5 to 100. The limit already exists in the database and account UI; batch/history features remain roadmap items.
- [ ] Agree price and billing interval. Internal proposal recorded in `docs/pricing-proposal.md`: USD 5/month, monthly-only for v1; do not publish it until accepted and Lemon Live Mode is ready.
- [x] Lemon Squeezy test store/product/variant identified: store 477243, product 1371942, actual Pro variant 2143724.
- [x] Webhook hardened and deployed with store/variant/test-mode validation, persisted subscription ownership, idempotency and stale-event protection.
- [x] Lemon webhook Edge Function deployed with JWT verification disabled; HMAC signature validation remains inside the function.
- [x] Checkout Edge Function authenticates the bearer token inside the handler; browser checkout sends the current user JWT and publishable key explicitly and never accepts a browser-provided plan.
- [x] First Lemon test checkout persisted correctly. Cancel → resume → pause → unpause webhooks were observed, final test subscription returned to active, and test purchases kept the Droop profile on FREE.
- [x] Rollback-safe DB audit verified duplicate-event idempotency, stale-event rejection, live active → PRO entitlement and live expired → FREE revocation.
- [x] Signed portal URL generation was verified, but Lemon blocks the hosted customer portal until the store is activated. Droop now treats this as an activation blocker instead of surfacing a dead test-mode portal link.
- [ ] After Lemon activates the store, verify the live customer portal from a physical browser.
- [ ] Activate the Lemon store, copy the tested product to Live Mode, create live API/webhook credentials, replace Store/Variant IDs with the live IDs, flip both mode flags to `false`, and re-run the full checkout/webhook/entitlement smoke test before exposing a paid CTA.

## Product / acquisition

- [x] Free → account → plans funnel links are in place, with direct signup entry and a dedicated bilingual Pro comparison page.
- [x] Pro page clearly separates current Free features from planned Pro features and does not invent a price or live checkout.
- [ ] Use real Umami data to identify the most-used tools.
- [ ] Measure visit → tool use → account → preset engagement → Pro intent → payment using the definitions in `docs/product-funnel.md`.
- [ ] Create demos/content around the strongest tools instead of adding metadata indefinitely.

## Licensing / future sale

- [x] MIT sale/licensing review recorded in `docs/licensing-and-sale.md`: existing distributed copies retain MIT rights, so do not promise exclusivity over those copies.
- [x] Initial service/dependency inventory created in `docs/service-inventory.md`; unknown recurring amounts are intentionally left for receipt/account-plan verification instead of being guessed.
