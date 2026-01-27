'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent
} from '@/components/ui/chart';
import { useAttendanceSelection } from '@/features/overview/components/attendance-context';
import {
  Line,
  LineChart,
  CartesianGrid,
  ResponsiveContainer,
  XAxis,
  YAxis
} from 'recharts';
import * as React from 'react';
import { useAuth } from '@/features/auth/auth-context';
import { getTeacherSessions, type TeacherSession } from '@/lib/teacher-api';

function formatShort(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: '2-digit' }).format(date);
}

export default function AreaStats() {
  const { selectedModule } = useAttendanceSelection();
  const { token } = useAuth();
  const [sessions, setSessions] = React.useState<TeacherSession[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    if (!token) return;
    let cancelled = false;
    setIsLoading(true);
    getTeacherSessions(token)
      .then((result) => {
        if (cancelled) return;
        setSessions(result.sessions ?? []);
      })
      .finally(() => setIsLoading(false));
    return () => {
      cancelled = true;
    };
  }, [token]);

  const data = React.useMemo(() => {
    const filtered = sessions
      .filter((s) => s.module?.code === selectedModule)
      .slice()
      .sort(
        (a, b) => new Date(a.date_time).getTime() - new Date(b.date_time).getTime()
      )
      .slice(-6);

    return filtered.map((s) => ({
      session: formatShort(s.date_time),
      rate: s.statistics?.attendance_rate ?? 0
    }));
  }, [sessions, selectedModule]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Attendance trend ({selectedModule})</CardTitle>
        <CardDescription>Selected module over time.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className='text-muted-foreground text-sm'>Loading…</p>
        ) : data.length === 0 ? (
          <p className='text-muted-foreground text-sm'>No sessions for this module yet.</p>
        ) : null}
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
            <LineChart data={data} margin={{ left: 0, right: 12 }}>
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
  );
}
