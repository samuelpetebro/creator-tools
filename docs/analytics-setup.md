# Analytics setup — prepared, NOT active

## Choice

Use Umami Cloud Hobby as the initial candidate: the official Cloud FAQ confirms a free tier, and the tracker supports custom events. Check the live account's quotas before activation; no paid plan, subscription, self-hosted server or account was created during this work.

Official references checked 2026-09-17:
- https://docs.umami.is/docs/cloud/faq
- https://docs.umami.is/docs/add-a-website
- https://docs.umami.is/docs/collect-data
- https://docs.umami.is/docs/tracker-configuration
- https://docs.umami.is/docs/tracker-functions

## Owner action required

1. Create/sign into your own Umami Cloud account and choose the free Hobby option.
2. Websites → Add website: name `droop`, domain `droopweb.lat`.
3. Open the website's Tracking code section. Supply that public script snippet, or its `src` and `data-website-id`. No account password or API key is needed.
4. Copy the website ID and script URL into `js/analytics-config.js`, bump its query version in HTML and verify the real provider before merging/deploying this draft.

Do not put an example ID in production. Empty configuration currently makes the adapter return without loading a provider, registering analytics listeners or sending requests. The adapter also returns on localhost, unknown routes, DNT, GPC, local opt-out, or unavailable localStorage.

## Coverage

- Page views: home + all 17 current catalog tools.
- `process_start`, `process_complete`, `process_error`, `process_cancel`: Thumbnail Maker, Video to GIF, Subtitle Burner, Image Upscaler, Metadata Cleaner. Only actual jobs emit starts; file opening/validation does not. Only the tools with a cancel function emit cancel events.
- `download_click`: attached native download links using blob/media data URLs. It means a download was requested, NOT confirmed saved. Legacy download code using detached links may not be counted; do not treat this as complete cross-tool export accounting.
- Other tools initially have visits and eligible link clicks only. Their lifecycle instrumentation remains a subsequent increment.

Compare starts/completions/errors/cancels per tool. Do not label their difference as exact abandonment: closed tabs, blockers, network losses and unfinished jobs also affect it. No forced unload beacon, session replay, heatmaps or persistent client identifiers are added by droop.

## Data boundary

Manual tracking only; automatic collection is disabled. The payload filter builds a new allowlisted payload:
- known canonical page path and static tool name;
- website ID and hostname;
- ES/EN interface language;
- external referring origin (no path/query/hash);
- an allowlisted event name and static tool ID.

No file name, file size, media bytes, caption text, search text, dynamic page title, URL query/hash, raw error or arbitrary event properties are forwarded. The third-party service still receives ordinary network metadata such as IP/user agent; this is not a claim of zero personal-data processing. A bilingual public description and browser opt-out are prepared in privacy.html, linked from the home and tool footers. Optional local opt-out: `localStorage.setItem('droop-analytics-disabled','1')` then reload. Clearing that key restores the configured behavior.

## Validation and final activation gate

Automated VM tests passed for empty config, off-domain pages, DNT/GPC, local opt-out, payload filtering, duplicate completion prevention, event ordering during script load, script errors and throwing providers. Metadata source-race tests still pass; modified JS syntax checks pass.

These use a fake provider. They do not establish successful delivery to Umami Cloud. Once the owner's snippet is supplied, verify its tracker version/API, inspect actual outgoing payloads in a controlled test, verify one pageview + one successful export in the owner's dashboard, and check the published opt-out/privacy information before considering analytics live.
