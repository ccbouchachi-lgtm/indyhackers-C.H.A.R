import { SITES, buildRules, normalizeSelection } from './core.js';
// Serialize popup operations so simultaneous windows cannot overwrite each other.
let queue = Promise.resolve();
async function getState() {
  const [saved, rules, notifications] = await Promise.all([
    chrome.storage.local.get({ selected: [], notifications: false }),
    chrome.declarativeNetRequest.getDynamicRules(),
    chrome.permissions.contains({ permissions: ['notifications'] })
  ]);
  return { selected: normalizeSelection(saved.selected),
    active: SITES.filter((site, index) => rules.some(rule => rule.id === index + 1)).map(site => site.id),
    notifications: saved.notifications && notifications, connection: 'Not connected — manual mode' };
}
async function notify(active) {
  const state = await getState();
  if (!state.notifications) return;
  try {
    await chrome.notifications.create({ type: 'basic', iconUrl: 'icon.png',
      title: active ? 'Focus blocking started' : 'Websites unblocked',
      message: active ? 'Your selected websites are blocked. Open GroupLock to unblock at any time.' : 'Your GroupLock website restrictions have ended.' });
  } catch (error) { console.warn('Notification unavailable:', error.message); }
}
async function handle(message) {
  if (message.type === 'GET_STATE') return getState();
  if (message.type === 'SET_NOTIFICATIONS') {
    const allowed = await chrome.permissions.contains({ permissions: ['notifications'] });
    await chrome.storage.local.set({ notifications: Boolean(message.enabled && allowed) });
    return getState();
  }
  if (!['BLOCK', 'UNBLOCK'].includes(message.type)) throw new Error('Unknown request.');
  const previous = await getState();
  const selected = message.type === 'BLOCK' ? normalizeSelection(message.selected) : previous.selected;
  if (message.type === 'BLOCK' && selected.length === 0) throw new Error('Select at least one website.');
  const existing = await chrome.declarativeNetRequest.getDynamicRules();
  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: existing.map(rule => rule.id),
    addRules: message.type === 'BLOCK' ? buildRules(selected) : []
  });
  // Dynamic rules are the source of truth, including after a browser restart.
  await chrome.storage.local.set({ selected, rulesChangedAt: Date.now() });
  const next = await getState();
  await chrome.action.setBadgeText({ text: next.active.length ? 'ON' : '' });
  await chrome.action.setBadgeBackgroundColor({ color: '#34644d' });
  if (previous.active.join() !== next.active.join()) await notify(next.active.length > 0);
  return next;
}
chrome.runtime.onMessage.addListener((message, sender, respond) => {
  if (sender.id !== chrome.runtime.id) return false;
  if (message.type === 'CHECK_SITE') {
    let host;
    try { host = new URL(sender.url).hostname; } catch { return false; }
    const site = SITES.find(site => site.domains.some(domain => host === domain || host.endsWith('.' + domain)));
    if (!site) return false;
    queue = queue.then(async () => {
      const state = await getState();
      respond({ blocked: state.active.includes(site.id) });
    }).catch(() => respond({ blocked: false }));
    return true;
  }
  if (sender.url !== chrome.runtime.getURL('popup.html')) return false;
  queue = queue.then(() => handle(message)).then(
    state => respond({ ok: true, state }),
    error => respond({ ok: false, error: error.message })
  );
  return true;
});
chrome.runtime.onStartup.addListener(() => {
  queue = queue.then(async () => {
    const state = await getState();
    await chrome.action.setBadgeText({ text: state.active.length ? 'ON' : '' });
  }).catch(console.error);
});

// Replace earlier block rules with focus-page redirects when updating/reloading.
chrome.runtime.onInstalled.addListener(() => {
  queue = queue.then(async () => {
    const state = await getState();
    const existing = await chrome.declarativeNetRequest.getDynamicRules();
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: existing.map(rule => rule.id), addRules: buildRules(state.active)
    });
  }).catch(console.error);
});
