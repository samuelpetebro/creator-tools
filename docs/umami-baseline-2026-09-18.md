# Umami baseline — 2026-09-18

The owner confirmed that Umami pageviews are arriving in production.

Visible 24-hour overview at the time of confirmation:

- Visitors: 11
- Visits: 17
- Views: 94
- Bounce rate: 47%
- Visit duration: 7m 41s

Derived ratios:

- ~1.55 visits per visitor
- ~5.53 views per visit
- ~8.55 views per visitor

Important: this window contains active development and QA traffic from the owner, so it must not be treated as a clean audience or conversion baseline.

## Next analytics validation

Open Umami **Events** and confirm that these event names are appearing when their matching actions occur:

- process_start
- process_complete
- process_error
- download_click
- cta_account
- cta_plans
- signup_success
- login_success

Then use **Breakdown -> Page** (or the equivalent page URL/title breakdown) to identify which tools are actually generating visits/views. Only after that should product work be prioritized from analytics.
