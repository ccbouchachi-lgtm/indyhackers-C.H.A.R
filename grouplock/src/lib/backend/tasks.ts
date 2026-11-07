import { after } from 'next/server';
import { deliverReviewerEmails } from './email';
import { body, object, route, signedIn, string, timestamp, unwrap, uuid, validation, version } from './http';

type GroupContext = { params: Promise<{ groupId: string }> };
type TaskContext = { params: Promise<{ taskId: string }> };

export const list = route(async (_request, { params }: GroupContext) => {
  const { client } = await signedIn();
  return unwrap(await client.rpc('grouplock_tasks', { action: 'list', resource_id: uuid((await params).groupId, 'groupId') }));
});

export const create = route(async (request, { params }: GroupContext) => {
  const { client } = await signedIn();
  const input = await body(request);
  const description = input.description ?? '';
  if (typeof description !== 'string' || description.length > 5000) validation('Invalid description');
  return unwrap(await client.rpc('grouplock_tasks', {
    action: 'create', resource_id: uuid((await params).groupId, 'groupId'),
    input: {
      title: string(input.title, 'title', 160).trim(),
      description,
      assignedTo: uuid(input.assignedTo, 'assignedTo'),
      reviewerId: uuid(input.reviewerId, 'reviewerId'),
      deadline: timestamp(input.deadline, 'deadline'),
    },
  }));
}, 201);

export const detail = route(async (_request, { params }: TaskContext) => {
  const { client } = await signedIn();
  return unwrap(await client.rpc('grouplock_tasks', { action: 'detail', resource_id: uuid((await params).taskId, 'taskId') }));
});

export const accept = route(async (request, { params }: TaskContext) => {
  const { client } = await signedIn();
  const { focusAgreement } = await body(request);
  const input = focusAgreement === undefined ? {} : { focusAgreement: parseAgreement(focusAgreement) };
  return unwrap(await client.rpc('grouplock_tasks', {
    action: 'accept', resource_id: uuid((await params).taskId, 'taskId'), input,
  }));
});

function parseAgreement(value: unknown) {
  const { allowedDomains, expiresAt } = object(value);
  if (!Array.isArray(allowedDomains) || allowedDomains.length > 100) validation('Invalid allowed domains');
  return {
    allowedDomains: allowedDomains.map((domain: unknown) => string(domain, 'allowed domain', 253).trim().toLowerCase()),
    expiresAt: timestamp(expiresAt, 'expiresAt'),
  };
}

export const submit = route(async (request, { params }: TaskContext) => {
  const { client } = await signedIn();
  const input = await body(request);
  const submissionUrl = string(input.submissionUrl, 'submissionUrl', 2048).trim();
  let parsed: URL;
  try {
    parsed = new URL(submissionUrl);
  } catch {
    validation('Invalid submission URL');
  }
  if (parsed.protocol !== 'https:' || !/^https:\/\//i.test(submissionUrl) || parsed.username || parsed.password || /[\s\\]/.test(submissionUrl)) {
    validation('Submission URL must be an HTTPS URL without credentials');
  }
  const taskId = uuid((await params).taskId, 'taskId');
  const task = unwrap(await client.rpc('grouplock_tasks', {
    action: 'submit', resource_id: taskId,
    input: {
      submissionUrl: parsed.href,
      expectedSubmissionVersion: version(input.expectedSubmissionVersion, 'expectedSubmissionVersion'),
    },
  }));
  after(async () => {
    try {
      await deliverReviewerEmails(taskId, task.submissionVersion);
    } catch {
      console.error('GroupLock reviewer email remains queued');
    }
  });
  return task;
});

export const review = route(async (request, { params }: TaskContext) => {
  const { client } = await signedIn();
  const { decision, submissionVersion } = await body(request);
  if (decision !== 'approve' && decision !== 'request_changes') validation('Invalid review decision');
  return unwrap(await client.rpc('grouplock_tasks', {
    action: 'review', resource_id: uuid((await params).taskId, 'taskId'),
    input: { decision, submissionVersion: version(submissionVersion, 'submissionVersion') },
  }));
});
