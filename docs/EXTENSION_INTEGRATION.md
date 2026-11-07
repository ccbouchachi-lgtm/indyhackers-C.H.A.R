# Extension handoff

Load `/extension` from branch `feature/extension-backend-integration` in Chrome. This branch merges `feature/backend` with `feature/extension-v2` and implements PR #4's pairing and focus polling contract. See `/extension/README.md` for setup and live acceptance steps.

Frontend handoff: offer an authenticated **Create extension credential** button that POSTs `/api/extension/pair` with same-origin cookies and displays `data.credential` once in a copyable password field. Never send or log the credential elsewhere. List and revoke account connections using the API contract. The account owner pastes the credential and backend URL into the extension; no cross-origin session-cookie pairing or permanent keys are used.

Real integration testing remains pending a running backend URL connected to development Supabase. Local tests cover bearer requests, revoked credentials, offline clearing, malformed status, server-relative expiry, exact-host exemptions and a persistent local override.
