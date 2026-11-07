# Frontend integration

No shared API contract exists in this checkout. `types.ts` defines frontend domain models; `mock-data.ts` holds fixtures; `mock-api.ts` is the persistence/mutation boundary to replace with backend queries and mutations later. No real authentication or extension connection is implemented.

Demo state persists in localStorage under `grouplock.application.v1`. Clear this key to reset. The account selector tests different roles; permissions must also be enforced by the future backend. Points are 50 per approved task. Focus settings are browser-local demo preferences and do not block websites.

## Routes

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

Landing page markup and styling remain intact. Its existing Get Started and Sign In actions now open group creation and the demo profile respectively.
