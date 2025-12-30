'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useRouter } from 'next/navigation';

export function LoginForm() {
  const router = useRouter();

  return (
    <form
      className='space-y-4'
      onSubmit={(event) => {
        event.preventDefault();
        router.push('/dashboard/overview');
      }}
    >
      <div className='space-y-2'>
        <Label htmlFor='email'>Email</Label>
        <Input
          id='email'
          type='email'
          defaultValue='sidali@test'
          placeholder='sidali@test'
        />
      </div>
      <div className='space-y-2'>
        <Label htmlFor='password'>Password</Label>
        <Input
          id='password'
          type='password'
          defaultValue='test1234'
          placeholder='test1234'
        />
      </div>
      <Button className='w-full cursor-pointer' type='submit'>
        Sign in
      </Button>
    </form>
  );
}
