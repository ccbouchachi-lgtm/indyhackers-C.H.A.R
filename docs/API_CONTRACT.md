# GroupLock API contract

**Status: approved by frontend and extension.** See [backend setup](BACKEND_SETUP.md) for deployment and database checks.

## Conventions

JSON keys are camelCase. IDs are UUID strings; dates are UTC ISO 8601 strings.
A successful response is `{ "data": <value> }`. Errors are
`{ "error": { "code": "<CODE>", "message": "<human-readable message>" } }`.
Clients should branch on the code, not the message.

| HTTP | Codes |
| --- | --- |
| 400 | `VALIDATION_ERROR` |
| 401 | `UNAUTHENTICATED`, `INVALID_CREDENTIALS` |
| 403 | `FORBIDDEN` (known resource, action disallowed) |
| 404 | `NOT_FOUND` (includes resources outside caller visibility) |
| 409 | `INVALID_TRANSITION`, `IDEMPOTENCY_CONFLICT` |
| 429 | `RATE_LIMITED` |
| 500 | `INTERNAL_ERROR` |

Web requests use Supabase Auth SSR cookies. Write requests from browsers require
same-origin validation. Use the [Supabase Next.js SSR pattern](https://supabase.com/docs/guides/auth/server-side/nextjs)
for cookie refresh and verified identity. Authentication and focus responses use
`Cache-Control: no-store`. Caller identity always comes from verified credentials.
No request accepts a user ID to select the subject of focus status.

## Shapes

```ts
type Timestamp = string;
type Profile = {
  id: string; username: string; email: string | null;
  avatarUrl: string | null; createdAt: Timestamp;
};
type Role = "owner" | "admin" | "member";
type Group = { id: string; name: string; ownerId: string; role: Role };
type Member = { userId: string; username: string; avatarUrl: string | null; role: Role };
type Task = {
  id: string; groupId: string; title: string; description: string;
  assignedTo: string; reviewerId: string; deadline: Timestamp;
  status: "assigned" | "accepted" | "submitted" | "changes_requested" | "approved";
  focusAgreementId: string | null; submissionUrl: string | null;
  submittedAt: Timestamp | null; approvedAt: Timestamp | null;
  graceUntil: Timestamp | null; submissionVersion: number; isOverdue: boolean;
};
type FocusAgreement = {
  id: string; userId: string; groupId: string; enabled: boolean;
  allowedDomains: string[]; expiresAt: Timestamp; createdAt: Timestamp;
};
type FocusStatus = {
  active: boolean; serverTime: Timestamp; allowedDomains: string[];
  activeTasks: { taskId: string; agreementId: string; expiresAt: Timestamp }[];
};
type Notification = {
  id: string; taskId: string;
  type: "task_assigned" | "task_submitted" | "task_approved" | "task_changes_requested";
  readAt: Timestamp | null; createdAt: Timestamp;
};
type Connection = { id: string; revokedAt: Timestamp | null };
```

## Web endpoints

Paths below are relative to `/api`. The last column is the successful status and
the value inside `data`.

| Method and path | JSON body | Success |
| --- | --- | --- |
| POST /auth/signup | `{ email, password, username }` | 201 `{ requiresEmailConfirmation: boolean }` |
| POST /auth/login | `{ email, password }` | 200 `Profile` |
| POST /auth/logout | — | 200 `null` |
| GET /auth/me | — | 200 `Profile` |
| GET /groups | — | 200 `Group[]` |
| POST /groups | `{ name }` | 201 `{ group: Group, inviteCode: string }` |
| POST /groups/join | `{ inviteCode }` | 200 `Group` |
| GET /groups/:groupId | — | 200 `{ group: Group, members: Member[], inviteCode: string \| null }` |
| GET /groups/:groupId/tasks | — | 200 `Task[]` |
| POST /groups/:groupId/tasks | `{ title, description?, assignedTo, reviewerId, deadline }` | 201 `Task` |
| GET /tasks/:taskId | — | 200 `Task` |
| POST /tasks/:taskId/accept | `{ focusAgreement?: { allowedDomains: string[], expiresAt: Timestamp } }` | 200 `{ task: Task, focusAgreement: FocusAgreement \| null }` |
| POST /tasks/:taskId/submit | `{ submissionUrl: string, expectedSubmissionVersion: number }` | 200 `Task` |
| POST /tasks/:taskId/review | `{ decision: "approve" \| "request_changes", submissionVersion: number }` | 200 `Task` |
| DELETE /focus-agreements/:agreementId | — | 200 `FocusAgreement` (disabled) |
| GET /focus-status | — | 200 `FocusStatus` |
| GET /notifications | — | 200 `Notification[]` (newest first) |
| POST /notifications/:notificationId/read | — | 200 `Notification` |
| GET /extension/connections | — | 200 `Connection[]` |
| POST /extension/pair | — | 201 `{ connection: Connection, credential: string }` |
| DELETE /extension/connections/:connectionId | — | 200 `Connection` (revoked) |

Email confirmation, when enabled, returns through a server callback that verifies
the Supabase token and only redirects to a fixed same-origin destination.
Profiles are created from verified Auth identity, with username from signup metadata.
Group creation atomically creates owner membership and a random 32-character hex invite
code. Only owners and admins can retrieve it. Joining is idempotent and rate limited.

## Task and focus rules

- Owner/admin can create and assign tasks. Both assignee and reviewer must belong
  to the group and must be different users. Group members can read tasks. Only
  the assignee accepts and submits; only the designated reviewer reviews.
- Transitions: `assigned → accepted → submitted → approved` or
  `submitted → changes_requested → submitted`. Submission URLs must use HTTPS.
  Acceptance can include explicit consent to one optional focus agreement for
  that task. Agreement expiration must be after the server's acceptance time.
- Overdue is derived at read time: `serverTime >= deadline` and status is
  `assigned`, `accepted`, or `changes_requested`. Submitted and approved tasks
  are not currently overdue. Grace delays blocking without changing the deadline.
- Focus is active only for accepted or changes-requested tasks with an enabled,
  unexpired agreement, once the deadline has arrived and any grace period has
  ended. Requesting changes grants **15 minutes** from the server review time.
  Submission and approval remove the task from focus immediately on the server;
  revocation disables the agreement immediately. All comparisons use server time.
- Allowlist entries are canonical DNS hostnames (lowercase, no wildcard, scheme,
  path, or port). Each entry allows exactly that host. When several tasks are
  active, intersect their allowlists. Sort domains and active tasks deterministically.
  If inactive, return empty arrays and remove GroupLock blocking. The extension
  only blocks its locally authorized list of distracting domains, minus the
  returned allowlist and essential sites (including GroupLock and its auth
  service). An empty allowlist adds no exemptions. Remote status never adds new
  domains to the locally authorized list. The extension provides a local override.
- The client sends the last observed `submissionVersion` as
  `expectedSubmissionVersion`. The server locks the task row, increments the
  version on a new submission, and inserts one reviewer notification in that
  transaction. Same-version retries of the latest successful submission with
  the same URL are safe; stale or conflicting attempts return 409. Review also
  locks the row and must match the current submission version. Email delivery
  uses a server-side outbox keyed by the notification ID and the same stable
  Resend idempotency key on retry. Email failure does not undo submission.

## Chrome extension pairing and polling

An authenticated user creates a connection on the web and transfers the one-time
displayed credential into their extension. The credential is a random 256-bit
opaque secret; the server stores only its SHA-256 hash. Never place it in a URL,
log it, or bake it into the extension. Store it in extension-local storage and
restrict access to trusted extension contexts.

Call `GET /api/focus-status` with `Authorization: Bearer <credential>` over HTTPS
(outside local development). The request has no body or account ID. A supplied
bearer credential takes precedence over cookies; invalid or revoked credentials
return 401, never a cookie fallback. The server resolves the user from the
connection. The extension should poll on startup and use
[Chrome alarms](https://developer.chrome.com/docs/extensions/reference/api/alarms)
with a **30-second** period on Chrome versions that support it. On
401 clear the credential and remove blocking. On network or server errors fail
open; clear existing GroupLock rules. Reconcile locally at expiration using
the server time and agreement expiry in the response. Server state changes take effect on
the extension's next successful poll. Re-pairing creates a new connection.
