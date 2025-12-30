'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import Link from 'next/link';
import { useSessionState } from '@/features/session/session-context';

const summary = {
  start: 'Oct 08, 11:00',
  duration: '90 minutes',
  present: 18,
  absent: 11,
  rate: '62%'
};

const presentStudents = [
  { name: 'Ayoub N.', status: 'On time' },
  { name: 'Lina R.', status: 'On time' },
  { name: 'Mehdi K.', status: 'Late' },
  { name: 'Sara B.', status: 'On time' }
];

export default function SessionSummaryPage() {
  const { module, room, code } = useSessionState();

  const downloadFile = (filename: string, content: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportCsv = () => {
    const rows = [
      ['Student', 'Status'],
      ...presentStudents.map((student) => [student.name, student.status])
    ];
    const csv = rows.map((row) => row.join(',')).join('\n');
    downloadFile('session-summary.csv', csv, 'text/csv');
  };

  const exportExcel = () => {
    const rows = [
      ['Student', 'Status'],
      ...presentStudents.map((student) => [student.name, student.status])
    ];
    const csv = rows.map((row) => row.join(',')).join('\n');
    downloadFile('session-summary.xls', csv, 'application/vnd.ms-excel');
  };

  const exportPdf = () => {
    window.print();
  };

  return (
    <div className='flex w-full flex-col gap-6 p-4'>
      <Card>
        <CardHeader>
          <CardTitle>Session summary</CardTitle>
          <CardDescription>Quick recap and next actions.</CardDescription>
        </CardHeader>
      </Card>

      <div className='grid gap-6 lg:grid-cols-[1.2fr_0.8fr]'>
        <Card>
          <CardHeader>
            <CardTitle>Session details</CardTitle>
            <CardDescription>Finalized attendance snapshot.</CardDescription>
          </CardHeader>
          <CardContent className='grid gap-4 md:grid-cols-2'>
            <div>
              <p className='text-muted-foreground text-xs uppercase'>Module</p>
              <p className='text-sm font-medium'>{module}</p>
            </div>
            <div>
              <p className='text-muted-foreground text-xs uppercase'>Room</p>
              <p className='text-sm font-medium'>{room}</p>
            </div>
            <div>
              <p className='text-muted-foreground text-xs uppercase'>Code</p>
              <p className='text-sm font-medium tracking-widest'>{code}</p>
            </div>
            <div>
              <p className='text-muted-foreground text-xs uppercase'>Start</p>
              <p className='text-sm font-medium'>{summary.start}</p>
            </div>
            <div>
              <p className='text-muted-foreground text-xs uppercase'>Duration</p>
              <p className='text-sm font-medium'>{summary.duration}</p>
            </div>
            <div>
              <p className='text-muted-foreground text-xs uppercase'>Present</p>
              <p className='text-sm font-medium'>{summary.present}</p>
            </div>
            <div>
              <p className='text-muted-foreground text-xs uppercase'>Absent</p>
              <p className='text-sm font-medium'>{summary.absent}</p>
            </div>
            <div className='md:col-span-2'>
              <Badge className='bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/20 dark:text-emerald-400'>
                Attendance rate {summary.rate}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Next actions</CardTitle>
            <CardDescription>Export or continue sessions.</CardDescription>
          </CardHeader>
          <CardContent className='flex flex-col gap-2'>
            <Button variant='outline' onClick={exportPdf}>
              Export PDF
            </Button>
            <Button variant='outline' onClick={exportCsv}>
              Export CSV
            </Button>
            <Button variant='outline' onClick={exportExcel}>
              Export Excel
            </Button>
            <Button asChild>
              <Link href='/dashboard/attendance'>Go to Attendance Records</Link>
            </Button>
            <Button asChild variant='secondary'>
              <Link href='/dashboard/session'>Start another session</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Present students</CardTitle>
          <CardDescription>Attendance list for this session.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {presentStudents.map((student) => (
                <TableRow key={student.name}>
                  <TableCell className='font-medium'>
                    {student.name}
                  </TableCell>
                  <TableCell>{student.status}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
