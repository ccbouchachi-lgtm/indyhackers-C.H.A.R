import { route, signedIn, unwrap, uuid } from './http';

export const list = route(async () => {
  const { client } = await signedIn();
  return unwrap(await client.rpc('grouplock_notifications'));
});

export const markRead = route(async (_request, { params }: { params: Promise<{ notificationId: string }> }) => {
  const { client } = await signedIn();
  return unwrap(await client.rpc('grouplock_notifications', {
    mark_read_id: uuid((await params).notificationId, 'notificationId'),
  }));
});
