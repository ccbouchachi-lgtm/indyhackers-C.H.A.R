import { SITES } from './core.js';
import { backendOrigin } from './sync.js';
const $ = id => document.getElementById(id);
let current;
for (const site of SITES) {
  const label = document.createElement('label');
  label.className = 'site';
  const input = document.createElement('input');
  input.type = 'checkbox'; input.value = site.id;
  const name = document.createElement('span'); name.textContent = site.name;
  const domain = document.createElement('small'); domain.textContent = site.domains[0];
  label.append(input, name, domain); $('sites').append(label);
}
async function request(type, payload = {}) {
  const response = await chrome.runtime.sendMessage({ type, ...payload });
  if (!response?.ok) throw new Error(response?.error || 'Extension unavailable. Reload it in chrome://extensions.');
  return response.state;
}
function render(state) {
  current = state;
  const active = state.active.length > 0;
  $('status').textContent = active ? 'Focus is on' : 'You’re in control';
  $('summary').textContent = active ? `${state.active.length} website${state.active.length === 1 ? '' : 's'} blocked` : 'No websites are blocked';
  $('indicator').classList.toggle('active', active);
  for (const input of $('sites').querySelectorAll('input')) input.checked = state.selected.includes(input.value);
  $('block').textContent = state.paired ? 'Save sites & resume automatic focus' : active ? 'Update blocked websites' : 'Block selected websites';
  $('connection').textContent = state.connection;
  $('sync-status').textContent = `${state.taskCount} active overdue task(s)` + (state.lastSync ? ` · Last sync ${new Date(state.lastSync).toLocaleTimeString()}` : '');
  $('origin').value = state.origin || $('origin').value;
  $('sync').hidden = $('disconnect').hidden = !state.paired;
  $('notifications').checked = state.notifications;
}
function busy(value) {
  for (const id of ['sites', 'block', 'unblock', 'notifications', 'pair', 'sync', 'disconnect', 'origin', 'credential']) $(id).disabled = value;
}
async function run(task) {
  busy(true); $('feedback').textContent = '';
  try { render(await task()); }
  catch (error) { $('feedback').textContent = error.message; }
  finally { busy(false); }
}
$('form').addEventListener('submit', event => {
  event.preventDefault();
  const selected = [...$('sites').querySelectorAll('input:checked')].map(input => input.value);
  run(() => request('BLOCK', { selected }));
});
$('unblock').addEventListener('click', () => run(() => request('UNBLOCK')));
$('notifications').addEventListener('change', async () => {
  const enabled = $('notifications').checked;
  try {
    // Permission must be requested directly from the user's click.
    const granted = !enabled || await chrome.permissions.request({ permissions: ['notifications'] });
    await run(() => request('SET_NOTIFICATIONS', { enabled: enabled && granted }));
    if (!granted) $('feedback').textContent = 'Notifications were not enabled. Website blocking still works.';
  } catch (error) { $('notifications').checked = current?.notifications || false; $('feedback').textContent = error.message; }
});
$('pair').addEventListener('click', async () => {
  try {
    const origin = backendOrigin($('origin').value.trim());
    const credential = $('credential').value.trim();
    const selected = [...$('sites').querySelectorAll('input:checked')].map(input => input.value);
    if (!selected.length) throw new Error('Select the sites you authorize for automatic blocking first.');
    if (!/^[A-Za-z0-9_-]{43}$/.test(credential)) throw new Error('Paste the pairing credential first.');
    const granted = await chrome.permissions.request({ origins: [origin + '/*'] });
    if (!granted) throw new Error('Backend access was not granted.');
    $('credential').value = '';
    await run(() => request('PAIR', { origin, credential, selected }));
  } catch (error) { $('feedback').textContent = error.message; }
});
$('sync').addEventListener('click', () => run(() => request('SYNC')));
$('disconnect').addEventListener('click', () => run(() => request('DISCONNECT')));
run(() => request('GET_STATE'));
