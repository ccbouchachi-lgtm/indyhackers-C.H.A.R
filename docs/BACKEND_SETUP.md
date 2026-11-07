# GroupLock backend setup

The Next.js app lives in `grouplock/`. Use a development Supabase project and apply the SQL files under `supabase/migrations/` in filename order.

From the repository root, with a PostgreSQL connection string for the development database in `DATABASE_URL`:

```sh
for migration in supabase/migrations/*.sql; do
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$migration" || exit 1
done
```

Run the migrations once on a fresh database. Use your project's migration tracking when deploying to a database with existing migration history.

Create `grouplock/.env.local` using development credentials:

| Variable | Value |
| --- | --- |
| `APP_ORIGIN` | Canonical web origin, such as `http://localhost:3000` |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable key. The legacy `NEXT_PUBLIC_SUPABASE_ANON_KEY` also works. |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only credential for extension verification and email outbox processing |
| `RESEND_API_KEY` | Server-only Resend API key |
| `RESEND_FROM_EMAIL` | Sender on a verified Resend domain |
| `GROUPLOCK_EMAIL_WORKER_SECRET` | Random server-only bearer secret for the retry worker |

If email confirmation is enabled, set the Supabase Auth Site URL to `APP_ORIGIN`. Set the confirmation email link to `{{ .SiteURL }}/api/auth/confirm?token_hash={{ .TokenHash }}` so the route can verify the token and establish the session cookie. For web mutations, browsers send the page origin. Include the matching `Origin` header when testing with a script.

From `grouplock/`, use `npm ci` and `npm run dev`. The [API contract](API_CONTRACT.md) lists the app endpoints and response shapes.

## Reviewer email

Submitting a task commits the reviewer notification and outbox record together. The app attempts delivery after the HTTP response. Configure a scheduler to POST to `/api/internal/email/retry` every minute with `Authorization: Bearer <GROUPLOCK_EMAIL_WORKER_SECRET>`. The worker reclaims undelivered jobs after their one-minute lease and uses the same Resend idempotency key for every retry of a notification. Automatic retries stop after 23 hours to stay within [Resend's 24-hour idempotency window](https://resend.com/docs/dashboard/emails/idempotency-keys).

## Verification

Run the SQL checks against a disposable database with the migrations applied. They roll back their fixtures.

```sh
for check in supabase/checks/*.sql; do
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$check" || exit 1
done
```

From `grouplock/`, run `npm run lint` and `npm run build`.
