import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { encodeSession, SESSION_COOKIE, type Session } from '@/lib/auth-session';

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | { email?: string; password?: string }
    | null;

  const email = body?.email?.trim() || '';
  const password = body?.password || '';

  const base =
    process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, '') ??
    'http://127.0.0.1:8000/api';

  const res = await fetch(`${base}/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({ email, password }),
    cache: 'no-store'
  });

  if (!res.ok) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const json = (await res.json().catch(() => null)) as
    | { access_token?: string; user?: { id: number; email: string; full_name: string; role: string } }
    | null;

  const token = json?.access_token;
  const user = json?.user;
  if (!token || !user || user.role !== 'admin') {
    return NextResponse.json({ ok: false, error: 'Admin access required' }, { status: 403 });
  }

  const session: Session = {
    user: {
      id: String(user.id),
      name: user.full_name,
      email: user.email,
      role: 'admin'
    }
  };

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, encodeSession(session), {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: process.env.NODE_ENV === 'production'
  });
  cookieStore.set('hodory_token', token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 7
  });

  return NextResponse.json({ ok: true });
}
