import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { encodeSession, SESSION_COOKIE, type Session } from '@/lib/auth-session';

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | { email?: string; password?: string }
    | null;

  const email = body?.email?.trim() || 'admin@hodory.local';

  const session: Session = {
    user: {
      id: 'ADM-0001',
      name: 'Administrator',
      email,
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

  return NextResponse.json({ ok: true });
}

