const fs = require("fs");
const assert = require("assert");

const readme = fs.readFileSync("README.md", "utf8");
const checklist = fs.readFileSync("docs/launch-checklist.md", "utf8");

assert(!readme.includes("Google OAuth frontend support is feature-flagged"), "README still claims Google OAuth is feature-flagged");
assert(readme.includes("Google sign-in live in production"), "README must document live Google sign-in");
assert(readme.includes("synced Brand Kits"), "README must include current Brand Kits value");
assert(readme.includes("batch Audio Converter"), "README must include current batch Audio Converter value");

assert(checklist.includes("Updated: 2026-09-19"), "Launch checklist date is stale");
assert(checklist.includes("Google sign-in is enabled in production"), "Launch checklist must reflect live Google sign-in");
assert(checklist.includes("Cloudflare Turnstile is enabled"), "Launch checklist must reflect active Turnstile protection");
assert(checklist.includes("synced Brand Kits"), "Launch checklist must reflect current Pro Brand Kits");
assert(checklist.includes("local Recent Runs / Run Again"), "Launch checklist must reflect current Recent Runs feature");
assert(!checklist.includes("History and additional batch workflows remain roadmap items"), "Launch checklist contains stale Pro roadmap copy");

console.log("✓ launch documentation matches current shipped state");
