# GroupLock API Contract

## Task statuses

| Status | Meaning | Blocking |
| --- | --- | --- |
| `pending` | Task assigned, waiting for acceptance | Off |
| `accepted` | Assignee accepted the task | Off |
| `overdue` | Deadline passed without a submission | On only with explicit opt-in |
| `pending_review` | Assignee submitted evidence | Suspended |
| `approved` | Reviewer approved the submission | Off |
| `changes_requested` | Reviewer asked for changes | Off during the grace period |

Blocking requires the assignee to explicitly opt in. The assignee can override it at any time, and blocking expires automatically.

## Database tables

| Table | Columns |
| --- | --- |
| `profiles` | `id`, `username`, `email`, `avatar_url`, `created_at` |
| `groups` | `id`, `name`, `invite_code`, `owner_id` |
| `group_members` | `group_id`, `user_id`, `role` |
| `tasks` | `id`, `group_id`, `title`, `description`, `assigned_to`, `reviewer_id`, `deadline`, `status`, `focus_agreement_id`, `submission_url`, `submitted_at`, `approved_at` |
| `focus_agreements` | `id`, `user_id`, `group_id`, `enabled`, `allowed_domains`, `expires_at`, `created_at` |
| `extension_connections` | `id`, `user_id`, `credential_hash`, `revoked_at` |
| `notifications` | `id`, `recipient_id`, `task_id`, `type`, `read_at`, `created_at` |

### GET /api/focus-status

The extension sends its paired credential. The backend uses that credential to identify the user and returns their current blocking state.

Proposed response when blocking is active:

```json
{
  "blocking": true,
  "allowedDomains": ["docs.google.com"],
  "expiresAt": "2026-11-07T22:00:00Z"
}
```

When blocking is off, return `blocking: false`, `allowedDomains: []`, and `expiresAt: null`.

### POST /api/extension/pair

Proposed flow for team review:

1. A signed-in user requests a short-lived, one-time pairing code from the website.
2. The user enters that code in the extension.
3. The extension sends the code to this endpoint and receives a revocable credential.
4. The extension sends `Authorization: Bearer <credential>` when calling `GET /api/focus-status`.

The backend links the credential to the signed-in account that created the code and stores only the credential hash. Expired or already-used codes are rejected. If the credential is revoked, the extension clears its blocking rules.

