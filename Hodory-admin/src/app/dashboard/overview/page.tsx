'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';

import PageContainer from '@/components/layout/page-container';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { DataTable, type DataTableColumn } from '@/components/data-table/data-table';
import { useAdminStore, type AbsenceType } from '@/features/admin/store/admin-store';
import { resolveDateRange, type DateRangePreset } from '@/features/admin/filters/date-range';

type ModuleSummaryRow = {
  moduleCode: string;
  moduleName: string;
  teachers: string;
  sessionsCount: number;
  avgAttendance: number;
  excludedCount: number;
};

const ABSENCE_COLORS: Record<AbsenceType, string> = {
  justified: 'var(--color-chart-2)',
  unjustified: 'var(--color-chart-5)',
  pending: 'var(--color-chart-3)'
};

function toDateKey(iso: string) {
  return iso.slice(0, 10);
}

function clampPercent(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, value));
}

function formatIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

export default function AttendanceMonitoringDashboardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { store } = useAdminStore();

  const preset = (searchParams.get('range') as DateRangePreset | null) ?? 'month';
  const from = searchParams.get('from') ?? undefined;
  const to = searchParams.get('to') ?? undefined;
  const { start, end, label: rangeLabel } = React.useMemo(
    () => resolveDateRange({ preset, from, to }),
    [preset, from, to]
  );

  const semester = 'all';
  const moduleFilter = 'all';
  const [absenceFilter, setAbsenceFilter] = React.useState<AbsenceType | 'all'>('all');

  const [isLoading, setIsLoading] = React.useState(true);
  const [timeoutWarning, setTimeoutWarning] = React.useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = React.useState<Date>(() => new Date());

  React.useEffect(() => {
    setIsLoading(true);
    setTimeoutWarning(false);
    const warning = window.setTimeout(() => setTimeoutWarning(true), 2500);
    const timer = window.setTimeout(() => {
      setIsLoading(false);
      setLastUpdatedAt(new Date());
    }, 450);
    return () => {
      window.clearTimeout(timer);
      window.clearTimeout(warning);
    };
  }, [preset, from, to, absenceFilter]);

  React.useEffect(() => {
    const interval = window.setInterval(() => setLastUpdatedAt(new Date()), 30000);
    return () => window.clearInterval(interval);
  }, []);

  const teacherNameById = React.useMemo(() => {
    const map = new Map(store.teachers.map((t) => [t.teacherId, t.fullName] as const));
    return map;
  }, [store.teachers]);

  const teachersByModule = React.useMemo(() => {
    const map = new Map<string, string[]>();
    for (const assignment of store.assignments) {
      const list = map.get(assignment.moduleCode) ?? [];
      const teacherName = teacherNameById.get(assignment.teacherId) ?? assignment.teacherId;
      list.push(teacherName);
      map.set(assignment.moduleCode, list);
    }
    return map;
  }, [store.assignments, teacherNameById]);

  const filteredModules = React.useMemo(() => {
    return store.modules.filter((m) => {
      if (semester !== 'all' && (m.semester ?? 'all') !== semester) return false;
      if (moduleFilter !== 'all' && m.code !== moduleFilter) return false;
      return true;
    });
  }, [store.modules, semester, moduleFilter]);

  const moduleCodes = React.useMemo(() => filteredModules.map((m) => m.code), [filteredModules]);

  const sessionsInRange = React.useMemo(() => {
    const startMs = start.getTime();
    const endMs = end.getTime();
    return store.sessions.filter((s) => {
      if (!moduleCodes.includes(s.moduleCode)) return false;
      const ms = new Date(s.startAt).getTime();
      return ms >= startMs && ms <= endMs;
    });
  }, [store.sessions, start, end, moduleCodes]);

  const activeSessionsToday = React.useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return store.sessions.filter((s) => s.status === 'active' && toDateKey(s.startAt) === today);
  }, [store.sessions]);

  const liveSessionsCount = activeSessionsToday.length;
  const sessionsToday = React.useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return store.sessions.filter((s) => toDateKey(s.startAt) === today);
  }, [store.sessions]);
  const todayAttendanceRate = React.useMemo(() => {
    const totals = sessionsToday.reduce(
      (acc, s) => {
        acc.expected += s.expectedCount;
        acc.present += s.presentCount;
        return acc;
      },
      { expected: 0, present: 0 }
    );
    return totals.expected ? (totals.present / totals.expected) * 100 : 0;
  }, [sessionsToday]);

  const totalStudents = React.useMemo(
    () => store.students.filter((s) => s.status === 'active').length,
    [store.students]
  );

  const totalTeachers = React.useMemo(
    () => store.teachers.filter((t) => t.status === 'active').length,
    [store.teachers]
  );

  const overallAttendanceRate = React.useMemo(() => {
    const totals = sessionsInRange.reduce(
      (acc, s) => {
        acc.expected += s.expectedCount;
        acc.present += s.presentCount;
        return acc;
      },
      { expected: 0, present: 0 }
    );
    return totals.expected ? (totals.present / totals.expected) * 100 : 0;
  }, [sessionsInRange]);

  const absenceBreakdown = React.useMemo(() => {
    const breakdown = { justified: 0, unjustified: 0, pending: 0 } as Record<AbsenceType, number>;
    for (const session of sessionsInRange) {
      for (const absence of session.absences) breakdown[absence.type] += 1;
    }
    return breakdown;
  }, [sessionsInRange]);

  const excludedStudents = React.useMemo(() => {
    const stats = new Map<string, { justified: number; unjustified: number; pending: number; lastDate?: string }>();
    const sorted = sessionsInRange.slice().sort((a, b) => a.startAt.localeCompare(b.startAt));
    for (const session of sorted) {
      for (const absence of session.absences) {
        const key = `${absence.studentId}|${session.moduleCode}`;
        const current = stats.get(key) ?? { justified: 0, unjustified: 0, pending: 0 };
        current[absence.type] += 1;
        current.lastDate = toDateKey(session.startAt);
        stats.set(key, current);
      }
    }

    const rows: Array<{
      studentId: string;
      moduleCode: string;
      totalAbsences: number;
      justified: number;
      unjustified: number;
      pending: number;
      exclusionDate: string;
    }> = [];

    for (const [key, value] of Array.from(stats.entries())) {
      const [studentId, moduleCode] = key.split('|');
      if (!studentId || !moduleCode) continue;
      const excluded =
        value.unjustified >= 3 || value.justified >= 5;
      if (!excluded) continue;
      rows.push({
        studentId,
        moduleCode,
        totalAbsences: value.justified + value.unjustified + value.pending,
        justified: value.justified,
        unjustified: value.unjustified,
        pending: value.pending,
        exclusionDate: value.lastDate ?? '—'
      });
    }
    return rows;
  }, [sessionsInRange]);

  const modulesSummary = React.useMemo(() => {
    const byModule = new Map<string, { expected: number; present: number; sessions: number }>();
    for (const session of sessionsInRange) {
      const current = byModule.get(session.moduleCode) ?? { expected: 0, present: 0, sessions: 0 };
      current.expected += session.expectedCount;
      current.present += session.presentCount;
      current.sessions += 1;
      byModule.set(session.moduleCode, current);
    }

    const excludedByModule = excludedStudents.reduce<Record<string, number>>((acc, row) => {
      acc[row.moduleCode] = (acc[row.moduleCode] ?? 0) + 1;
      return acc;
    }, {});

    return filteredModules.map<ModuleSummaryRow>((module) => {
      const totals = byModule.get(module.code) ?? { expected: 0, present: 0, sessions: 0 };
      const avg = totals.expected ? (totals.present / totals.expected) * 100 : 0;
      return {
        moduleCode: module.code,
        moduleName: module.name,
        teachers: (teachersByModule.get(module.code) ?? []).join(', ') || '—',
        sessionsCount: totals.sessions,
        avgAttendance: clampPercent(avg),
        excludedCount: excludedByModule[module.code] ?? 0
      };
    });
  }, [sessionsInRange, filteredModules, teachersByModule, excludedStudents]);

  const lowestAttendanceModules = React.useMemo(() => {
    return modulesSummary
      .slice()
      .sort((a, b) => a.avgAttendance - b.avgAttendance)
      .slice(0, 6);
  }, [modulesSummary]);

  const attendanceTrend = React.useMemo(() => {
    const byDate = new Map<string, { expected: number; present: number; sessions: number }>();
    for (const session of sessionsInRange) {
      const key = toDateKey(session.startAt);
      const current = byDate.get(key) ?? { expected: 0, present: 0, sessions: 0 };
      current.expected += session.expectedCount;
      current.present += session.presentCount;
      current.sessions += 1;
      byDate.set(key, current);
    }
    return Array.from(byDate.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, totals]) => ({
        date,
        rate: totals.expected ? (totals.present / totals.expected) * 100 : 0,
        present: totals.present,
        expected: totals.expected,
        sessions: totals.sessions
      }));
  }, [sessionsInRange]);

  const moduleSummaryColumns: Array<DataTableColumn<ModuleSummaryRow>> = [
    { key: 'moduleName', header: 'Module name', sortable: true, accessor: (r) => r.moduleName, cell: (r) => <span className='font-medium'>{r.moduleName}</span> },
    { key: 'teachers', header: 'Assigned teacher' },
    { key: 'sessionsCount', header: 'Session', sortable: true, accessor: (r) => r.sessionsCount },
    {
      key: 'avgAttendance',
      header: 'Avg attendance %',
      sortable: true,
      accessor: (r) => r.avgAttendance,
      cell: (r) => {
        const critical = r.avgAttendance < 70;
        return (
          <div className='flex items-center gap-2'>
            <span className={critical ? 'text-destructive font-semibold' : 'font-medium'}>
              {r.avgAttendance.toFixed(0)}%
            </span>
            {critical ? <Badge variant='destructive'>Critical</Badge> : null}
          </div>
        );
      }
    },
  ];

  const kpiCards = [
    { title: 'Total Students', value: totalStudents, href: '/dashboard/students' },
    { title: 'Active Sessions Today', value: activeSessionsToday.length, href: '/dashboard/monitoring/active-sessions' },
    { title: 'Overall Attendance Rate', value: `${clampPercent(overallAttendanceRate).toFixed(0)}%`, href: undefined }
  ] as const;

  return (
    <PageContainer
      pageTitle='Dashboard'
      pageDescription='Monitor attendance activity with trends, drill-downs, and exports.'
    >
      <div className='relative mb-4 overflow-hidden rounded-2xl border border-border/70 bg-linear-to-br from-amber-50 via-white to-emerald-50 p-6 shadow-sm dark:from-amber-950/30 dark:via-background dark:to-emerald-950/20'>
        <div className='absolute -left-16 -top-16 h-40 w-40 rounded-full bg-emerald-200/30 blur-3xl dark:bg-emerald-500/10' />
        <div className='absolute -bottom-16 right-10 h-44 w-44 rounded-full bg-amber-200/30 blur-3xl dark:bg-amber-500/10' />
        <div className='relative z-10 grid gap-4 md:grid-cols-[1.3fr_0.7fr]'>
          <div>
            <h2 className='text-2xl font-semibold text-slate-900 dark:text-slate-100'>
              Administration control center
            </h2>
            <p className='text-muted-foreground mt-2 text-sm'>
              Monitor attendance, manage accounts, and assign modules/schedules in one place.
            </p>
          </div>

          <div className='flex flex-col gap-3 rounded-xl border border-border/60 bg-background/80 p-4'>
            <div className='flex items-center justify-between'>
              <span className='text-sm font-medium'>Today activity</span>
              <Badge variant={liveSessionsCount ? 'default' : 'secondary'}>
                Live sessions: {liveSessionsCount}
              </Badge>
            </div>
            <div className='grid gap-2 text-sm'>
              <div className='flex items-center justify-between gap-3'>
                <span className='text-muted-foreground'>Sessions today</span>
                <span className='font-medium text-foreground'>{sessionsToday.length}</span>
              </div>
              <div className='flex items-center justify-between gap-3'>
                <span className='text-muted-foreground'>Avg attendance today</span>
                <span className='font-medium text-foreground'>
                  {clampPercent(todayAttendanceRate).toFixed(0)}%
                </span>
              </div>
            </div>
            <Button asChild size='sm' variant='outline'>
              <Link href='/dashboard/monitoring/active-sessions'>
                View active sessions
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {timeoutWarning && isLoading ? (
        <Card className='mb-4 border-amber-200 bg-amber-50 text-amber-900'>
          <CardContent className='py-3 text-sm'>
            Data loading is taking longer than expected..
          </CardContent>
        </Card>
      ) : null}

      <div className='mb-4 flex flex-wrap items-center justify-between gap-2'>
        <div className='text-xs text-muted-foreground'>
          Last updated at{' '}
          <span className='text-foreground'>
            {lastUpdatedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>

      <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-4'>
        {kpiCards.map((kpi) => (
          <Card key={kpi.title} className={kpi.href ? 'transition-colors hover:bg-accent/40' : undefined}>
            <CardHeader className='space-y-1'>
              <CardTitle className='text-sm text-muted-foreground'>{kpi.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-semibold'>
                {isLoading ? <Skeleton className='h-7 w-24' /> : kpi.value}
              </div>
              {kpi.href ? (
                <Link href={kpi.href} className='mt-2 inline-block text-xs font-medium text-primary'>
                  Open
                </Link>
              ) : null}
            </CardContent>
          </Card>
        ))}
        <Card>
          <CardHeader className='space-y-1'>
            <CardTitle className='text-sm text-muted-foreground'>Total Modules</CardTitle>
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-semibold'>{store.modules.length}</div>
            <CardDescription className='mt-2 text-xs'>
              Total Teachers: {totalTeachers}
            </CardDescription>
          </CardContent>
        </Card>
      </div>

      <div className='mt-6 grid gap-4 lg:grid-cols-2'>
        <Card>
          <CardHeader>
            <CardTitle>Attendance trend over time</CardTitle>
            <CardDescription>Attendance rate (%) for the selected date range.</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer className='h-[280px]' config={{ rate: { label: 'Attendance rate', color: 'var(--color-chart-1)' } }}>
              <ResponsiveContainer>
                <LineChart data={attendanceTrend} margin={{ left: 0, right: 12 }}>
                  <CartesianGrid strokeDasharray='3 3' vertical={false} />
                  <XAxis dataKey='date' tickLine={false} axisLine={false} />
                  <YAxis tickLine={false} axisLine={false} domain={[0, 100]} />
                  <Tooltip content={<ChartTooltipContent />} formatter={(value: any, _name: any, props: any) => {
                    const row = props?.payload as any;
                    return [`${Number(value).toFixed(1)}% (present ${row?.present}/${row?.expected}, sessions ${row?.sessions})`, 'Rate'];
                  }} />
                  <Line type='monotone' dataKey='rate' stroke='var(--color-rate)' strokeWidth={2} dot={{ r: 2 }} activeDot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Absence breakdown</CardTitle>
            <CardDescription>Click a segment to filter tables below.</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              className='h-[280px]'
              config={{
                justified: { label: 'Justified', color: ABSENCE_COLORS.justified },
                unjustified: { label: 'Unjustified', color: ABSENCE_COLORS.unjustified },
                pending: { label: 'Pending', color: ABSENCE_COLORS.pending }
              }}
            >
              <ResponsiveContainer>
                <PieChart>
                  <Tooltip content={<ChartTooltipContent />} />
                  <Pie
                    data={[
                      { name: 'Justified', key: 'justified', value: absenceBreakdown.justified },
                      { name: 'Unjustified', key: 'unjustified', value: absenceBreakdown.unjustified },
                      { name: 'Pending', key: 'pending', value: absenceBreakdown.pending }
                    ]}
                    dataKey='value'
                    nameKey='name'
                    innerRadius={60}
                    outerRadius={90}
                    onClick={(entry: any) => {
                      const key = entry?.key as AbsenceType | undefined;
                      if (!key) return;
                      setAbsenceFilter((prev) => (prev === key ? 'all' : key));
                    }}
                  >
                    {(['justified', 'unjustified', 'pending'] as AbsenceType[]).map((key) => (
                      <Cell
                        key={key}
                        fill={ABSENCE_COLORS[key]}
                        opacity={absenceFilter === 'all' || absenceFilter === key ? 1 : 0.25}
                      />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>
            {absenceFilter !== 'all' ? (
              <div className='mt-2 text-xs text-muted-foreground'>
                Active filter: <span className='font-medium text-foreground'>{absenceFilter}</span>{' '}
                <button className='ml-2 text-primary underline' onClick={() => setAbsenceFilter('all')}>
                  Clear
                </button>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <div className='mt-6 grid gap-4'>
        <Card>
          <CardHeader>
            <CardTitle>Lowest attendance modules</CardTitle>
            <CardDescription>Click a bar to drill down to module details.</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer className='h-[280px]' config={{ avgAttendance: { label: 'Avg attendance', color: 'var(--color-chart-1)' } }}>
              <BarChart data={lowestAttendanceModules} margin={{ left: 0, right: 8 }}>
                <CartesianGrid strokeDasharray='3 3' vertical={false} />
                <XAxis dataKey='moduleCode' tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} domain={[0, 100]} />
                <Tooltip content={<ChartTooltipContent />} />
                <Bar
                  dataKey='avgAttendance'
                  fill='var(--color-avgAttendance)'
                  radius={[6, 6, 0, 0]}
                  className='cursor-pointer'
                  onClick={(entry: any) => {
                    const code = entry?.moduleCode as string | undefined;
                    if (!code) return;
                    router.push(`/dashboard/monitoring/modules/${encodeURIComponent(code)}`);
                  }}
                >
                  {lowestAttendanceModules.map((row) => (
                    <Cell key={row.moduleCode} fill='var(--color-avgAttendance)' opacity={row.avgAttendance < 70 ? 1 : 0.7} />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      <div className='mt-6 grid gap-6'>
        <Card>
          <CardHeader className='flex flex-row items-start justify-between gap-3'>
            <div>
              <CardTitle>Modules summary</CardTitle>
              <CardDescription>Row click opens Module Attendance Detail.</CardDescription>
            </div>
            <div className='flex flex-col gap-1'>
              <span className='text-xs text-muted-foreground'>Date range</span>
              <div className='flex flex-col gap-2 sm:flex-row sm:items-center'>
                <Select
                  value={preset}
                  onValueChange={(value) => {
                    const nextPreset = value as DateRangePreset;
                    const next = new URLSearchParams(searchParams.toString());
                    next.set('range', nextPreset);
                    if (nextPreset !== 'custom') {
                      next.delete('from');
                      next.delete('to');
                    }
                    router.push(`/dashboard/overview?${next.toString()}`);
                  }}
                >
                  <SelectTrigger className='h-9 w-full sm:w-[160px]'>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='today'>Today</SelectItem>
                    <SelectItem value='week'>This week</SelectItem>
                    <SelectItem value='month'>This month</SelectItem>
                    <SelectItem value='custom' disabled>
                      Custom
                    </SelectItem>
                  </SelectContent>
                </Select>
                <div className='flex h-9 w-full items-center rounded-md border border-input bg-background px-3 text-sm text-muted-foreground sm:w-[280px]'>
                  {rangeLabel}: {formatIsoDate(start)} → {formatIsoDate(end)}
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className='h-[360px] w-full' />
            ) : (
              <DataTable
                rows={modulesSummary}
                columns={moduleSummaryColumns}
                searchPlaceholder='Search by name, teacher…'
                onRowClick={(row) =>
                  router.push(`/dashboard/monitoring/modules/${encodeURIComponent(row.moduleCode)}`)
                }
              />
            )}
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
