'use client';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { UserAvatarProfile } from '@/components/user-avatar-profile';
import { useRouter } from 'next/navigation';
import { IconLogout, IconUserCircle } from '@tabler/icons-react';
import { useSessionUser } from '@/hooks/use-session-user';
import { Skeleton } from '@/components/ui/skeleton';
export function UserNav() {
  const router = useRouter();
  const session = useSessionUser();

  const avatarUser =
    session.status === 'ready'
      ? {
          fullName: `${session.user.name} (${session.user.id})`,
          emailAddresses: [{ emailAddress: session.user.email }],
          imageUrl: ''
        }
      : null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant='ghost'
          className='relative flex-row-reverse flex h-8 items-center gap-2 rounded-full px-2'
        >
          {session.status === 'loading' ? (
            <Skeleton className='h-7 w-28 rounded-full' />
          ) : (
            <>
              <UserAvatarProfile user={avatarUser} />
              <span className='text-sm font-medium'>
                {session.status === 'ready' ? session.user.name : 'Admin'}
              </span>
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className='w-56'
        align='end'
        sideOffset={10}
        forceMount
      >
        <DropdownMenuLabel className='font-normal'>
          <div className='flex flex-col space-y-1'>
            <p className='text-sm leading-none font-medium'>
              {session.status === 'ready'
                ? `${session.user.name} (${session.user.id})`
                : 'Administrator'}
            </p>
            <p className='text-muted-foreground text-xs leading-none'>
              {session.status === 'ready' ? session.user.email : ''}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={() => router.push('/dashboard/profile')}>
            <IconUserCircle className='mr-2 h-4 w-4' />
            Personal Info
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => router.push('/auth/logout')}>
          <IconLogout className='mr-2 h-4 w-4' />
          Logout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
