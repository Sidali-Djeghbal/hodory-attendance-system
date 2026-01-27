import Image from 'next/image';

{/* logo will be here*/}

export function Logo() {
  return (
    <Image
      className='bg-white rounded-lg p-4'
      src='/assets/logo.svg'
      alt='App Logo'
      width={140}
      height={140}
      suppressHydrationWarning
    />
  );
}
