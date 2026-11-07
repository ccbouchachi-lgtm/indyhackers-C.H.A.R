import test from 'node:test';
import assert from 'node:assert/strict';
import { backendOrigin, validateStatus, automaticRules } from '../sync.js';
const active = () => ({ active: true, serverTime: new Date().toISOString(), allowedDomains: [],
  activeTasks: [{ taskId: 'task', agreementId: 'agreement', expiresAt: new Date(Date.now() + 60000).toISOString() }] });
test('backend URL excludes credentials, insecure remote URLs and distracting sites', () => {
  assert.equal(backendOrigin('http://localhost:3000'), 'http://localhost:3000');
  assert.equal(backendOrigin('https://grouplock.example'), 'https://grouplock.example');
  for (const url of ['http://example.com', 'https://a:b@example.com', 'https://example.com/path', 'https://youtube.com', 'https://example.com/#key']) assert.throws(() => backendOrigin(url));
});
test('expiry uses server-relative time and earliest agreement; malformed responses fail open', () => {
  const response = active();
  const parsed = validateStatus(response, 1000);
  assert.equal(parsed.expiresAtLocal, 1000 + Date.parse(response.activeTasks[0].expiresAt) - Date.parse(response.serverTime));
  const earlier = { ...response.activeTasks[0], expiresAt: new Date(Date.parse(response.serverTime) + 30000).toISOString() };
  assert.equal(validateStatus({ ...response, activeTasks: [...response.activeTasks, earlier] }, 1000).expiresAtLocal, 31000);
  for (const invalid of [{}, { ...response, activeTasks: [] }, { ...response, allowedDomains: ['*.youtube.com'] }, { ...response, active: false }, { ...response, activeTasks: [{ taskId: 't', agreementId: 'a', expiresAt: '2020-01-01' }] }]) assert.throws(() => validateStatus(invalid));
});
test('remote status cannot expand local sites; exemptions match only exact hosts', () => {
  const response = validateStatus({ ...active(), allowedDomains: ['www.youtube.com'] });
  const rules = automaticRules(['youtube'], response, false);
  assert.equal(rules.filter(rule => rule.action.type === 'redirect').length, 1);
  const exemption = new RegExp(rules.find(rule => rule.action.type === 'allow').condition.regexFilter);
  assert.ok(exemption.test('https://www.youtube.com/watch?v=123'));
  assert.equal(exemption.test('https://sub.www.youtube.com/'), false);
  assert.equal(exemption.test('https://wwwXyoutube.com/'), false);
  assert.equal(exemption.test('https://www.youtube.com.evil.example/'), false);
  assert.deepEqual(automaticRules(['youtube'], response, true), []);
  assert.deepEqual(automaticRules(['youtube'], { ...response, expiresAtLocal: 1 }, false), []);
});
test('integration clears rules offline and on 401; override survives polling and secret stays private', async () => {
  let listener, alarmListener;
  let state = {}, rules = [], mode = 'active', called;
  globalThis.fetch = async (url, options) => {
    called = { url, options };
    if (mode === 'offline') throw new Error('Network unavailable');
    return { ok: mode !== 'revoked', status: mode === 'revoked' ? 401 : 200,
      json: async () => ({ data: mode === 'inactive' ? { active: false, serverTime: new Date().toISOString(), allowedDomains: [], activeTasks: [] } : active() }) };
  };
  globalThis.chrome = {
    runtime: { id: 'test', getURL: path => 'chrome-extension://test/' + path,
      onMessage: { addListener: fn => { listener = fn; } }, onStartup: { addListener() {} }, onInstalled: { addListener() {} } },
    storage: { local: { setAccessLevel: async value => assert.equal(value.accessLevel, 'TRUSTED_CONTEXTS'),
      get: async defaults => ({ ...defaults, ...state }), set: async value => { state = { ...state, ...value }; } } },
    permissions: { contains: async () => true },
    alarms: { create: async () => {}, clear: async () => {}, onAlarm: { addListener: fn => { alarmListener = fn; } } },
    tabs: { query: async () => [] },
    notifications: { create: async () => {} },
    action: { setBadgeText: async () => {}, setBadgeBackgroundColor: async () => {} },
    declarativeNetRequest: { getDynamicRules: async () => structuredClone(rules),
      updateDynamicRules: async value => { rules = [...value.addRules]; } }
  };
  await import('../background.js');
  const send = message => new Promise(resolve => listener(message, { id: 'test', url: 'chrome-extension://test/popup.html' }, resolve));
  const paired = await send({ type: 'PAIR', origin: 'https://grouplock.example', credential: 'a'.repeat(43), selected: ['youtube'] });
  assert.equal(paired.ok, true);
  assert.equal(rules.length, 1);
  assert.equal(called.url, 'https://grouplock.example/api/focus-status');
  assert.equal(called.options.credentials, 'omit');
  assert.equal(called.options.redirect, 'error');
  assert.equal(called.options.headers.Authorization, 'Bearer ' + 'a'.repeat(43));
  assert.equal('credential' in paired.state, false);
  await send({ type: 'UNBLOCK' }); await send({ type: 'SYNC' });
  assert.equal(rules.length, 0); assert.equal(state.override, true);
  await send({ type: 'BLOCK', selected: ['youtube'] }); assert.equal(rules.length, 1);
  mode = 'inactive'; await send({ type: 'SYNC' }); assert.equal(rules.length, 0);
  mode = 'active'; await send({ type: 'SYNC' }); assert.equal(rules.length, 1);
  mode = 'offline'; await send({ type: 'SYNC' }); assert.equal(rules.length, 0);
  assert.equal(state.credential.length, 43);
  mode = 'active'; await send({ type: 'SYNC' }); assert.equal(rules.length, 1);
  mode = 'revoked'; await send({ type: 'SYNC' }); assert.equal(rules.length, 0); assert.equal(state.credential, '');
  mode = 'active'; await send({ type: 'PAIR', origin: 'https://grouplock.example', credential: 'a'.repeat(43), selected: ['youtube'] });
  mode = 'offline'; alarmListener({ name: 'expiry' }); await send({ type: 'GET_STATE' }); assert.equal(rules.length, 0);
  await send({ type: 'DISCONNECT' }); assert.equal(state.credential, ''); assert.equal(rules.length, 0);
});
