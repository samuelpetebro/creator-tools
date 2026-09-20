const fs = require("fs");
const assert = require("assert");

const readme = fs.readFileSync("README.md", "utf8");
const checklist = fs.readFileSync("docs/launch-checklist.md", "utf8");
const billing = fs.readFileSync("docs/billing-go-live.md", "utf8");
const operations = fs.readFileSync("docs/operations-runbook.md", "utf8");

assert(!readme.includes("Google OAuth frontend support is feature-flagged"), "README still claims Google OAuth is feature-flagged");
assert(readme.includes("Google sign-in live in production"), "README must document live Google sign-in");
assert(readme.includes("synced Brand Kits"), "README must include current Brand Kits value");
assert(readme.includes("batch Audio Converter"), "README must include current batch Audio Converter value");

assert(checklist.includes("Updated: 2026-09-20"), "Launch checklist date is stale");
assert(checklist.includes("Google sign-in is enabled in production"), "Launch checklist must reflect live Google sign-in");
assert(checklist.includes("Cloudflare Turnstile is enabled"), "Launch checklist must reflect active Turnstile protection");
assert(checklist.includes("synced Brand Kits"), "Launch checklist must reflect current Pro Brand Kits");
assert(checklist.includes("local Recent Runs / Run Again"), "Launch checklist must reflect current Recent Runs feature");
assert(!checklist.includes("History and additional batch workflows remain roadmap items"), "Launch checklist contains stale Pro roadmap copy");

assert(billing.includes("batch Audio Converter"), "Billing go-live runbook must include current batch Audio Converter value");
assert(billing.includes("synced Brand Kits"), "Billing go-live runbook must include current Brand Kits value");
assert(billing.includes("local Recent Runs / Run Again"), "Billing go-live runbook must include current Recent Runs value");
assert(!billing.includes("history / repeat-export workflows"), "Billing go-live runbook contains a shipped feature in the deferred list");

assert(operations.includes("daily production smoke"), "Operations runbook must document daily production smoke");
assert(operations.includes("daily billing endpoint smoke"), "Operations runbook must document daily billing endpoint smoke");
assert(operations.includes("weekly browser smoke"), "Operations runbook must document weekly browser smoke");
assert(operations.includes("Never paste or commit secrets"), "Operations runbook must retain the secret-handling rule");

console.log("✓ launch documentation matches current shipped state");
