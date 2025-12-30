import { APP_CONFIG } from '@/config/app-config';

import { LoginForm } from '../_components/login-form';

export default function LoginV2() {
  return (
    <>
      <div className='mx-auto flex w-full flex-col justify-center space-y-8 sm:w-[350px]'>
        <div className='space-y-2 text-center'>
          <h1 className='text-3xl font-medium'>Login to your account</h1>
          <p className='text-muted-foreground text-sm'>
            Please enter your credentials to continue.
          </p>
        </div>
        <div className='space-y-4'></div>
        <LoginForm />
      </div>

      <div className='absolute bottom-5 flex w-full justify-between px-10'>
        <div className='text-sm'>{APP_CONFIG.copyright}</div>
      </div>
    </>
  );
}
