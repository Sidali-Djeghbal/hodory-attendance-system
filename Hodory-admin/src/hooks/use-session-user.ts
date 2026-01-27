'use client';

import * as React from 'react';

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: 'admin';
};

type Result =
  | { status: 'loading'; user: null; error: null }
  | { status: 'ready'; user: SessionUser; error: null }
  | { status: 'error'; user: null; error: string };

export function useSessionUser(): Result {
  const [result, setResult] = React.useState<Result>({
    status: 'loading',
    user: null,
    error: null
  });

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch('/api/auth/me', { cache: 'no-store' });
        if (!response.ok) throw new Error('Unauthorized');
        const json = (await response.json()) as { user: SessionUser };
        if (!cancelled) {
          setResult({ status: 'ready', user: json.user, error: null });
        }
      } catch (error) {
        if (!cancelled) {
          setResult({
            status: 'error',
            user: null,
            error: error instanceof Error ? error.message : 'Unable to load user'
          });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return result;
}

