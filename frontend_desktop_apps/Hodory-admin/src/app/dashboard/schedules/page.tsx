'use client';

import * as React from 'react';
import { toast } from 'sonner';

import PageContainer from '@/components/layout/page-container';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

import { readCache, writeCache } from '@/lib/cache';
import {
  createAdminSchedule,
  createAdminSDay,
  deleteAdminSDay,
  getAdminLevels,
  updateAdminSDay,
  type AdminLevel
} from '@/lib/admin-api';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'] as const;
const TIMES = ['08:00-09:30', '09:45-11:15', '11:30-13:00', '14:00-15:30', '15:45-17:15'] as const;

function toApiDay(day: (typeof DAYS)[number]) {
  return day.toLowerCase();
}

function toUiDay(day?: string | null) {
  const value = (day ?? '').toLowerCase();
  const match = DAYS.find((d) => d.toLowerCase() === value);
  return match ?? null;
}

type CellKey = { day: (typeof DAYS)[number]; time: (typeof TIMES)[number] };

type CellValue = {
  sdayId: number;
  moduleId: number;
  moduleCode?: string | null;
  moduleName?: string | null;
};

const CACHE_LEVELS = 'hodory_admin_levels_v1';
const CACHE_MAX_AGE = 5 * 60_000;

export default function SchedulesPage() {
  const [levels, setLevels] = React.useState<AdminLevel[]>([]);
  const [levelId, setLevelId] = React.useState<string>('');
  const [isLoading, setIsLoading] = React.useState(true);

  const [cellOpen, setCellOpen] = React.useState(false);
  const [cellKey, setCellKey] = React.useState<CellKey | null>(null);
  const [moduleDraft, setModuleDraft] = React.useState<string>('__empty__');

  const load = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await getAdminLevels();
      setLevels(res.data ?? []);
      writeCache(CACHE_LEVELS, res.data ?? []);
      if (!levelId && res.data?.[0]?.id) setLevelId(String(res.data[0].id));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load levels');
    } finally {
      setIsLoading(false);
    }
  }, [levelId]);

  React.useEffect(() => {
    const cached = readCache<AdminLevel[]>(CACHE_LEVELS, CACHE_MAX_AGE);
    if (cached) {
      setLevels(cached);
      if (!levelId && cached[0]?.id) setLevelId(String(cached[0].id));
      setIsLoading(false);
    }
    void load();
  }, [load, levelId]);

  const selectedLevel = React.useMemo(() => {
    const id = Number(levelId);
    if (!Number.isFinite(id)) return null;
    return levels.find((l) => l.id === id) ?? null;
  }, [levels, levelId]);

  const modulesForLevel = React.useMemo(() => {
    return (selectedLevel?.modules ?? []).slice().sort((a, b) => (a.code ?? '').localeCompare(b.code ?? ''));
  }, [selectedLevel?.modules]);

  const cellMap = React.useMemo(() => {
    const map = new Map<string, CellValue>();
    const sdays = selectedLevel?.schedule?.sdays ?? [];
    for (const sday of sdays) {
      const uiDay = toUiDay(sday.day);
      const time = sday.time as (typeof TIMES)[number];
      if (!uiDay) continue;
      if (!TIMES.includes(time)) continue;
      map.set(`${uiDay}|${time}`, {
        sdayId: sday.id,
        moduleId: sday.module_id,
        moduleCode: sday.module_code,
        moduleName: sday.module_name
      });
    }
    return map;
  }, [selectedLevel?.schedule?.sdays]);

  const openCell = (day: (typeof DAYS)[number], time: (typeof TIMES)[number]) => {
    setCellKey({ day, time });
    const current = cellMap.get(`${day}|${time}`);
    setModuleDraft(current ? String(current.moduleId) : '__empty__');
    setCellOpen(true);
  };

  const createSchedule = async () => {
    const id = Number(levelId);
    if (!Number.isFinite(id)) return;
    try {
      await createAdminSchedule({ level_id: id });
      toast.success('Schedule created.');
      void load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Create schedule failed');
    }
  };

  const saveCell = async () => {
    if (!cellKey || !selectedLevel) return;
    const existing = cellMap.get(`${cellKey.day}|${cellKey.time}`);
    const chosen = moduleDraft === '__empty__' ? null : Number(moduleDraft);
    if (moduleDraft !== '__empty__' && !Number.isFinite(chosen)) {
      toast.error('Invalid module.');
      return;
    }

    try {
      if (existing && chosen == null) {
        await deleteAdminSDay(existing.sdayId);
        toast.success('Session cleared.');
      } else if (existing && chosen != null) {
        await updateAdminSDay(existing.sdayId, { module_id: chosen });
        toast.success('Session updated.');
      } else if (!existing && chosen != null) {
        await createAdminSDay({
          level_id: selectedLevel.id,
          day: toApiDay(cellKey.day),
          time: cellKey.time,
          module_id: chosen
        });
        toast.success('Session created.');
      }

      setCellOpen(false);
      void load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Save failed');
    }
  };

  return (
    <PageContainer
      pageTitle='Schedules'
      pageDescription='Manage weekly schedules per level.'
      pageHeaderAction={
        <div className='flex gap-2'>
          <Button variant='outline' onClick={load} disabled={isLoading}>Refresh</Button>
          <Button variant='secondary' onClick={createSchedule} disabled={!selectedLevel}>Create schedule</Button>
        </div>
      }
    >
      <Card>
        <CardHeader>
          <CardTitle>Level</CardTitle>
          <CardDescription>Select a level to view/edit its schedule.</CardDescription>
        </CardHeader>
        <CardContent className='grid gap-2 max-w-md'>
          <Label>Level</Label>
          <Select value={levelId} onValueChange={setLevelId}>
            <SelectTrigger>
              <SelectValue placeholder='Select level' />
            </SelectTrigger>
            <SelectContent>
              {levels.map((l) => (
                <SelectItem key={l.id} value={String(l.id)}>
                  {l.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Weekly schedule</CardTitle>
          <CardDescription>Click a cell to assign/clear a module.</CardDescription>
        </CardHeader>
        <CardContent>
          {!selectedLevel?.schedule ? (
            <div className='rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground'>
              No schedule yet for this level. Click “Create schedule”.
            </div>
          ) : (
            <Table className='table-fixed'>
              <TableHeader>
                <TableRow>
                  <TableHead className='w-[140px]'>Time</TableHead>
                  {DAYS.map((day) => (
                    <TableHead key={day}>{day}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {TIMES.map((time) => (
                  <TableRow key={time}>
                    <TableCell className='font-medium'>{time}</TableCell>
                    {DAYS.map((day) => {
                      const entry = cellMap.get(`${day}|${time}`);
                      return (
                        <TableCell key={`${day}|${time}`} className='p-0'>
                          <button
                            type='button'
                            onClick={() => openCell(day, time)}
                            className='flex h-full min-h-[56px] w-full flex-col items-start justify-center gap-0.5 px-2 py-2 text-left transition-colors hover:bg-muted/40'
                          >
                            {entry ? (
                              <>
                                <span className='truncate text-xs font-medium'>{entry.moduleName ?? 'Unknown module'}</span>
                                <span className='truncate text-[11px] text-muted-foreground'>{entry.moduleCode ?? ''}</span>
                              </>
                            ) : (
                              <span className='text-xs text-muted-foreground'>—</span>
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

      <Dialog open={cellOpen} onOpenChange={setCellOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schedule slot</DialogTitle>
            <DialogDescription>
              {cellKey ? `${cellKey.day} • ${cellKey.time}` : '—'}
            </DialogDescription>
          </DialogHeader>

          <div className='grid gap-2'>
            <Label>Module</Label>
            <Select value={moduleDraft} onValueChange={setModuleDraft}>
              <SelectTrigger>
                <SelectValue placeholder='Select module' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='__empty__'>— (clear)</SelectItem>
                {modulesForLevel.map((m) => (
                  <SelectItem key={m.id} value={String(m.id)}>
                    {m.code ?? '—'} — {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button variant='outline' onClick={() => setCellOpen(false)}>Cancel</Button>
            <Button onClick={saveCell}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}

