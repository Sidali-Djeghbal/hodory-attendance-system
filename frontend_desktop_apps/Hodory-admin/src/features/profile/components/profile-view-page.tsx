'use client';

import { UserAvatarProfile } from '@/components/user-avatar-profile';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useSessionUser } from '@/hooks/use-session-user';
import { Skeleton } from '@/components/ui/skeleton';

export default function ProfileViewPage() {
  const session = useSessionUser();
  const avatarUser =
    session.status === 'ready'
      ? {
          fullName: session.user.name,
          emailAddresses: [{ emailAddress: session.user.email }],
          imageUrl: ''
        }
      : null;

  if (session.status === 'error') {
    return (
      <div className='flex w-full flex-col gap-6 p-4'>
        <Card>
          <CardHeader>
            <CardTitle>Personal information</CardTitle>
            <CardDescription>
              Unable to load personal information. Please try again.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className='flex w-full flex-col gap-6 p-4'>
      <Card>
        <CardHeader className='flex flex-row items-center gap-4'>
          {session.status === 'loading' ? (
            <div className='flex items-center gap-3'>
              <Skeleton className='h-14 w-14 rounded-xl' />
              <div className='grid gap-2'>
                <Skeleton className='h-4 w-40' />
                <Skeleton className='h-3 w-56' />
              </div>
            </div>
          ) : (
            <UserAvatarProfile
              className='h-14 w-14 rounded-xl'
              showInfo
              user={avatarUser}
            />
          )}
          <div>
            <CardTitle>Personal information</CardTitle>
            <CardDescription>
              Administrator profile details (read-only).
            </CardDescription>
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Core administrator information.</CardDescription>
        </CardHeader>
        <CardContent className='grid gap-4 md:grid-cols-2'>
          <div>
            <p className='text-muted-foreground text-xs uppercase'>Name</p>
            <p className='text-sm font-medium'>
              {session.status === 'ready' ? session.user.name : '—'}
            </p>
          </div>
          <div>
            <p className='text-muted-foreground text-xs uppercase'>Admin ID</p>
            <p className='text-sm font-medium'>
              {session.status === 'ready' ? session.user.id : '—'}
            </p>
          </div>
          <div>
            <p className='text-muted-foreground text-xs uppercase'>Email</p>
            <p className='text-sm font-medium'>
              {session.status === 'ready' ? session.user.email : '—'}
            </p>
          </div>
          <div>
            <p className='text-muted-foreground text-xs uppercase'>Phone</p>
            <p className='text-sm font-medium'>—</p>
          </div>
          <div>
            <p className='text-muted-foreground text-xs uppercase'>Role</p>
            <p className='text-sm font-medium'>
              <Badge variant='secondary'>Administrator</Badge>
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Actions</CardTitle>
          <CardDescription>Account-level options.</CardDescription>
        </CardHeader>
        <CardContent className='flex flex-wrap gap-2'>
          <Button asChild variant='destructive'>
            <Link href='/auth/logout'>Logout</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
