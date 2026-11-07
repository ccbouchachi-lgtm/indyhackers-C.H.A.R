import test from 'node:test';
import assert from 'node:assert/strict';
import { SITES, buildRules, normalizeSelection } from '../core.js';

test('only predefined domain choices produce rules', () => {
  assert.throws(() => buildRules(['example.com']));
  assert.throws(() => normalizeSelection(null));
  assert.deepEqual(normalizeSelection(['youtube', 'youtube']), ['youtube']);
  assert.deepEqual(buildRules([]), []);
  const rules = buildRules(SITES.map(site => site.id));
  assert.equal(new Set(rules.map(rule => rule.id)).size, SITES.length);
  assert.deepEqual(rules[0].condition.requestDomains, ['youtube.com', 'youtu.be']);
  for (const rule of rules) {
    assert.equal(rule.action.type, 'redirect');
    assert.equal(rule.action.redirect.extensionPath, '/blocked.html');
    assert.deepEqual(rule.condition.resourceTypes, ['main_frame', 'sub_frame']);
  }
});

test('worker blocks, replaces rules, restores state and overrides without backend', async () => {
  let listener;
  let rules = [];
  let saved = {};
  globalThis.chrome = {
    runtime: { id: 'test', getURL: path => `chrome-extension://test/${path}`,
      onMessage: { addListener: fn => { listener = fn; } }, onStartup: { addListener() {} }, onInstalled: { addListener() {} } },
    storage: { local: { setAccessLevel: async () => {}, get: async defaults => ({ ...defaults, ...saved }), set: async value => { saved = { ...saved, ...value }; } } },
    permissions: { contains: async () => false },
    declarativeNetRequest: { getDynamicRules: async () => structuredClone(rules),
      updateDynamicRules: async ({ removeRuleIds, addRules }) => { rules = [...rules.filter(rule => !removeRuleIds.includes(rule.id)), ...addRules]; } },
    alarms: { create: async () => {}, clear: async () => {}, onAlarm: { addListener() {} } },
    tabs: { query: async () => [] },
    action: { setBadgeText: async () => {}, setBadgeBackgroundColor: async () => {} }
  };
  await import('../background.js');
  const send = message => new Promise(resolve => {
    assert.equal(listener(message, { id: 'test', url: 'chrome-extension://test/popup.html' }, resolve), true);
  });
  assert.equal(listener({ type: 'BLOCK' }, { id: 'other' }, () => {}), false);
  assert.equal((await send({ type: 'BLOCK', selected: [] })).ok, false);
  assert.equal(rules.length, 0);
  assert.equal((await send({ type: 'BLOCK', selected: ['youtube', 'reddit'] })).ok, true);
  assert.equal(rules.length, 2);
  assert.deepEqual((await send({ type: 'GET_STATE' })).state.active, ['youtube', 'reddit']);
  await send({ type: 'BLOCK', selected: ['instagram'] });
  assert.deepEqual(rules.map(rule => rule.condition.requestDomains), [['instagram.com']]);
  // State is reconstructed from Chrome's persisted rules, not an in-memory flag.
  assert.deepEqual((await send({ type: 'GET_STATE' })).state.active, ['instagram']);
  const cleared = await send({ type: 'UNBLOCK' });
  assert.equal(rules.length, 0);
  assert.deepEqual(cleared.state.selected, ['instagram']);
  assert.deepEqual(cleared.state.active, []);
  assert.equal((await send({ type: 'BLOCK', selected: ['arbitrary.test'] })).ok, false);
  assert.equal(rules.length, 0);
});
