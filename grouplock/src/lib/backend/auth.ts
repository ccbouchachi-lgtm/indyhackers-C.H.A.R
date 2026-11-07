import { ApiError, body, route, signedIn, string, unwrap, validation } from './http';
import { sessionClient } from './supabase';

async function profile(client: Awaited<ReturnType<typeof sessionClient>>, id: string) {
  const row = unwrap(await client.from('profiles').select('id,username,email,avatar_url,created_at').eq('id', id).single());
  if (!row) throw new ApiError(500, 'INTERNAL_ERROR', 'Profile unavailable');
  return { id: row.id, username: row.username, email: row.email, avatarUrl: row.avatar_url, createdAt: row.created_at };
}

export const signup = route(async (request) => {
  const input = await body(request);
  const email = string(input.email, 'email', 254).trim();
  const password = string(input.password, 'password', 256);
  const username = string(input.username, 'username', 80).trim();
  if (password.length < 8) validation('Password must have at least eight characters');
  const client = await sessionClient();
  const { data, error } = await client.auth.signUp({ email, password, options: { data: { username } } });
  if (error) authFailure(error.status, 'Could not create account');
  return { requiresEmailConfirmation: !data.session };
}, 201);

function authFailure(status: number | undefined, message: string): never {
  if (status === 429) throw new ApiError(429, 'RATE_LIMITED', 'Try again later');
  if (!status || status >= 500) throw new ApiError(500, 'INTERNAL_ERROR', 'Authentication unavailable');
  validation(message);
}

export const login = route(async (request) => {
  const input = await body(request);
  const client = await sessionClient();
  const { data, error } = await client.auth.signInWithPassword({
    email: string(input.email, 'email', 254).trim(),
    password: string(input.password, 'password', 256),
  });
  if (error) {
    if (error.code === 'invalid_credentials' || error.code === 'email_not_confirmed') {
      throw new ApiError(401, 'INVALID_CREDENTIALS', 'Invalid email or password, or email confirmation required');
    }
    authFailure(error.status, 'Could not sign in');
  }
  return profile(client, data.user.id);
});

export const logout = route(async () => {
  const { client } = await signedIn();
  const { error } = await client.auth.signOut({ scope: 'local' });
  if (error) authFailure(error.status, 'Could not sign out');
  return null;
});

export const me = route(async () => {
  const { client, id } = await signedIn();
  return profile(client, id);
});

export async function confirm(request: Request) {
  const url = new URL(request.url);
  const tokenHash = url.searchParams.get('token_hash');
  const destination = new URL('/', process.env.APP_ORIGIN ?? url.origin);
  const client = await sessionClient();
  const result = tokenHash ? await client.auth.verifyOtp({ token_hash: tokenHash, type: 'email' }) : null;
  if (!result || result.error) destination.searchParams.set('auth', 'confirmation_failed');
  return new Response(null, { status: 303, headers: { Location: destination.href, 'Cache-Control': 'private, no-store', 'Referrer-Policy': 'no-referrer' } });
}
