# Google sign-in rollout

Droop uses Supabase Auth. The frontend Google OAuth flow is implemented behind the public `googleOAuthEnabled` feature flag in `js/supabase-config.js`.

## Production values

- App origin: `https://droopweb.lat`
- Account return URL: `https://droopweb.lat/account.html?oauth=google`
- Supabase project callback URL: `https://qbzqiiinugidkdxcpdln.supabase.co/auth/v1/callback`

## Enablement checklist

1. In Google Auth Platform, create a **Web application** OAuth client.
2. Add `https://droopweb.lat` as an Authorized JavaScript origin.
3. Add the Supabase callback URL above as an Authorized redirect URI.
4. Configure the standard Supabase-required scopes: `openid`, email and profile.
5. Put the Google Client ID and Client Secret only in the Supabase Google provider settings. Never commit the secret.
6. In Supabase Auth URL Configuration, keep the production Site URL on `https://droopweb.lat` and allow the account return URL.
7. Test with a real second Google account.
8. Verify the resulting user receives a normal `profiles` row and remains `free` unless billing grants Pro.
9. Test sign-out, sign-back-in, email/password accounts and Google accounts side-by-side.
10. Only after the real smoke passes, flip `googleOAuthEnabled` to `true` and deploy.

Google OAuth is an authentication convenience. It must never write or infer `profiles.plan`.
