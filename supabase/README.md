## Supabase setup

1. Open the Supabase SQL Editor for the Droop project.
2. Paste and run supabase/001_profiles_presets.sql.
3. In Authentication → URL Configuration, add https://droopweb.lat/account.html as a Redirect URL.
4. Keep email confirmation enabled for production.

The browser only uses the public publishable key from js/supabase-config.js; never expose a service role key.