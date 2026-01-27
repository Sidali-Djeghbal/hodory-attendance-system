'use client';

import * as React from 'react';
import { toast } from 'sonner';

import PageContainer from '@/components/layout/page-container';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { DataTable, type DataTableColumn } from '@/components/data-table/data-table';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

import { useAdminStore, type Module } from '@/features/admin/store/admin-store';
import {
  LEVELS,
  SPECIALITIES,
  levelsForSpeciality,
  type LevelCode,
  type SpecialityCode
} from '@/features/admin/catalog/levels';

type ModuleDraft = {
  code: string;
  name: string;
  speciality: SpecialityCode;
  levelCode: LevelCode;
  semester?: Module['semester'];
};

export default function ModulesPage() {
  const { store, setStore } = useAdminStore();

  const [levelFilter, setLevelFilter] = React.useState('all');
  const [semesterFilter, setSemesterFilter] = React.useState('all');

  const [editorOpen, setEditorOpen] = React.useState(false);
  const [editingCode, setEditingCode] = React.useState<string | null>(null);
  const [draft, setDraft] = React.useState<ModuleDraft>({
    code: '',
    name: '',
    speciality: 'LMD',
    levelCode: 'LMD1',
    semester: 'S1'
  });
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const teacherNameById = React.useMemo(() => {
    return new Map(store.teachers.map((t) => [t.teacherId, t.fullName] as const));
  }, [store.teachers]);

  const assignedTeacherNamesByModule = React.useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const assignment of store.assignments) {
      const teacherName = teacherNameById.get(assignment.teacherId) ?? assignment.teacherId;
      const set = map.get(assignment.moduleCode) ?? new Set<string>();
      set.add(teacherName);
      map.set(assignment.moduleCode, set);
    }
    const joined = new Map<string, string>();
    map.forEach((names, moduleCode) => {
      joined.set(moduleCode, Array.from(names).sort().join(', '));
    });
    return joined;
  }, [store.assignments, teacherNameById]);

  const filteredModules = React.useMemo(() => {
    return store.modules.filter((m) => {
      if (levelFilter !== 'all' && m.levelCode !== levelFilter) return false;
      if (semesterFilter !== 'all' && (m.semester ?? 'all') !== semesterFilter) return false;
      return true;
    });
  }, [store.modules, levelFilter, semesterFilter]);

  const openCreate = () => {
    setEditingCode(null);
    setDraft({ code: '', name: '', speciality: 'LMD', levelCode: 'LMD1', semester: 'S1' });
    setErrors({});
    setEditorOpen(true);
  };

  const openEdit = (module: Module) => {
    setEditingCode(module.code);
    setDraft({
      code: module.code,
      name: module.name,
      speciality: module.speciality,
      levelCode: module.levelCode,
      semester: module.semester
    });
    setErrors({});
    setEditorOpen(true);
  };

  const validate = (candidate: ModuleDraft) => {
    const nextErrors: Record<string, string> = {};
    if (!candidate.code.trim()) nextErrors.code = 'Module code is required.';
    if (!candidate.name.trim()) nextErrors.name = 'Module name is required.';

    const isEditing = Boolean(editingCode);
    const duplicate = store.modules.some((m) => {
      const sameKey = m.code === candidate.code;
      if (!sameKey) return false;
      if (!isEditing) return true;
      return m.code !== editingCode;
    });

    if (duplicate) {
      nextErrors.uniqueness = 'A module with this code already exists.';
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const saveModule = async () => {
    const levelInfo = LEVELS.find((l) => l.code === draft.levelCode);
    const inferredSpeciality = (levelInfo?.speciality ??
      draft.speciality) as SpecialityCode;

    const candidate: ModuleDraft = {
      code: draft.code.trim().toUpperCase(),
      name: draft.name.trim(),
      speciality: inferredSpeciality,
      levelCode: draft.levelCode,
      semester: draft.semester
    };
    if (!validate(candidate)) return;

    const isEditing = Boolean(editingCode);
    setStore((current) => {
      const next = { ...current, modules: current.modules.slice() };
      if (isEditing) {
        const index = next.modules.findIndex(
          (m) => m.code === editingCode
        );
        if (index >= 0) next.modules[index] = candidate;
      } else {
        next.modules.unshift(candidate);
      }
      return next;
    });

    toast.success(isEditing ? 'Module information updated successfully.' : 'Module created successfully.');
    setEditorOpen(false);
  };

  const canDeleteModule = (code: string) => {
    const hasActive = store.sessions.some((s) => s.moduleCode === code && s.status === 'active');
    return !hasActive;
  };

  const deleteModule = async (code: string) => {
    if (!canDeleteModule(code)) {
      toast.error('This module has active attendance sessions. Deletion is not allowed for now.');
      return;
    }

    setStore((current) => ({
      ...current,
      modules: current.modules.filter((m) => m.code !== code),
      assignments: current.assignments.filter((a) => a.moduleCode !== code),
      sessions: current.sessions.filter((s) => s.moduleCode !== code),
      students: current.students.map((s) => ({ ...s, modules: s.modules.filter((m) => m !== code) }))
    }));
    toast.success('Module deleted.');
  };

  const columns: Array<DataTableColumn<Module & { assignedTeacherNames: string }>> = [
    { key: 'name', header: 'Module name', sortable: true, accessor: (m) => m.name, cell: (m) => <span className='font-medium'>{m.name}</span> },
    { key: 'levelCode', header: 'Level', sortable: true, accessor: (m) => m.levelCode },
    {
      key: 'assignedTeacherNames',
      header: 'Assigned teachers',
      accessor: (m) => m.assignedTeacherNames,
      cell: (m) => <span className='line-clamp-2'>{m.assignedTeacherNames || '—'}</span>
    },
    {
      key: 'actions',
      header: '',
      cell: (m) => {
        const deleteBlocked = !canDeleteModule(m.code);
        return (
          <div className='flex justify-end gap-2'>
            <Button size='sm' variant='outline' onClick={(e) => { e.stopPropagation(); openEdit(m); }}>
              Edit
            </Button>
            {deleteBlocked ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span onClick={(e) => e.stopPropagation()}>
                    <Button size='sm' variant='destructive' disabled>
                      Delete
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent sideOffset={8}>
                  Active attendance session running for this module.
                </TooltipContent>
              </Tooltip>
            ) : (
              <ConfirmDialog
                title='Delete module?'
                description='This will remove the module and clean up related assignments, sessions, and enrollments.'
                confirmLabel='Delete'
                destructive
                trigger={
                  <Button size='sm' variant='destructive' onClick={(e) => e.stopPropagation()}>
                    Delete
                  </Button>
                }
                onConfirm={() => deleteModule(m.code)}
              />
            )}
          </div>
        );
      }
    }
  ];

  const tableRows = filteredModules.map((m) => ({
    ...m,
    assignedTeacherNames: assignedTeacherNamesByModule.get(m.code) ?? ''
  }));

  return (
    <PageContainer
      pageTitle='Modules'
      pageDescription='Manage modules: add, update, and delete with constraints.'
      pageHeaderAction={<Button onClick={openCreate}>Add Module</Button>}
    >
      <Card>
        <CardHeader>
          <CardTitle>Module list</CardTitle>
          <CardDescription>Delete is blocked when the module has active attendance sessions.</CardDescription>
        </CardHeader>
        <CardContent className='grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-0'>
          <div className='grid gap-2'>
            <Label>Level</Label>
            <Select value={levelFilter} onValueChange={setLevelFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>All</SelectItem>
                {LEVELS.map((l) => (
                  <SelectItem key={l.code} value={l.code}>
                    {l.code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className='grid gap-2'>
            <Label>Semester</Label>
            <Select value={semesterFilter} onValueChange={setSemesterFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>All</SelectItem>
                <SelectItem value='S1'>S1</SelectItem>
                <SelectItem value='S2'>S2</SelectItem>
                <SelectItem value='S3'>S3</SelectItem>
                <SelectItem value='S4'>S4</SelectItem>
                <SelectItem value='S5'>S5</SelectItem>
                <SelectItem value='S6'>S6</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
        <CardContent>
          <DataTable
            rows={tableRows}
            columns={columns}
            searchPlaceholder='Search by module name or code…'
            searchFn={(row, q) =>
              [row.code, row.name, row.levelCode].some((value) => value.toLowerCase().includes(q))
            }
            emptyState='No modules found.'
          />
        </CardContent>
      </Card>

      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCode ? 'Update module' : 'Add module'}</DialogTitle>
            <DialogDescription>
              {editingCode ? 'Edit module information.' : 'Create a new module. Code must be unique.'}
            </DialogDescription>
          </DialogHeader>

          {errors.uniqueness ? (
            <div className='rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive'>
              {errors.uniqueness}
            </div>
          ) : null}

          <div className='grid gap-4 md:grid-cols-2'>
            <div className='grid gap-2'>
              <Label htmlFor='code'>Module code</Label>
              <Input id='code' value={draft.code} onChange={(e) => setDraft((d) => ({ ...d, code: e.target.value }))} />
              {errors.code ? <p className='text-xs text-destructive'>{errors.code}</p> : null}
            </div>
            <div className='grid gap-2'>
              <Label>Speciality</Label>
              <Select
                value={draft.speciality}
                onValueChange={(value) => {
                  const speciality = value as SpecialityCode;
                  const nextLevel =
                    levelsForSpeciality(speciality)[0]?.code ?? draft.levelCode;
                  setDraft((d) => ({
                    ...d,
                    speciality,
                    levelCode: nextLevel
                  }));
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SPECIALITIES.map((s) => (
                    <SelectItem key={s.code} value={s.code}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className='grid gap-2'>
              <Label>Level</Label>
              <Select
                value={draft.levelCode}
                onValueChange={(value) => {
                  const levelCode = value as LevelCode;
                  const levelInfo = LEVELS.find((l) => l.code === levelCode);
                  const speciality = (levelInfo?.speciality ??
                    draft.speciality) as SpecialityCode;
                  setDraft((d) => ({
                    ...d,
                    speciality,
                    levelCode
                  }));
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {levelsForSpeciality(draft.speciality).map((l) => (
                    <SelectItem key={l.code} value={l.code}>
                      {l.code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className='grid gap-2 md:col-span-2'>
              <Label htmlFor='name'>Module name</Label>
              <Input id='name' value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} />
              {errors.name ? <p className='text-xs text-destructive'>{errors.name}</p> : null}
            </div>
            <div className='grid gap-2'>
              <Label>Semester</Label>
              <Select value={draft.semester ?? 'S1'} onValueChange={(value) => setDraft((d) => ({ ...d, semester: value as Module['semester'] }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='S1'>S1</SelectItem>
                  <SelectItem value='S2'>S2</SelectItem>
                  <SelectItem value='S3'>S3</SelectItem>
                  <SelectItem value='S4'>S4</SelectItem>
                  <SelectItem value='S5'>S5</SelectItem>
                  <SelectItem value='S6'>S6</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className='grid gap-2'>
              <Label>Status</Label>
              <div className='flex items-center gap-2 pt-2 text-sm text-muted-foreground'>
                <Badge variant='secondary'>Active</Badge>
                <span>Modules are always active in this demo.</span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant='outline' onClick={() => setEditorOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void saveModule()}>
              {editingCode ? 'Save Changes' : 'Create Module'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
