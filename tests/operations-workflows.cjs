const fs = require("fs");
const assert = require("assert");

const production = fs.readFileSync(".github/workflows/production-smoke.yml", "utf8");
const billing = fs.readFileSync(".github/workflows/billing-endpoint-smoke.yml", "utf8");
const browser = fs.readFileSync(".github/workflows/browser-smoke.yml", "utf8");

assert(production.includes('cron: "17 10 * * *"'), "Production smoke must retain its daily schedule");
assert(billing.includes('cron: "23 10 * * *"'), "Billing endpoint smoke must retain its daily schedule");
assert(browser.includes('cron: "41 10 * * 1"'), "Browser smoke must retain its weekly schedule");

assert(production.includes("workflow_dispatch:"), "Production smoke should remain manually runnable");
assert(billing.includes("workflow_dispatch:"), "Billing endpoint smoke should remain manually runnable");
assert(browser.includes("pull_request:"), "Browser smoke must keep pull-request coverage");
assert(browser.includes("- main"), "Browser smoke must keep main push coverage");

console.log("✓ operations smoke schedules and trigger coverage are current");
