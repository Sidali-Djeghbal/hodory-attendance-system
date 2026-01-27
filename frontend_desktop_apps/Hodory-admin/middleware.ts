import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const SESSION_COOKIE = 'hodory_session';

function isPublicPath(pathname: string) {
  if (pathname.startsWith('/auth')) return true;
  if (pathname.startsWith('/api/auth')) return true;
  if (pathname.startsWith('/_next')) return true;
  if (pathname === '/favicon.ico') return true;
  return false;
}

function getRoleFromCookie(request: NextRequest): string | undefined {
  const raw = request.cookies.get(SESSION_COOKIE)?.value;
  if (!raw) return undefined;
  try {
    const json = atob(raw);
    const parsed = JSON.parse(json) as {
      role?: string;
      user?: { role?: string };
    };
    return parsed.user?.role ?? parsed.role;
  } catch {
    return undefined;
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublicPath(pathname)) return NextResponse.next();

  if (pathname.startsWith('/dashboard')) {
    const role = getRoleFromCookie(request);
    if (role !== 'admin') {
      const url = request.nextUrl.clone();
      url.pathname = '/auth/login';
      url.searchParams.set('next', pathname);
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!.*\\..*).*)']
};
