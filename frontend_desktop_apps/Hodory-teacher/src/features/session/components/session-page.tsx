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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { IconAlertTriangle } from '@tabler/icons-react';
import { useSessionState } from '@/features/session/session-context';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { useOverviewData } from '@/features/overview/components/overview-data-context';

export default function SessionSetupPage() {
  const { isActive, startSession } = useSessionState();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { modules, isLoading: isLoadingModules } = useOverviewData();
  const [selectedModuleId, setSelectedModuleId] = React.useState<string>('');
  const [room, setRoom] = React.useState('E1. TP4');

  React.useEffect(() => {
    const moduleId = searchParams.get('moduleId');
    const roomParam = searchParams.get('room');
    if (moduleId) setSelectedModuleId(moduleId);
    if (roomParam) setRoom(roomParam);
    // Only run once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    if (!selectedModuleId && modules[0]) {
      setSelectedModuleId(String(modules[0].module_id));
    }
  }, [modules, selectedModuleId]);

  const selectedModule = React.useMemo(() => {
    const id = Number(selectedModuleId);
    return modules.find((m) => m.module_id === id) ?? null;
  }, [modules, selectedModuleId]);

  const hasAssignedModules = modules.length > 0;
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
            Start an attendance session and display a QR code for students to scan.
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

      <div className='grid gap-6'>
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
              <AlertTitle>Session preview</AlertTitle>
              <AlertDescription>
                {(selectedModule?.module_code ?? '—')} - {room}
              </AlertDescription>
            </Alert>

            <div className='grid gap-4 md:grid-cols-2'>
              <div className='grid gap-2'>
                <Label htmlFor='module'>Module</Label>
                <Select
                  value={selectedModuleId}
                  onValueChange={setSelectedModuleId}
                  disabled={isLoadingModules || !hasAssignedModules}
                >
                  <SelectTrigger id='module'>
                    <SelectValue placeholder='Select module' />
                  </SelectTrigger>
                  <SelectContent>
                    {modules.map((module) => (
                      <SelectItem
                        key={module.module_id}
                        value={String(module.module_id)}
                      >
                        {module.module_code} - {module.module_name}
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
                disabled={!hasAssignedModules || isActive || !selectedModule}
                onClick={async () => {
                  if (!selectedModule) return;
                  try {
                    await startSession({
                      moduleId: selectedModule.module_id,
                      moduleCode: selectedModule.module_code,
                      moduleName: selectedModule.module_name,
                      room,
                      durationMinutes: 90
                    });
                    router.push('/dashboard/active-session');
                  } catch (error) {
                    toast.error(
                      error instanceof Error
                        ? error.message
                        : 'Failed to start session'
                    );
                  }
                }}
              >
                Start session
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

    </div>
  );
}
