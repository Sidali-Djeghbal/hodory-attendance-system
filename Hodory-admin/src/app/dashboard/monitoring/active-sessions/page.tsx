'use client';

import * as React from 'react';

import PageContainer from '@/components/layout/page-container';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { DataTable, type DataTableColumn } from '@/components/data-table/data-table';
import { useAdminStore } from '@/features/admin/store/admin-store';

type Row = {
  module: string;
  teacher: string;
  startTime: string;
  status: string;
  present: number;
  expected: number;
  rate: number;
};

export default function ActiveSessionsPage() {
  const { store } = useAdminStore();
  const [lastUpdatedAt, setLastUpdatedAt] = React.useState<Date>(() => new Date());
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const timer = window.setTimeout(() => setLoading(false), 450);
    return () => window.clearTimeout(timer);
  }, []);

  React.useEffect(() => {
    const interval = window.setInterval(() => setLastUpdatedAt(new Date()), 10000);
    return () => window.clearInterval(interval);
  }, []);

  const teacherNameById = React.useMemo(
    () => new Map(store.teachers.map((t) => [t.teacherId, t.fullName] as const)),
    [store.teachers]
  );

  const today = new Date().toISOString().slice(0, 10);
  const rows: Row[] = store.sessions
    .filter((s) => s.status === 'active' && s.startAt.startsWith(today))
    .map((s) => ({
      module: s.moduleCode,
      teacher: teacherNameById.get(s.teacherId) ?? s.teacherId,
      startTime: new Date(s.startAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'Active',
      present: s.presentCount,
      expected: s.expectedCount,
      rate: s.expectedCount ? (s.presentCount / s.expectedCount) * 100 : 0
    }));

  const columns: Array<DataTableColumn<Row>> = [
    { key: 'module', header: 'Module', sortable: true, accessor: (r) => r.module, cell: (r) => <span className='font-medium'>{r.module}</span> },
    { key: 'teacher', header: 'Teacher', sortable: true, accessor: (r) => r.teacher },
    { key: 'startTime', header: 'Start time', sortable: true, accessor: (r) => r.startTime },
    { key: 'status', header: 'Status', cell: () => <Badge className='bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-400'>Active</Badge> },
    { key: 'present', header: 'Marked present', sortable: true, accessor: (r) => r.present },
    { key: 'expected', header: 'Total enrolled/expected', sortable: true, accessor: (r) => r.expected },
    { key: 'rate', header: 'Attendance rate %', sortable: true, accessor: (r) => r.rate, cell: (r) => `${r.rate.toFixed(0)}%` }
  ];

  return (
    <PageContainer
      pageTitle='Active Sessions Today'
      pageDescription='Real-time list of active sessions (auto-refresh).'
    >
      <Card className='mb-6'>
        <CardHeader>
          <CardTitle>Real-time</CardTitle>
          <CardDescription>
            Last updated{' '}
            <span className='font-medium text-foreground'>
              {lastUpdatedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          </CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sessions</CardTitle>
          <CardDescription>Auto-refreshes periodically.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className='h-[360px] w-full' />
          ) : (
            <DataTable
              rows={rows}
              columns={columns}
              searchPlaceholder='Search by module or teacher…'
              searchFn={(r, q) => [r.module, r.teacher].some((v) => v.toLowerCase().includes(q))}
              emptyState='No active sessions right now.'
            />
          )}
        </CardContent>
      </Card>
    </PageContainer>
  );
}

