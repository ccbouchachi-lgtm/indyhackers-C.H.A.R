import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { publicConfig } from './lib/backend/supabase';

export async function proxy(request: NextRequest) {
  const { url, key } = publicConfig();
  let response = NextResponse.next({ request });
  const client = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (updates, headers) => {
        for (const { name, value } of updates) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of updates) response.cookies.set(name, value, options);
        for (const [name, value] of Object.entries(headers)) response.headers.set(name, value);
      },
    },
  });
  await client.auth.getClaims();
  return response;
}

export const config = { matcher: ['/((?!api|_next/static|_next/image|.*\\..*).*)'] };
