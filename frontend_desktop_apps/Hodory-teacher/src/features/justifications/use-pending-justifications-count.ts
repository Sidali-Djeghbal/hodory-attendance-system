'use client';

import * as React from 'react';
import { useAuth } from '@/features/auth/auth-context';
import { getTeacherJustificationsCount } from '@/lib/teacher-api';

export function usePendingJustificationsCount(options?: { refreshMs?: number }) {
  const refreshMs = options?.refreshMs ?? 60_000;
  const { token } = useAuth();
  const [count, setCount] = React.useState<number | null>(null);
  const inFlight = React.useRef(false);

  React.useEffect(() => {
    if (!token) {
      setCount(null);
      return;
    }

    let cancelled = false;

    const load = async () => {
      if (inFlight.current) return;
      inFlight.current = true;
      try {
        const result = await getTeacherJustificationsCount(token, 'pending');
        if (cancelled) return;
        setCount(result.total_justifications ?? 0);
      } catch {
        // Ignore badge refresh errors (UI should still work).
      } finally {
        inFlight.current = false;
      }
    };

    load();
    const interval = setInterval(load, refreshMs);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [token, refreshMs]);

  return count;
}
