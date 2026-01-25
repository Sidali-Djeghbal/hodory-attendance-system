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
import { useAuth } from '@/features/auth/auth-context';
import { getMyModules, getTeacherSessions } from '@/lib/teacher-api';
import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from 'recharts';
import * as React from 'react';

export default function BarStats() {
  const { selectedModule, setSelectedModule } = useAttendanceSelection();
  const { token } = useAuth();
  const [data, setData] = React.useState<Array<{ module: string; rate: number }>>(
    []
  );
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    if (!token) return;
    let cancelled = false;
    setIsLoading(true);

    Promise.all([getMyModules(token), getTeacherSessions(token)])
      .then(([modules, sessions]) => {
        if (cancelled) return;
        const sessionsByModule = new Map<string, number[]>();
        for (const sess of sessions.sessions ?? []) {
          const code = sess.module?.code;
          if (!code) continue;
          const arr = sessionsByModule.get(code) ?? [];
          arr.push(sess.statistics?.attendance_rate ?? 0);
          sessionsByModule.set(code, arr);
        }

        const next = (modules.modules ?? [])
          .map((m) => {
            const rates = sessionsByModule.get(m.module_code) ?? [];
            const last = rates.slice(0, 6);
            const avg =
              last.length > 0
                ? Math.round(
                    (last.reduce((a, b) => a + b, 0) / last.length) * 100
                  ) / 100
                : 0;
            return { module: m.module_code, rate: avg };
          })
          .sort((a, b) => a.module.localeCompare(b.module));
        setData(next);
      })
      .finally(() => setIsLoading(false));

    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Attendance rate by module</CardTitle>
        <CardDescription>
          Average attendance rate (up to last 6 sessions). Click a bar to update
          the trend.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className='text-muted-foreground text-sm'>Loading…</p>
        ) : data.length === 0 ? (
          <p className='text-muted-foreground text-sm'>
            No module sessions yet.
          </p>
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
          <BarChart data={data} margin={{ left: 0, right: 8 }}>
            <CartesianGrid strokeDasharray='3 3' vertical={false} />
            <XAxis dataKey='module' tickLine={false} axisLine={false} />
            <YAxis tickLine={false} axisLine={false} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar
              dataKey='rate'
              fill='var(--color-rate)'
              radius={[6, 6, 0, 0]}
              onClick={(entry) => {
                if (entry?.module) {
                  setSelectedModule(entry.module);
                }
              }}
              className='cursor-pointer'
            >
              {data.map((entry) => (
                <Cell
                  key={entry.module}
                  fill='var(--color-rate)'
                  opacity={entry.module === selectedModule ? 1 : 0.22}
                />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
