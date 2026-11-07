# GroupLock extension 0.2.0

This extension integrates with the backend API in PR #4 and `docs/API_CONTRACT.md`. The backend branch is included in `feature/extension-backend-integration`. Extension files now live at the repository root in `/extension` (previously `outputs 4/extension`). Website and backend source files were not changed by the extension integration.

## Install or update

Use Chrome 120 or newer. Open `chrome://extensions`, enable Developer mode, and Load unpacked → this `extension` directory. If updating, replace the previous folder and reload the extension. Accept permissions for the predefined websites. Close old distracting-site tabs once after updating so their new page guard loads. Manual Block/Unblock still works before pairing.

## Pair when the backend is running

1. Follow `docs/BACKEND_SETUP.md` to start the backend with the development Supabase project and migrations.
2. Sign into that GroupLock website. From its account interface create an extension connection using **POST `/api/extension/pair`** (same-origin authenticated cookies; no body). The frontend must display the returned `data.credential` once so the account owner can copy it. If that frontend control is not built yet, the frontend teammate needs to add it; the API already exists. Do not put the credential in a URL or logs.
3. Open the extension. Select the websites you explicitly authorize for automatic restrictions.
4. Enter only the backend origin (e.g. `https://grouplock.example` or `http://localhost:3000`) and paste the pairing credential. Click **Pair account** and allow access to that origin. HTTPS is mandatory outside localhost.
5. The extension verifies the credential with **GET `/api/focus-status`**, using a bearer header, no cookies, no cache and no redirects. It polls every 30 seconds and on Chrome startup. **Sync now** checks immediately.
6. The popup shows the connection state, active overdue task count and last successful sync. It never displays the stored credential. Paired mode's main button saves your selected sites and resumes automatic focus; it does not manually force an overdue state.

Only select the development backend you intend to connect to. Optional HTTPS backend access is declared broadly because the deployed hostname is not known yet; runtime permission is requested only for the origin you enter.

## Automatic behavior

- Inactive, submitted or approved focus state clears automatic restrictions on the next successful poll.
- Active focus redirects only locally authorized predefined distracting websites to the same GroupLock focus page.
- The backend's `allowedDomains` are exact-host exemptions. `youtube.com` does not exempt `www.youtube.com`. Remote responses cannot add distracting sites.
- The GroupLock backend cannot be configured on one of the distracting domains. Auth services outside this fixed list are unaffected.
- The earliest active agreement expiry is scheduled locally using server-relative remaining time. At that alarm all automatic rules clear, then the extension requests fresh status. This fails open while remaining agreements are re-evaluated.
- Network failures, malformed responses or server errors clear automatic rules. Polling retries. A 401 clears the stored pairing credential and rules; pair again.
- **Unblock all · override** persists across polls and restarts. Only explicitly saving/resuming or re-pairing resumes automatic restrictions.
- **Disconnect and clear blocks** removes this device's stored credential. It does not revoke the server connection: revoke it from the website's account controls using DELETE `/api/extension/connections/:connectionId`.
- Chrome alarms are approximate and do not run while the browser/computer is shut down. Startup clears old automatic rules before syncing. A change on the server normally takes up to 30 seconds plus request time to appear here.

Credentials are stored only in extension-local storage restricted to trusted extension contexts. Content scripts can ask whether their own site is blocked, but cannot read the credential or other account data. No service-role key belongs in this extension.

## Local checks

With Node.js installed, run `node --test extension/tests/*.test.js` from the repository root, or `npm test` from this folder. No dependencies are needed. Checks use simulated Chrome APIs and HTTP responses; they do not establish a real Supabase connection.

## Live acceptance test once a backend URL is available

Use two development users in the same group. Assignee pairs the extension and accepts a task and expiring focus agreement; reviewer is a different user. Let its deadline pass, close the dashboard and check the selected sites block after a poll. Submit work and check unblocking after the next poll. Test approval, changes-requested grace, agreement revocation, connection revocation, exact-host exemptions, offline clearing, Chrome restart, local override persistence and agreement expiry. Check unselected sites remain accessible throughout. Enable notifications and ensure macOS permits Chrome banners to verify start/end alerts.

No live pairing or full backend database checks have been performed without a running backend connected to development Supabase.
