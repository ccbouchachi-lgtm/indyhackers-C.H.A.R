-- Run with psql -v ON_ERROR_STOP=1 against a disposable migrated Supabase DB.
begin;

insert into auth.users (id) values
  ('15000000-0000-4000-8000-000000000001'),
  ('15000000-0000-4000-8000-000000000002'),
  ('15000000-0000-4000-8000-000000000003');

insert into public.profiles (id, username) values
  ('15000000-0000-4000-8000-000000000001', 'test owner'),
  ('15000000-0000-4000-8000-000000000002', 'test assignee'),
  ('15000000-0000-4000-8000-000000000003', 'test outsider')
on conflict (id) do nothing;

insert into public.groups (id, name, invite_code, owner_id) values (
  '25000000-0000-4000-8000-000000000001', 'test group',
  replace(gen_random_uuid()::text, '-', ''), '15000000-0000-4000-8000-000000000001'
);

insert into public.group_members (group_id, user_id, role) values
  ('25000000-0000-4000-8000-000000000001', '15000000-0000-4000-8000-000000000001', 'owner'),
  ('25000000-0000-4000-8000-000000000001', '15000000-0000-4000-8000-000000000002', 'member');

insert into public.tasks (id, group_id, title, assigned_to, reviewer_id, deadline) values (
  '35000000-0000-4000-8000-000000000001', '25000000-0000-4000-8000-000000000001',
  'test task', '15000000-0000-4000-8000-000000000002',
  '15000000-0000-4000-8000-000000000001', now()
);

do $$
begin
  begin
    update public.tasks set reviewer_id = assigned_to
    where id = '35000000-0000-4000-8000-000000000001';
    raise exception 'Self-review was permitted';
  exception when check_violation then null;
  end;

  begin
    insert into public.focus_agreements (user_id, group_id, expires_at) values (
      '15000000-0000-4000-8000-000000000002', '25000000-0000-4000-8000-000000000001', now()
    );
    raise exception 'Agreement with no future expiration was permitted';
  exception when check_violation then null;
  end;
end;
$$;

set local role authenticated;
set local request.jwt.claim.sub = '15000000-0000-4000-8000-000000000002';

do $$
begin
  if not exists (select 1 from public.tasks where id = '35000000-0000-4000-8000-000000000001') then
    raise exception 'Assignee could not see their group task';
  end if;

  begin
    update public.tasks set title = 'changed' where id = '35000000-0000-4000-8000-000000000001';
    raise exception 'Direct task update was permitted';
  exception when insufficient_privilege then null;
  end;

  begin
    perform invite_code from public.groups;
    raise exception 'Direct invite code read was permitted';
  exception when insufficient_privilege then null;
  end;

  begin
    perform credential_hash from public.extension_connections;
    raise exception 'Direct extension credential hash read was permitted';
  exception when insufficient_privilege then null;
  end;
end;
$$;

set local request.jwt.claim.sub = '15000000-0000-4000-8000-000000000003';

do $$
begin
  if exists (select id from public.groups where id = '25000000-0000-4000-8000-000000000001')
    or exists (select 1 from public.group_members where group_id = '25000000-0000-4000-8000-000000000001')
    or exists (select 1 from public.tasks where id = '35000000-0000-4000-8000-000000000001')
  then
    raise exception 'An outsider could see private group data';
  end if;
end;
$$;

rollback;
