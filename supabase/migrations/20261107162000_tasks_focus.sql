begin;

create function grouplock_private.task_json(t public.tasks, server_time timestamptz)
returns jsonb language sql stable set search_path = ''
as $$
  select jsonb_build_object(
    'id', t.id, 'groupId', t.group_id, 'title', t.title, 'description', t.description,
    'assignedTo', t.assigned_to, 'reviewerId', t.reviewer_id, 'deadline', t.deadline,
    'status', t.status, 'focusAgreementId', t.focus_agreement_id, 'submissionUrl', t.submission_url,
    'submittedAt', t.submitted_at, 'approvedAt', t.approved_at, 'graceUntil', t.grace_until,
    'submissionVersion', t.submission_version,
    'isOverdue', t.deadline <= server_time and t.status in ('assigned', 'accepted', 'changes_requested')
  );
$$;

create function grouplock_private.agreement_json(a public.focus_agreements)
returns jsonb language sql stable set search_path = ''
as $$
  select jsonb_build_object('id', a.id, 'userId', a.user_id, 'groupId', a.group_id, 'enabled', a.enabled,
    'allowedDomains', a.allowed_domains, 'expiresAt', a.expires_at, 'createdAt', a.created_at);
$$;

create function public.grouplock_tasks(action text, resource_id uuid, input jsonb default '{}')
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  member_role public.group_role;
  t public.tasks;
  a public.focus_agreements;
  consent jsonb := input->'focusAgreement';
  expected_version integer;
  server_time timestamptz;
  target_user uuid;
  reviewer uuid;
  deadline_input timestamptz;
  expiry timestamptz;
  domains text[];
  url text;
  event public.notification_type;
  recipient uuid;
begin
  if actor is null then raise sqlstate 'PT401' using message = 'Sign in required'; end if;
  if action in ('list', 'create') then
    select role into member_role from public.group_members where group_id = resource_id and user_id = actor;
    if not found then raise sqlstate 'PT404' using message = 'Group not found'; end if;
    if action = 'list' then
      return (select coalesce(jsonb_agg(grouplock_private.task_json(item, statement_timestamp())
        order by item.deadline, item.id), '[]') from public.tasks item where item.group_id = resource_id);
    end if;
    if member_role not in ('owner', 'admin') then raise sqlstate 'PT403' using message = 'Task assignment requires an owner or admin'; end if;

    target_user := (input->>'assignedTo')::uuid;
    reviewer := (input->>'reviewerId')::uuid;
    deadline_input := (input->>'deadline')::timestamptz;
    if target_user is null or reviewer is null or target_user = reviewer
      or deadline_input is null or not isfinite(deadline_input)
      or coalesce(char_length(btrim(input->>'title')), 0) not between 1 and 160
      or char_length(input->>'description') > 5000
      or (select count(*) from public.group_members where group_id = resource_id and user_id in (target_user, reviewer)) <> 2
    then raise sqlstate 'PT400' using message = 'Invalid task or group participants'; end if;

    insert into public.tasks (group_id, title, description, assigned_to, reviewer_id, deadline)
    values (resource_id, btrim(input->>'title'), coalesce(input->>'description', ''), target_user, reviewer, deadline_input)
    returning * into t;
    event := 'task_assigned';
    recipient := t.assigned_to;
    server_time := clock_timestamp();
  elsif action = 'detail' then
    select * into t from public.tasks where id = resource_id and grouplock_private.is_group_member(group_id);
    if not found then raise sqlstate 'PT404' using message = 'Task not found'; end if;
    return grouplock_private.task_json(t, statement_timestamp());
  else
    select * into t from public.tasks where id = resource_id and grouplock_private.is_group_member(group_id) for update;
    if not found then raise sqlstate 'PT404' using message = 'Task not found'; end if;
    server_time := clock_timestamp();

    if action in ('accept', 'submit') and actor <> t.assigned_to then
      raise sqlstate 'PT403' using message = 'Only the assignee can perform this action';
    end if;

    case action
      when 'accept' then
        if t.status <> 'assigned' then raise sqlstate 'PT409' using message = 'Task is not awaiting acceptance'; end if;
        if consent is not null then
          expiry := (consent->>'expiresAt')::timestamptz;
          if expiry is null or not isfinite(expiry) or expiry <= server_time
            or jsonb_typeof(consent->'allowedDomains') is distinct from 'array'
            or jsonb_array_length(consent->'allowedDomains') > 100
          then raise sqlstate 'PT400' using message = 'Invalid focus agreement'; end if;

          if exists (select 1 from jsonb_array_elements(consent->'allowedDomains') entry
            where jsonb_typeof(entry) <> 'string' or length(entry #>> '{}') > 253
            or (entry #>> '{}') !~ '^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$')
          then raise sqlstate 'PT400' using message = 'Invalid allowed domain'; end if;

          select array(select distinct value from jsonb_array_elements_text(consent->'allowedDomains') order by value) into domains;
          insert into public.focus_agreements (user_id, group_id, enabled, allowed_domains, expires_at, created_at)
          values (actor, t.group_id, true, domains, expiry, server_time) returning * into a;
        end if;

        update public.tasks set status = 'accepted', focus_agreement_id = a.id where id = t.id returning * into t;
        return jsonb_build_object('task', grouplock_private.task_json(t, server_time), 'focusAgreement',
          case when a.id is not null then grouplock_private.agreement_json(a) end);
      when 'submit' then
        url := input->>'submissionUrl';
        expected_version := (input->>'expectedSubmissionVersion')::integer;
        if expected_version is null or expected_version < 0 or expected_version >= 2147483647
          or url is null or length(url) > 2048 or url !~ '^https://[^[:space:]/?#]+'
        then raise sqlstate 'PT400' using message = 'Invalid submission'; end if;

        if t.submission_version = expected_version + 1 and t.submission_url = url then
          return grouplock_private.task_json(t, server_time);
        end if;
        if t.submission_version <> expected_version then raise sqlstate 'PT410' using message = 'Submission version has changed'; end if;
        if t.status not in ('accepted', 'changes_requested') then
          raise sqlstate 'PT409' using message = 'Task is not accepting submissions';
        end if;
        update public.tasks set status = 'submitted', submission_url = url, submitted_at = server_time,
          grace_until = null, submission_version = submission_version + 1 where id = t.id returning * into t;
        event := 'task_submitted';
        recipient := t.reviewer_id;
      when 'review' then
        if actor <> t.reviewer_id or actor = t.assigned_to then
          raise sqlstate 'PT403' using message = 'Only the designated reviewer can review';
        end if;
        expected_version := (input->>'submissionVersion')::integer;
        if expected_version is distinct from t.submission_version then
          raise sqlstate 'PT410' using message = 'Submission version has changed';
        end if;
        if t.status <> 'submitted' then raise sqlstate 'PT409' using message = 'Task is not awaiting review'; end if;

        case input->>'decision'
          when 'approve' then
            update public.tasks set status = 'approved', approved_at = server_time where id = t.id returning * into t;
            event := 'task_approved';
          when 'request_changes' then
            update public.tasks set status = 'changes_requested', grace_until = server_time + interval '15 minutes'
            where id = t.id returning * into t;
            event := 'task_changes_requested';
          else raise sqlstate 'PT400' using message = 'Invalid review decision';
        end case;
        recipient := t.assigned_to;
      else raise sqlstate 'PT400' using message = 'Invalid task action';
    end case;
  end if;

  insert into public.notifications (recipient_id, task_id, type, event_version)
  values (recipient, t.id, event, t.submission_version);
  return grouplock_private.task_json(t, server_time);
exception
  when invalid_text_representation or invalid_datetime_format or datetime_field_overflow or numeric_value_out_of_range then
    raise sqlstate 'PT400' using message = 'Invalid task input';
end;
$$;

create function grouplock_private.focus_status(actor uuid, server_time timestamptz)
returns jsonb language sql stable set search_path = ''
as $$
  with active as (
    select t.id as task_id, a.id as agreement_id, a.expires_at, a.allowed_domains
    from public.tasks t join public.focus_agreements a on a.id = t.focus_agreement_id
    where t.assigned_to = actor and a.enabled and a.expires_at > server_time
      and t.deadline <= server_time and t.status in ('accepted', 'changes_requested')
      and (t.grace_until is null or t.grace_until <= server_time)
  ), common_domains as (
    select distinct domain
    from active cross join lateral unnest(active.allowed_domains) as entries(domain)
    where not exists (select 1 from active candidate where not (domain = any(candidate.allowed_domains)))
  )
  select jsonb_build_object('active', exists(select 1 from active), 'serverTime', server_time,
    'allowedDomains', coalesce((select jsonb_agg(domain order by domain) from common_domains), '[]'),
    'activeTasks', coalesce((select jsonb_agg(jsonb_build_object(
      'taskId', task_id, 'agreementId', agreement_id, 'expiresAt', expires_at
    ) order by task_id) from active), '[]'));
$$;

create function public.grouplock_focus_status()
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
begin
  if auth.uid() is null then raise sqlstate 'PT401' using message = 'Sign in required'; end if;
  return grouplock_private.focus_status(auth.uid(), statement_timestamp());
end;
$$;

create function public.grouplock_extension_focus(hash_input bytea)
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
declare actor uuid;
begin
  select user_id into actor from public.extension_connections
  where credential_hash = hash_input and revoked_at is null;
  if not found then raise sqlstate 'PT401' using message = 'Invalid extension credential'; end if;
  return grouplock_private.focus_status(actor, statement_timestamp());
end;
$$;

create function public.grouplock_revoke_agreement(agreement_id uuid)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare a public.focus_agreements;
begin
  update public.focus_agreements set enabled = false where id = agreement_id and user_id = auth.uid() returning * into a;
  if not found then raise sqlstate 'PT404' using message = 'Agreement not found'; end if;
  return grouplock_private.agreement_json(a);
end;
$$;

create function public.grouplock_connections(action text, connection_id uuid default null, hash_input bytea default null)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  connection public.extension_connections;
begin
  if actor is null then raise sqlstate 'PT401' using message = 'Sign in required'; end if;
  case action
    when 'list' then
      return (select coalesce(jsonb_agg(jsonb_build_object('id', id, 'revokedAt', revoked_at) order by id), '[]')
        from public.extension_connections where user_id = actor);
    when 'pair' then
      if hash_input is null or octet_length(hash_input) <> 32 then
        raise sqlstate 'PT400' using message = 'Invalid pairing credential';
      end if;
      insert into public.extension_connections (user_id, credential_hash) values (actor, hash_input) returning * into connection;
    when 'revoke' then
      update public.extension_connections set revoked_at = coalesce(revoked_at, clock_timestamp())
      where user_id = actor and id = connection_id returning * into connection;
      if not found then raise sqlstate 'PT404' using message = 'Connection not found'; end if;
    else raise sqlstate 'PT400' using message = 'Invalid connection action';
  end case;
  return jsonb_build_object('id', connection.id, 'revokedAt', connection.revoked_at);
end;
$$;

create function public.grouplock_notifications(mark_read_id uuid default null)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  n public.notifications;
begin
  if actor is null then raise sqlstate 'PT401' using message = 'Sign in required'; end if;
  if mark_read_id is null then
    return (select coalesce(jsonb_agg(jsonb_build_object('id', id, 'taskId', task_id,
      'type', type, 'readAt', read_at, 'createdAt', created_at) order by created_at desc, id), '[]')
      from public.notifications where recipient_id = actor);
  end if;
  update public.notifications set read_at = coalesce(read_at, clock_timestamp())
  where id = mark_read_id and recipient_id = actor returning * into n;
  if not found then raise sqlstate 'PT404' using message = 'Notification not found'; end if;
  return jsonb_build_object('id', n.id, 'taskId', n.task_id, 'type', n.type, 'readAt', n.read_at, 'createdAt', n.created_at);
end;
$$;

revoke all on function grouplock_private.task_json(public.tasks, timestamptz),
  grouplock_private.agreement_json(public.focus_agreements), grouplock_private.focus_status(uuid, timestamptz) from public;
revoke all on function public.grouplock_tasks(text, uuid, jsonb), public.grouplock_focus_status(),
  public.grouplock_revoke_agreement(uuid), public.grouplock_connections(text, uuid, bytea),
  public.grouplock_notifications(uuid), public.grouplock_extension_focus(bytea)
  from public, anon, authenticated;
grant execute on function public.grouplock_tasks(text, uuid, jsonb), public.grouplock_focus_status(),
  public.grouplock_revoke_agreement(uuid), public.grouplock_connections(text, uuid, bytea),
  public.grouplock_notifications(uuid) to authenticated;
grant execute on function public.grouplock_extension_focus(bytea) to service_role;

commit;
