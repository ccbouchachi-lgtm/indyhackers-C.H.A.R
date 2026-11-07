import { SITES, buildRules, normalizeSelection } from './core.js';
export function backendOrigin(value) {
  const url = new URL(value);
  if (url.username || url.password || url.pathname !== '/' || url.search || url.hash ||
      !(url.protocol === 'https:' || (url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname)))) {
    throw new Error('Enter an HTTPS backend origin, or http://localhost:3000 for development.');
  }
  if (SITES.some(site => site.domains.some(domain => url.hostname === domain || url.hostname.endsWith('.' + domain)))) {
    throw new Error('The backend cannot be a distracting website.');
  }
  return url.origin;
}
export function validateStatus(data, now = Date.now()) {
  if (!data || typeof data.active !== 'boolean' || !Array.isArray(data.allowedDomains) ||
      !Array.isArray(data.activeTasks) || !Number.isFinite(Date.parse(data.serverTime))) throw new Error('Invalid focus response.');
  const hostname = /^(?=.{1,253}$)[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)*$/;
  if (data.allowedDomains.some(domain => typeof domain !== 'string' || !hostname.test(domain))) throw new Error('Invalid domain exemption.');
  if (!data.active && (data.activeTasks.length || data.allowedDomains.length)) throw new Error('Invalid inactive response.');
  if (data.active && !data.activeTasks.length) throw new Error('Missing active agreements.');
  for (const task of data.activeTasks) {
    if (typeof task.taskId !== 'string' || typeof task.agreementId !== 'string' || !Number.isFinite(Date.parse(task.expiresAt))) throw new Error('Invalid agreement.');
  }
  const remaining = data.activeTasks.map(task => Date.parse(task.expiresAt) - Date.parse(data.serverTime));
  if (remaining.some(ms => ms <= 0)) throw new Error('Focus agreement has expired.');
  return { ...data, expiresAtLocal: remaining.length ? now + Math.min(...remaining) : null };
}
export function automaticRules(selected, focus, override) {
  normalizeSelection(selected);
  if (!focus?.active || override || focus.expiresAtLocal <= Date.now()) return [];
  const rules = buildRules(selected);
  // API allowlists exempt EXACT hosts, not their subdomains.
  const escape = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  for (const [index, host] of focus.allowedDomains.entries()) {
    rules.push({ id: 100 + index, priority: 10, action: { type: 'allow' },
      condition: { regexFilter: '^https?://' + escape(host) + '(:[0-9]+)?/', resourceTypes: ['main_frame', 'sub_frame'] } });
  }
  return rules;
}
