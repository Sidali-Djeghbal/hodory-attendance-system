'use client';

import React from 'react';
import { Breadcrumbs } from '../breadcrumbs';
import { UserNav } from './user-nav';
import { ModeToggle } from './ThemeToggle/theme-toggle';
import { Badge } from '@/components/ui/badge';
import { useSessionState } from '@/features/session/session-context';

export default function Header() {
  const [now, setNow] = React.useState(() => new Date());
  const { isActive, module, room, code, remainingSeconds } =
    useSessionState();

  React.useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  const dateLabel = new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  }).format(now);
  const timeLabel = new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  }).format(now);
  const remainingMinutes = Math.max(Math.ceil(remainingSeconds / 60), 0);

  return (
    <header className='flex h-16 shrink-0 items-center justify-between gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12'>
      <div className='flex items-center gap-2 px-4'>
        <Breadcrumbs />
      </div>

      <div className='flex items-center gap-3 px-4'>
        <div className='hidden items-center gap-2 rounded-full border border-border/60 bg-card px-3 py-1 text-xs font-medium text-muted-foreground lg:flex'>
          <span>{dateLabel}</span>
          <span className='text-foreground'>{timeLabel}</span>
        </div>
        {isActive ? (
          <div className='hidden items-center gap-2 rounded-full border border-border/60 bg-card px-3 py-1 text-xs lg:flex'>
            <Badge className='bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/20 dark:text-emerald-400'>
              Active session
            </Badge>
            <span className='text-muted-foreground'>
              {module} - {code} - {room}
            </span>
            <span className='text-foreground'>{remainingMinutes} min</span>
          </div>
        ) : (
          <div className='hidden items-center gap-2 rounded-full border border-border/60 bg-card px-3 py-1 text-xs lg:flex'>
            <Badge variant='secondary'>Session stopped</Badge>
            <span className='text-muted-foreground'>{module} - {code} - {room}</span>
          </div>
        )}
        <UserNav />
        <ModeToggle />
      </div>
    </header>
  );
}
