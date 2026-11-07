-- Run with psql -v ON_ERROR_STOP=1 against a disposable migrated Supabase DB.
begin;

insert into auth.users (id, email, raw_user_meta_data) values
  ('15000000-0000-4000-8000-000000000001', 'owner@example.test', '{"username":"Owner"}'),
  ('15000000-0000-4000-8000-000000000002', 'member@example.test', '{"username":"Member"}'),
  ('15000000-0000-4000-8000-000000000003', 'outsider@example.test', '{"username":"Outsider"}');

do $$
declare
  owner constant uuid := '15000000-0000-4000-8000-000000000001';
  assignee constant uuid := '15000000-0000-4000-8000-000000000002';
  outsider constant uuid := '15000000-0000-4000-8000-000000000003';
  g jsonb;
  task_input jsonb;
  item jsonb;
  result jsonb;
  group_id uuid;
  task_id uuid;
  future_task_id uuid;
  agreement_id uuid;
  connection_id uuid;
  cutoff timestamptz;
  expiry timestamptz;
  hash_input bytea := decode(repeat('aa', 32), 'hex');
begin
  assert (select username from public.profiles where id = owner) = 'Owner', 'Signup did not create a profile';

  set local role authenticated;
  perform set_config('request.jwt.claim.sub', owner::text, true);
  g := public.grouplock_groups('create', null, 'Workflow test');
  group_id := (g#>>'{group,id}')::uuid;
  perform set_config('request.jwt.claim.sub', assignee::text, true);
  assert public.grouplock_groups('join', null, g->>'inviteCode')->>'role' = 'member';
  assert public.grouplock_groups('join', null, g->>'inviteCode')->>'role' = 'member';
  assert public.grouplock_groups('detail', group_id)->>'inviteCode' is null;

  task_input := jsonb_build_object('title', 'First task', 'assignedTo', assignee,
    'reviewerId', owner, 'deadline', now() - interval '1 minute');
  begin
    perform public.grouplock_tasks('create', group_id, task_input);
    raise exception 'Regular member could assign tasks';
  exception when sqlstate 'PT403' then null;
  end;

  perform set_config('request.jwt.claim.sub', owner::text, true);
  item := public.grouplock_tasks('create', group_id, task_input);
  assert (item->>'isOverdue')::boolean, 'Past-due assignment should be overdue';
  task_id := (item->>'id')::uuid;
  item := public.grouplock_tasks('create', group_id, task_input || jsonb_build_object('deadline', now() + interval '1 hour'));
  assert not (item->>'isOverdue')::boolean, 'Future assignment should not be overdue';
  future_task_id := (item->>'id')::uuid;
  begin
    perform public.grouplock_tasks('accept', task_id);
    raise exception 'Reviewer accepted on behalf of assignee';
  exception when sqlstate 'PT403' then null;
  end;

  perform set_config('request.jwt.claim.sub', outsider::text, true);
  begin
    perform public.grouplock_tasks('detail', task_id);
    raise exception 'Outsider could read a task';
  exception when sqlstate 'PT404' then null;
  end;

  perform set_config('request.jwt.claim.sub', assignee::text, true);
  assert not (public.grouplock_focus_status()->>'active')::boolean, 'Unaccepted task activated focus';
  perform public.grouplock_tasks('accept', future_task_id);
  assert not (public.grouplock_focus_status()->>'active')::boolean, 'Task without consent activated focus';
  expiry := clock_timestamp() + interval '2 hours';
  result := public.grouplock_tasks('accept', task_id,
    jsonb_build_object('focusAgreement', jsonb_build_object('expiresAt', expiry, 'allowedDomains', array['docs.google.com'])));
  agreement_id := (result#>>'{focusAgreement,id}')::uuid;
  assert (public.grouplock_focus_status()->>'active')::boolean, 'Overdue accepted agreement did not activate focus';

  result := public.grouplock_connections('pair', null, hash_input);
  connection_id := (result->>'id')::uuid;
  begin
    perform public.grouplock_extension_focus(hash_input);
    raise exception 'Browser could access service-only extension verification';
  exception when insufficient_privilege then null;
  end;
  set local role service_role;
  assert (public.grouplock_extension_focus(hash_input)->>'active')::boolean;
  set local role authenticated;
  perform public.grouplock_connections('revoke', connection_id);
  set local role service_role;
  begin
    perform public.grouplock_extension_focus(hash_input);
    raise exception 'Revoked extension credential was accepted';
  exception when sqlstate 'PT401' then null;
  end;

  set local role authenticated;
  item := public.grouplock_tasks('submit', task_id,
    '{"submissionUrl":"https://example.test/first","expectedSubmissionVersion":0}');
  assert not (item->>'isOverdue')::boolean, 'Submission should clear overdue';
  assert not (public.grouplock_focus_status()->>'active')::boolean, 'Submission did not suspend focus';
  assert item->>'submissionVersion' = '1';
  result := public.grouplock_tasks('submit', task_id,
    '{"submissionUrl":"https://example.test/first","expectedSubmissionVersion":0}');
  assert result = item, 'Submission retry did not return the same task';
  begin
    perform public.grouplock_tasks('submit', task_id,
      '{"submissionUrl":"https://example.test/conflict","expectedSubmissionVersion":0}');
    raise exception 'Conflicting submission retry was accepted';
  exception when sqlstate 'PT410' then null;
  end;
  begin
    perform public.grouplock_tasks('review', task_id, '{"decision":"approve","submissionVersion":1}');
    raise exception 'Assignee approved their own work';
  exception when sqlstate 'PT403' then null;
  end;

  perform set_config('request.jwt.claim.sub', owner::text, true);
  assert (select count(*) from public.notifications where type = 'task_submitted') = 1, 'Duplicate submission notification';
  item := public.grouplock_tasks('review', task_id, '{"decision":"request_changes","submissionVersion":1}');
  cutoff := (item->>'graceUntil')::timestamptz;
  assert cutoff >= (item->>'submittedAt')::timestamptz + interval '15 minutes';
  assert (item->>'isOverdue')::boolean, 'Grace should not change overdue';
  perform set_config('request.jwt.claim.sub', assignee::text, true);
  assert not (public.grouplock_focus_status()->>'active')::boolean, 'Focus activated during grace';
  reset role;
  assert not (grouplock_private.focus_status(assignee, cutoff - interval '1 microsecond')->>'active')::boolean;
  assert (grouplock_private.focus_status(assignee, cutoff)->>'active')::boolean, 'Focus should resume at grace boundary';
  assert not (grouplock_private.focus_status(assignee, expiry)->>'active')::boolean, 'Focus should expire at the expiry boundary';
  set local role authenticated;

  item := public.grouplock_tasks('submit', task_id,
    '{"submissionUrl":"https://example.test/second","expectedSubmissionVersion":1}');
  assert item->>'submissionVersion' = '2';
  perform set_config('request.jwt.claim.sub', owner::text, true);
  begin
    perform public.grouplock_tasks('review', task_id, '{"decision":"approve","submissionVersion":1}');
    raise exception 'A stale review approved a later submission';
  exception when sqlstate 'PT410' then null;
  end;
  item := public.grouplock_tasks('review', task_id, '{"decision":"approve","submissionVersion":2}');
  assert item->>'status' = 'approved' and item->>'approvedAt' is not null;
  assert not (item->>'isOverdue')::boolean;
  begin
    perform public.grouplock_revoke_agreement(agreement_id);
    raise exception 'Another member revoked the assignee agreement';
  exception when sqlstate 'PT404' then null;
  end;

  reset role;
  assert not (grouplock_private.focus_status(assignee, cutoff)->>'active')::boolean, 'Approval did not release focus';
  set local role authenticated;
  perform set_config('request.jwt.claim.sub', owner::text, true);
  item := public.grouplock_tasks('create', group_id, task_input);
  task_id := (item->>'id')::uuid;
  perform set_config('request.jwt.claim.sub', assignee::text, true);
  result := public.grouplock_tasks('accept', task_id,
    jsonb_build_object('focusAgreement', jsonb_build_object('expiresAt', expiry, 'allowedDomains', '[]'::jsonb)));
  assert (public.grouplock_focus_status()->>'active')::boolean;
  perform public.grouplock_revoke_agreement((result#>>'{focusAgreement,id}')::uuid);
  assert not (public.grouplock_focus_status()->>'active')::boolean, 'Revoking consent did not release focus';
end;
$$;

rollback;
