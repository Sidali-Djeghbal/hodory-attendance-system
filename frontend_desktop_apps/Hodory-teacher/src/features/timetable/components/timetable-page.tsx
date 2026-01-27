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
import * as React from 'react';
import { useOverviewData } from '@/features/overview/components/overview-data-context';

function toDayLabel(date: Date) {
  return new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(date);
}

function toTimeLabel(date: Date) {
  return new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function startOfWeekMonday(date: Date) {
  const d = new Date(date);
  const day = d.getDay(); // 0 Sun..6 Sat
  const diff = (day + 6) % 7; // Monday=0
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export default function TimetablePage() {
  const { modules, sessions, isLoading } = useOverviewData();

  const moduleIdByCode = React.useMemo(() => {
    const map = new Map<string, number>();
    for (const m of modules) map.set(m.module_code, m.module_id);
    return map;
  }, [modules]);

  const referenceDate = React.useMemo(() => {
    const latest = sessions
      .slice()
      .sort((a, b) => new Date(b.date_time).getTime() - new Date(a.date_time).getTime())[0];
    return latest ? new Date(latest.date_time) : new Date();
  }, [sessions]);

  const weekStart = React.useMemo(() => startOfWeekMonday(referenceDate), [referenceDate]);
  const weekDays = React.useMemo(
    // Show full week. Seed data creates sessions every 7 days, so limiting to Mon–Fri
    // can hide sessions that fall on weekends.
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  );

  const sessionsThisWeek = React.useMemo(() => {
    const start = weekStart.getTime();
    const end = addDays(weekStart, 7).getTime();
    return sessions.filter((s) => {
      const t = new Date(s.date_time).getTime();
      return t >= start && t < end;
    });
  }, [sessions, weekStart]);

  const weekSchedule = React.useMemo(() => {
    return weekDays.map((day) => {
      const slots = sessionsThisWeek
        .filter((s) => isSameDay(new Date(s.date_time), day))
        .map((s) => ({
          time: toTimeLabel(new Date(s.date_time)),
          moduleCode: s.module.code,
          room: s.room ?? s.module.room ?? '—',
          duration: `${s.duration_minutes} min`,
          moduleId: moduleIdByCode.get(s.module.code) ?? null
        }))
        .sort((a, b) => a.time.localeCompare(b.time));
      return { day: toDayLabel(day), slots };
    });
  }, [weekDays, sessionsThisWeek, moduleIdByCode]);

  const todaysClasses = React.useMemo(() => {
    const now = new Date();
    return sessions
      .filter((s) => isSameDay(new Date(s.date_time), now))
      .map((s) => ({
        time: toTimeLabel(new Date(s.date_time)),
        moduleCode: s.module.code,
        room: s.room ?? s.module.room ?? '—',
        duration: `${s.duration_minutes} min`,
        moduleId: moduleIdByCode.get(s.module.code) ?? null
      }))
      .sort((a, b) => a.time.localeCompare(b.time));
  }, [sessions, moduleIdByCode]);

  return (
    <div className='flex w-full flex-col gap-6 p-4'>
      <Card>
        <CardHeader>
          <CardTitle>Teaching timetable</CardTitle>
          <CardDescription>
            Based on sessions stored in the database (week of{' '}
            {new Intl.DateTimeFormat('en-US', {
              month: 'short',
              day: '2-digit',
              year: 'numeric'
            }).format(weekStart)}
            ).
          </CardDescription>
        </CardHeader>
      </Card>

      <div className='grid gap-6 lg:grid-cols-[1.2fr_0.8fr]'>
        <Card>
          <CardHeader>
            <CardTitle>Week view</CardTitle>
            <CardDescription>Sessions grouped by weekday.</CardDescription>
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
                    <p className='text-muted-foreground'>
                      {isLoading ? 'Loading…' : 'No sessions'}
                    </p>
                  ) : (
                    day.slots.map((slot) => (
                      <div
                        key={`${slot.moduleCode}-${slot.time}`}
                        className='rounded-lg border border-border/60 bg-background p-3'
                      >
                        <p className='font-medium'>
                          {slot.moduleCode} - {slot.room}
                        </p>
                        <p className='text-muted-foreground text-xs'>
                          {slot.time} - {slot.duration}
                        </p>
                        <Button asChild variant='outline' size='sm' className='mt-2'>
                          <Link
                            href={
                              slot.moduleId
                                ? `/dashboard/session?moduleId=${slot.moduleId}&room=${encodeURIComponent(
                                    slot.room
                                  )}`
                                : '/dashboard/session'
                            }
                          >
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
            {isLoading ? (
              <p className='text-muted-foreground text-sm'>Loading…</p>
            ) : todaysClasses.length === 0 ? (
              <p className='text-muted-foreground text-sm'>No sessions today.</p>
            ) : (
              todaysClasses.map((slot) => (
                <div
                  key={`${slot.moduleCode}-${slot.time}`}
                  className='rounded-xl border border-border/60 p-4'
                >
                  <p className='text-sm font-medium'>
                    {slot.moduleCode} - {slot.room}
                  </p>
                  <p className='text-muted-foreground text-xs'>
                    {slot.time} - {slot.duration}
                  </p>
                  <Button asChild variant='outline' size='sm' className='mt-2'>
                    <Link
                      href={
                        slot.moduleId
                          ? `/dashboard/session?moduleId=${slot.moduleId}&room=${encodeURIComponent(
                              slot.room
                            )}`
                          : '/dashboard/session'
                      }
                    >
                      Start session for this class
                    </Link>
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
