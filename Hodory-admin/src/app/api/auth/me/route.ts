import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { decodeSession, SESSION_COOKIE } from '@/lib/auth-session';

export async function GET() {
  const cookieStore = await cookies();
  const raw = cookieStore.get(SESSION_COOKIE)?.value;
  const session = decodeSession(raw);

  if (!session?.user) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  return NextResponse.json({ ok: true, user: session.user });
}

