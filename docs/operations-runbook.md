# Droop operations runbook

Updated: 2026-09-20

This is the practical operating guide for Droop after deployment and during the Pro launch. It complements `docs/launch-checklist.md` and `docs/billing-go-live.md`.

## Automated monitoring

Droop currently has three repository-level smoke layers:

- **Daily production smoke** — `.github/workflows/production-smoke.yml` runs at 10:17 UTC every day and after pushes to `main`. It checks the deployed site at `https://droopweb.lat`.
- **Daily billing endpoint smoke** — `.github/workflows/billing-endpoint-smoke.yml` runs at 10:23 UTC every day, on pull requests and after pushes to `main`. It verifies that unauthenticated checkout/portal requests stay rejected and unsigned Lemon webhooks stay rejected.
- **Weekly browser smoke** — `.github/workflows/browser-smoke.yml` runs Mondays at 10:41 UTC, on pull requests and after pushes to `main`. It exercises Chromium journeys, account states, tool pages and responsive/layout behavior.

Scheduled GitHub Actions use UTC. The exact local wall-clock time can shift only if the operating timezone changes; the cron expressions remain UTC.

## What to do when a check fails

### Production smoke fails

1. Open the failing GitHub Actions run and identify the first failed step.
2. If the failure happened after a push, verify the matching GitHub Pages deployment completed successfully.
3. Check the homepage plus the exact route named by the smoke output.
4. Distinguish a deployment/DNS/HTTP failure from a content assertion failure.
5. If production is broken and the last known-good commit is clear, prefer a small revert or forward fix rather than unrelated changes.
6. Re-run the smoke only after the underlying cause is understood.

### Billing endpoint smoke fails

Treat this as security-sensitive even before real billing is enabled.

1. Check which invariant changed: unsigned webhook rejection, unauthenticated checkout rejection, or unauthenticated portal rejection.
2. Do not expose the paid CTA while an auth/signature invariant is failing.
3. Inspect only server-side configuration and Edge Function code needed for that invariant.
4. Never weaken authentication or webhook signature validation merely to make the smoke green.
5. Re-run the endpoint smoke after the fix and confirm all expected 401/rejection behavior is restored.

### Browser smoke fails

1. Identify whether the failure is a runtime exception, navigation/journey issue, responsive overflow, account-state regression or screenshot/layout issue.
2. Reproduce against the branch under test before touching production.
3. Pay particular attention to remotely loaded browser dependencies when the repository code did not recently change.
4. Keep fixes scoped; do not mask browser errors with broad catches unless the failure is genuinely recoverable.
5. Require the full browser smoke to pass again before merging.

## Lemon / Pro activation day

When Lemon confirms Live Mode:

1. Follow `docs/billing-go-live.md` exactly.
2. Create/copy the product in Live Mode and record the new live Store/Product/Variant IDs.
3. Create a new live Lemon API key and a live webhook with a new signing secret.
4. Update Supabase secrets atomically, keeping Test IDs and secrets out of Live configuration.
5. Redeploy checkout, webhook and portal functions.
6. Run the billing endpoint smoke before any real purchase.
7. Perform one controlled USD 5 owner subscription.
8. Verify Lemon Live order/subscription, `test_mode=false` webhook persistence, Droop FREE → PRO entitlement, 100-preset allowance and customer portal access.
9. Cancel the controlled subscription and verify the intended grace-period/expiry behavior.
10. Only then expose the public real-money checkout path.

## Secret exposure response

Never paste or commit secrets into GitHub, client-side JavaScript, documentation, screenshots or issue/PR text.

If a service-role key, Lemon API key, webhook secret or other server credential is exposed:

1. Rotate/revoke the exposed credential at the provider first.
2. Update the corresponding Supabase secret/server configuration.
3. Redeploy the affected server function if necessary.
4. Re-run billing and production smoke checks.
5. Remove the secret from the current repository state. Remember that deleting it from the latest commit does not make an already published secret safe; rotation is mandatory.
6. Review logs for unexpected access during the exposure window.

## Routine operating cadence

### Daily, automated

- Production availability/HTTP contract.
- Billing endpoint auth/signature rejection contract.

### Weekly, automated

- Browser journeys and responsive/runtime regression coverage.

### Weekly, owner review after launch

- GitHub Actions failures or flakes.
- Supabase Auth/Edge Function anomalies.
- Lemon failed payments, refunds, subscription-state mismatches and webhook errors.
- Umami acquisition → tool use → account → Pro funnel changes.
- Search Console crawl/indexing warnings that persist long enough to be actionable.

Do not treat mixed development traffic, test-mode Lemon purchases or a single noisy analytics day as business performance.

## Before changing production

- Work on a branch and use a pull request.
- Keep secrets server-side.
- Run static, billing and browser checks appropriate to the change.
- Prefer small, reversible production changes.
- Update `docs/launch-checklist.md` when a launch blocker or verified state changes.

## First month after paid launch

For the first real billing cycle, record new failure modes instead of relying on memory. Add only issues that actually occurred or checks justified by evidence. The goal is a small operating system that catches meaningful regressions, not a large checklist that nobody uses.
