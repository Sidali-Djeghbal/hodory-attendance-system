'use client';

import React from 'react';
import { Breadcrumbs } from '../breadcrumbs';
import { UserNav } from './user-nav';
import { ModeToggle } from './ThemeToggle/theme-toggle';
import { useSessionUser } from '@/hooks/use-session-user';
import { Skeleton } from '@/components/ui/skeleton';

export default function Header() {
  const [now, setNow] = React.useState(() => new Date());

  React.useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  const session = useSessionUser();
  const dateLabel = new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  }).format(now);
  const timeLabel = new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  }).format(now);

  return (
    <header className='flex h-16 shrink-0 items-center justify-between gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12'>
      <div className='flex items-center gap-2 px-4'>
        <Breadcrumbs />
      </div>

      <div className='flex items-center gap-3 px-4'>
        <div className='hidden items-center gap-2 rounded-full border border-border/60 bg-card px-3 py-1 text-xs font-medium text-muted-foreground lg:flex'>
          {session.status === 'loading' ? (
            <Skeleton className='h-4 w-40 rounded-full' />
          ) : (
            <span>
              {session.status === 'ready'
                ? `${session.user.name} (${session.user.id})`
                : 'Administrator'}
            </span>
          )}
        </div>
        <div className='hidden items-center gap-2 rounded-full border border-border/60 bg-card px-3 py-1 text-xs font-medium text-muted-foreground lg:flex'>
          <span>{dateLabel}</span>
          <span className='text-foreground'>{timeLabel}</span>
        </div>
        <UserNav />
        <ModeToggle />
      </div>
    </header>
  );
}
