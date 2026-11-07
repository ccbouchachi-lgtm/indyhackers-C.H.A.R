import { timingSafeEqual } from 'node:crypto';
import { serviceClient } from './supabase';

type EmailJob = {
  notification_id: string;
  lease_id: string;
  recipient_email: string;
  task_title: string;
  sender_email: string;
};

export async function deliverReviewerEmails(taskId?: string, submissionVersion?: number) {
  const apiKey = process.env.RESEND_API_KEY;
  const sender = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !sender) throw new Error('Missing reviewer email configuration');
  const client = serviceClient();
  const { data, error } = await client.rpc('grouplock_claim_reviewer_email', {
    sender_input: sender, task_id_input: taskId, version_input: submissionVersion,
  });
  if (error) throw new Error('Could not claim reviewer email jobs');

  const jobs = data as EmailJob[];
  const results = await Promise.allSettled(jobs.map(async (job) => {
    const sent = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': `grouplock-task-submitted/${job.notification_id}`,
      },
      body: JSON.stringify({
        from: job.sender_email,
        to: [job.recipient_email],
        subject: 'GroupLock task ready for review',
        text: `A submission is ready for your review in GroupLock.\n\nTask: ${job.task_title}`,
      }),
      signal: AbortSignal.timeout(8000),
      cache: 'no-store',
    });
    if (!sent.ok) throw new Error(`Resend returned HTTP ${sent.status}`);
    const result = await client.rpc('grouplock_mark_reviewer_email_sent', {
      notification_input: job.notification_id,
      lease_input: job.lease_id,
    });
    if (result.error) throw new Error('Could not mark reviewer email sent');
  }));

  let sent = 0;
  for (const result of results) {
    if (result.status === 'fulfilled') sent++;
    else console.error('GroupLock reviewer email will be retried', result.reason instanceof Error ? result.reason.message : 'Unknown');
  }
  return { claimed: jobs.length, sent };
}

export async function retryReviewerEmails(request: Request) {
  const secret = process.env.GROUPLOCK_EMAIL_WORKER_SECRET;
  const expected = Buffer.from(`Bearer ${secret ?? ''}`);
  const supplied = Buffer.from(request.headers.get('authorization') ?? '');
  const headers = { 'Cache-Control': 'private, no-store' };
  if (!secret || supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) {
    return Response.json({ error: { code: 'UNAUTHENTICATED', message: 'Invalid worker credential' } }, { status: 401, headers });
  }
  try {
    return Response.json({ data: await deliverReviewerEmails() }, { headers });
  } catch {
    return Response.json({ error: { code: 'INTERNAL_ERROR', message: 'Email worker unavailable' } }, { status: 500, headers });
  }
}
