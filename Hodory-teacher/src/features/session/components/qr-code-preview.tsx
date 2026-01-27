'use client';

import * as React from 'react';
import * as QRCode from 'qrcode';
import { cn } from '@/lib/utils';

export function QrCodePreview({
  className,
  value
}: {
  className?: string;
  value: string;
}) {
  const [dataUrl, setDataUrl] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    setDataUrl(null);

    QRCode.toDataURL(value, {
      margin: 1,
      errorCorrectionLevel: 'M',
      width: 512,
      color: { dark: '#000000', light: '#ffffff' }
    })
      .then((next) => {
        if (cancelled) return;
        setDataUrl(next);
      })
      .catch(() => {
        if (cancelled) return;
        setDataUrl(null);
      });

    return () => {
      cancelled = true;
    };
  }, [value]);

  return (
    <div
      className={cn(
        'relative border border-[#009485] flex items-center justify-center rounded-lg border-dashed bg-white p-3',
        className
      )}
    >
      {dataUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={dataUrl}
          alt='Session QR code'
          className='h-full w-full'
        />
      ) : (
        <div className='text-muted-foreground text-sm'>Generating QR…</div>
      )}
    </div>
  );
}
