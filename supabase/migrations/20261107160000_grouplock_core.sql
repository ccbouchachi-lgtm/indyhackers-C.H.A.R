begin;

create type public.group_role as enum ('owner', 'admin', 'member');
create type public.task_status as enum (
  'assigned', 'accepted', 'submitted', 'changes_requested', 'approved'
);
create type public.notification_type as enum (
  'task_assigned', 'task_submitted', 'task_approved', 'task_changes_requested'
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null check (char_length(username) between 1 and 80),
  email text,
  avatar_url text,
  created_at timestamptz not null default now()
);

create table public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 100),
  invite_code text not null unique check (invite_code ~ '^[0-9a-f]{32}$'),
  owner_id uuid not null references public.profiles(id)
);

create table public.group_members (
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.group_role not null default 'member',
  primary key (group_id, user_id)
);
create unique index group_members_one_owner on public.group_members (group_id)
  where role = 'owner';
create index group_members_by_user on public.group_members (user_id, group_id);

create table public.focus_agreements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  group_id uuid not null,
  enabled boolean not null default false,
  allowed_domains text[] not null default '{}',
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  foreign key (group_id, user_id) references public.group_members (group_id, user_id),
  unique (id, user_id, group_id),
  check (isfinite(expires_at) and expires_at > created_at),
  check (array_position(allowed_domains, null) is null)
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 160),
  description text not null default '',
  assigned_to uuid not null,
  reviewer_id uuid not null,
  deadline timestamptz not null check (isfinite(deadline)),
  status public.task_status not null default 'assigned',
  focus_agreement_id uuid unique,
  submission_url text,
  submitted_at timestamptz,
  approved_at timestamptz,
  grace_until timestamptz,
  submission_version integer not null default 0 check (submission_version >= 0),
  foreign key (group_id, assigned_to) references public.group_members (group_id, user_id),
  foreign key (group_id, reviewer_id) references public.group_members (group_id, user_id),
  foreign key (focus_agreement_id, assigned_to, group_id)
    references public.focus_agreements (id, user_id, group_id),
  check (assigned_to <> reviewer_id),
  check ((status = 'approved') = (approved_at is not null)),
  check ((status = 'changes_requested') = (grace_until is not null)),
  check ((submission_version > 0) = (submitted_at is not null)),
  check ((submitted_at is null) = (submission_url is null)),
  check ((status in ('submitted', 'changes_requested', 'approved')) = (submission_version > 0)),
  check (status <> 'assigned' or focus_agreement_id is null),
  check (approved_at is null or approved_at >= submitted_at),
  check (grace_until is null or (isfinite(grace_until) and grace_until > submitted_at))
);
create index tasks_by_group on public.tasks (group_id);
create index tasks_by_assignee on public.tasks (assigned_to, status, deadline);
create index tasks_by_reviewer on public.tasks (reviewer_id, status);

create table public.extension_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  credential_hash bytea not null unique check (octet_length(credential_hash) = 32),
  revoked_at timestamptz
);
create index extension_connections_by_user on public.extension_connections (user_id);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  task_id uuid not null references public.tasks(id) on delete cascade,
  type public.notification_type not null,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  event_version integer not null check (event_version >= 0),
  unique (recipient_id, task_id, type, event_version)
);
create index notifications_by_recipient on public.notifications (recipient_id, created_at desc);

-- Only this predicate bypasses membership RLS, to avoid recursive policy evaluation.
create schema if not exists grouplock_private;
revoke all on schema grouplock_private from public;
grant usage on schema grouplock_private to authenticated;

create function grouplock_private.is_group_member(target_group uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.group_members m
    where m.group_id = target_group and m.user_id = (select auth.uid())
  );
$$;
revoke all on function grouplock_private.is_group_member(uuid) from public;
grant execute on function grouplock_private.is_group_member(uuid) to authenticated;

alter table public.profiles enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.tasks enable row level security;
alter table public.focus_agreements enable row level security;
alter table public.extension_connections enable row level security;
alter table public.notifications enable row level security;

-- Mutations are added through narrowly scoped transaction functions in later migrations.
revoke all on table public.profiles, public.groups, public.group_members, public.tasks,
  public.focus_agreements, public.extension_connections, public.notifications
  from public, anon, authenticated;

grant select on public.profiles, public.group_members, public.tasks,
  public.focus_agreements, public.notifications to authenticated;
grant select (id, name, owner_id) on public.groups to authenticated;

create policy profiles_read_self on public.profiles for select to authenticated
  using (id = (select auth.uid()));
create policy groups_read_member on public.groups for select to authenticated
  using (grouplock_private.is_group_member(id));
create policy members_read_member on public.group_members for select to authenticated
  using (grouplock_private.is_group_member(group_id));
create policy tasks_read_member on public.tasks for select to authenticated
  using (grouplock_private.is_group_member(group_id));
create policy agreements_read_self_member on public.focus_agreements for select to authenticated
  using (user_id = (select auth.uid()) and grouplock_private.is_group_member(group_id));
create policy notifications_read_recipient on public.notifications for select to authenticated
  using (recipient_id = (select auth.uid()));

-- No client privileges or policies on extension_connections: the server verifies hashes.
commit;
