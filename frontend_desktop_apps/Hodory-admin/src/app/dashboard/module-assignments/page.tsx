'use client';

import * as React from 'react';
import { toast } from 'sonner';

import PageContainer from '@/components/layout/page-container';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ConfirmDialog } from '@/components/confirm-dialog';

import { readCache, writeCache } from '@/lib/cache';
import {
  createAdminTeacherModule,
  deleteAdminTeacherModule,
  getAdminModules,
  getAdminTeacherModules,
  getAdminTeachers,
  type AdminModuleRow,
  type AdminTeacherRow,
  type AdminTeacherModuleAssignment
} from '@/lib/admin-api';

const CACHE_ASSIGNMENTS = 'hodory_admin_assignments_v1';
const CACHE_TEACHERS = 'hodory_admin_teachers_v1';
const CACHE_MODULES = 'hodory_admin_modules_v1';
const CACHE_MAX_AGE = 5 * 60_000;

export default function ModuleAssignmentsPage() {
  const [teachers, setTeachers] = React.useState<AdminTeacherRow[]>([]);
  const [modules, setModules] = React.useState<AdminModuleRow[]>([]);
  const [assignments, setAssignments] = React.useState<AdminTeacherModuleAssignment[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  const [teacherId, setTeacherId] = React.useState<string>('__none__');
  const [moduleId, setModuleId] = React.useState<string>('__none__');

  const load = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const [t, m, a] = await Promise.all([
        getAdminTeachers({ skip: 0, limit: 500 }),
        getAdminModules({ skip: 0, limit: 500 }),
        getAdminTeacherModules()
      ]);
      setTeachers(t.data ?? []);
      writeCache(CACHE_TEACHERS, t.data ?? []);
      setModules(m.data ?? []);
      writeCache(CACHE_MODULES, m.data ?? []);
      setAssignments(a.data ?? []);
      writeCache(CACHE_ASSIGNMENTS, a.data ?? []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load assignments');
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    const cachedTeachers = readCache<AdminTeacherRow[]>(CACHE_TEACHERS, CACHE_MAX_AGE);
    if (cachedTeachers) setTeachers(cachedTeachers);
    const cachedModules = readCache<AdminModuleRow[]>(CACHE_MODULES, CACHE_MAX_AGE);
    if (cachedModules) setModules(cachedModules);
    const cachedAssignments = readCache<AdminTeacherModuleAssignment[]>(CACHE_ASSIGNMENTS, CACHE_MAX_AGE);
    if (cachedAssignments) {
      setAssignments(cachedAssignments);
      setIsLoading(false);
    }
    void load();
  }, [load]);

  const createAssignment = async () => {
    const tid = Number(teacherId);
    const mid = Number(moduleId);
    if (!Number.isFinite(tid) || !Number.isFinite(mid)) {
      toast.error('Select both a teacher and a module.');
      return;
    }
    try {
      await createAdminTeacherModule({ teacher_id: tid, module_id: mid });
      toast.success('Assigned successfully.');
      setTeacherId('__none__');
      setModuleId('__none__');
      void load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Assignment failed');
    }
  };

  const removeAssignment = async (teacherModuleId: number) => {
    try {
      await deleteAdminTeacherModule(teacherModuleId);
      toast.success('Unassigned successfully.');
      setAssignments((prev) => prev.filter((a) => a.id !== teacherModuleId));
      writeCache(CACHE_ASSIGNMENTS, assignments.filter((a) => a.id !== teacherModuleId));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Unassign failed');
    }
  };

  const sortedAssignments = React.useMemo(() => {
    return assignments
      .slice()
      .sort((a, b) => {
        const am = a.module?.code ?? '';
        const bm = b.module?.code ?? '';
        return am.localeCompare(bm);
      });
  }, [assignments]);

  return (
    <PageContainer
      pageTitle='Module Assignments'
      pageDescription='Assign/unassign teachers to modules.'
      pageHeaderAction={<Button variant='outline' onClick={load} disabled={isLoading}>Refresh</Button>}
    >
      <Card>
        <CardHeader>
          <CardTitle>Create assignment</CardTitle>
          <CardDescription>Links a teacher to a module.</CardDescription>
        </CardHeader>
        <CardContent className='grid gap-4 md:grid-cols-3'>
          <div className='grid gap-2'>
            <Label>Teacher</Label>
            <Select value={teacherId} onValueChange={setTeacherId}>
              <SelectTrigger>
                <SelectValue placeholder='Select teacher' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='__none__'>Select…</SelectItem>
                {teachers.map((t) => (
                  <SelectItem key={t.id} value={String(t.id)}>
                    {t.full_name} ({t.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className='grid gap-2'>
            <Label>Module</Label>
            <Select value={moduleId} onValueChange={setModuleId}>
              <SelectTrigger>
                <SelectValue placeholder='Select module' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='__none__'>Select…</SelectItem>
                {modules.map((m) => (
                  <SelectItem key={m.id} value={String(m.id)}>
                    {m.code ?? '—'} — {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className='flex items-end'>
            <Button onClick={createAssignment}>Assign</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Assignments</CardTitle>
          <CardDescription>Loaded from backend.</CardDescription>
        </CardHeader>
        <CardContent className='grid gap-2'>
          {isLoading ? (
            <div className='text-sm text-muted-foreground'>Loading…</div>
          ) : sortedAssignments.length ? (
            sortedAssignments.map((a) => (
              <div key={a.id} className='flex items-center justify-between rounded-lg border border-border/60 p-3'>
                <div className='min-w-0'>
                  <div className='truncate text-sm font-medium'>
                    {a.module?.code ?? '—'} — {a.module?.name ?? '—'}
                  </div>
                  <div className='truncate text-xs text-muted-foreground'>
                    {a.teacher?.full_name ?? '—'} ({a.teacher?.email ?? '—'})
                  </div>
                </div>
                <ConfirmDialog
                  title='Unassign teacher from module?'
                  description='This deletes the teacher-module assignment (blocked if sessions exist).'
                  confirmLabel='Unassign'
                  destructive
                  trigger={<Button size='sm' variant='destructive'>Unassign</Button>}
                  onConfirm={() => removeAssignment(a.id)}
                />
              </div>
            ))
          ) : (
            <div className='text-sm text-muted-foreground'>No assignments.</div>
          )}
        </CardContent>
      </Card>
    </PageContainer>
  );
}

