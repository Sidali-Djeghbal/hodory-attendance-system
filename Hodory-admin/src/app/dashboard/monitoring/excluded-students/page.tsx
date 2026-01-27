'use client';

import * as React from 'react';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';

import PageContainer from '@/components/layout/page-container';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DataTable, type DataTableColumn } from '@/components/data-table/data-table';
import { downloadCsv, downloadExcelHtmlTable } from '@/lib/download';

import { useAdminStore, type AbsenceType } from '@/features/admin/store/admin-store';
import { resolveDateRange, type DateRangePreset } from '@/features/admin/filters/date-range';
import { LEVELS } from '@/features/admin/catalog/levels';

type Row = {
  studentName: string;
  studentId: string;
  module: string;
  totalAbsences: number;
  exclusionDate: string;
  level: string;
  justified: number;
  unjustified: number;
  pending: number;
};

function toDateKey(iso: string) {
  return iso.slice(0, 10);
}

export default function ExcludedStudentsPage() {
  const { store } = useAdminStore();
  const searchParams = useSearchParams();

  const preset = (searchParams.get('range') as DateRangePreset | null) ?? 'today';
  const from = searchParams.get('from') ?? undefined;
  const to = searchParams.get('to') ?? undefined;
  const { start, end } = React.useMemo(
    () => resolveDateRange({ preset, from, to }),
    [preset, from, to]
  );

  const [moduleFilter, setModuleFilter] = React.useState<string>('all');
  const [levelFilter, setLevelFilter] = React.useState<string>('all');

  const sessionsInRange = React.useMemo(() => {
    const startMs = start.getTime();
    const endMs = end.getTime();
    return store.sessions.filter((s) => {
      const ms = new Date(s.startAt).getTime();
      return ms >= startMs && ms <= endMs;
    });
  }, [store.sessions, start, end]);

  const excludedRows = React.useMemo(() => {
    const studentById = new Map(store.students.map((s) => [s.studentId, s] as const));
    const byKey = new Map<string, { justified: number; unjustified: number; pending: number; lastDate?: string }>();
    const sorted = sessionsInRange.slice().sort((a, b) => a.startAt.localeCompare(b.startAt));
    for (const session of sorted) {
      for (const absence of session.absences) {
        const key = `${absence.studentId}|${session.moduleCode}`;
        const current = byKey.get(key) ?? { justified: 0, unjustified: 0, pending: 0 };
        current[absence.type as AbsenceType] += 1;
        current.lastDate = toDateKey(session.startAt);
        byKey.set(key, current);
      }
    }

    const rows: Row[] = [];
    for (const [key, value] of Array.from(byKey.entries())) {
      const [studentId, module] = key.split('|');
      if (!studentId || !module) continue;
      const excluded = value.unjustified >= 3 || value.justified >= 5;
      if (!excluded) continue;
      const student = studentById.get(studentId);
      rows.push({
        studentName: student?.fullName ?? studentId,
        studentId,
        module,
        totalAbsences: value.justified + value.unjustified + value.pending,
        exclusionDate: value.lastDate ?? '—',
        level: student?.levelCode ?? '—',
        justified: value.justified,
        unjustified: value.unjustified,
        pending: value.pending
      });
    }
    return rows
      .filter((r) => (moduleFilter === 'all' ? true : r.module === moduleFilter))
      .filter((r) => (levelFilter === 'all' ? true : r.level === levelFilter));
  }, [sessionsInRange, store.students, moduleFilter, levelFilter]);

  const columns: Array<DataTableColumn<Row>> = [
    { key: 'studentName', header: 'Student name', sortable: true, accessor: (r) => r.studentName, cell: (r) => <span className='font-medium'>{r.studentName}</span> },
    { key: 'studentId', header: 'Student ID', sortable: true, accessor: (r) => r.studentId },
    { key: 'module', header: 'Module', sortable: true, accessor: (r) => r.module },
    { key: 'totalAbsences', header: 'Total absences', sortable: true, accessor: (r) => r.totalAbsences },
    { key: 'exclusionDate', header: 'Exclusion date', sortable: true, accessor: (r) => r.exclusionDate },
    { key: 'level', header: 'Level', sortable: true, accessor: (r) => r.level },
    { key: 'justified', header: 'Justified', sortable: true, accessor: (r) => r.justified },
    { key: 'unjustified', header: 'Unjustified', sortable: true, accessor: (r) => r.unjustified },
    { key: 'pending', header: 'Pending', sortable: true, accessor: (r) => r.pending }
  ];

  const exportRows = (format: 'csv' | 'excel' | 'pdf') => {
    try {
      if (format === 'pdf') {
        window.print();
        return;
      }
      const headers = ['Student name', 'Student ID', 'Module', 'Total absences', 'Exclusion date', 'Level', 'Justified', 'Unjustified', 'Pending'];
      const rows = excludedRows.map((r) => [
        r.studentName,
        r.studentId,
        r.module,
        r.totalAbsences,
        r.exclusionDate,
        r.level,
        r.justified,
        r.unjustified,
        r.pending
      ]);
      if (format === 'csv') downloadCsv('excluded-students.csv', [headers, ...rows]);
      else downloadExcelHtmlTable('excluded-students.xls', headers, rows);
      toast.success('Export generated.');
    } catch {
      toast.error('Unable to generate export file. Please try again.');
    }
  };

  return (
    <PageContainer
      pageTitle='Excluded Students'
      pageDescription='Global exclusion list (derived from the 3/5 policy).'
      pageHeaderAction={
        <div className='flex flex-wrap gap-2'>
          <Button variant='outline' onClick={() => exportRows('csv')}>Export CSV</Button>
          <Button variant='outline' onClick={() => exportRows('excel')}>Export Excel</Button>
          <Button variant='outline' onClick={() => exportRows('pdf')}>Export PDF</Button>
        </div>
      }
    >
      <Card>
        <CardHeader>
          <CardTitle>List</CardTitle>
          <CardDescription>Search, sort, filter, and paginate.</CardDescription>
        </CardHeader>
        <CardContent className='grid gap-4 md:grid-cols-3 lg:grid-cols-6 mb-0'>
          <div className='grid gap-2'>
            <Label>Module</Label>
            <Select value={moduleFilter} onValueChange={setModuleFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>All</SelectItem>
                {store.modules.map((m) => (
                  <SelectItem key={m.code} value={m.code}>{m.code}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className='grid gap-2'>
            <Label>level</Label>
            <Select value={levelFilter} onValueChange={setLevelFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>All</SelectItem>
                {LEVELS.map((l) => (
                  <SelectItem key={l.code} value={l.code}>{l.code}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
        <CardContent>
          <DataTable
            rows={excludedRows}
            columns={columns}
            searchPlaceholder='Search by student ID, name, or module…'
            searchFn={(r, q) =>
              [r.studentId, r.studentName, r.module].some((v) => v.toLowerCase().includes(q))
            }
          />
        </CardContent>
      </Card>
    </PageContainer>
  );
}
