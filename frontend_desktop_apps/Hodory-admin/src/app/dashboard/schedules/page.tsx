'use client';

import * as React from 'react';
import { toast } from 'sonner';

import PageContainer from '@/components/layout/page-container';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';

import {
  LEVELS,
  type LevelCode,
  getLevelInfo
} from '@/features/admin/catalog/levels';
import { useAdminStore } from '@/features/admin/store/admin-store';
import {
  SCHEDULE_DAYS,
  SCHEDULE_SLOTS,
  createEmptyLevelSchedule,
  getScheduleEntry,
  upsertScheduleEntry,
  type ScheduleDay,
  type ScheduleSlot
} from '@/features/admin/schedules/schedule-model';
import { cn } from '@/lib/utils';

type CellKey = { day: ScheduleDay; time: ScheduleSlot };

export default function SchedulesPage() {
  const { store, setStore } = useAdminStore();

  const [levelCode, setLevelCode] = React.useState<LevelCode>(
    () => LEVELS[0]?.code ?? 'LMD1'
  );
  const [cellOpen, setCellOpen] = React.useState(false);
  const [cellKey, setCellKey] = React.useState<CellKey | null>(null);
  const [moduleDraft, setModuleDraft] = React.useState<string>('__empty__');

  const schedule = React.useMemo(() => {
    return store.schedules.find((s) => s.levelCode === levelCode) ?? null;
  }, [store.schedules, levelCode]);

  const modulesForLevel = React.useMemo(() => {
    return store.modules
      .filter((m) => m.levelCode === levelCode)
      .slice()
      .sort((a, b) => a.code.localeCompare(b.code));
  }, [store.modules, levelCode]);

  const moduleByCode = React.useMemo(() => {
    const map = new Map<string, { code: string; name: string }>();
    for (const module of modulesForLevel) map.set(module.code, module);
    return map;
  }, [modulesForLevel]);

  const openCell = (day: ScheduleDay, time: ScheduleSlot) => {
    setCellKey({ day, time });
    const current = schedule
      ? getScheduleEntry(schedule, day, time)
      : undefined;
    setModuleDraft(current?.moduleCode ?? '__empty__');
    setCellOpen(true);
  };

  const ensureSchedule = (target: LevelCode) => {
    setStore((current) => {
      const exists = current.schedules.some((s) => s.levelCode === target);
      if (exists) return current;
      return {
        ...current,
        schedules: [createEmptyLevelSchedule(target), ...current.schedules]
      };
    });
  };

  const createSchedule = () => {
    if (schedule) {
      toast.info('This level already has a schedule.');
      return;
    }
    ensureSchedule(levelCode);
    toast.success('Schedule created.');
  };

  const deleteSchedule = async () => {
    if (!schedule) return;
    setStore((current) => ({
      ...current,
      schedules: current.schedules.filter((s) => s.levelCode !== levelCode)
    }));
    toast.success('Schedule deleted.');
  };

  const saveCell = async () => {
    if (!cellKey) return;
    if (!modulesForLevel.length) {
      toast.error('No modules found for this level.');
      return;
    }

    const selectedModuleCode = moduleDraft === '__empty__' ? null : moduleDraft;
    if (selectedModuleCode && !moduleByCode.has(selectedModuleCode)) {
      toast.error('Invalid module selected.');
      return;
    }

    setStore((current) => {
      const nextSchedules = current.schedules.slice();
      let index = nextSchedules.findIndex((s) => s.levelCode === levelCode);
      if (index < 0) {
        nextSchedules.unshift(createEmptyLevelSchedule(levelCode));
        index = 0;
      }
      const existing = nextSchedules[index]!;
      nextSchedules[index] = upsertScheduleEntry(
        existing,
        cellKey.day,
        cellKey.time,
        selectedModuleCode
      );
      return { ...current, schedules: nextSchedules };
    });

    setCellOpen(false);
    toast.success(selectedModuleCode ? 'Session updated.' : 'Session cleared.');
  };

  const levelInfo = getLevelInfo(levelCode);

  return (
    <PageContainer
      pageTitle='Schedules'
      pageDescription='Create and manage weekly study schedules per level (Sunday → Thursday, 1h30 sessions).'
      pageHeaderAction={
        <div className='flex items-center gap-2'>
          <Button variant='secondary' onClick={createSchedule}>
            Create schedule
          </Button>
          <ConfirmDialog
            title='Delete schedule?'
            description='This will remove all sessions for this level.'
            confirmLabel='Delete'
            destructive
            disabled={!schedule}
            trigger={
              <Button variant='destructive' disabled={!schedule}>
                Delete schedule
              </Button>
            }
            onConfirm={deleteSchedule}
          />
        </div>
      }
    >
      <div className='grid gap-6 lg:grid-cols-[360px_1fr]'>
        <Card>
          <CardHeader>
            <CardTitle>Level</CardTitle>
            <CardDescription>
              Select a level to edit its schedule.
            </CardDescription>
          </CardHeader>
          <CardContent className='grid gap-4'>
            <div className='grid gap-2'>
              <Label>Year level</Label>
              <Select
                value={levelCode}
                onValueChange={(value) => setLevelCode(value as LevelCode)}
              >
                <SelectTrigger>
                  <SelectValue placeholder='Select a level' />
                </SelectTrigger>
                <SelectContent>
                  {LEVELS.map((level) => (
                    <SelectItem key={level.code} value={level.code}>
                      {level.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className='text-muted-foreground text-xs'>
                {levelInfo
                  ? `${levelInfo.label} (${levelInfo.speciality})`
                  : levelCode}
              </p>
            </div>

            <Separator />

            <div className='grid gap-2'>
              <div className='flex items-center justify-between'>
                <p className='text-sm font-medium'>Modules</p>
                <Badge variant='secondary'>{modulesForLevel.length}</Badge>
              </div>
              {modulesForLevel.length === 0 ? (
                <p className='text-muted-foreground text-sm'>
                  No modules available for this level.
                </p>
              ) : (
                <div className='grid max-h-[320px] gap-2 overflow-auto rounded-lg border p-3 text-sm'>
                  {modulesForLevel.map((module) => (
                    <div
                      key={module.code}
                      className='flex items-start justify-between gap-2'
                    >
                      <div className='min-w-0'>
                        <p className='truncate font-medium'>{module.name}</p>
                        <p className='text-muted-foreground truncate text-xs'>
                          {module.code}
                        </p>
                      </div>
                      <Badge variant='outline' className='shrink-0'>
                        {module.semester ?? '—'}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Weekly schedule</CardTitle>
            <CardDescription>
              Click a cell to assign a module (or clear it).
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!schedule ? (
              <div className='rounded-lg border border-dashed p-8 text-center'>
                <p className='text-sm font-medium'>No schedule yet</p>
                <p className='text-muted-foreground mt-1 text-sm'>
                  Create a schedule for {levelCode} to start assigning sessions.
                </p>
                <Button className='mt-4' onClick={createSchedule}>
                  Create schedule
                </Button>
              </div>
            ) : (
              <Table className='table-fixed'>
                <TableHeader>
                  <TableRow>
                    <TableHead className='w-[140px]'>Time</TableHead>
                    {SCHEDULE_DAYS.map((day) => (
                      <TableHead key={day}>{day}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {SCHEDULE_SLOTS.map((time) => (
                    <TableRow key={time}>
                      <TableCell className='font-medium'>{time}</TableCell>
                      {SCHEDULE_DAYS.map((day) => {
                        const entry = getScheduleEntry(schedule, day, time);
                        const module = entry
                          ? moduleByCode.get(entry.moduleCode)
                          : null;
                        const hasValue = Boolean(entry?.moduleCode);
                        return (
                          <TableCell key={`${day}|${time}`} className='p-0'>
                            <button
                              type='button'
                              onClick={() => openCell(day, time)}
                              className={cn(
                                'flex h-full min-h-[52px] w-full flex-col items-start justify-center gap-0.5 px-2 py-2 text-left transition-colors',
                                hasValue
                                  ? 'hover:bg-muted/60'
                                  : 'text-muted-foreground hover:bg-muted/40'
                              )}
                            >
                              {hasValue ? (
                                <>
                                  <span className='truncate text-xs font-medium'>
                                    {module?.name ?? 'Unknown module'}
                                  </span>
                                  <span className='text-muted-foreground truncate text-[11px]'>
                                    {entry?.moduleCode ?? ''}
                                  </span>
                                </>
                              ) : (
                                <span className='text-xs'>—</span>
                              )}
                            </button>
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog
        open={cellOpen}
        onOpenChange={(open) => {
          setCellOpen(open);
          if (!open) setCellKey(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit session</DialogTitle>
            <DialogDescription>
              {cellKey ? `${cellKey.day} • ${cellKey.time} • ${levelCode}` : ''}
            </DialogDescription>
          </DialogHeader>

          <div className='grid gap-2'>
            <Label>Module</Label>
            <Select
              value={moduleDraft}
              onValueChange={setModuleDraft}
              disabled={!modulesForLevel.length}
            >
              <SelectTrigger>
                <SelectValue placeholder='Select a module' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='__empty__'>Empty</SelectItem>
                {modulesForLevel.map((module) => (
                  <SelectItem key={module.code} value={module.code}>
                    {module.code} — {module.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!modulesForLevel.length ? (
              <p className='text-muted-foreground text-xs'>
                Add modules for this level before scheduling sessions.
              </p>
            ) : null}
          </div>

          <DialogFooter className='gap-2 sm:gap-0'>
            <Button variant='outline' onClick={() => setCellOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveCell}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
