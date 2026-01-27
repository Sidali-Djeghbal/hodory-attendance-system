'use client';

import * as React from 'react';
import { toast } from 'sonner';

import PageContainer from '@/components/layout/page-container';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

import { parseCsv } from '@/features/admin/import/csv';
import { useAdminStore, type ModuleAssignment } from '@/features/admin/store/admin-store';
import { downloadCsv } from '@/lib/download';

function uniq<T>(values: T[]) {
  return Array.from(new Set(values));
}

export default function ModuleAssignmentsPage() {
  const { store, setStore } = useAdminStore();

  const searchParams =
    typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const teacherQuery = searchParams?.get('teacher') ?? null;

  const [moduleQuery, setModuleQuery] = React.useState('');
  const [selectedModuleCode, setSelectedModuleCode] = React.useState<string | null>(
    store.modules[0]?.code ?? null
  );

  const [teacherQueryText, setTeacherQueryText] = React.useState('');
  const [selectedTeacherId, setSelectedTeacherId] = React.useState<string | null>(
    teacherQuery ?? store.teachers[0]?.teacherId ?? null
  );

  const [bulkOpen, setBulkOpen] = React.useState(false);
  const [bulkPreview, setBulkPreview] = React.useState<
    Array<{ row: number; assignment?: ModuleAssignment; errors: string[] }>
  >([]);

  const modules = React.useMemo(() => store.modules.slice().sort((a, b) => a.code.localeCompare(b.code)), [store.modules]);
  const teachers = React.useMemo(() => store.teachers.slice().sort((a, b) => a.teacherId.localeCompare(b.teacherId)), [store.teachers]);

  React.useEffect(() => {
    if (!selectedModuleCode && modules.length) setSelectedModuleCode(modules[0]!.code);
  }, [modules, selectedModuleCode]);

  React.useEffect(() => {
    if (!selectedTeacherId && teachers.length) setSelectedTeacherId(teachers[0]!.teacherId);
  }, [teachers, selectedTeacherId]);

  const teacherNameById = React.useMemo(() => new Map(teachers.map((t) => [t.teacherId, t.fullName] as const)), [teachers]);
  const moduleNameByCode = React.useMemo(() => new Map(modules.map((m) => [m.code, m.name] as const)), [modules]);

  const moduleAssignments = React.useMemo(() => {
    if (!selectedModuleCode) return [];
    return store.assignments.filter((a) => a.moduleCode === selectedModuleCode);
  }, [store.assignments, selectedModuleCode]);

  const teacherAssignments = React.useMemo(() => {
    if (!selectedTeacherId) return [];
    return store.assignments.filter((a) => a.teacherId === selectedTeacherId);
  }, [store.assignments, selectedTeacherId]);

  const availableTeachersForModule = React.useMemo(() => {
    if (!selectedModuleCode) return [];
    const assigned = new Set(moduleAssignments.map((a) => a.teacherId));
    return teachers.filter((t) => !assigned.has(t.teacherId) && t.status === 'active');
  }, [teachers, moduleAssignments, selectedModuleCode]);

  const availableModulesForTeacher = React.useMemo(() => {
    if (!selectedTeacherId) return [];
    const assigned = new Set(teacherAssignments.map((a) => a.moduleCode));
    return modules.filter((m) => !assigned.has(m.code));
  }, [modules, teacherAssignments, selectedTeacherId]);

  const [assignTeacherId, setAssignTeacherId] = React.useState<string>('none');
  const [assignSemester, setAssignSemester] = React.useState<string>('S1');

  React.useEffect(() => {
    const module = modules.find((m) => m.code === selectedModuleCode);
    if (!module) return;
    setAssignSemester(module.semester ?? 'S1');
  }, [modules, selectedModuleCode]);

  const [teacherPickModules, setTeacherPickModules] = React.useState<string[]>([]);
  const [teacherAssignSemester, setTeacherAssignSemester] = React.useState<string>('S1');

  const hasActiveSessionForModule = React.useCallback(
    (moduleCode: string) => store.sessions.some((s) => s.status === 'active' && s.moduleCode === moduleCode),
    [store.sessions]
  );

  const assignTeacherToModule = async () => {
    if (!selectedModuleCode) return;
    if (assignTeacherId === 'none') {
      toast.error('Select a teacher.');
      return;
    }
    const exists = store.assignments.some(
      (a) => a.moduleCode === selectedModuleCode && a.teacherId === assignTeacherId
    );
    if (exists) {
      toast.error('Selected teacher is already assigned to this module.');
      return;
    }

    setStore((current) => ({
      ...current,
      assignments: [
        ...current.assignments,
        {
          moduleCode: selectedModuleCode,
          teacherId: assignTeacherId,
          semester: assignSemester as any
        }
      ]
    }));
    toast.success('Teacher assigned successfully.');
    setAssignTeacherId('none');
  };

  const unassignTeacherFromModule = async (moduleCode: string, teacherId: string) => {
    if (hasActiveSessionForModule(moduleCode)) {
      toast.error('this module has an active session right now..');
      return;
    }
    setStore((current) => ({
      ...current,
      assignments: current.assignments.filter(
        (a) => !(a.moduleCode === moduleCode && a.teacherId === teacherId)
      )
    }));
    toast.success('Teacher unassigned and notified.');
  };

  const assignModulesToTeacher = async () => {
    if (!selectedTeacherId) return;
    if (!teacherPickModules.length) {
      toast.error('Select at least one module.');
      return;
    }
    const existing = new Set(
      store.assignments
        .filter((a) => a.teacherId === selectedTeacherId)
        .map((a) => a.moduleCode)
    );
    const nextModules = teacherPickModules.filter((code) => !existing.has(code));
    if (!nextModules.length) {
      toast.error('All selected modules are already assigned.');
      return;
    }

    setStore((current) => ({
      ...current,
      assignments: [
        ...current.assignments,
        ...nextModules.map((moduleCode) => ({
          moduleCode,
          teacherId: selectedTeacherId,
          semester: teacherAssignSemester as any
        }))
      ]
    }));
    toast.success('Assignments created.');
    setTeacherPickModules([]);
  };

  const downloadBulkTemplate = () => {
    const csv = [
      ['teacherId', 'moduleCode', 'semester'],
      ['TCH-0001', 'AABDD', 'S1'],
      ['TCH-0002', 'COMPIL', 'S2']
    ];
    downloadCsv('bulk-assignments-template.csv', csv);
  };

  const loadBulkFile = async (file: File) => {
    const parsed = parseCsv(await file.text());
    const header = parsed.headers.map((h) => h.toLowerCase());
    const expected = ['teacherid', 'modulecode', 'semester'];
    if (!expected.every((h) => header.includes(h))) {
      toast.error('Invalid CSV format. Please use the template.');
      setBulkPreview([]);
      return;
    }
    const preview = parsed.rows.slice(0, 200).map((row, index) => {
      const [teacherId, moduleCode, semester] = row;
      const errors: string[] = [];
      const assignment: ModuleAssignment = {
        teacherId: (teacherId ?? '').trim(),
        moduleCode: (moduleCode ?? '').trim(),
        semester: ((semester ?? '').trim() as any) || undefined
      };
      if (!store.teachers.some((t) => t.teacherId === assignment.teacherId)) errors.push('Unknown teacherId.');
      if (!store.modules.some((m) => m.code === assignment.moduleCode)) errors.push('Unknown moduleCode.');
      const exists = store.assignments.some((a) => a.teacherId === assignment.teacherId && a.moduleCode === assignment.moduleCode);
      if (exists) errors.push('Duplicate mapping (already assigned).');
      return { row: index + 1, assignment, errors };
    });
    setBulkPreview(preview);
  };

  const confirmBulk = async () => {
    const valid = bulkPreview.filter((r) => r.errors.length === 0 && r.assignment);
    if (!valid.length) {
      toast.error('No valid rows to assign.');
      return;
    }
    const unique = uniq(valid.map((v) => `${v.assignment!.teacherId}|${v.assignment!.moduleCode}`));
    setStore((current) => ({
      ...current,
      assignments: [
        ...current.assignments,
        ...unique.map((key) => {
          const [teacherId, moduleCode] = key.split('|');
          const row = valid.find((v) => v.assignment!.teacherId === teacherId && v.assignment!.moduleCode === moduleCode)!;
          return row.assignment!;
        })
      ]
    }));
    toast.success(`Bulk assignment complete: ${unique.length} created.`);
    setBulkOpen(false);
  };

  const filteredModuleList = modules.filter((m) => {
    const q = moduleQuery.trim().toLowerCase();
    if (!q) return true;
    return m.code.toLowerCase().includes(q) || m.name.toLowerCase().includes(q);
  });

  const filteredTeacherList = teachers.filter((t) => {
    const q = teacherQueryText.trim().toLowerCase();
    if (!q) return true;
    return (
      t.teacherId.toLowerCase().includes(q) ||
      t.fullName.toLowerCase().includes(q) ||
      t.email.toLowerCase().includes(q)
    );
  });

  return (
    <PageContainer
      pageTitle='Module Assignments'
      pageDescription='Assign teachers to modules with conflict handling and bulk assignment.'
      pageHeaderAction={
        <Button variant='outline' onClick={() => setBulkOpen(true)}>
          Bulk Assignment
        </Button>
      }
    >
      <Tabs defaultValue='by-module'>
        <TabsList>
          <TabsTrigger value='by-module'>Assign by Module</TabsTrigger>
          <TabsTrigger value='by-teacher'>Assign by Teacher</TabsTrigger>
        </TabsList>

        <TabsContent value='by-module' className='mt-4'>
          <div className='grid gap-4 lg:grid-cols-[320px_1fr]'>
            <Card>
              <CardHeader>
                <CardTitle>Modules</CardTitle>
                <CardDescription>Search and select a module.</CardDescription>
              </CardHeader>
              <CardContent className='grid gap-3'>
                <Input
                  placeholder='Search modules…'
                  value={moduleQuery}
                  onChange={(e) => setModuleQuery(e.target.value)}
                />
                <div className='max-h-[440px] overflow-auto rounded-md border border-border/60'>
                  {filteredModuleList.map((m) => (
                    <button
                      key={m.code}
                      className={`w-full border-b px-3 py-2 text-left text-sm hover:bg-accent/40 ${selectedModuleCode === m.code ? 'bg-accent/40' : ''}`}
                      onClick={() => setSelectedModuleCode(m.code)}
                    >
                      <div className='font-medium'>{m.code}</div>
                      <div className='text-xs text-muted-foreground'>{m.name}</div>
                    </button>
                  ))}
                  {!filteredModuleList.length ? (
                    <div className='p-3 text-sm text-muted-foreground'>No modules.</div>
                  ) : null}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Module details</CardTitle>
                <CardDescription>Assign or unassign teachers.</CardDescription>
              </CardHeader>
              <CardContent className='grid gap-6'>
                {selectedModuleCode ? (
                  <>
                    <div className='grid gap-1'>
                      <div className='text-sm font-medium'>
                        {selectedModuleCode} — {moduleNameByCode.get(selectedModuleCode) ?? '—'}
                      </div>
                      <div className='text-xs text-muted-foreground'>
                        Active session: {hasActiveSessionForModule(selectedModuleCode) ? 'Yes' : 'No'}
                      </div>
                    </div>

                    <div className='grid gap-2'>
                      <div className='text-sm font-medium'>Currently assigned teachers</div>
                      <div className='grid gap-2 rounded-md border border-border/60 p-3'>
                        {moduleAssignments.length ? (
                          moduleAssignments.map((a) => (
                            <div key={`${a.teacherId}-${a.moduleCode}`} className='flex items-center justify-between gap-2'>
                              <div className='text-sm'>
                                <span className='font-medium'>{a.teacherId}</span> — {teacherNameById.get(a.teacherId) ?? '—'}
                              </div>
                              <ConfirmDialog
                                title='Unassign teacher?'
                                description='Remove this teacher from the module assignment.'
                                confirmLabel='Remove'
                                destructive
                                trigger={<Button size='sm' variant='destructive'>Remove</Button>}
                                onConfirm={() => unassignTeacherFromModule(a.moduleCode, a.teacherId)}
                              />
                            </div>
                          ))
                        ) : (
                          <div className='text-sm text-muted-foreground'>No teachers assigned.</div>
                        )}
                      </div>
                    </div>

                    <div className='grid gap-3 rounded-lg border border-border/60 p-4'>
                      <div className='text-sm font-medium'>Assign teacher</div>
                      <div className='grid gap-4 md:grid-cols-2'>
                        <div className='grid gap-2 md:col-span-2'>
                          <Label>Available teachers not yet assigned</Label>
                          <Select value={assignTeacherId} onValueChange={setAssignTeacherId}>
                            <SelectTrigger>
                              <SelectValue placeholder='Select teacher' />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value='none'>Select teacher</SelectItem>
                              {availableTeachersForModule.map((t) => (
                                <SelectItem key={t.teacherId} value={t.teacherId}>
                                  {t.teacherId} — {t.fullName}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className='grid gap-2'>
                          <Label>Semester</Label>
                          <Select value={assignSemester} onValueChange={setAssignSemester}>
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
                        <div className='flex items-end'>
                          <Button className='w-full' onClick={() => void assignTeacherToModule()}>
                            Assign Teacher
                          </Button>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className='text-sm text-muted-foreground'>Select a module.</div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value='by-teacher' className='mt-4'>
          <div className='grid gap-4 lg:grid-cols-[320px_1fr]'>
            <Card>
              <CardHeader>
                <CardTitle>Teachers</CardTitle>
                <CardDescription>Search and select a teacher.</CardDescription>
              </CardHeader>
              <CardContent className='grid gap-3'>
                <Input
                  placeholder='Search teachers…'
                  value={teacherQueryText}
                  onChange={(e) => setTeacherQueryText(e.target.value)}
                />
                <div className='max-h-[440px] overflow-auto rounded-md border border-border/60'>
                  {filteredTeacherList.map((t) => (
                    <button
                      key={t.teacherId}
                      className={`w-full border-b px-3 py-2 text-left text-sm hover:bg-accent/40 ${selectedTeacherId === t.teacherId ? 'bg-accent/40' : ''}`}
                      onClick={() => setSelectedTeacherId(t.teacherId)}
                    >
                      <div className='font-medium'>{t.teacherId}</div>
                      <div className='text-xs text-muted-foreground'>{t.fullName}</div>
                    </button>
                  ))}
                  {!filteredTeacherList.length ? (
                    <div className='p-3 text-sm text-muted-foreground'>No teachers.</div>
                  ) : null}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Teacher assignments</CardTitle>
                <CardDescription>Assign or review current modules.</CardDescription>
              </CardHeader>
              <CardContent className='grid gap-6'>
                {selectedTeacherId ? (
                  <>
                    <div className='grid gap-2'>
                      <div className='text-sm font-medium'>Current module assignments</div>
                      <div className='rounded-md border border-border/60 p-3 text-sm'>
                        {teacherAssignments.length ? (
                          <ul className='list-disc pl-5'>
                            {teacherAssignments.map((a) => (
                              <li key={`${a.teacherId}-${a.moduleCode}`}>
                                <span className='font-medium'>{a.moduleCode}</span> — {moduleNameByCode.get(a.moduleCode) ?? '—'}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <span className='text-muted-foreground'>No assignments.</span>
                        )}
                      </div>
                    </div>

                    <div className='grid gap-3 rounded-lg border border-border/60 p-4'>
                      <div className='text-sm font-medium'>Assign modules</div>
                      <div className='grid gap-2'>
                        <Label>Available modules not assigned</Label>
                        <div className='grid gap-2 rounded-md border border-border/60 p-3 md:grid-cols-2'>
                          {availableModulesForTeacher.map((m) => {
                            const checked = teacherPickModules.includes(m.code);
                            return (
                              <label key={m.code} className='flex items-center gap-2 text-sm'>
                                <input
                                  type='checkbox'
                                  checked={checked}
                                  onChange={(e) => {
                                    const next = e.target.checked;
                                    setTeacherPickModules((prev) =>
                                      next ? [...prev, m.code] : prev.filter((c) => c !== m.code)
                                    );
                                  }}
                                />
                                <span>
                                  <span className='font-medium'>{m.code}</span> — {m.name}
                                </span>
                              </label>
                            );
                          })}
                          {!availableModulesForTeacher.length ? (
                            <div className='text-sm text-muted-foreground'>No available modules.</div>
                          ) : null}
                        </div>
                      </div>
                      <div className='grid gap-4 md:grid-cols-2'>
                        <div className='grid gap-2'>
                          <Label>Semester</Label>
                          <Select value={teacherAssignSemester} onValueChange={setTeacherAssignSemester}>
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
                        <div className='flex items-end'>
                          <Button className='w-full' onClick={() => void assignModulesToTeacher()}>
                            Assign
                          </Button>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className='text-sm text-muted-foreground'>Select a teacher.</div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
        <DialogContent className='max-w-[900px]'>
          <DialogHeader>
            <DialogTitle>Bulk assignment</DialogTitle>
            <DialogDescription>Upload teacher-module mappings CSV, preview, then confirm.</DialogDescription>
          </DialogHeader>

          <div className='flex flex-wrap items-center gap-2'>
            <Button variant='outline' onClick={downloadBulkTemplate}>
              Download CSV template
            </Button>
            <Input type='file' accept='.csv,text/csv' onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              void loadBulkFile(file);
            }} />
          </div>

          <div className='rounded-lg border border-border/60 p-3'>
            <div className='text-sm font-medium'>Preview</div>
            <div className='mt-3 max-h-[320px] overflow-auto'>
              <table className='w-full text-sm'>
	                <thead className='text-left text-xs text-muted-foreground'>
	                  <tr>
	                    <th className='p-2'>Row</th>
	                    <th className='p-2'>Teacher</th>
	                    <th className='p-2'>Module</th>
	                    <th className='p-2'>Semester</th>
	                    <th className='p-2'>Issues</th>
	                  </tr>
	                </thead>
                <tbody>
                  {bulkPreview.map((r) => (
                    <tr key={r.row} className='border-t'>
	                      <td className='p-2'>{r.row}</td>
	                      <td className='p-2'>{r.assignment?.teacherId ?? '—'}</td>
	                      <td className='p-2'>{r.assignment?.moduleCode ?? '—'}</td>
	                      <td className='p-2'>{r.assignment?.semester ?? '—'}</td>
	                      <td className='p-2'>{r.errors.length ? <span className='text-destructive'>{r.errors.join(' ')}</span> : <span className='text-emerald-600'>OK</span>}</td>
	                    </tr>
	                  ))}
	                  {!bulkPreview.length ? (
	                    <tr>
	                      <td className='p-2 text-muted-foreground' colSpan={5}>
	                        Upload a CSV to see preview rows.
	                      </td>
	                    </tr>
	                  ) : null}
	                </tbody>
	              </table>
            </div>
          </div>

          <DialogFooter>
            <Button variant='outline' onClick={() => setBulkOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void confirmBulk()}>Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
