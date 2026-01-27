'use client';

import * as React from 'react';
import { toast } from 'sonner';

import PageContainer from '@/components/layout/page-container';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DataTable, type DataTableColumn } from '@/components/data-table/data-table';

import { readCache, writeCache } from '@/lib/cache';
import { getAdminMonitor } from '@/lib/admin-api';

type MonitorResponse = {
  levels: Array<{
    id: number;
    name: string;
    year_level: string | number;
    students: Array<{ id: number; name?: string | null; email?: string | null }>;
    modules: Array<{
      id: number;
      name: string;
      code?: string | null;
      room?: string | null;
      teachers: Array<{
        teacher_module_id: number;
        teacher_id: number | null;
        name?: string | null;
        email?: string | null;
        sessions: Array<{
          session_id: number;
          date_time: string;
          is_active: boolean;
          attendance_summary: { total: number; present: number; absent: number };
        }>;
      }>;
    }>;
    schedule: { id: number; days: Array<any> } | null;
  }>;
  summary: {
    total_levels: number;
    total_students: number;
    total_teachers: number;
    total_modules: number;
    total_sessions: number;
    total_attendance_records: number;
    attendance_rate: number;
    attendance_stats: { present: number; absent: number; excluded: number };
  };
};

const CACHE_KEY = 'hodory_admin_monitor_v1';
const CACHE_MAX_AGE = 60_000;

function formatPercent(value: number) {
  if (!Number.isFinite(value)) return '0%';
  return `${Math.round(value)}%`;
}

export default function AdminOverviewPage() {
  const [data, setData] = React.useState<MonitorResponse | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  const load = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await getAdminMonitor();
      setData(res.data as MonitorResponse);
      writeCache(CACHE_KEY, res.data as MonitorResponse);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load monitoring data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    const cached = readCache<MonitorResponse>(CACHE_KEY, CACHE_MAX_AGE);
    if (cached) {
      setData(cached);
      setIsLoading(false);
    }
    void load();
  }, [load]);

  const summary = data?.summary;
  const levels = data?.levels ?? [];

  const levelRows = React.useMemo(() => {
    return levels.map((level) => ({
      id: level.id,
      name: level.name,
      year_level: String(level.year_level ?? '—'),
      students: level.students?.length ?? 0,
      modules: level.modules?.length ?? 0,
      schedule: level.schedule ? 'yes' : 'no'
    }));
  }, [levels]);

  const moduleRows = React.useMemo(() => {
    const rows: Array<{
      code: string;
      name: string;
      level: string;
      teachers: number;
      sessions: number;
      attendanceRate: number;
    }> = [];

    for (const level of levels) {
      for (const module of level.modules ?? []) {
        let sessions = 0;
        let total = 0;
        let present = 0;
        for (const tm of module.teachers ?? []) {
          for (const s of tm.sessions ?? []) {
            sessions += 1;
            total += s.attendance_summary?.total ?? 0;
            present += s.attendance_summary?.present ?? 0;
          }
        }
        const attendanceRate = total ? (present / total) * 100 : 0;
        rows.push({
          code: module.code ?? String(module.id),
          name: module.name,
          level: level.name,
          teachers: module.teachers?.length ?? 0,
          sessions,
          attendanceRate
        });
      }
    }
    return rows.sort((a, b) => a.code.localeCompare(b.code));
  }, [levels]);

  const levelColumns: Array<DataTableColumn<(typeof levelRows)[number]>> = [
    { key: 'name', header: 'Level', sortable: true, accessor: (r) => r.name, cell: (r) => <span className='font-medium'>{r.name}</span> },
    { key: 'year_level', header: 'Year', sortable: true, accessor: (r) => r.year_level },
    { key: 'students', header: 'Students', sortable: true, accessor: (r) => r.students },
    { key: 'modules', header: 'Modules', sortable: true, accessor: (r) => r.modules },
    { key: 'schedule', header: 'Schedule', sortable: true, accessor: (r) => r.schedule, cell: (r) => <Badge variant={r.schedule === 'yes' ? 'secondary' : 'outline'}>{r.schedule}</Badge> }
  ];

  const moduleColumns: Array<DataTableColumn<(typeof moduleRows)[number]>> = [
    { key: 'code', header: 'Code', sortable: true, accessor: (r) => r.code, cell: (r) => <span className='font-medium'>{r.code}</span> },
    { key: 'name', header: 'Module', sortable: true, accessor: (r) => r.name },
    { key: 'level', header: 'Level', sortable: true, accessor: (r) => r.level },
    { key: 'teachers', header: 'Teachers', sortable: true, accessor: (r) => r.teachers },
    { key: 'sessions', header: 'Sessions', sortable: true, accessor: (r) => r.sessions },
    { key: 'attendanceRate', header: 'Avg attendance', sortable: true, accessor: (r) => r.attendanceRate, cell: (r) => formatPercent(r.attendanceRate) }
  ];

  return (
    <PageContainer
      pageTitle='Monitoring'
      pageDescription='Live system snapshot from backend.'
      pageHeaderAction={<Button variant='outline' onClick={load} disabled={isLoading}>Refresh</Button>}
    >
      <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-4'>
        <Card>
          <CardHeader>
            <CardTitle className='text-sm text-muted-foreground'>Students</CardTitle>
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-semibold'>{summary?.total_students ?? '—'}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className='text-sm text-muted-foreground'>Teachers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-semibold'>{summary?.total_teachers ?? '—'}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className='text-sm text-muted-foreground'>Modules</CardTitle>
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-semibold'>{summary?.total_modules ?? '—'}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className='text-sm text-muted-foreground'>Attendance rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-semibold'>{formatPercent(summary?.attendance_rate ?? 0)}</div>
            <p className='text-xs text-muted-foreground mt-2'>
              Present: {summary?.attendance_stats?.present ?? 0} • Absent: {summary?.attendance_stats?.absent ?? 0} • Excluded: {summary?.attendance_stats?.excluded ?? 0}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Levels</CardTitle>
          <CardDescription>Counts per level.</CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            rows={levelRows}
            columns={levelColumns}
            emptyState={isLoading ? 'Loading…' : 'No levels.'}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Modules</CardTitle>
          <CardDescription>Sessions + average attendance based on recorded sessions.</CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            rows={moduleRows}
            columns={moduleColumns}
            searchPlaceholder='Search by code or name…'
            searchFn={(row, q) =>
              [row.code, row.name, row.level].some((value) => value.toLowerCase().includes(q))
            }
            emptyState={isLoading ? 'Loading…' : 'No modules.'}
          />
        </CardContent>
      </Card>
    </PageContainer>
  );
}

