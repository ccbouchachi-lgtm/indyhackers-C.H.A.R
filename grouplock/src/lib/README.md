# Frontend integration

The integration branch has a shared contract in `docs/API_CONTRACT.md`. Real login and extension pairing use `web-api.ts`; the rest of this frontend remains a separate mock workspace. `types.ts` defines frontend domain models; `mock-data.ts` holds fixtures; `mock-api.ts` is the persistence/mutation boundary to replace with backend queries and mutations later. See `grouplock/FRONTEND_PAIRING.md` for the real session and credential creation flow. Chrome pairing still happens in the extension.

Demo state persists in localStorage under `grouplock.application.v1`. Clear this key to reset. The account selector tests different roles; permissions must also be enforced by the future backend. Points are 50 per approved task. Focus settings are browser-local demo preferences and do not block websites.

## Routes

- `/signup`: browser-local demo profile onboarding, then create/join group choices.
- `/login`: real email/password login against `/api/auth/login`.
- `/account`: verified account, extension credential creation/copy, and logout.

- `/dashboard`: groups, assignments, deadlines, review count.
- `/groups/create`, `/groups/join`: create a group or join with an invite code.
- `/groups/[id]`: members, ranking, invite code, tasks.
- `/groups/[id]/tasks/create`: task form with separate assignee/reviewer.
- `/tasks/[id]`: accept, submit/resubmit, submission history.
- `/tasks/[id]/review`: approve or request changes with required feedback.
- `/notifications`: pending reviews and changes requested.
- `/profile`: current progress, group leaderboard, top three contributors, completed tasks, contribution points and activity.
- `/focus`: website preferences and disconnected extension status.

## Try the handoff

1. As **You**, open **Build the landing page**, accept it, and submit work.
2. Switch to **Alex Morgan**, open Notifications, and request changes with feedback.
3. Switch back to **You**, open the changes notification, and resubmit.
4. As **Alex Morgan**, approve. Switch to **You** to see completion, profile history, and group ranking updated.
5. Use `BUILD24` to join Weekend Builders. For a new group, copy its invite code, switch demo accounts, and join; then create a task with two different members.

Landing page markup and styling remain intact. Its Get Started and Sign In actions now open `/signup` and `/login` respectively. Login establishes the backend cookie session and opens `/account`. Demo onboarding still creates only a local demo profile.
