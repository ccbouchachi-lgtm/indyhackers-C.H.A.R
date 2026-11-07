import { SITES } from './core.js';
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
  $('block').textContent = active ? 'Update blocked websites' : 'Block selected websites';
  $('notifications').checked = state.notifications;
}
function busy(value) {
  for (const id of ['sites', 'block', 'unblock', 'notifications']) $(id).disabled = value;
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
run(() => request('GET_STATE'));
