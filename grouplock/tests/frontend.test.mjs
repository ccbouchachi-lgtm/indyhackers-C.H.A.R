import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const loadModule = createRequire(import.meta.url);

// Compile the isolated adapter without Next.js, a server, or extra test dependencies.
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'grouplock-workflow-'));
fs.symlinkSync(path.join(root, 'node_modules'), path.join(temp, 'node_modules'), 'dir');
for (const file of ['mock-data', 'mock-api']) {
  const source = fs.readFileSync(path.join(root, `src/lib/${file}.ts`), 'utf8');
  fs.writeFileSync(path.join(temp, `${file}.js`), ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText);
}
let persisted;
global.localStorage = { getItem: () => null, setItem: (_, text) => { persisted = JSON.parse(text); } };
const { mockApi: api } = loadModule(path.join(temp, 'mock-api.js'));

test('onboarding and complete task handoff persist only to the mock adapter', () => {
  api.switchUser('you');
  assert.throws(() => api.switchUser('missing'));
  assert.throws(() => api.createDemoProfile(' ', 'test@example.com'));
  assert.throws(() => api.createDemoProfile('Test', 'invalid'));
  const profile = api.createDemoProfile('Taylor', 'taylor@example.com');
  assert.equal(persisted.activeUserId, profile);
  assert.equal(persisted.users.find(u => u.id === profile).name, 'Taylor');
  assert.throws(() => api.createDemoProfile('Taylor', 'TAYLOR@example.com'));
  api.joinGroup('BUILD24');
  assert.throws(() => api.joinGroup('BUILD24'));
  assert.throws(() => api.joinGroup('INVALID'));
  const groupId = api.createGroup('Release Crew', 'First release');
  const code = persisted.groups.find(g => g.id === groupId).code;
  api.switchUser('alex'); api.joinGroup(code); api.switchUser(profile);
  const input = { groupId, title: 'Ship frontend', description: 'Check responsive UI', assignee: profile, reviewer: 'alex', deadline: new Date(Date.now() + 86400000).toISOString() };
  assert.throws(() => api.createTask({ ...input, reviewer: profile }));
  assert.throws(() => api.createTask({ ...input, reviewer: 'sam' }));
  assert.throws(() => api.createTask({ ...input, deadline: '2020-01-01' }));
  const taskId = api.createTask(input);
  const task = () => persisted.tasks.find(t => t.id === taskId);
  assert.throws(() => api.submitWork(taskId, 'Too soon', ''));
  api.acceptTask(taskId);
  assert.equal(task().status, 'accepted');
  assert.throws(() => api.submitWork(taskId, '', ''));
  assert.throws(() => api.submitWork(taskId, 'Done', 'javascript:alert(1)'));
  api.submitWork(taskId, 'First draft', 'https://example.com/work');
  assert.equal(task().status, 'submitted');
  assert.throws(() => api.reviewTask(taskId, true, 'Self approval'));
  api.switchUser('alex');
  assert.throws(() => api.reviewTask(taskId, false, ''));
  api.reviewTask(taskId, false, 'Fix mobile spacing');
  assert.equal(task().status, 'changes_requested');
  api.switchUser(profile); api.submitWork(taskId, 'Spacing fixed', '');
  api.switchUser('alex'); api.reviewTask(taskId, true, 'Approved');
  assert.equal(task().status, 'completed');
  assert.equal(task().submissions.length, 2);
  assert.equal(task().submissions[0].decision, 'changes_requested');
  assert.equal(task().submissions[1].decision, 'approved');
  assert.throws(() => api.reviewTask(taskId, true, 'Duplicate'));
  assert(persisted.activity.some(a => a.taskId === taskId && a.text.startsWith('Approved')));
  api.saveSites(['example.com']);
  assert.deepEqual(persisted.blockedSites, ['example.com']);
});

test('all frontend route entrypoints and landing entry destinations exist', () => {
  for (const route of ['login', 'signup', '(workspace)/dashboard', '(workspace)/groups/create', '(workspace)/groups/join', '(workspace)/groups/[id]', '(workspace)/groups/[id]/tasks/create', '(workspace)/tasks/[id]', '(workspace)/tasks/[id]/review', '(workspace)/notifications', '(workspace)/profile', '(workspace)/focus']) {
    assert(fs.existsSync(path.join(root, 'src/app', route, 'page.tsx')), route);
  }
  const entry = fs.readFileSync(path.join(root, 'src/app/components/entry-button.tsx'), 'utf8');
  assert.match(entry, /mode === "signin" \? "\/login" : "\/signup"/);
  const auth = fs.readFileSync(path.join(root, 'src/app/components/application/auth-entry.tsx'), 'utf8');
  assert.match(auth, /router.push\("\/dashboard"\)/);
  assert.match(auth, /Authentication not connected/);
});

process.on('exit', () => fs.rmSync(temp, { recursive: true, force: true }));
