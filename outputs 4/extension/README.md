# GroupLock Chrome extension — standalone milestone

No build step or backend needed. All extension code stays in this folder. No network calls, credentials, browsing-history collection, or website code. A small content script checks selected sites against local blocking rules, including cached pages.

## Install
1. Open Google Chrome and enter `chrome://extensions` in the address bar.
2. Enable **Developer mode** (top right).
3. Click **Load unpacked** and choose this `extension` folder, containing `manifest.json`.
4. Open the puzzle-piece menu and pin **GroupLock — Focus Blocker**.
5. Open GroupLock, select YouTube, and click **Block selected websites**.

## Verify in Chrome
- Open or reload `https://www.youtube.com`. You should see the GroupLock focus page. Also test `https://youtu.be`.
- Close the popup and GroupLock website, then navigate to YouTube again. Blocking should remain active.
- Open the extension and click **Unblock all · override**, then reload YouTube. It should load.
- Select two websites, block them, restart Chrome, and confirm both are still blocked and the popup reports them correctly.
- Update the selection and click **Update blocked websites**. Deselected websites should become accessible.
- Click Block with nothing selected; a useful error should appear.
- Turn on notifications and grant permission. Block and unblock a website; notifications should appear if your OS allows them.
- Disable or remove the extension from `chrome://extensions` to stop all blocking.

Existing pages already loaded are not closed or erased. Navigate or reload to check blocking. Regular Chrome tabs are supported; incognito is not enabled by default. Blocking does not affect other browsers or apps. This manual milestone stays active until you unblock; it does not represent a timed or backend focus agreement.

## Automated checks
With Node.js installed, run `npm test` from this folder. No package installation is needed. Tests cover domain allowlisting, generated rules, worker message handling, rule replacement, persistence, and the override.

## Backend handoff — not implemented yet
Pairing, automatic deadline activation, expiration, revocation, task status, and periodic synchronization are deliberately pending the backend developer's `docs/API_CONTRACT.md`. The popup explicitly shows manual mode; it never simulates a connected account.

Before integrating, agree on the pairing request/response, credential expiry and revocation, focus-status schema, agreement expiration, authorized domain IDs, protected service domains, and offline behavior. Use revocable credentials and no service-role keys. Remote responses must never expand this local allowlist or activate domains without explicit local user consent. An expired or revoked agreement must clear automatic restrictions; offline responses must not create new restrictions. Keep the local override available. Add `alarms` and narrowly scoped backend host permissions only when required by the real integration.

## Permissions
- `declarativeNetRequest`: blocks navigation to explicitly selected, predefined domains and subdomains using dynamic redirect rules that open the GroupLock focus page.
- `storage`: remembers your selected websites and notification preference locally.
- `notifications` (optional): requested only when you turn notifications on.

Content scripts run only on the predefined distracting sites; Chrome may ask for permission to read and change those sites. They check local blocking status and redirect blocked pages; they do not collect page content. No broad host permissions are requested. Dynamic rules persist across Chrome restarts. Reference: https://developer.chrome.com/docs/extensions/reference/api/declarativeNetRequest/

## Updating to 0.1.1
Replace the previous extension folder, click Reload on its card in chrome://extensions, and accept any site-access prompt. Close existing distracting-site tabs once so Chrome loads the new guard on fresh tabs. After that, ordinary navigation and cached pages are checked without needing a hard refresh.

## Updating to 0.1.2
All selected websites now redirect to the same GroupLock focus page, for both network and cached-page navigation. Host access is scoped to the eight existing distracting-site domains and is required by Chrome for redirects. Replace your extension files and reload the extension, accepting the site-access prompt if shown. Select the sites and click Block/Update again to confirm the active selection. Test ordinary navigation to YouTube and Instagram, then test Unblock.
