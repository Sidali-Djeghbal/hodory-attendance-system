'use client';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from '@/components/ui/collapsible';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar
} from '@/components/ui/sidebar';
import { UserAvatarProfile } from '@/components/user-avatar-profile';
import { navItems } from '@/config/nav-config';
import { useSessionState } from '@/features/session/session-context';
import { useFilteredNavItems } from '@/hooks/use-nav';
import {
  IconChevronRight,
  IconChevronsDown,
  IconLogout,
  IconUserCircle
} from '@tabler/icons-react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Icons } from '../icons';
import { cn } from '@/lib/utils';
import { useAuth } from '@/features/auth/auth-context';
import { toAvatarUser } from '@/features/auth/avatar-user';
import { useOverviewData } from '@/features/overview/components/overview-data-context';

export default function AppSidebar() {
  const pathname = usePathname();
  const { state } = useSidebar();
  const router = useRouter();
  const { isActive } = useSessionState();
  const { user, logout } = useAuth();
  const avatarUser = toAvatarUser(user);
  const { metrics } = useOverviewData();
  const pendingJustificationsCount = metrics?.pendingJustifications ?? 0;
  const filteredItems = useFilteredNavItems(
    navItems.map((item) => {
      let next = item;

      if (item.title === 'Active Session') {
        next = { ...next, visible: isActive };
      }

      if (item.title === 'Justifications') {
        next = {
          ...next,
          badge:
            pendingJustificationsCount && pendingJustificationsCount > 0
              ? pendingJustificationsCount
              : undefined
        };
      }

      return next;
    })
  );

  return (
    <Sidebar collapsible='offcanvas'>
      <SidebarHeader>
        <div className='px-3 py-2'>
          <Link
            href='/dashboard/overview'
            className={cn(
              'flex items-center gap-2',
              state === 'collapsed' ? 'justify-center' : ''
            )}
          >
            <Image
              src='/assets/logo.svg'
              alt='Hodory'
              width={state === 'expanded' ? 54 : 64}
              height={state === 'expanded' ? 54 : 64}
              className='shrink-0 rounded-lg bg-white p-0.5'
              priority
            />
            {state === 'expanded' ? (
              <span className='text-2xl font-semibold'>Hodory</span>
            ) : null}
          </Link>
        </div>
      </SidebarHeader>
      <SidebarContent className='overflow-x-hidden'>
        <SidebarGroup>
          <SidebarGroupLabel>Teaching</SidebarGroupLabel>
          <SidebarMenu>
            {filteredItems.map((item) => {
              const Icon = item.icon ? Icons[item.icon] : Icons.logo;
              return item?.items && item?.items?.length > 0 ? (
                <Collapsible
                  key={item.title}
                  asChild
                  defaultOpen={item.isActive}
                  className='group/collapsible'
                >
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton
                        tooltip={item.title}
                        isActive={pathname === item.url}
                      >
                        {item.icon && <Icon />}
                        <span>{item.title}</span>
                        <IconChevronRight className='ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90' />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        {item.items?.map((subItem) => (
                          <SidebarMenuSubItem key={subItem.title}>
                            <SidebarMenuSubButton
                              asChild
                              isActive={pathname === subItem.url}
                            >
                              <Link href={subItem.url}>
                                <span>{subItem.title}</span>
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        ))}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </SidebarMenuItem>
                </Collapsible>
              ) : (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    tooltip={item.title}
                    isActive={pathname === item.url}
                  >
                    <Link href={item.url}>
                      <Icon />
                      <span>{item.title}</span>
                      {item.badge ? (
                        <Badge
                          variant='secondary'
                          className='ml-auto h-5 rounded-full px-2 text-[11px]'
                        >
                          {item.badge}
                        </Badge>
                      ) : null}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size='lg'
                  className='data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground'
                >
                  <UserAvatarProfile
                    className='h-8 w-8 rounded-lg'
                    showInfo
                    user={avatarUser}
                  />
                  <IconChevronsDown className='ml-auto size-4' />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className='w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg'
                side='bottom'
                align='end'
                sideOffset={4}
              >
                <DropdownMenuLabel className='p-0 font-normal'>
                  <div className='px-1 py-1.5'>
                    <UserAvatarProfile
                      className='h-8 w-8 rounded-lg'
                      showInfo
                      user={avatarUser}
                    />
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />

                <DropdownMenuGroup>
                  <DropdownMenuItem
                    onClick={() => router.push('/dashboard/profile')}
                  >
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
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
