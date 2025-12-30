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

const justifications = [
  {
    student: 'Lina R.',
    id: 'STU-1182',
    module: 'COMPIL',
    absenceDate: 'Oct 01',
    type: 'Medical',
    submitted: 'Oct 02',
    urgency: '2/3 unjustified',
    status: 'Pending'
  },
  {
    student: 'Mehdi K.',
    id: 'STU-1201',
    module: 'SOFENG',
    absenceDate: 'Sep 24',
    type: 'Administrative',
    submitted: 'Sep 25',
    urgency: '4/5 justified',
    status: 'Pending'
  },
  {
    student: 'Sara B.',
    id: 'STU-1310',
    module: 'AABDD',
    absenceDate: 'Sep 20',
    type: 'Personal',
    submitted: 'Sep 21',
    urgency: '1/3 unjustified',
    status: 'Pending'
  }
];

export default function PendingJustificationsPage() {
  const [search, setSearch] = React.useState('');
  const [moduleFilter, setModuleFilter] = React.useState('all');
  const [statusFilter, setStatusFilter] = React.useState('pending');
  const [urgentOnly, setUrgentOnly] = React.useState(false);

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

    return justifications.filter((row) => {
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
  }, [search, moduleFilter, statusFilter, urgentOnly]);

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
                <SelectItem value='COMPIL'>COMPIL</SelectItem>
                <SelectItem value='AABDD'>AABDD</SelectItem>
                <SelectItem value='SOFENG'>SOFENG</SelectItem>
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
                <TableRow key={`${row.id}-${row.module}`}>
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
                      <Link href='/dashboard/justifications/review'>
                        Review
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {filteredRows.length === 0 ? (
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
