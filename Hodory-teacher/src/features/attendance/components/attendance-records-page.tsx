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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent
} from '@/components/ui/chart';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  XAxis,
  YAxis
} from 'recharts';

const moduleRows = [
  {
    code: 'COMPIL',
    name: 'Compilation',
    sessions: 8,
    avgRate: '84%',
    excluded: 2
  },
  {
    code: 'AABDD',
    name: 'Architecture and administration of databases',
    sessions: 6,
    avgRate: '88%',
    excluded: 1
  },
  {
    code: 'SOFENG',
    name: 'Software Engineering',
    sessions: 5,
    avgRate: '79%',
    excluded: 3
  }
];

const attendanceTrend = [
  { session: 'S1', rate: 78 },
  { session: 'S2', rate: 82 },
  { session: 'S3', rate: 85 },
  { session: 'S4', rate: 88 },
  { session: 'S5', rate: 84 },
  { session: 'S6', rate: 89 }
];

const stackedAttendance = [
  { session: 'S1', present: 26, absent: 8 },
  { session: 'S2', present: 28, absent: 6 },
  { session: 'S3', present: 30, absent: 4 },
  { session: 'S4', present: 29, absent: 5 },
  { session: 'S5', present: 27, absent: 7 },
  { session: 'S6', present: 31, absent: 3 }
];

const sessionsTable = [
  {
    date: 'Oct 08, 11:00',
    duration: '90 min',
    rate: '84%',
    present: '28/34'
  },
  {
    date: 'Oct 01, 11:00',
    duration: '90 min',
    rate: '88%',
    present: '30/34'
  },
  {
    date: 'Sep 24, 11:00',
    duration: '90 min',
    rate: '81%',
    present: '27/34'
  }
];

const roster = [
  { name: 'Ayoub N.', status: 'Present', risk: 'Low' },
  { name: 'Lina R.', status: 'Absent-unjustified', risk: 'High' },
  { name: 'Mehdi K.', status: 'Pending-justification', risk: 'Medium' },
  { name: 'Sara B.', status: 'Absent-justified', risk: 'Low' }
];

const statusBadge: Record<string, string> = {
  Present: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
  'Absent-unjustified': 'bg-red-500/15 text-red-600 dark:text-red-400',
  'Pending-justification': 'bg-muted text-muted-foreground',
  'Absent-justified': 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
};

export default function AttendanceRecordsPage() {
  const [moduleSearch, setModuleSearch] = React.useState('');

  const filteredModules = React.useMemo(() => {
    const query = moduleSearch.toLowerCase().trim();
    if (!query) return moduleRows;
    return moduleRows.filter(
      (module) =>
        module.code.toLowerCase().includes(query) ||
        module.name.toLowerCase().includes(query)
    );
  }, [moduleSearch]);

  const downloadFile = (filename: string, content: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportModuleCsv = () => {
    const rows = [
      ['Date', 'Duration', 'Attendance', 'Present'],
      ...sessionsTable.map((session) => [
        session.date,
        session.duration,
        session.rate,
        session.present
      ])
    ];
    const csv = rows.map((row) => row.join(',')).join('\n');
    downloadFile('module-records.csv', csv, 'text/csv');
  };

  const exportModulePdf = () => {
    window.print();
  };

  return (
    <div className='flex w-full flex-col gap-6 p-4'>
      <Card>
        <CardHeader>
          <CardTitle>Attendance records</CardTitle>
          <CardDescription>
            Track module-level attendance history and session details.
          </CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Module list</CardTitle>
          <CardDescription>Quick metrics across your modules.</CardDescription>
        </CardHeader>
        <CardContent className='grid gap-4'>
          <div className='grid gap-4 md:grid-cols-[1fr_220px_220px]'>
            <div className='grid gap-2'>
              <Label htmlFor='search'>Search modules</Label>
              <Input
                id='search'
                placeholder='Search by module name or code'
                value={moduleSearch}
                onChange={(event) => setModuleSearch(event.target.value)}
              />
            </div>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Module</TableHead>
                <TableHead>Total sessions</TableHead>
                <TableHead>Avg attendance</TableHead>
                <TableHead>Excluded students</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredModules.map((module) => (
                <TableRow key={module.code}>
                  <TableCell className='font-medium'>
                    {module.code} - {module.name}
                  </TableCell>
                  <TableCell>{module.sessions}</TableCell>
                  <TableCell>{module.avgRate}</TableCell>
                  <TableCell>{module.excluded}</TableCell>
                </TableRow>
              ))}
              {filteredModules.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className='text-muted-foreground'>
                    No results.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Module detail - Compilation</CardTitle>
          <CardDescription>Charts and KPIs for the selected module.</CardDescription>
        </CardHeader>
        <CardContent className='grid gap-6'>
          <div className='grid gap-4 md:grid-cols-4'>
            <div className='rounded-lg border border-border/60 p-3'>
              <p className='text-xs text-muted-foreground'>Total sessions</p>
              <p className='text-lg font-semibold'>8</p>
            </div>
            <div className='rounded-lg border border-border/60 p-3'>
              <p className='text-xs text-muted-foreground'>Avg attendance</p>
              <p className='text-lg font-semibold'>84%</p>
            </div>
            <div className='rounded-lg border border-border/60 p-3'>
              <p className='text-xs text-muted-foreground'>Excluded students</p>
              <p className='text-lg font-semibold'>2</p>
            </div>
            <div className='rounded-lg border border-border/60 p-3'>
              <p className='text-xs text-muted-foreground'>
                Near exclusion threshold
              </p>
              <p className='text-lg font-semibold'>3</p>
            </div>
          </div>

          <div className='grid gap-4 lg:grid-cols-2'>
            <Card>
              <CardHeader>
                <CardTitle>Attendance rate per session</CardTitle>
                <CardDescription>Line chart across the term.</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  className='h-[260px]'
                  config={{
                    rate: {
                      label: 'Attendance rate',
                      color: 'var(--color-chart-1)'
                    }
                  }}
                >
                  <ResponsiveContainer>
                    <LineChart data={attendanceTrend}>
                      <CartesianGrid strokeDasharray='3 3' vertical={false} />
                      <XAxis dataKey='session' tickLine={false} axisLine={false} />
                      <YAxis tickLine={false} axisLine={false} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Line
                        type='monotone'
                        dataKey='rate'
                        stroke='var(--color-rate)'
                        strokeWidth={2}
                        dot={{ r: 3, strokeWidth: 2 }}
                        activeDot={{ r: 5 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Present vs absent</CardTitle>
                <CardDescription>Stacked bar per session.</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  className='h-[260px]'
                  config={{
                    present: { label: 'Present', color: 'var(--color-chart-1)' },
                    absent: { label: 'Absent', color: 'var(--color-chart-5)' }
                  }}
                >
                  <BarChart data={stackedAttendance}>
                    <CartesianGrid strokeDasharray='3 3' vertical={false} />
                    <XAxis dataKey='session' tickLine={false} axisLine={false} />
                    <YAxis tickLine={false} axisLine={false} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Legend />
                    <Bar
                      dataKey='present'
                      stackId='a'
                      fill='var(--color-present)'
                    />
                    <Bar
                      dataKey='absent'
                      stackId='a'
                      fill='var(--color-absent)'
                    />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Sessions</CardTitle>
              <CardDescription>Click a session to open detail.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className='flex flex-wrap items-center justify-between gap-2'>
                <Button variant='outline' onClick={exportModuleCsv}>
                  Export module records (CSV)
                </Button>
                <Button variant='outline' onClick={exportModulePdf}>
                  Export module records (PDF)
                </Button>
              </div>
              <Table className='mt-4'>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date/time</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Attendance %</TableHead>
                    <TableHead>Present/total</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sessionsTable.map((session) => (
                    <TableRow key={session.date}>
                      <TableCell className='font-medium'>
                        {session.date}
                      </TableCell>
                      <TableCell>{session.duration}</TableCell>
                      <TableCell>{session.rate}</TableCell>
                      <TableCell>{session.present}</TableCell>
                      <TableCell>
                        <Button size='sm' variant='ghost'>
                          Export
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Session detail - Oct 08</CardTitle>
              <CardDescription>
                Full roster with status and sorting controls.
              </CardDescription>
            </CardHeader>
            <CardContent className='grid gap-4'>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Risk</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {roster.map((student) => (
                    <TableRow key={student.name}>
                      <TableCell className='font-medium'>
                        {student.name}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={statusBadge[student.status]}
                          variant='secondary'
                        >
                          {student.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{student.risk}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  );
}
