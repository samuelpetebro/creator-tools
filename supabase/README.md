## Supabase setup

1. Open the Supabase SQL Editor for the Droop project.
2. On a fresh project, paste and run `001_profiles_presets.sql`.
3. On the current project, the same hardening is already applied through Supabase migrations; do not run destructive resets.
4. In Authentication → URL Configuration, add `https://droopweb.lat/account.html` as a Redirect URL.
5. In Authentication → Password Security, enable leaked-password protection.
6. Keep email confirmation enabled for production.

The browser uses only the public publishable key from `js/supabase-config.js`. Never expose a service role or secret key. RLS is enabled on every exposed table, free accounts are limited to 5 presets, and Pro accounts to 100.