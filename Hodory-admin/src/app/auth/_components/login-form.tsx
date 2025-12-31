'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import * as React from 'react';

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  return (
    <form
      className='space-y-4'
      onSubmit={async (event) => {
        event.preventDefault();
        setIsSubmitting(true);
        try {
          const form = new FormData(event.currentTarget);
          const email = String(form.get('email') ?? '');
          const password = String(form.get('password') ?? '');
          const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ email, password })
          });
          if (!response.ok) throw new Error('Login failed');
          const next = searchParams.get('next');
          const destination =
            next && next.startsWith('/') ? next : '/dashboard/overview';
          router.replace(destination);
        } catch (error) {
          toast.error(
            error instanceof Error ? error.message : 'Unable to sign in.'
          );
        } finally {
          setIsSubmitting(false);
        }
      }}
    >
      <div className='space-y-2'>
        <Label htmlFor='email'>Email</Label>
        <Input
          id='email'
          name='email'
          type='email'
          defaultValue='admin@hodory.local'
          placeholder='admin@hodory.local'
        />
      </div>
      <div className='space-y-2'>
        <Label htmlFor='password'>Password</Label>
        <Input
          id='password'
          name='password'
          type='password'
          defaultValue='admin'
          placeholder='admin'
        />
      </div>
      <Button className='w-full cursor-pointer' type='submit' disabled={isSubmitting}>
        {isSubmitting ? 'Signing in…' : 'Sign in'}
      </Button>
    </form>
  );
}
