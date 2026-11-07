# Sign-in and extension credential controls

This branch includes the existing fiery frontend plus two real backend-connected controls:

- `/login` posts `{ email, password }` to `/api/auth/login`, uses backend session cookies, and redirects to `/account` only on success. Invalid/unconfirmed accounts and network errors remain visible on the form. No passwords are saved locally.
- `/account` verifies the user through `/api/auth/me`. **Create extension credential** posts to `/api/extension/pair` and displays the returned `data.credential` with show/hide and copy controls. Credentials stay in component memory only and are never written to localStorage, URLs, or logs. Repeated creation is disabled after success. Sign Out calls `/api/auth/logout` and clears the displayed credential.

The account selector, groups, tasks, notifications, leaderboard, and signup onboarding are still a separately labeled browser-local demo. Selecting a demo profile does not change the real signed-in identity or credential owner. The application navigation includes **Account & extension** to return to the real pairing controls.

## Manual verification

1. Configure the existing backend using `docs/BACKEND_SETUP.md`: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, server-only `SUPABASE_SERVICE_ROLE_KEY`, and `APP_ORIGIN` matching the exact app origin. Never prefix the service role key with `NEXT_PUBLIC_`.
2. Run the app or deploy the integration branch with Vercel Root Directory `grouplock`.
3. Visit `/login`, use your own confirmed Supabase account, and verify `/account` shows that identity. Wrong credentials must leave you on the login form with an error.
4. Create a credential. Copy the app origin and credential into the Chrome extension, then **Pair account → Sync now**. Pairing/sync success is shown in Chrome; this frontend does not claim it has verified the extension connection.
5. Sign out and verify `/account` asks for sign-in and offers no credential creation action.

Automated frontend checks: `npm run lint`, `node --test tests/frontend.test.mjs`, `npx tsc --noEmit`. Real account/extension end-to-end verification requires configured Supabase and a confirmed account. No backend or extension source files were modified for these controls.

## Validation in this workspace

Lint, TypeScript, and all three frontend tests passed. Tests exercise the real API request contract using mocked HTTP responses, not a live Supabase account. `npm run build` was attempted twice: the first failed downloading Google fonts with restricted network access, and the escalated retry failed because Turbopack's CSS worker could not bind its local port (`Operation not permitted`). Production build and real account-to-extension pairing remain unverified in this environment.
