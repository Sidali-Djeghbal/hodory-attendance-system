'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useRouter } from 'next/navigation';
import * as React from 'react';
import { toast } from 'sonner';
import { apiJson } from '@/lib/api-client';
import { useAuth } from '@/features/auth/auth-context';

export function LoginForm() {
  const router = useRouter();
  const { ready, token, login } = useAuth();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (!ready) return;
    if (token) router.replace('/dashboard/overview');
  }, [ready, token, router]);

  return (
    <form
      className='space-y-4'
      onSubmit={async (event) => {
        event.preventDefault();
        setIsSubmitting(true);
        try {
          const form = new FormData(event.currentTarget);
          const email = String(form.get('email') ?? '').trim();
          const password = String(form.get('password') ?? '');

          const result = await apiJson<{
            success: boolean;
            access_token: string;
            token_type: string;
            user: {
              id: number;
              email: string;
              full_name: string;
              role: string;
              department?: string | null;
            };
          }>('/auth/login', { method: 'POST', body: { email, password } });

          if (!result?.access_token || !result?.user) {
            throw new Error('Invalid login response');
          }
          if (result.user.role !== 'teacher') {
            throw new Error('This account is not a teacher.');
          }

          login({ token: result.access_token, user: result.user });
          router.replace('/dashboard/overview');
        } catch (error) {
          toast.error(error instanceof Error ? error.message : 'Login failed');
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
          placeholder='teacher@university.dz'
          autoComplete='email'
          required
        />
      </div>
      <div className='space-y-2'>
        <Label htmlFor='password'>Password</Label>
        <Input
          id='password'
          name='password'
          type='password'
          placeholder='Password'
          autoComplete='current-password'
          required
        />
      </div>
      <Button
        className='w-full cursor-pointer'
        type='submit'
        disabled={isSubmitting}
      >
        {isSubmitting ? 'Signing in…' : 'Sign in'}
      </Button>
    </form>
  );
}
