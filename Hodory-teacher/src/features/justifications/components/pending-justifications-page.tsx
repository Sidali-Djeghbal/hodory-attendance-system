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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import Link from 'next/link';
import { useAuth } from '@/features/auth/auth-context';
import { getTeacherJustifications, type TeacherJustificationsResponse } from '@/lib/teacher-api';
import { toast } from 'sonner';

function formatShortDate(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: '2-digit'
  }).format(date);
}

export default function PendingJustificationsPage() {
  const { token } = useAuth();
  const [search, setSearch] = React.useState('');
  const [moduleFilter, setModuleFilter] = React.useState('all');
  const [statusFilter, setStatusFilter] = React.useState('pending');
  const [urgentOnly, setUrgentOnly] = React.useState(false);
  const [data, setData] = React.useState<TeacherJustificationsResponse | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);

  React.useEffect(() => {
    if (!token) return;
    let mounted = true;
    setIsLoading(true);
    const filter =
      statusFilter === 'all'
        ? undefined
        : (statusFilter as 'pending' | 'approved' | 'rejected');
    getTeacherJustifications(token, filter)
      .then((result) => {
        if (!mounted) return;
        setData(result);
      })
      .catch((error) => {
        toast.error(error instanceof Error ? error.message : 'Failed to load justifications');
      })
      .finally(() => setIsLoading(false));
    return () => {
      mounted = false;
    };
  }, [token, statusFilter]);

  const rows = React.useMemo(() => {
    const list = data?.justifications ?? [];
    return list.map((entry) => {
      const studentName = entry.student?.full_name ?? 'Unknown';
      const studentId = entry.student?.student_id ?? null;
      const moduleCode = entry.module?.code ?? '—';
      const absenceDate = entry.session?.date_time
        ? formatShortDate(entry.session.date_time)
        : '—';
      const submitted = formatShortDate(entry.created_at);
      const status = String(entry.status ?? 'pending');

      return {
        key: entry.justification_id,
        student: studentName,
        id: studentId ? String(studentId) : '—',
        module: moduleCode,
        absenceDate,
        type: entry.comment ? 'Provided' : '—',
        submitted,
        urgency: '—',
        status
      };
    });
  }, [data]);

  const availableModules = React.useMemo(() => {
    const codes = new Set<string>();
    for (const row of rows) {
      if (row.module && row.module !== '—') codes.add(row.module);
    }
    return Array.from(codes).sort((a, b) => a.localeCompare(b));
  }, [rows]);

  const filteredRows = React.useMemo(() => {
    const normalize = (value: string) => value.toLowerCase().trim();
    const query = normalize(search);

    const isUrgent = (urgency: string) => {
      const match = urgency.match(/^(\d+)\s*\/\s*(\d+)/);
      if (!match) return false;
      const current = Number(match[1]);
      const total = Number(match[2]);
      if (!Number.isFinite(current) || !Number.isFinite(total) || total === 0) {
        return false;
      }
      return current >= 2;
    };

    return rows.filter((row) => {
      const matchesSearch =
        !query ||
        normalize(row.student).includes(query) ||
        normalize(row.id).includes(query);
      const matchesModule =
        moduleFilter === 'all' || row.module === moduleFilter;
      const matchesStatus =
        statusFilter === 'all' ||
        normalize(row.status) === normalize(statusFilter);
      const matchesUrgent = !urgentOnly || isUrgent(row.urgency);

      return matchesSearch && matchesModule && matchesStatus && matchesUrgent;
    });
  }, [search, moduleFilter, statusFilter, urgentOnly, rows]);

  return (
    <div className='flex w-full flex-col gap-6 p-4'>
      <Card>
        <CardHeader>
          <CardTitle>Justifications</CardTitle>
          <CardDescription>
            Review student submissions and manage absence status.
          </CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Focus on urgent or specific modules.</CardDescription>
        </CardHeader>
        <CardContent className='grid gap-4 md:grid-cols-[1fr_220px_220px_220px]'>
          <div className='grid gap-2'>
            <Label htmlFor='search'>Search students</Label>
            <Input
              id='search'
              placeholder='Search by name or ID'
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <div className='grid gap-2'>
            <Label>Module</Label>
            <Select value={moduleFilter} onValueChange={setModuleFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>All modules</SelectItem>
                {availableModules.map((code) => (
                  <SelectItem key={code} value={code}>
                    {code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className='grid gap-2'>
            <Label>Status</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='pending'>Pending</SelectItem>
                <SelectItem value='approved'>Approved</SelectItem>
                <SelectItem value='rejected'>Rejected</SelectItem>
                <SelectItem value='all'>All</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className='grid gap-2'>
            <Label>Absence date range</Label>
            <Input type='text' placeholder='Sep 01 - Oct 30' />
          </div>
          <div className='flex items-center gap-2'>
            <Switch
              id='urgent'
              checked={urgentOnly}
              onCheckedChange={setUrgentOnly}
            />
            <Label htmlFor='urgent'>Urgent only</Label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Requests</CardTitle>
          <CardDescription>Pending submissions in queue.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Module</TableHead>
                <TableHead>Absence date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead>Urgency</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
              <TableBody>
              {filteredRows.map((row) => (
                <TableRow key={row.key}>
                  <TableCell className='font-medium'>
                    {row.student} - {row.id}
                  </TableCell>
                  <TableCell>{row.module}</TableCell>
                  <TableCell>{row.absenceDate}</TableCell>
                  <TableCell>{row.type}</TableCell>
                  <TableCell>{row.submitted}</TableCell>
                  <TableCell>{row.urgency}</TableCell>
                  <TableCell>
                    <Badge variant='secondary'>{row.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <Button asChild size='sm' variant='ghost'>
                      <Link href={`/dashboard/justifications/review?id=${row.key}`}>
                        Review
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className='text-muted-foreground'>
                    Loading…
                  </TableCell>
                </TableRow>
              ) : filteredRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className='text-muted-foreground'>
                    No results.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
