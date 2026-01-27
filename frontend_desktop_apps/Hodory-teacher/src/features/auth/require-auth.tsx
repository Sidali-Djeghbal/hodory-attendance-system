'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './auth-context';

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { ready, token } = useAuth();

  React.useEffect(() => {
    if (!ready) return;
    if (!token) router.replace('/auth/login');
  }, [ready, token, router]);

  if (!ready) return null;
  if (!token) return null;
  return <>{children}</>;
}

