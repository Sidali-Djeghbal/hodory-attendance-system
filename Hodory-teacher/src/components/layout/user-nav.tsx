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
import { useAuth } from '@/features/auth/auth-context';
import { toAvatarUser } from '@/features/auth/avatar-user';
export function UserNav() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const avatarUser = toAvatarUser(user);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant='ghost'
          className='relative flex-row-reverse flex h-8 items-center gap-2 rounded-full px-2'
        >
          <UserAvatarProfile user={avatarUser} />
          <span className='text-sm font-medium'>{avatarUser?.fullName ?? ''}</span>
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
              {avatarUser?.fullName ?? ''}
            </p>
            <p className='text-muted-foreground text-xs leading-none'>
              {avatarUser?.emailAddresses[0]?.emailAddress ?? ''}
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
        <DropdownMenuItem
          onClick={() => {
            logout();
            router.replace('/auth/login');
          }}
        >
          <IconLogout className='mr-2 h-4 w-4' />
          Logout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
