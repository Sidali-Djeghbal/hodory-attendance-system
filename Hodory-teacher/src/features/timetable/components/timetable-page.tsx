'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

const weekSchedule = [
  {
    day: 'Monday',
    slots: [
      { time: '09:30', module: 'AABDD', room: 'E1.2', duration: '90 min' }
    ]
  },
  {
    day: 'Tuesday',
    slots: [
      { time: '13:00', module: 'SOFENG', room: 'E5.15', duration: '90 min' }
    ]
  },
  {
    day: 'Wednesday',
    slots: []
  },
  {
    day: 'Thursday',
    slots: [
      { time: '11:00', module: 'COMPIL', room: 'E8.13', duration: '90 min' }
    ]
  },
  {
    day: 'Friday',
    slots: []
  }
];

const todaysClasses = [
  {
    time: '11:00',
    module: 'COMPIL',
    room: 'E8.13',
    duration: '90 min'
  }
];

export default function TimetablePage() {
  return (
    <div className='flex w-full flex-col gap-6 p-4'>
      <Card>
        <CardHeader>
          <CardTitle>Teaching timetable</CardTitle>
          <CardDescription>Weekly schedule and today&apos;s view.</CardDescription>
        </CardHeader>
      </Card>

      <div className='grid gap-6 lg:grid-cols-[1.2fr_0.8fr]'>
        <Card>
          <CardHeader>
            <CardTitle>Week view</CardTitle>
            <CardDescription>Plan the full week at a glance.</CardDescription>
          </CardHeader>
          <CardContent className='grid gap-4 md:grid-cols-2 xl:grid-cols-3'>
            {weekSchedule.map((day) => (
              <div
                key={day.day}
                className='rounded-xl border border-border/60 bg-muted/30 p-4'
              >
                <div className='flex items-center justify-between'>
                  <p className='text-sm font-medium'>{day.day}</p>
                  <Badge variant='secondary'>{day.slots.length}</Badge>
                </div>
                <div className='mt-3 grid gap-3 text-sm'>
                  {day.slots.length === 0 ? (
                    <p className='text-muted-foreground'>No sessions</p>
                  ) : (
                    day.slots.map((slot) => (
                      <div
                        key={`${slot.module}-${slot.time}`}
                        className='rounded-lg border border-border/60 bg-background p-3'
                      >
                        <p className='font-medium'>
                          {slot.module} - {slot.room}
                        </p>
                        <p className='text-muted-foreground text-xs'>
                          {slot.time} - {slot.duration}
                        </p>
                        <Button asChild variant='outline' size='sm' className='mt-2'>
                          <Link href='/dashboard/session'>
                            Start session for this class
                          </Link>
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Today</CardTitle>
            <CardDescription>Quick list view.</CardDescription>
          </CardHeader>
          <CardContent className='grid gap-3'>
            {todaysClasses.map((slot) => (
              <div
                key={`${slot.module}-${slot.time}`}
                className='rounded-xl border border-border/60 p-4'
              >
                <p className='text-sm font-medium'>
                  {slot.module} - {slot.room}
                </p>
                <p className='text-muted-foreground text-xs'>
                  {slot.time} - {slot.duration}
                </p>
                <Button asChild variant='outline' size='sm' className='mt-2'>
                  <Link href='/dashboard/session'>
                    Start session for this class
                  </Link>
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
