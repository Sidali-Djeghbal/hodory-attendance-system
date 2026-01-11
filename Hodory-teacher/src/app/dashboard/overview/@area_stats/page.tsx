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

const moduleTrends: Record<string, { session: string; rate: number }[]> = {
  COMPIL: [
    { session: 'S1', rate: 78 },
    { session: 'S2', rate: 83 },
    { session: 'S3', rate: 81 },
    { session: 'S4', rate: 86 },
    { session: 'S5', rate: 84 },
    { session: 'S6', rate: 89 }
  ],
  AABDD: [
    { session: 'S1', rate: 88 },
    { session: 'S2', rate: 90 },
    { session: 'S3', rate: 92 },
    { session: 'S4', rate: 87 },
    { session: 'S5', rate: 91 },
    { session: 'S6', rate: 89 }
  ],
  SOFENG: [
    { session: 'S1', rate: 76 },
    { session: 'S2', rate: 79 },
    { session: 'S3', rate: 82 },
    { session: 'S4', rate: 84 },
    { session: 'S5', rate: 81 },
    { session: 'S6', rate: 86 }
  ],
  ALGDS: [
    { session: 'S1', rate: 72 },
    { session: 'S2', rate: 75 },
    { session: 'S3', rate: 77 },
    { session: 'S4', rate: 79 },
    { session: 'S5', rate: 74 },
    { session: 'S6', rate: 78 }
  ],
  NETSYS: [
    { session: 'S1', rate: 84 },
    { session: 'S2', rate: 86 },
    { session: 'S3', rate: 80 },
    { session: 'S4', rate: 82 },
    { session: 'S5', rate: 85 },
    { session: 'S6', rate: 83 }
  ]
};

export default function AreaStats() {
  const { selectedModule } = useAttendanceSelection();
  const data = moduleTrends[selectedModule] ?? moduleTrends.COMPIL;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Attendance trend ({selectedModule})</CardTitle>
        <CardDescription>Selected module over time.</CardDescription>
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
