import { SITES, buildRules, normalizeSelection } from './core.js';
import { backendOrigin, validateStatus, automaticRules } from './sync.js';
let queue = Promise.resolve();
const ready = chrome.storage.local.setAccessLevel({ accessLevel: 'TRUSTED_CONTEXTS' });
const defaults = { selected: [], notifications: false, origin: '', credential: '', override: false,
  focus: null, connection: 'Not connected — manual mode', lastSync: null };
async function saved() { await ready; return chrome.storage.local.get(defaults); }
async function getState() {
  const state = await saved();
  const rules = await chrome.declarativeNetRequest.getDynamicRules();
  const permission = await chrome.permissions.contains({ permissions: ['notifications'] });
  return { selected: normalizeSelection(state.selected), active: SITES.filter((_, index) => rules.some(rule => rule.id === index + 1)).map(site => site.id),
    notifications: state.notifications && permission, origin: state.origin, paired: Boolean(state.credential),
    override: state.override, connection: state.connection, lastSync: state.lastSync,
    taskCount: state.focus?.activeTasks.length || 0 };
}
async function apply(rules) {
  const before = await chrome.declarativeNetRequest.getDynamicRules();
  await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds: before.map(rule => rule.id), addRules: rules });
  const active = rules.some(rule => rule.action.type === 'redirect');
  await chrome.action.setBadgeText({ text: active ? 'ON' : '' });
  await chrome.action.setBadgeBackgroundColor({ color: '#34644d' });
  // Content scripts cannot access credential storage. Only send a request to re-check.
  const tabs = await chrome.tabs.query({});
  await Promise.all(tabs.map(tab => chrome.tabs.sendMessage(tab.id, { type: 'RECHECK' }).catch(() => {})));
  if (JSON.stringify(before) !== JSON.stringify(rules)) {
    const state = await saved();
    if (state.notifications && await chrome.permissions.contains({ permissions: ['notifications'] })) {
      await chrome.notifications.create({ type: 'basic', iconUrl: 'icon.png',
        title: active ? 'Focus blocking started' : 'Websites unblocked',
        message: active ? 'Your selected websites are blocked. You can override in GroupLock.' : 'Your GroupLock website restrictions have ended.' }).catch(() => {});
    }
  }
}
async function fetchFocus(origin, credential) {
  const startedAt = Date.now();
  const response = await fetch(origin + '/api/focus-status', { headers: { Authorization: 'Bearer ' + credential },
    credentials: 'omit', cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(8000) });
  if (response.status === 401) { const error = new Error('Connection revoked or invalid. Pair again.'); error.revoked = true; throw error; }
  if (!response.ok) throw new Error('Backend unavailable. Automatic blocks cleared.');
  return validateStatus((await response.json()).data, startedAt);
}
async function sync() {
  const state = await saved();
  if (!state.credential) return;
  try {
    const focus = await fetchFocus(state.origin, state.credential);
    await chrome.storage.local.set({ focus, lastSync: new Date().toISOString(), connection: state.override ? 'Connected — local override is on' : focus.active ? 'Connected — overdue focus active' : 'Connected — no active restriction' });
    if (focus.expiresAtLocal) await chrome.alarms.create('expiry', { when: focus.expiresAtLocal });
    else await chrome.alarms.clear('expiry');
    await apply(automaticRules(state.selected, focus, state.override));
  } catch (error) {
    await chrome.storage.local.set({ focus: null, connection: error.revoked ? error.message : 'Offline or invalid response — automatic blocks cleared', ...(error.revoked ? { credential: '', origin: '' } : {}) });
    await chrome.alarms.clear('expiry');
    await apply([]);
  }
}
async function handle(message) {
  if (message.type === 'GET_STATE') return getState();
  if (message.type === 'SET_NOTIFICATIONS') {
    await chrome.storage.local.set({ notifications: Boolean(message.enabled && await chrome.permissions.contains({ permissions: ['notifications'] })) });
  } else if (message.type === 'PAIR') {
    const origin = backendOrigin(message.origin);
    if (!/^[A-Za-z0-9_-]{43}$/.test(message.credential)) throw new Error('Paste the pairing credential from your signed-in GroupLock account.');
    if (!await chrome.permissions.contains({ origins: [origin + '/*'] })) throw new Error('Allow access to the backend first.');
    await fetchFocus(origin, message.credential); // Validate before replacing an existing pairing.
    await chrome.storage.local.set({ origin, credential: message.credential, selected: normalizeSelection(message.selected), override: false });
    await sync();
  } else if (message.type === 'DISCONNECT') {
    await chrome.storage.local.set({ credential: '', origin: '', focus: null, override: false, connection: 'Disconnected — manual mode', lastSync: null });
    await chrome.alarms.clear('expiry'); await apply([]);
  } else if (message.type === 'SYNC') { await sync();
  } else if (message.type === 'UNBLOCK') {
    await chrome.storage.local.set({ override: true });
    await apply([]);
    const state = await saved();
    if (state.credential) await chrome.storage.local.set({ connection: 'Connected — local override is on' });
  } else if (message.type === 'BLOCK') {
    const selected = normalizeSelection(message.selected);
    if (!selected.length) throw new Error('Select at least one website.');
    await chrome.storage.local.set({ selected, override: false });
    if ((await saved()).credential) await sync(); else await apply(buildRules(selected));
  } else throw new Error('Unknown request.');
  return getState();
}
chrome.runtime.onMessage.addListener((message, sender, respond) => {
  if (sender.id !== chrome.runtime.id) return false;
  if (message.type === 'CHECK_SITE') {
    let url;
    try { url = new URL(sender.url); } catch { return false; }
    const index = SITES.findIndex(site => site.domains.some(domain => url.hostname === domain || url.hostname.endsWith('.' + domain)));
    if (index < 0) return false;
    // Do not queue this behind apply(), which broadcasts RECHECK to content scripts.
    Promise.all([saved(), chrome.declarativeNetRequest.getDynamicRules()]).then(([state, rules]) => {
      const expired = state.credential && (!state.focus || state.focus.expiresAtLocal <= Date.now());
      const exempt = state.credential && state.focus?.allowedDomains.includes(url.hostname);
      respond({ blocked: !expired && !exempt && rules.some(rule => rule.id === index + 1) });
    }).catch(() => respond({ blocked: false }));
    return true;
  }
  if (sender.url !== chrome.runtime.getURL('popup.html')) return false;
  queue = queue.then(() => ready).then(() => handle(message)).then(state => respond({ ok: true, state }), error => respond({ ok: false, error: error.message }));
  return true;
});
function enqueue(fn) { queue = queue.then(() => ready).then(fn).catch(console.error); }
chrome.alarms.onAlarm.addListener(alarm => enqueue(async () => {
  if (alarm.name === 'expiry') { await apply([]); await chrome.storage.local.set({ focus: null }); }
  if (alarm.name === 'expiry' || alarm.name === 'poll') await sync();
}));
async function initialize() {
  await chrome.alarms.create('poll', { periodInMinutes: 0.5 });
  const state = await saved();
  if (state.credential) { await apply([]); await sync(); }
  else { const status = await getState(); await apply(buildRules(status.active)); }
}
chrome.runtime.onStartup.addListener(() => enqueue(initialize));
chrome.runtime.onInstalled.addListener(() => enqueue(initialize));
// Recreate the periodic alarm whenever the service worker wakes; Chrome may clear alarms.
ready.then(() => chrome.alarms.create('poll', { periodInMinutes: 0.5 })).catch(console.error);
