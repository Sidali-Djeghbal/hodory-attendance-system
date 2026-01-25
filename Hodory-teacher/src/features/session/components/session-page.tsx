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
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { useAuth } from '@/features/auth/auth-context';
import { getMyModules, type TeacherModuleSummary } from '@/lib/teacher-api';

export default function SessionSetupPage() {
  const {
    isActive,
    startSession,
    hotspotPhase,
    hotspotStatus,
    hotspotError,
    startHotspot,
    stopHotspot,
    refreshHotspot
  } = useSessionState();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { token } = useAuth();
  const [mode, setMode] = React.useState('device');
  const [modules, setModules] = React.useState<TeacherModuleSummary[]>([]);
  const [selectedModuleId, setSelectedModuleId] = React.useState<string>('');
  const [room, setRoom] = React.useState('E1. TP4');
  const [isLoadingModules, setIsLoadingModules] = React.useState(false);
  const [wifiSsid, setWifiSsid] = React.useState('Hodory-AP');
  const [wifiSecurity, setWifiSecurity] =
    React.useState<'WPA' | 'WEP' | 'nopass'>('WPA');
  const [wifiPassword, setWifiPassword] = React.useState('AP-ATTEND');
  const [showWifiPassword, setShowWifiPassword] = React.useState(false);

  React.useEffect(() => {
    const moduleId = searchParams.get('moduleId');
    const roomParam = searchParams.get('room');
    if (moduleId) setSelectedModuleId(moduleId);
    if (roomParam) setRoom(roomParam);
    // Only run once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    if (!token) return;
    let mounted = true;
    setIsLoadingModules(true);
    getMyModules(token)
      .then((result) => {
        if (!mounted) return;
        const next = result.modules ?? [];
        setModules(next);
        if (!selectedModuleId && next[0]) {
          setSelectedModuleId(String(next[0].module_id));
        }
      })
      .catch((error) => {
        toast.error(error instanceof Error ? error.message : 'Failed to load modules');
      })
      .finally(() => setIsLoadingModules(false));
    return () => {
      mounted = false;
    };
  }, [token]);

  React.useEffect(() => {
    refreshHotspot().catch(() => null);
  }, [refreshHotspot]);

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
                      durationMinutes: 90,
                      wifiSsid,
                      wifiSecurity,
                      wifiPassword: wifiSecurity === 'nopass' ? '' : wifiPassword
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
                <Badge
                  variant={
                    hotspotPhase === 'active'
                      ? 'default'
                      : hotspotPhase === 'error'
                        ? 'destructive'
                        : 'secondary'
                  }
                >
                  {hotspotPhase === 'starting'
                    ? 'Starting…'
                    : hotspotPhase === 'active'
                      ? 'Running'
                      : hotspotPhase === 'inactive'
                        ? 'Stopped'
                        : hotspotPhase === 'error'
                          ? 'Error'
                          : 'Idle'}
                </Badge>
              </div>
              {hotspotStatus && 'error' in hotspotStatus ? (
                <p className='text-muted-foreground mt-3 text-xs'>
                  {hotspotError ??
                    hotspotStatus.error ??
                    'Hotspot controls are only available in the Electron build.'}
                </p>
              ) : (
                <p className='text-muted-foreground mt-3 text-xs'>
                  {hotspotStatus?.isHotspotActive
                    ? `Hotspot active on ${hotspotStatus.ifname}${
                        hotspotStatus.ipv4Address
                          ? ` · IP ${hotspotStatus.ipv4Address}`
                          : ''
                      }`
                    : 'Hotspot not active. It will start when the session starts (Electron).'}
                </p>
              )}
              <div className='mt-3 flex flex-wrap gap-2'>
                <Button
                  size='sm'
                  variant='outline'
                  onClick={() => {
                    refreshHotspot().catch(() => null);
                  }}
                >
                  Refresh
                </Button>
                <Button
                  size='sm'
                  variant='secondary'
                  onClick={() => {
                    startHotspot({
                      ssid: wifiSsid,
                      security: wifiSecurity,
                      password: wifiSecurity === 'nopass' ? undefined : wifiPassword
                    }).catch(() => null);
                  }}
                  disabled={hotspotPhase === 'starting'}
                >
                  Start AP
                </Button>
                <Button
                  size='sm'
                  variant='ghost'
                  onClick={() => {
                    stopHotspot().catch(() => null);
                  }}
                  disabled={hotspotPhase === 'starting'}
                >
                  Stop AP
                </Button>
              </div>
            </div>

            <div className='grid gap-4 rounded-xl border border-border/60 bg-background p-4'>
              <div className='grid gap-2'>
                <Label htmlFor='wifi-ssid'>WiFi SSID (hotspot name)</Label>
                <Input
                  id='wifi-ssid'
                  value={wifiSsid}
                  onChange={(event) => setWifiSsid(event.target.value)}
                  placeholder='Hodory-AP'
                />
              </div>

              <div className='grid gap-2'>
                <Label>Security</Label>
                <Select
                  value={wifiSecurity}
                  onValueChange={(value) =>
                    setWifiSecurity(value as 'WPA' | 'WEP' | 'nopass')
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='WPA'>WPA/WPA2</SelectItem>
                    <SelectItem value='WEP'>WEP</SelectItem>
                    <SelectItem value='nopass'>No password</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className='grid gap-2'>
                <Label htmlFor='wifi-password'>WiFi password</Label>
                <div className='flex gap-2'>
                  <Input
                    id='wifi-password'
                    type={showWifiPassword ? 'text' : 'password'}
                    value={wifiPassword}
                    onChange={(event) => setWifiPassword(event.target.value)}
                    placeholder='AP-ATTEND'
                    disabled={wifiSecurity === 'nopass'}
                  />
                  <Button
                    type='button'
                    size='icon'
                    variant='outline'
                    onClick={() => setShowWifiPassword((prev) => !prev)}
                    disabled={wifiSecurity === 'nopass'}
                  >
                    {showWifiPassword ? (
                      <IconEyeOff className='h-4 w-4' />
                    ) : (
                      <IconEye className='h-4 w-4' />
                    )}
                  </Button>
                </div>
                <p className='text-muted-foreground text-xs'>
                  These values are embedded in the session QR payload for the
                  student app to use later.
                </p>
              </div>
            </div>

            <Button
              className='w-full'
              variant='outline'
              disabled={!hasAssignedModules || isActive || !selectedModule}
              onClick={async () => {
                if (!selectedModule) return;
                try {
                  await startSession({
                    moduleId: selectedModule.module_id,
                    moduleCode: selectedModule.module_code,
                    moduleName: selectedModule.module_name,
                    room,
                    durationMinutes: 90,
                    wifiSsid,
                    wifiSecurity,
                    wifiPassword: wifiSecurity === 'nopass' ? '' : wifiPassword
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
