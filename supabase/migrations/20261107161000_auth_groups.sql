begin;

create function grouplock_private.sync_profile()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, username, email)
  values (new.id, coalesce(nullif(left(btrim(new.raw_user_meta_data->>'username'), 80), ''), 'Member'), new.email)
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;
revoke all on function grouplock_private.sync_profile() from public;

create trigger grouplock_profile_sync
after insert or update of email on auth.users
for each row execute function grouplock_private.sync_profile();

insert into public.profiles (id, username, email)
select id, coalesce(nullif(left(btrim(raw_user_meta_data->>'username'), 80), ''), 'Member'), email
from auth.users on conflict (id) do nothing;

create function grouplock_private.group_json(g public.groups, member_role public.group_role)
returns jsonb language sql immutable set search_path = ''
as $$
  select jsonb_build_object('id', g.id, 'name', g.name, 'ownerId', g.owner_id, 'role', member_role);
$$;
revoke all on function grouplock_private.group_json(public.groups, public.group_role) from public;

create table grouplock_private.join_limits (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  window_start timestamptz not null,
  attempts integer not null
);
alter table grouplock_private.join_limits enable row level security;

create function public.grouplock_groups(action text, group_id_input uuid default null, input text default null)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  g public.groups;
  member_role public.group_role;
  attempts integer;
begin
  if actor is null then raise sqlstate 'PT401' using message = 'Sign in required'; end if;
  case action
    when 'list' then
      return (select coalesce(jsonb_agg(grouplock_private.group_json(gr, m.role) order by gr.name, gr.id), '[]')
        from public.groups gr join public.group_members m on m.group_id = gr.id where m.user_id = actor);
    when 'create' then
      if input is null or char_length(btrim(input)) not between 1 and 100 then
        raise sqlstate 'PT400' using message = 'Invalid group name';
      end if;
      insert into public.groups(name, invite_code, owner_id)
      values (btrim(input), replace(gen_random_uuid()::text, '-', ''), actor) returning * into g;
      insert into public.group_members values (g.id, actor, 'owner');
      return jsonb_build_object('group', grouplock_private.group_json(g, 'owner'), 'inviteCode', g.invite_code);
    when 'join' then
      insert into grouplock_private.join_limits as limits values (actor, statement_timestamp(), 1)
      on conflict (user_id) do update set
        window_start = case when limits.window_start <= statement_timestamp() - interval '1 minute'
          then statement_timestamp() else limits.window_start end,
        attempts = case when limits.window_start <= statement_timestamp() - interval '1 minute'
          then 1 else least(limits.attempts + 1, 11) end
      returning limits.attempts into attempts;
      -- Return expected failures so that the attempt counter commits.
      if attempts > 10 then return jsonb_build_object('joinError', 'RATE_LIMITED'); end if;
      select * into g from public.groups where invite_code = lower(btrim(input));
      if not found then return jsonb_build_object('joinError', 'NOT_FOUND'); end if;
      insert into public.group_members values (g.id, actor, 'member') on conflict do nothing;
      select role into member_role from public.group_members where group_id = g.id and user_id = actor;
      return grouplock_private.group_json(g, member_role);
    when 'detail' then
      select role into member_role from public.group_members where group_id = group_id_input and user_id = actor;
      if not found then raise sqlstate 'PT404' using message = 'Group not found'; end if;
      select * into strict g from public.groups where id = group_id_input;
      return jsonb_build_object(
        'group', grouplock_private.group_json(g, member_role),
        'inviteCode', case when member_role in ('owner', 'admin') then g.invite_code end,
        'members', (select jsonb_agg(jsonb_build_object('userId', p.id, 'username', p.username,
          'avatarUrl', p.avatar_url, 'role', m.role) order by p.username, p.id)
          from public.group_members m join public.profiles p on p.id = m.user_id where m.group_id = g.id)
      );
    else raise sqlstate 'PT400' using message = 'Invalid group action';
  end case;
end;
$$;
revoke all on function public.grouplock_groups(text, uuid, text) from public, anon, authenticated;
grant execute on function public.grouplock_groups(text, uuid, text) to authenticated;

commit;
