'use client';

import * as React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { IconAlertTriangle, IconEye, IconEyeOff } from '@tabler/icons-react';
import { useSessionState } from '@/features/session/session-context';
import { useRouter } from 'next/navigation';

const modules = [
  { code: 'AABDD', name: 'Architecture and administration of databases' },
  { code: 'SOFENG', name: 'Software Engineering' },
  { code: 'COMPIL', name: 'Compilation' }
];

const timetableContext = {
  module: 'COMPIL',
  room: 'E1. TP4',
  date: 'Oct 08, 2024',
  time: '11:00 - 12:30'
};

export default function SessionSetupPage() {
  const { isActive, startSession } = useSessionState();
  const router = useRouter();
  const [showPassword, setShowPassword] = React.useState(false);
  const [mode, setMode] = React.useState('device');
  const [selectedModule, setSelectedModule] = React.useState('COMPIL');
  const [room, setRoom] = React.useState('E1. TP4');

  const hasAssignedModules = true;
  const upcomingDates = React.useMemo(() => {
    const dates: { label: string; value: string; disabled?: boolean }[] = [];
    const formatter = new Intl.DateTimeFormat('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });

    for (let i = 0; i < 7; i += 1) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      const isFriday = date.getDay() === 5;
      dates.push({
        label: formatter.format(date),
        value: date.toISOString().split('T')[0],
        disabled: isFriday
      });
    }

    return dates;
  }, []);
  const defaultDate =
    upcomingDates.find((date) => !date.disabled)?.value ??
    upcomingDates[0]?.value ??
    '';

  return (
    <div className='flex w-full flex-col gap-6 p-4'>
      <Card>
        <CardHeader>
          <CardTitle>Create session</CardTitle>
          <CardDescription>
            Start an attendance session, generate a code, and launch the QR/AP
            flow.
          </CardDescription>
        </CardHeader>
      </Card>

      {!hasAssignedModules ? (
        <Alert>
          <IconAlertTriangle />
          <AlertTitle>No modules assigned</AlertTitle>
          <AlertDescription>
            You are not assigned to any modules. Please contact the
            administrator.
          </AlertDescription>
        </Alert>
      ) : null}

      <div className='grid gap-6 lg:grid-cols-[1.2fr_0.8fr]'>
        <Card>
          <CardHeader>
            <CardTitle>Session details</CardTitle>
            <CardDescription>
              Confirm timetable context or adjust session fields.
            </CardDescription>
          </CardHeader>
          <CardContent className='grid gap-4'>
            <Alert>
              <IconAlertTriangle />
              <AlertTitle>Timetable context</AlertTitle>
              <AlertDescription>
                {selectedModule} - {room} - {timetableContext.date} -{' '}
                {timetableContext.time}
              </AlertDescription>
            </Alert>

            <div className='grid gap-4 md:grid-cols-2'>
              <div className='grid gap-2'>
                <Label htmlFor='module'>Module</Label>
                <Select
                  value={selectedModule}
                  onValueChange={setSelectedModule}
                >
                  <SelectTrigger id='module'>
                    <SelectValue placeholder='Select module' />
                  </SelectTrigger>
                  <SelectContent>
                    {modules.map((module) => (
                      <SelectItem key={module.code} value={module.code}>
                        {module.code} - {module.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className='grid gap-2'>
                <Label htmlFor='session-date'>Date</Label>
                <Select defaultValue={defaultDate}>
                  <SelectTrigger id='session-date'>
                    <SelectValue placeholder='Select date' />
                  </SelectTrigger>
                  <SelectContent>
                    {upcomingDates.map((date) => (
                      <SelectItem
                        key={date.value}
                        value={date.value}
                        disabled={date.disabled}
                      >
                        {date.label}
                        {date.disabled}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className='grid gap-2'>
                <Label htmlFor='session-time'>Start time</Label>
                <Select defaultValue='11:00'>
                  <SelectTrigger id='session-time'>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='11:00'>11:00</SelectItem>
                  </SelectContent>
                </Select>
                <p className='text-muted-foreground text-xs'>
                  Session duration: 1h 30m.
                </p>
              </div>
              <div className='grid gap-2'>
                <Label htmlFor='room'>Room</Label>
                <Input
                  id='room'
                  value={room}
                  onChange={(event) => setRoom(event.target.value)}
                />
              </div>
            </div>

            <div className='border-border/60 bg-muted/30 flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4'>
              <div>
                <p className='text-sm font-medium'>What happens next</p>
                <p className='text-muted-foreground text-xs'>
                  Create session record, generate code, mark default absences,
                  and open the active session view.
                </p>
              </div>
              <Button
                disabled={!hasAssignedModules || isActive}
                onClick={() => {
                  startSession({ module: selectedModule, room });
                  router.push('/dashboard/active-session');
                }}
              >
                Start session
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>AP setup</CardTitle>
            <CardDescription>
              Choose how students connect and monitor the live AP.
            </CardDescription>
          </CardHeader>
          <CardContent className='grid gap-4'>
            <div className='grid gap-2'>
              <Label>Mode</Label>
              <RadioGroup value={mode} onValueChange={setMode}>
                <div className='border-border/60 flex items-center gap-3 rounded-lg border p-3'>
                  <RadioGroupItem value='device' id='mode-device' />
                  <Label htmlFor='mode-device'>Use my device as AP</Label>
                </div>
                <div className='border-border/60 flex items-center gap-3 rounded-lg border p-3 opacity-60'>
                  <RadioGroupItem
                    value='external'
                    id='mode-external'
                    disabled
                  />
                  <Label htmlFor='mode-external'>
                    Use external AP (coming soon)
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div className='border-border/60 bg-muted/30 rounded-xl border p-4'>
              <div className='flex items-center justify-between'>
                <p className='text-sm font-medium'>AP Status</p>
                <Badge className='bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/20 dark:text-emerald-400'>
                  AP Ready
                </Badge>
              </div>
              <div className='mt-4 grid gap-3 text-sm'>
                <div className='flex items-center justify-between'>
                  <span className='text-muted-foreground'>SSID</span>
                  <span className='font-medium'>Hodory-AP</span>
                </div>
                <div className='flex items-center justify-between'>
                  <span className='text-muted-foreground'>Password</span>
                  <span className='font-medium'>
                    {showPassword ? 'AP-ATTEND' : '********'}
                  </span>
                  <Button
                    size='icon'
                    variant='ghost'
                    className='h-8 w-8'
                    onClick={() => setShowPassword((prev) => !prev)}
                  >
                    {showPassword ? (
                      <IconEyeOff className='h-4 w-4' />
                    ) : (
                      <IconEye className='h-4 w-4' />
                    )}
                  </Button>
                </div>
                <div className='flex items-center justify-between'>
                  <span className='text-muted-foreground'>Connected</span>
                  <span className='font-medium'>18 devices</span>
                </div>
              </div>
            </div>

            <Button
              className='w-full'
              variant='outline'
              disabled={!hasAssignedModules || isActive}
              onClick={() => {
                startSession({ module: selectedModule, room });
                router.push('/dashboard/active-session');
              }}
            >
              Start session
            </Button>
            <p className='text-muted-foreground text-xs'>
              After starting, you will be redirected to the active session
              projection view.
            </p>
          </CardContent>
        </Card>
      </div>

    </div>
  );
}
