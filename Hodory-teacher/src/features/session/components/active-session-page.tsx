'use client';

import * as React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
	} from '@/components/ui/table';
	import { QrCodePreview } from './qr-code-preview';
	import { useSessionState } from '@/features/session/session-context';
	import { useRouter } from 'next/navigation';
import { useAuth } from '@/features/auth/auth-context';
import { getSessionAttendance, type SessionAttendanceResponse } from '@/lib/teacher-api';
import { encodeQrPayload, type HodoryQrPayloadV1 } from '@/lib/qr-payload';
import { resolveAdvertisedApiBaseUrl } from '@/lib/electron-hotspot';

function formatClock(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}

export default function ActiveSessionPage() {
  const [isEndOpen, setIsEndOpen] = React.useState(false);
  const [isProjectOpen, setIsProjectOpen] = React.useState(false);
  const { token } = useAuth();
  const {
    isActive,
    module,
    room,
    code,
    remainingSeconds,
    stopSession,
    sessionId,
    startedAt,
    durationMinutes,
    wifiSsid,
    wifiPassword,
    wifiSecurity,
    hotspotPhase,
    hotspotStatus,
    hotspotError,
    startHotspot,
    stopHotspot,
    refreshHotspot
  } = useSessionState();
  const router = useRouter();
  const [attendance, setAttendance] = React.useState<SessionAttendanceResponse | null>(null);
  const [loadError, setLoadError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!isActive) {
      router.push('/dashboard/session');
    }
  }, [isActive, router]);

  React.useEffect(() => {
    if (!token || !sessionId || !isActive) return;
    let cancelled = false;

    const load = async () => {
      try {
        const next = await getSessionAttendance(token, sessionId);
        if (cancelled) return;
        setAttendance(next);
        setLoadError(null);
      } catch (error) {
        if (cancelled) return;
        setLoadError(error instanceof Error ? error.message : 'Failed to load attendance');
      }
    };

    load();
    const interval = setInterval(load, 5000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [token, sessionId, isActive]);

  React.useEffect(() => {
    if (!isActive) return;
    let cancelled = false;
    const tick = async () => {
      try {
        await refreshHotspot();
      } catch {
        // Ignore.
      }
    };
    tick().catch(() => null);
    const interval = setInterval(() => {
      if (cancelled) return;
      tick().catch(() => null);
    }, 5000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [isActive, refreshHotspot]);

  const hotspotIpv4 = React.useMemo(() => {
    if (!hotspotStatus || 'error' in hotspotStatus) return null;
    return hotspotStatus.ipv4Address ?? null;
  }, [hotspotStatus]);

  const presentStudents = React.useMemo(() => {
    const rows = attendance?.students ?? [];
    return rows
      .filter((row) => String(row.status).toUpperCase() === 'PRESENT')
      .map((row) => ({
        name: row.student?.full_name ?? `Student #${row.attendance_id}`,
        time: formatClock(row.marked_at)
      }));
  }, [attendance]);

  const liveStats = React.useMemo(() => {
    const stats = attendance?.statistics;
    return {
      present: stats?.present ?? 0,
      absent: stats?.absent ?? 0,
      total: stats?.total ?? 0
    };
  }, [attendance]);

  const liveEvents = React.useMemo(() => {
    if (loadError) return [{ message: `Last refresh failed: ${loadError}` }];
    return [{ message: 'Live updates refresh every 5 seconds.' }];
  }, [loadError]);

  const qrValue = React.useMemo(() => {
    const payload: HodoryQrPayloadV1 = {
      v: 1,
      type: 'hodory.attendance.session',
      session: {
        id: sessionId ?? -1,
        code,
        moduleCode: module,
        room,
        startedAt,
        durationMinutes
      },
      network: wifiSsid
        ? {
            ssid: wifiSsid,
            password: wifiSecurity === 'nopass' ? undefined : wifiPassword,
            security: wifiSecurity
          }
        : undefined,
      apiBaseUrl: resolveAdvertisedApiBaseUrl({
        configured: process.env.NEXT_PUBLIC_API_URL,
        hotspotIpv4
      })
    };

    return encodeQrPayload(payload);
  }, [
    sessionId,
    code,
    module,
    room,
    startedAt,
    durationMinutes,
    wifiSsid,
    wifiPassword,
    wifiSecurity,
    hotspotIpv4
  ]);

  const formatCountdown = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const downloadFile = (filename: string, content: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportCurrentList = () => {
    const rows = [
      ['Student', 'Time'],
      ...presentStudents.map((student) => [student.name, student.time])
    ];
    const csv = rows.map((row) => row.join(',')).join('\n');
    downloadFile(`session-${code}-present.csv`, csv, 'text/csv');
  };

  return (
    <div className='flex w-full flex-col gap-6 p-4'>
      <Card>
        <CardHeader>
          <CardTitle>Active session</CardTitle>
          <CardDescription>
            Projection view and live attendance monitoring.
          </CardDescription>
        </CardHeader>
      </Card>

      <div className='grid gap-6 lg:grid-cols-[1.1fr_0.9fr]'>
        <Card className='overflow-hidden'>
          <CardHeader>
            <CardTitle>Projection panel</CardTitle>
            <CardDescription>Display this to students.</CardDescription>
          </CardHeader>
          <CardContent className='grid gap-6'>
            <div className='grid gap-4 rounded-xl border border-border/60 bg-muted/30 p-4 text-center'>
              <div className='flex items-center justify-between text-xs text-muted-foreground'>
                <span>{module}</span>
                {isActive ? (
                  <Badge className='bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/20 dark:text-emerald-400'>
                    Active
                  </Badge>
                ) : (
                  <Badge variant='secondary'>Stopped</Badge>
                )}
              </div>
              <div className='text-3xl font-semibold tracking-widest'>
                {code}
              </div>
              <div className='text-sm text-muted-foreground'>Room {room}</div>
              {wifiSsid ? (
                <div className='text-xs text-muted-foreground'>
                  WiFi: <span className='text-foreground font-medium'>{wifiSsid}</span>
                  {wifiSecurity !== 'nopass' ? (
                    <>
                      {' '}
                      · Password:{' '}
                      <span className='text-foreground font-medium'>
                        {wifiPassword || '—'}
                      </span>
                    </>
                  ) : (
                    <> · Open network</>
                  )}
                </div>
              ) : null}
              <div className='text-2xl font-semibold'>
                {formatCountdown(remainingSeconds)} remaining
              </div>
            </div>
            <div className='flex items-center justify-center rounded-2xl border border-dashed border-border/60 bg-white p-4'>
              <QrCodePreview className='h-72 w-72' value={qrValue} />
            </div>
            <div className='flex flex-wrap justify-center gap-2'>
              <Button
                variant='outline'
                onClick={() => setIsProjectOpen(true)}
                disabled={!isActive}
              >
                Project Mode
              </Button>
              <Button
                variant='secondary'
                disabled={!isActive}
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(code);
                  } catch {
                    // Ignore.
                  }
                }}
              >
                Copy code
              </Button>
            </div>
            <div className='rounded-lg border border-border/60 bg-muted/30 p-3 text-sm'>
              <div className='flex flex-wrap items-center justify-between gap-2'>
                <span className='text-muted-foreground'>Hotspot</span>
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
              {hotspotError ? (
                <p className='mt-2 text-xs text-muted-foreground'>
                  {hotspotError}
                </p>
              ) : hotspotIpv4 ? (
                <p className='mt-2 text-xs text-muted-foreground'>
                  Students should reach the backend at{' '}
                  <span className='font-medium text-foreground'>
                    http://{hotspotIpv4}:8000
                  </span>{' '}
                  (backend must listen on 0.0.0.0).
                </p>
              ) : null}
              <div className='mt-3 flex flex-wrap gap-2'>
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
                  variant='outline'
                  onClick={() => {
                    stopHotspot().catch(() => null);
                  }}
                  disabled={hotspotPhase === 'starting'}
                >
                  Stop AP
                </Button>
              </div>
            </div>
            {!isActive ? (
              <div className='rounded-lg border border-border/60 bg-muted/30 p-3 text-center text-sm text-muted-foreground'>
                Session stopped. Projection and live controls are disabled.
              </div>
            ) : null}
          </CardContent>
        </Card>

        <div className='grid gap-6'>
          <Card>
            <CardHeader>
              <CardTitle>Live status</CardTitle>
              <CardDescription>Real-time attendance counters.</CardDescription>
            </CardHeader>
            <CardContent className='grid gap-4 md:grid-cols-3'>
              <div className='rounded-lg border border-border/60 p-3'>
                <p className='text-xs text-muted-foreground'>Present</p>
                <p className='text-lg font-semibold'>
                  {isActive ? liveStats.present : 0}
                </p>
              </div>
              <div className='rounded-lg border border-border/60 p-3'>
                <p className='text-xs text-muted-foreground'>
                  Absent (unmarked)
                </p>
                <p className='text-lg font-semibold'>
                  {isActive ? liveStats.absent : 0}
                </p>
              </div>
              <div className='rounded-lg border border-border/60 p-3'>
                <p className='text-xs text-muted-foreground'>Total</p>
                <p className='text-lg font-semibold'>
                  {isActive ? liveStats.total : 0}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Marked present</CardTitle>
              <CardDescription>Students who checked in.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isActive ? (
                    presentStudents.map((student) => (
                      <TableRow key={student.name}>
                        <TableCell className='font-medium'>
                          {student.name}
                        </TableCell>
                        <TableCell>{student.time}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        className='text-muted-foreground'
                        colSpan={2}
                      >
                        Session stopped.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Live events</CardTitle>
              <CardDescription>Recent session activity.</CardDescription>
            </CardHeader>
            <CardContent className='grid gap-2 text-sm'>
              {isActive ? (
                liveEvents.map((event) => (
                  <div
                    key={event.message}
                    className='rounded-lg border border-border/60 bg-muted/30 p-3'
                  >
                    <span className='text-muted-foreground'>
                      {event.message}
                    </span>
                  </div>
                ))
              ) : (
                <div className='rounded-lg border border-border/60 bg-muted/30 p-3 text-muted-foreground'>
                  No live events. Session stopped.
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Controls</CardTitle>
              <CardDescription>Session management actions.</CardDescription>
            </CardHeader>
            <CardContent className='flex flex-wrap gap-2'>
            <Button
              variant='destructive'
              onClick={() => setIsEndOpen(true)}
              disabled={!isActive}
            >
              End session
            </Button>
              <Button
                variant='outline'
                disabled={!isActive}
                onClick={exportCurrentList}
              >
                Export current list
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={isEndOpen} onOpenChange={setIsEndOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>End this session?</DialogTitle>
            <DialogDescription>
              Attendance will be finalized and the session will move to summary.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className='gap-2'>
            <Button variant='outline' onClick={() => setIsEndOpen(false)}>
              Cancel
            </Button>
            <Button
              variant='destructive'
              onClick={() => {
                stopSession()
                  .catch(() => null)
                  .finally(() => {
                    setIsEndOpen(false);
                    router.push('/dashboard/session');
                  });
              }}
            >
              Stop session
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isProjectOpen} onOpenChange={setIsProjectOpen}>
        <DialogContent className='h-[90vh] w-[90vw] max-w-none'>
          <DialogHeader>
            <DialogTitle>Project mode</DialogTitle>
            <DialogDescription>
              Large display for classroom projection.
            </DialogDescription>
          </DialogHeader>
          <div className='grid h-full gap-6 md:grid-cols-[1.5fr_0.5fr]'>
            <div className='flex items-center justify-center rounded-2xl border border-dashed border-border/60 p-6'>
              <QrCodePreview
                className='h-[70vh] w-[70vh] max-h-[760px] max-w-[760px]'
                value={qrValue}
              />
            </div>
            <div className='grid gap-4'>
              <div className='rounded-xl border border-border/60 bg-muted/30 p-4 text-center'>
                <p className='text-sm text-muted-foreground'>Session code</p>
                <p className='text-3xl font-semibold tracking-widest'>
                  {code}
                </p>
                {wifiSsid ? (
                  <p className='mt-2 text-xs text-muted-foreground'>
                    WiFi: <span className='text-foreground font-medium'>{wifiSsid}</span>
                    {wifiSecurity !== 'nopass' ? (
                      <>
                        {' '}
                        · Password:{' '}
                        <span className='text-foreground font-medium'>
                          {wifiPassword || '—'}
                        </span>
                      </>
                    ) : (
                      <> · Open network</>
                    )}
                  </p>
                ) : null}
              </div>
              <div className='rounded-xl border border-border/60 bg-muted/30 p-4'>
                <p className='text-sm font-medium'>{module}</p>
                <p className='text-muted-foreground text-sm'>
                  Room {room}
                </p>
                <p className='mt-3 text-lg font-semibold'>
                  {formatCountdown(remainingSeconds)} remaining
                </p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant='outline' onClick={() => setIsProjectOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
