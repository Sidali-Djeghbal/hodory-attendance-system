'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';

export default function LogoutPage() {
  const router = useRouter();

  React.useEffect(() => {
    let alive = true;
    const run = async () => {
      try {
        await fetch('/api/auth/logout', { method: 'POST' });
      } finally {
        if (!alive) return;
        router.replace('/auth/login');
      }
    };
    void run();
    return () => {
      alive = false;
    };
  }, [router]);

  return (
    <div className='mx-auto flex w-full flex-col justify-center space-y-3 sm:w-[350px]'>
      <h1 className='text-2xl font-medium'>Logging out…</h1>
      <p className='text-sm text-muted-foreground'>Please wait.</p>
    </div>
  );
}
