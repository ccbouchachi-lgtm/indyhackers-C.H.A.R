import { createHash, randomBytes } from 'node:crypto';
import { ApiError, route, signedIn, unwrap, uuid } from './http';
import { serviceClient } from './supabase';

function credentialHash(credential: string) {
  return '\\x' + createHash('sha256').update(credential).digest('hex');
}

export const status = route(async (request) => {
  const authorization = request.headers.get('authorization');
  if (authorization !== null) {
    const credential = /^Bearer ([A-Za-z0-9_-]{43})$/i.exec(authorization)?.[1];
    const invalid = () => new ApiError(401, 'INVALID_CREDENTIALS', 'Invalid extension credential');
    if (!credential) throw invalid();
    const result = await serviceClient().rpc('grouplock_extension_focus', { hash_input: credentialHash(credential) });
    if (result.error?.code === 'PT401') throw invalid();
    return unwrap(result);
  }

  const { client } = await signedIn();
  return unwrap(await client.rpc('grouplock_focus_status'));
});

export const revokeAgreement = route(async (_request, { params }: { params: Promise<{ agreementId: string }> }) => {
  const { client } = await signedIn();
  return unwrap(await client.rpc('grouplock_revoke_agreement', {
    agreement_id: uuid((await params).agreementId, 'agreementId'),
  }));
});

export const listConnections = route(async () => {
  const { client } = await signedIn();
  return unwrap(await client.rpc('grouplock_connections', { action: 'list' }));
});

export const pair = route(async () => {
  const { client } = await signedIn();
  const credential = randomBytes(32).toString('base64url');
  const connection = unwrap(await client.rpc('grouplock_connections', {
    action: 'pair', hash_input: credentialHash(credential),
  }));
  return { connection, credential };
}, 201);

export const revokeConnection = route(async (_request, { params }: { params: Promise<{ connectionId: string }> }) => {
  const { client } = await signedIn();
  return unwrap(await client.rpc('grouplock_connections', {
    action: 'revoke', connection_id: uuid((await params).connectionId, 'connectionId'),
  }));
});
