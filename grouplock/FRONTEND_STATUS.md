# Frontend audit

Branch: `feature/frontend`. Existing design preserved. No backend, database, or Chrome extension changes.

| Feature | Frontend status | Integration needed |
| --- | --- | --- |
| Get Started → `/signup` | Added: validated demo onboarding, then create/join/explore choices | Real registration, account storage, verification |
| Sign In → `/login` | Added: explicitly labeled demo profile selector; opens dashboard | Real authentication, sessions, logout, route protection, recovery |
| Dashboard | Groups, assignments, deadlines, review counts, leaderboard | Server queries and persistence |
| Create/join group | Validation, local invite codes, membership, navigation | Shared groups, invitations, authorization |
| Group workspace | Members, tasks, contribution ranking, invite copying | Membership and task APIs |
| Create task | Title, description, distinct assignee/reviewer, future deadline | Persistent tasks and authoritative validation |
| Accept/submit | Assignee actions, summary/link submission, resubmission history | Server state transitions and storage; uploads if required |
| Review | Assigned-reviewer approval or change request with required feedback | Server permissions and review persistence |
| Notifications | Derived pending-review and requested-changes queues | Delivery, read state, real-time/email/push if required |
| Profile | Progress, completed tasks, history, top three, levels and badges | Authoritative user/contribution data |
| Focus settings | Local domain list and explicit disconnected extension status | User settings API, extension handshake, actual blocking |
| Navigation | Landing, auth entry, app nav, group/task/review, back/cancel links | Session-aware redirects when auth exists |

No shared API contract or backend endpoints were found. All app data uses the separate `src/lib/mock-api.ts` adapter and `mock-data.ts` fixtures. Writes persist in browser localStorage, with memory fallback when storage is unavailable. Demo accounts are not authentication; no passwords are collected. No real server task saving, external notifications, or website blocking is implied.

Validation:

- `npm run lint`: passed.
- `tsc --noEmit`: passed.
- `npm run test:frontend`: passed. Tests cover onboarding, group creation/joining, task creation/acceptance/submission, role guards, validation, requested changes, resubmission, approval, activity, local persistence and route entrypoints.
- HTTP checks: `/`, `/signup`, `/login`, `/dashboard`, `/groups/create`, `/groups/join`, `/groups/launch`, `/groups/launch/tasks/create`, `/tasks/landing`, `/tasks/journey/review`, `/notifications`, `/profile`, `/focus` all returned 200.
- `npm run build`: failed twice, including the escalated retry, because Turbopack's CSS worker cannot bind a local port: `Operation not permitted (os error 1)`. Production build success remains unverified. Next.js also reports a multiple-lockfile workspace-root warning.
- Browser end-to-end/visual checks were not run. HTTP checks establish route availability, not complete browser interaction behavior. Workflow checks exercise the mock adapter.

See `src/lib/README.md` for the manual demo handoff sequence. Run `npm run test:frontend` to repeat automated tests.
