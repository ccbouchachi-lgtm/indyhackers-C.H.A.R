import { ApiError, body, route, signedIn, string, unwrap, uuid, validation } from './http';

export const list = route(async () => {
  const { client } = await signedIn();
  return unwrap(await client.rpc('grouplock_groups', { action: 'list' }));
});

export const create = route(async (request) => {
  const { client } = await signedIn();
  const { name } = await body(request);
  return unwrap(await client.rpc('grouplock_groups', { action: 'create', input: string(name, 'name', 100) }));
}, 201);

export const join = route(async (request) => {
  const { client } = await signedIn();
  const { inviteCode } = await body(request);
  const input = string(inviteCode, 'inviteCode', 64).trim();
  if (!/^[a-f0-9]{32}$/i.test(input)) validation('Invalid invite code');
  const result = unwrap(await client.rpc('grouplock_groups', { action: 'join', input }));
  if (result.joinError === 'RATE_LIMITED') throw new ApiError(429, 'RATE_LIMITED', 'Try again in a minute');
  if (result.joinError === 'NOT_FOUND') throw new ApiError(404, 'NOT_FOUND', 'Invite not found');
  return result;
});

export const detail = route(async (_request, { params }: { params: Promise<{ groupId: string }> }) => {
  const { client } = await signedIn();
  const { groupId } = await params;
  return unwrap(await client.rpc('grouplock_groups', { action: 'detail', group_id_input: uuid(groupId, 'groupId') }));
});
