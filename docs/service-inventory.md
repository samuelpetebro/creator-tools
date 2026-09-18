# Droop service and dependency inventory

Updated: 2026-09-18

This is the starting inventory for operating-cost, dependency and future-sale due diligence. Amounts are recorded only when verified; unknown costs are not estimated here.

## External services

| Service | Purpose | Current project state | Cost/revenue record |
| --- | --- | --- | --- |
| GitHub / GitHub Pages | Source control, CI, static production hosting | Production repository and deployment path active | Verify account/plan billing if any |
| Namecheap | `droopweb.lat` registration / DNS ownership | Registrant contact verified | Record renewal receipt and renewal date from registrar |
| Supabase | Auth, profiles, presets, billing persistence, Edge Functions | Project `droopweb` is active and healthy; verify the current billing tier in the Supabase dashboard before recording cost | Record any verified plan charge or future upgrade |
| Umami Cloud | Privacy-focused product analytics | Production pageviews/events enabled through `js/analytics.js` | Verify current Umami account plan |
| Lemon Squeezy | Pro checkout, subscriptions, webhooks, customer portal | Test lifecycle passed; live store activation pending | No live subscription revenue yet; record fees/revenue after launch |
| Google Search Console | Search/indexing diagnostics | Domain property connected; sitemap submitted | No direct project revenue |
| jsDelivr / unpkg / esm.sh | Runtime CDN delivery/fallbacks for selected browser libraries | Used by browser tools; availability is an external dependency | No project-specific amount recorded |

## Notable runtime libraries / remote packages

- Supabase JS v2 via jsDelivr on account/Pro pages.
- FFmpeg WASM packages, currently including `@ffmpeg/ffmpeg@0.12.10`, `@ffmpeg/util@0.12.1` and `@ffmpeg/core@0.12.10`, with CDN fallbacks in media tools.
- Hugging Face Transformers JS `@huggingface/transformers@4.2.0` for the background-removal path.
- Additional local/vendor assets should remain pinned and documented when added.

## Revenue / cost ledger to maintain

For sale readiness, keep a monthly record of:

- domain and SaaS charges;
- Lemon Squeezy gross sales, refunds, taxes/fees and net payout;
- any paid hosting/API/model/CDN costs;
- support or contractor expenses;
- active subscribers and MRR once real billing launches.

Do not infer revenue from test-mode Lemon subscriptions or mixed development analytics traffic.
