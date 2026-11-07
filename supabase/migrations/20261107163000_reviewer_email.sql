begin;

create table grouplock_private.reviewer_email_outbox (
  notification_id uuid primary key references public.notifications(id) on delete cascade,
  recipient_email text not null,
  task_title text not null,
  sender_email text,
  created_at timestamptz not null default clock_timestamp(),
  available_at timestamptz not null default clock_timestamp(),
  lease_id uuid,
  sent_at timestamptz
);
alter table grouplock_private.reviewer_email_outbox enable row level security;
create index reviewer_email_pending on grouplock_private.reviewer_email_outbox (available_at, created_at)
where sent_at is null;

create function grouplock_private.enqueue_reviewer_email()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  insert into grouplock_private.reviewer_email_outbox (notification_id, recipient_email, task_title)
  select new.id, p.email, t.title
  from public.profiles p cross join public.tasks t
  where p.id = new.recipient_id and t.id = new.task_id and nullif(p.email, '') is not null;
  return new;
end;
$$;
revoke all on function grouplock_private.enqueue_reviewer_email() from public;

create trigger grouplock_enqueue_reviewer_email
after insert on public.notifications for each row when (new.type = 'task_submitted')
execute function grouplock_private.enqueue_reviewer_email();

create function public.grouplock_claim_reviewer_email(
  sender_input text, task_id_input uuid default null, version_input integer default null
)
returns table (notification_id uuid, lease_id uuid, recipient_email text, task_title text, sender_email text)
language sql security definer set search_path = ''
as $$
  with claim_time as (select clock_timestamp() as ts), candidates as (
    select o.notification_id
    from grouplock_private.reviewer_email_outbox o
    join public.notifications n on n.id = o.notification_id
    cross join claim_time
    where o.sent_at is null and o.available_at <= claim_time.ts
      -- Stay within Resend's idempotency window even after an ambiguous send.
      and o.created_at > claim_time.ts - interval '23 hours'
      and (task_id_input is null or (n.task_id = task_id_input and n.event_version = version_input))
    order by o.available_at, o.created_at
    limit 10
    for update of o skip locked
  )
  update grouplock_private.reviewer_email_outbox o
  set lease_id = gen_random_uuid(), available_at = claim_time.ts + interval '1 minute',
      sender_email = coalesce(o.sender_email, sender_input)
  from candidates c cross join claim_time where o.notification_id = c.notification_id
  returning o.notification_id, o.lease_id, o.recipient_email, o.task_title, o.sender_email;
$$;

create function public.grouplock_mark_reviewer_email_sent(notification_input uuid, lease_input uuid)
returns void language sql security definer set search_path = ''
as $$
  update grouplock_private.reviewer_email_outbox
  set sent_at = clock_timestamp()
  where notification_id = notification_input and lease_id = lease_input and sent_at is null;
$$;

revoke all on function public.grouplock_claim_reviewer_email(text, uuid, integer),
  public.grouplock_mark_reviewer_email_sent(uuid, uuid) from public, anon, authenticated;
grant execute on function public.grouplock_claim_reviewer_email(text, uuid, integer),
  public.grouplock_mark_reviewer_email_sent(uuid, uuid) to service_role;

commit;
