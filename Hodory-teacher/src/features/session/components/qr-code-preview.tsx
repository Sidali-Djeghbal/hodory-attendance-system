'use client';

import { cn } from '@/lib/utils';

export const qrValue = 'SESSION-CS215-2024-10-08-0900';

export function QrCodePreview({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'relative border border-[#009485] flex items-center justify-center rounded-lg border-dashed bg-white p-3',
        className
      )}
    >
      <svg
        aria-label={`QR code for ${qrValue}`}
        role='img'
        viewBox='0 0 100 100'
        className='h-full w-full'
      >
        <rect width='100' height='100' fill='white' />
        <rect x='4' y='4' width='28' height='28' fill='black' />
        <rect x='10' y='10' width='16' height='16' fill='white' />
        <rect x='14' y='14' width='8' height='8' fill='black' />
        <rect x='68' y='4' width='28' height='28' fill='black' />
        <rect x='74' y='10' width='16' height='16' fill='white' />
        <rect x='78' y='14' width='8' height='8' fill='black' />
        <rect x='4' y='68' width='28' height='28' fill='black' />
        <rect x='10' y='74' width='16' height='16' fill='white' />
        <rect x='14' y='78' width='8' height='8' fill='black' />
        <rect x='40' y='10' width='6' height='6' fill='black' />
        <rect x='52' y='10' width='6' height='6' fill='black' />
        <rect x='46' y='20' width='6' height='6' fill='black' />
        <rect x='58' y='24' width='6' height='6' fill='black' />
        <rect x='40' y='32' width='6' height='6' fill='black' />
        <rect x='52' y='36' width='6' height='6' fill='black' />
        <rect x='64' y='40' width='6' height='6' fill='black' />
        <rect x='36' y='48' width='6' height='6' fill='black' />
        <rect x='48' y='52' width='6' height='6' fill='black' />
        <rect x='60' y='56' width='6' height='6' fill='black' />
        <rect x='72' y='52' width='6' height='6' fill='black' />
        <rect x='40' y='64' width='6' height='6' fill='black' />
        <rect x='52' y='68' width='6' height='6' fill='black' />
        <rect x='64' y='72' width='6' height='6' fill='black' />
        <rect x='76' y='76' width='6' height='6' fill='black' />
        <rect x='48' y='80' width='6' height='6' fill='black' />
        <rect x='60' y='84' width='6' height='6' fill='black' />
      </svg>
    </div>
  );
}
