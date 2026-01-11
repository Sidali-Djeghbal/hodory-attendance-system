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
import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from 'recharts';

const data = [
  { module: 'AABDD', rate: 92 },
  { module: 'SOFENG', rate: 88 },
  { module: 'COMPIL', rate: 81 },
  { module: 'ALGDS', rate: 76 },
  { module: 'NETSYS', rate: 83 }
];

export default function BarStats() {
  const { selectedModule, setSelectedModule } = useAttendanceSelection();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Attendance rate by module</CardTitle>
        <CardDescription>
          Last 6 sessions by module. Click a bar to update the trend.
        </CardDescription>
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
