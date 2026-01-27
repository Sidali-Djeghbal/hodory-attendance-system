'use client';

import * as React from 'react';
import { useAuth } from '@/features/auth/auth-context';
import { OverviewDataProvider } from './overview-data-context';

export function DashboardOverviewProvider({ children }: { children: React.ReactNode }) {
  const { token, user } = useAuth();
  return (
    <OverviewDataProvider token={token} userId={user?.id ?? null}>
      {children}
    </OverviewDataProvider>
  );
}

