const fs = require("fs");
const assert = require("assert");

const readme = fs.readFileSync("README.md", "utf8");
const checklist = fs.readFileSync("docs/launch-checklist.md", "utf8");
const billing = fs.readFileSync("docs/billing-go-live.md", "utf8");
const operations = fs.readFileSync("docs/operations-runbook.md", "utf8");
const operationsLower = operations.toLowerCase();

assert(!readme.includes("Google OAuth frontend support is feature-flagged"), "README still claims Google OAuth is feature-flagged");
assert(readme.includes("Google sign-in live in production"), "README must document live Google sign-in");
assert(readme.includes("synced Brand Kits"), "README must include current Brand Kits value");
assert(readme.includes("batch Audio Converter"), "README must include current batch Audio Converter value");

assert(checklist.includes("Updated: 2026-09-24"), "Launch checklist date is stale");
assert(checklist.includes("Google sign-in is enabled in production"), "Launch checklist must reflect live Google sign-in");
assert(checklist.includes("Cloudflare Turnstile is enabled"), "Launch checklist must reflect active Turnstile protection");
assert(checklist.includes("synced Brand Kits"), "Launch checklist must reflect current Pro Brand Kits");
assert(checklist.includes("local Recent Runs / Run Again"), "Launch checklist must reflect current Recent Runs feature");
assert(!checklist.includes("History and additional batch workflows remain roadmap items"), "Launch checklist contains stale Pro roadmap copy");

assert(billing.includes("PayPal"), "Billing go-live runbook must describe PayPal");
assert(billing.includes("PAYPAL_SANDBOX=true"), "Billing runbook must stage sandbox before live");
assert(billing.includes("PAYPAL_SANDBOX=false"), "Billing runbook must document the live transition");
assert(billing.includes("billingLiveEnabled=false"), "Public billing must remain gated during controlled validation");
assert(checklist.includes("Lemon merchant application was rejected"), "Launch checklist must record the abandoned Lemon production path");
assert(checklist.includes("PayPal checkout"), "Launch checklist must reflect the PayPal production path");

assert(operationsLower.includes("daily production smoke"), "Operations runbook must document daily production smoke");
assert(operationsLower.includes("daily billing endpoint smoke"), "Operations runbook must document daily billing endpoint smoke");
assert(operationsLower.includes("weekly browser smoke"), "Operations runbook must document weekly browser smoke");
assert(operations.includes("Never paste or commit secrets"), "Operations runbook must retain the secret-handling rule");

console.log("✓ launch documentation matches current shipped state");
