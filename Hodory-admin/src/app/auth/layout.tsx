import type { ReactNode } from 'react';


import { APP_CONFIG } from '@/config/app-config';
import { Logo } from '@/components/layout/logo';


export default function Layout({
  children
}: Readonly<{ children: ReactNode }>) {
  return (
    <main>
      <div className='grid h-dvh justify-center p-2 lg:grid-cols-2'>
        <div className='relative order-1 hidden h-full rounded-3xl bg-[#009485] lg:flex'>
          <div className='absolute flex top-10 space-y-1 px-10 text-primary-foreground'>
            <Logo />
            <div className='items-center p-4'>
            <h1 className='text-6xl font-medium'>{APP_CONFIG.name}</h1>
            <p className='text-xl pt-3'>Empowering academic excellence through Intelligent Presence.</p>
            </div>
          </div>

          <div className='absolute bottom-10 flex w-full justify-between px-10'>
            <div className='flex-1 space-y-1 text-primary-foreground'>
              <h2 className='font-medium'>Administrator app</h2>
              <p className='text-sm'>
                manage student attendance with ease and efficiency.
              </p>
            </div>
          </div>
        </div>
        <div className='relative order-1 flex h-full'>{children}</div>
      </div>
    </main>
  );
}
