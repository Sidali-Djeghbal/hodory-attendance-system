'use client';

import * as React from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import {
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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { DataTable, type DataTableColumn } from '@/components/data-table/data-table';
import { downloadCsv, downloadExcelHtmlTable } from '@/lib/download';

import { useAdminStore, type AbsenceType } from '@/features/admin/store/admin-store';
import { resolveDateRange, type DateRangePreset } from '@/features/admin/filters/date-range';

type SessionRow = {
  dateTime: string;
  teacher: string;
  rate: number;
  present: string;
  absent: number;
};

type StudentRow = {
  studentId: string;
  name: string;
  exclusionStatus: string;
  exclusionDate: string;
};

const ABSENCE_COLORS: Record<AbsenceType, string> = {
  justified: 'var(--color-chart-2)',
  unjustified: 'var(--color-chart-5)',
  pending: 'var(--color-chart-3)'
};

function toDateKey(iso: string) {
  return iso.slice(0, 10);
}

export default function ModuleAttendanceDetailPage() {
  const params = useParams<{ code: string }>();
  const moduleCode = decodeURIComponent(params.code);
  const { store } = useAdminStore();
  const searchParams = useSearchParams();

  const preset = (searchParams.get('range') as DateRangePreset | null) ?? 'today';
  const from = searchParams.get('from') ?? undefined;
  const to = searchParams.get('to') ?? undefined;
  const { start, end } = React.useMemo(
    () => resolveDateRange({ preset, from, to }),
    [preset, from, to]
  );

  const [loading, setLoading] = React.useState(true);
  React.useEffect(() => {
    const timer = window.setTimeout(() => setLoading(false), 450);
    return () => window.clearTimeout(timer);
  }, [moduleCode, preset, from, to]);

  const module = store.modules.find((m) => m.code === moduleCode) ?? null;

  const teacherNameById = React.useMemo(
    () => new Map(store.teachers.map((t) => [t.teacherId, t.fullName] as const)),
    [store.teachers]
  );

  const assignedTeachers = store.assignments
    .filter((a) => a.moduleCode === moduleCode)
    .map((a) => teacherNameById.get(a.teacherId) ?? a.teacherId);

  const sessionsInRange = React.useMemo(() => {
    const startMs = start.getTime();
    const endMs = end.getTime();
    return store.sessions
      .filter((s) => s.moduleCode === moduleCode)
      .filter((s) => {
        const ms = new Date(s.startAt).getTime();
        return ms >= startMs && ms <= endMs;
      })
      .slice()
      .sort((a, b) => a.startAt.localeCompare(b.startAt));
  }, [store.sessions, moduleCode, start, end]);

  const kpis = React.useMemo(() => {
    const sessions = sessionsInRange.length;
    const totals = sessionsInRange.reduce(
      (acc, s) => {
        acc.present += s.presentCount;
        acc.expected += s.expectedCount;
        for (const a of s.absences) acc[a.type] += 1;
        return acc;
      },
      { present: 0, expected: 0, justified: 0, unjustified: 0, pending: 0 } as any
    );
    const avgRate = totals.expected ? (totals.present / totals.expected) * 100 : 0;
    return { sessions, avgRate, totals };
  }, [sessionsInRange]);

  const studentById = React.useMemo(
    () => new Map(store.students.map((s) => [s.studentId, s] as const)),
    [store.students]
  );

  const studentAbsenceStats = React.useMemo(() => {
    const byStudent = new Map<string, { justified: number; unjustified: number; pending: number; lastDate?: string }>();
    for (const session of sessionsInRange) {
      for (const absence of session.absences) {
        const current = byStudent.get(absence.studentId) ?? { justified: 0, unjustified: 0, pending: 0 };
        current[absence.type] += 1;
        current.lastDate = toDateKey(session.startAt);
        byStudent.set(absence.studentId, current);
      }
    }
    return byStudent;
  }, [sessionsInRange]);

  const excludedStudents = React.useMemo(() => {
    const rows: StudentRow[] = [];
    for (const [studentId, stats] of Array.from(studentAbsenceStats.entries())) {
      const excluded = stats.unjustified >= 3 || stats.justified >= 5;
      if (!excluded) continue;
      rows.push({
        studentId,
        name: studentById.get(studentId)?.fullName ?? studentId,
        exclusionStatus: 'Excluded',
        exclusionDate: stats.lastDate ?? '—'
      });
    }
    return rows;
  }, [studentAbsenceStats, studentById]);

  const nearExclusionCount = React.useMemo(() => {
    let count = 0;
    for (const stats of Array.from(studentAbsenceStats.values())) {
      if (stats.unjustified === 2 || stats.justified === 4) count += 1;
    }
    return count;
  }, [studentAbsenceStats]);

  const attendanceTrend = React.useMemo(() => {
    return sessionsInRange.map((s) => ({
      date: toDateKey(s.startAt),
      rate: s.expectedCount ? (s.presentCount / s.expectedCount) * 100 : 0,
      present: s.presentCount,
      expected: s.expectedCount
    }));
  }, [sessionsInRange]);

  const absenceBreakdown = React.useMemo(() => {
    return [
      { name: 'Justified', key: 'justified', value: kpis.totals.justified as number },
      { name: 'Unjustified', key: 'unjustified', value: kpis.totals.unjustified as number },
      { name: 'Pending', key: 'pending', value: kpis.totals.pending as number }
    ];
  }, [kpis.totals]);

  const sessionTable: SessionRow[] = sessionsInRange
    .slice()
    .reverse()
    .map((s) => ({
      dateTime: new Date(s.startAt).toLocaleString([], { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' }),
      teacher: teacherNameById.get(s.teacherId) ?? s.teacherId,
      rate: s.expectedCount ? (s.presentCount / s.expectedCount) * 100 : 0,
      present: `${s.presentCount}/${s.expectedCount}`,
      absent: Math.max(s.expectedCount - s.presentCount, 0)
    }));

  const sessionsColumns: Array<DataTableColumn<SessionRow>> = [
    { key: 'dateTime', header: 'Date/time', sortable: true, accessor: (r) => r.dateTime },
    { key: 'teacher', header: 'Teacher', sortable: true, accessor: (r) => r.teacher },
    { key: 'rate', header: 'Attendance rate %', sortable: true, accessor: (r) => r.rate, cell: (r) => `${r.rate.toFixed(0)}%` },
    { key: 'present', header: 'Present count', sortable: true, accessor: (r) => r.present },
    { key: 'absent', header: 'Absent count', sortable: true, accessor: (r) => r.absent }
  ];

  const studentColumns: Array<DataTableColumn<StudentRow>> = [
    { key: 'studentId', header: 'Student ID', sortable: true, accessor: (r) => r.studentId },
    { key: 'name', header: 'Name', sortable: true, accessor: (r) => r.name, cell: (r) => <span className='font-medium'>{r.name}</span> },
    { key: 'exclusionStatus', header: 'Exclusion status', cell: () => <Badge variant='destructive'>Excluded</Badge> },
    { key: 'exclusionDate', header: 'Exclusion date', sortable: true, accessor: (r) => r.exclusionDate }
  ];

  const exportModule = (format: 'csv' | 'excel' | 'pdf') => {
    try {
      if (format === 'pdf') {
        window.print();
        return;
      }
      const headers = ['Module', 'Sessions conducted', 'Average attendance rate', 'Excluded students', 'Near exclusion students'];
      const summaryRows = [[moduleCode, kpis.sessions, kpis.avgRate.toFixed(2), excludedStudents.length, nearExclusionCount]];
      if (format === 'csv') downloadCsv(`module-${moduleCode}-report.csv`, [headers, ...summaryRows]);
      else downloadExcelHtmlTable(`module-${moduleCode}-report.xls`, headers, summaryRows);
      toast.success('Export generated.');
    } catch {
      toast.error('Unable to generate export file. Please try again.');
    }
  };

  if (!module) {
    return (
      <PageContainer pageTitle='Module Attendance Detail' pageDescription='Module not found.'>
        <Card>
          <CardHeader>
            <CardTitle>Unknown module</CardTitle>
            <CardDescription>Check the module code and try again.</CardDescription>
          </CardHeader>
        </Card>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      pageTitle='Module Attendance Detail'
      pageDescription='Drill-down monitoring for a specific module.'
      pageHeaderAction={
        <div className='flex flex-wrap gap-2'>
          <Button variant='outline' onClick={() => exportModule('csv')}>Export CSV</Button>
          <Button variant='outline' onClick={() => exportModule('excel')}>Export Excel</Button>
          <Button variant='outline' onClick={() => exportModule('pdf')}>Export PDF</Button>
        </div>
      }
    >
      <Card className='mb-6'>
        <CardHeader>
          <CardTitle>
            {module.code} — {module.name}
          </CardTitle>
          <CardDescription>
            Assigned teacher(s): {assignedTeachers.length ? assignedTeachers.join(', ') : '—'}
          </CardDescription>
        </CardHeader>
      </Card>

      <div className='grid gap-4 md:grid-cols-4'>
        <Card>
          <CardHeader className='space-y-1'><CardTitle className='text-sm text-muted-foreground'>Sessions conducted</CardTitle></CardHeader>
          <CardContent><div className='text-2xl font-semibold'>{kpis.sessions}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className='space-y-1'><CardTitle className='text-sm text-muted-foreground'>Average attendance rate</CardTitle></CardHeader>
          <CardContent><div className='text-2xl font-semibold'>{kpis.avgRate.toFixed(0)}%</div></CardContent>
        </Card>
        <Card>
          <CardHeader className='space-y-1'><CardTitle className='text-sm text-muted-foreground'>Excluded students</CardTitle></CardHeader>
          <CardContent><div className='text-2xl font-semibold'>{excludedStudents.length}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className='space-y-1'><CardTitle className='text-sm text-muted-foreground'>Students near exclusion</CardTitle></CardHeader>
          <CardContent><div className='text-2xl font-semibold'>{nearExclusionCount}</div></CardContent>
        </Card>
      </div>

      <div className='mt-6 grid gap-4 lg:grid-cols-2'>
        <Card>
          <CardHeader>
            <CardTitle>Attendance trend per session/date</CardTitle>
            <CardDescription>Rate % for each session within the selected date range.</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className='h-[280px] w-full' />
            ) : (
              <ChartContainer className='h-[280px]' config={{ rate: { label: 'Rate', color: 'var(--color-chart-1)' } }}>
                <ResponsiveContainer>
                  <LineChart data={attendanceTrend} margin={{ left: 0, right: 12 }}>
                    <CartesianGrid strokeDasharray='3 3' vertical={false} />
                    <XAxis dataKey='date' tickLine={false} axisLine={false} />
                    <YAxis tickLine={false} axisLine={false} domain={[0, 100]} />
                    <Tooltip content={<ChartTooltipContent />} />
                    <Line type='monotone' dataKey='rate' stroke='var(--color-rate)' strokeWidth={2} dot={{ r: 2 }} />
                  </LineChart>
                </ResponsiveContainer>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Absence breakdown</CardTitle>
            <CardDescription>Justified vs unjustified vs pending.</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className='h-[280px] w-full' />
            ) : (
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
                    <Pie data={absenceBreakdown} dataKey='value' nameKey='name' innerRadius={60} outerRadius={90}>
                      {absenceBreakdown.map((entry) => (
                        <Cell
                          key={entry.key}
                          fill={ABSENCE_COLORS[entry.key as AbsenceType]}
                        />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <div className='mt-6 grid gap-6'>
        <Card>
          <CardHeader>
            <CardTitle>Sessions list</CardTitle>
            <CardDescription>Date/time, teacher, attendance rate, present count, absent count.</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className='h-[340px] w-full' /> : (
              <DataTable
                rows={sessionTable}
                columns={sessionsColumns}
                searchPlaceholder='Search sessions…'
                searchFn={(r, q) => [r.dateTime, r.teacher].some((v) => v.toLowerCase().includes(q))}
                emptyState='No sessions in range.'
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Students list</CardTitle>
            <CardDescription>Student-level drill-down (read-only).</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className='h-[280px] w-full' /> : (
              <DataTable
                rows={excludedStudents}
                columns={studentColumns}
                searchPlaceholder='Search by student ID or name…'
                searchFn={(r, q) => [r.studentId, r.name].some((v) => v.toLowerCase().includes(q))}
                emptyState='No excluded students for this module in range.'
              />
            )}
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
