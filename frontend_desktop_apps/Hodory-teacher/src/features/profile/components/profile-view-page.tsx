'use client';

import * as React from 'react';
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
import { useAuth } from '@/features/auth/auth-context';
import { toAvatarUser } from '@/features/auth/avatar-user';
import { useOverviewData } from '@/features/overview/components/overview-data-context';
import { getTeacherProfile, type TeacherModuleSummary, type TeacherProfile } from '@/lib/teacher-api';

export default function ProfileViewPage() {
  const { token, user, logout } = useAuth();
  const overview = useOverviewData();
  const avatarUser = toAvatarUser(user);
  const [profile, setProfile] = React.useState<TeacherProfile | null>(null);
  const [modules, setModules] = React.useState<TeacherModuleSummary[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!token) return;
    let mounted = true;
    setLoading(true);
    getTeacherProfile(token)
      .then((p) => {
        if (!mounted) return;
        setProfile(p);
        setModules(overview.modules ?? []);
      })
      .catch(() => {
        // If token is invalid, force logout.
        logout();
      })
      .finally(() => setLoading(false));

    return () => {
      mounted = false;
    };
  }, [token, logout, overview.modules]);

  return (
    <div className='flex w-full flex-col gap-6 p-4'>
      <Card>
        <CardHeader className='flex flex-row items-center gap-4'>
          <UserAvatarProfile
            className='h-14 w-14 rounded-xl'
            showInfo
            user={avatarUser}
          />
          <div>
            <CardTitle>Personal information</CardTitle>
            <CardDescription>
              Teacher profile details and assigned modules.
            </CardDescription>
          </div>
        </CardHeader>
      </Card>

      <div className='grid gap-6 lg:grid-cols-[1.1fr_0.9fr]'>
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>Core teacher information.</CardDescription>
          </CardHeader>
          <CardContent className='grid gap-4 md:grid-cols-2'>
            <div>
              <p className='text-muted-foreground text-xs uppercase'>
                Full name
              </p>
              <p className='text-sm font-medium'>
                {loading ? 'Loading…' : (profile?.full_name ?? avatarUser?.fullName ?? '—')}
              </p>
            </div>
            <div>
              <p className='text-muted-foreground text-xs uppercase'>Teacher ID</p>
              <p className='text-sm font-medium'>
                {loading ? '—' : String(profile?.teacher_id ?? '—')}
              </p>
            </div>
            <div>
              <p className='text-muted-foreground text-xs uppercase'>Email</p>
              <p className='text-sm font-medium'>
                {loading ? '—' : (profile?.email ?? avatarUser?.emailAddresses[0]?.emailAddress ?? '—')}
              </p>
            </div>
            <div>
              <p className='text-muted-foreground text-xs uppercase'>
                Department
              </p>
              <p className='text-sm font-medium'>
                {loading ? '—' : (profile?.department ?? user?.department ?? '—')}
              </p>
            </div>
            <div>
              <p className='text-muted-foreground text-xs uppercase'>Office</p>
              <p className='text-sm font-medium'>—</p>
            </div>
            <div>
              <p className='text-muted-foreground text-xs uppercase'>Phone</p>
              <p className='text-sm font-medium'>—</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Assigned modules</CardTitle>
            <CardDescription>Current teaching responsibilities.</CardDescription>
          </CardHeader>
          <CardContent className='flex flex-wrap gap-2'>
            {loading ? (
              <Badge variant='secondary'>Loading…</Badge>
            ) : modules.length ? (
              modules.map((module) => (
                <Badge key={module.teacher_module_id} variant='secondary'>
                  {module.module_code} - {module.module_name}
                </Badge>
              ))
            ) : (
              <Badge variant='secondary'>No assigned modules</Badge>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Actions</CardTitle>
          <CardDescription>Account-level options.</CardDescription>
        </CardHeader>
        <CardContent className='flex flex-wrap gap-2'>
          <Button
            variant='destructive'
            onClick={() => {
              logout();
            }}
          >
            Logout
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
