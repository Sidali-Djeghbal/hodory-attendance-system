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

const liveStats = {
  present: 18,
  absent: 11,
  connected: 24
};

const presentStudents = [
  { name: 'Ayoub N.', time: '11:02' },
  { name: 'Lina R.', time: '11:04' },
  { name: 'Mehdi K.', time: '11:06' },
  { name: 'Sara B.', time: '11:08' }
];

const liveEvents = [
  { message: 'Student marked successfully: Ayoub N.' }
];

export default function ActiveSessionPage() {
  const [isEndOpen, setIsEndOpen] = React.useState(false);
  const [isProjectOpen, setIsProjectOpen] = React.useState(false);
  const { isActive, module, room, code, remainingSeconds, stopSession } =
    useSessionState();
  const router = useRouter();

  React.useEffect(() => {
    if (!isActive) {
      router.push('/dashboard/session');
    }
  }, [isActive, router]);

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
              <div className='text-2xl font-semibold'>
                {formatCountdown(remainingSeconds)} remaining
              </div>
            </div>
            <div className='flex items-center justify-center rounded-2xl border border-dashed border-border/60 bg-white p-4'>
              <QrCodePreview className='h-72 w-72' />
            </div>
            <div className='flex flex-wrap justify-center gap-2'>
              <Button
                variant='outline'
                onClick={() => setIsProjectOpen(true)}
                disabled={!isActive}
              >
                Project Mode
              </Button>
              <Button variant='secondary' disabled={!isActive}>
                Copy code
              </Button>
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
                <p className='text-xs text-muted-foreground'>Connected</p>
                <p className='text-lg font-semibold'>
                  {isActive ? liveStats.connected : 0}
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
                stopSession();
                setIsEndOpen(false);
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
              <QrCodePreview className='h-[70vh] w-[70vh] max-h-[760px] max-w-[760px]' />
            </div>
            <div className='grid gap-4'>
              <div className='rounded-xl border border-border/60 bg-muted/30 p-4 text-center'>
                <p className='text-sm text-muted-foreground'>Session code</p>
                <p className='text-3xl font-semibold tracking-widest'>
                  {code}
                </p>
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
