import { demoUser } from '@/constants/demo-user';
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

const teacherProfile = {
  fullName: demoUser.fullName,
  email: demoUser.emailAddresses[0].emailAddress,
  teacherId: 'TCH-2048',
  department: 'Computer Science',
  office: 'E8.6',
  phone: '+213 672 86 56 39'
};

const assignedModules = [
  { code: 'AABDD', name: 'Architecture and administration of databases' },
  { code: 'SOFENG', name: 'Software Engineering' },
  { code: 'COMPIL', name: 'Compilation' }
];

export default function ProfileViewPage() {
  return (
    <div className='flex w-full flex-col gap-6 p-4'>
      <Card>
        <CardHeader className='flex flex-row items-center gap-4'>
          <UserAvatarProfile
            className='h-14 w-14 rounded-xl'
            showInfo
            user={demoUser}
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
              <p className='text-sm font-medium'>{teacherProfile.fullName}</p>
            </div>
            <div>
              <p className='text-muted-foreground text-xs uppercase'>Teacher ID</p>
              <p className='text-sm font-medium'>{teacherProfile.teacherId}</p>
            </div>
            <div>
              <p className='text-muted-foreground text-xs uppercase'>Email</p>
              <p className='text-sm font-medium'>{teacherProfile.email}</p>
            </div>
            <div>
              <p className='text-muted-foreground text-xs uppercase'>
                Department
              </p>
              <p className='text-sm font-medium'>
                {teacherProfile.department}
              </p>
            </div>
            <div>
              <p className='text-muted-foreground text-xs uppercase'>Office</p>
              <p className='text-sm font-medium'>{teacherProfile.office}</p>
            </div>
            <div>
              <p className='text-muted-foreground text-xs uppercase'>Phone</p>
              <p className='text-sm font-medium'>{teacherProfile.phone}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Assigned modules</CardTitle>
            <CardDescription>Current teaching responsibilities.</CardDescription>
          </CardHeader>
          <CardContent className='flex flex-wrap gap-2'>
            {assignedModules.map((module) => (
              <Badge key={module.code} variant='secondary'>
                {module.code} - {module.name}
              </Badge>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Actions</CardTitle>
          <CardDescription>Account-level options.</CardDescription>
        </CardHeader>
        <CardContent className='flex flex-wrap gap-2'>
          <Button asChild variant='destructive'>
            <Link href='/auth/login'>Logout</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
