'use client';

import * as React from 'react';
import { toast } from 'sonner';

import PageContainer from '@/components/layout/page-container';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { DataTable, type DataTableColumn } from '@/components/data-table/data-table';
import { downloadCsv } from '@/lib/download';
import { createPasswordRecord, generatePassword } from '@/lib/password';

import { parseCsv } from '@/features/admin/import/csv';
import { simulateWelcomeEmail, useAdminStore, type Student } from '@/features/admin/store/admin-store';
import {
  LEVELS,
  type LevelCode,
} from '@/features/admin/catalog/levels';

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

type StudentDraft = {
  studentId: string;
  fullName: string;
  email: string;
  levelCode: LevelCode;
  modules: string[];
};

export default function StudentsPage() {
  const { store, setStore } = useAdminStore();

  const [levelFilter, setLevelFilter] = React.useState<string>('all');

  const [editorOpen, setEditorOpen] = React.useState(false);
  const [editingStudentId, setEditingStudentId] = React.useState<string | null>(null);
  const [draft, setDraft] = React.useState<StudentDraft>(() => ({
    studentId: '',
    fullName: '',
    email: '',
    levelCode: 'LMD1',
    modules: []
  }));
  const [passwordDraft, setPasswordDraft] = React.useState('');
  const [passwordVisible, setPasswordVisible] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const [importOpen, setImportOpen] = React.useState(false);
  const [importFileName, setImportFileName] = React.useState<string | null>(null);
  const [importPreview, setImportPreview] = React.useState<
    Array<{ row: number; student?: StudentDraft; errors: string[] }>
  >([]);

  const modules = React.useMemo(
    () => store.modules.slice().sort((a, b) => a.code.localeCompare(b.code)),
    [store.modules]
  );

  const modulesForDraftLevel = React.useMemo(() => {
    return store.modules
      .filter((m) => m.levelCode === draft.levelCode)
      .slice()
      .sort((a, b) => (a.semester ?? 'S1').localeCompare(b.semester ?? 'S1'));
  }, [store.modules, draft.levelCode]);

  const defaultModuleCodesForDraftLevel = React.useMemo(() => {
    return modulesForDraftLevel.map((m) => m.code);
  }, [modulesForDraftLevel]);

  const canAutoAssignModules = defaultModuleCodesForDraftLevel.length > 0;

  const filteredStudents = React.useMemo(() => {
    return store.students.filter((s) => {
      if (levelFilter !== 'all' && s.levelCode !== levelFilter) return false;
      return true;
    });
  }, [store.students, levelFilter]);

  const openCreate = () => {
    setEditingStudentId(null);
    const defaultLevel = LEVELS[0]?.code ?? 'LMD1';
    setDraft({
      studentId: '',
      fullName: '',
      email: '',
      levelCode: defaultLevel,
      modules: store.modules
        .filter((m) => m.levelCode === defaultLevel)
        .map((m) => m.code)
    });
    setPasswordDraft('');
    setPasswordVisible(false);
    setErrors({});
    setEditorOpen(true);
  };

  const openEdit = (student: Student) => {
    setEditingStudentId(student.studentId);
    setDraft({
      studentId: student.studentId,
      fullName: student.fullName,
      email: student.email,
      levelCode: student.levelCode,
      modules: student.modules
    });
    setPasswordDraft('');
    setPasswordVisible(false);
    setErrors({});
    setEditorOpen(true);
  };

  const validate = (candidate: StudentDraft) => {
    const nextErrors: Record<string, string> = {};
    if (!candidate.studentId.trim()) nextErrors.studentId = 'Student ID is required.';
    if (!candidate.fullName.trim()) nextErrors.fullName = 'Full name is required.';
    if (!candidate.email.trim()) nextErrors.email = 'Email is required.';
    else if (!isValidEmail(candidate.email.trim())) nextErrors.email = 'Invalid email.';

    const isEditing = Boolean(editingStudentId);
    const idTaken = store.students.some(
      (s) => s.studentId === candidate.studentId && (!isEditing || s.studentId !== editingStudentId)
    );
    const emailTaken = store.students.some(
      (s) => s.email.toLowerCase() === candidate.email.toLowerCase() && (!isEditing || s.studentId !== editingStudentId)
    );
    if (idTaken || emailTaken) {
      nextErrors.uniqueness = 'A student with this ID or email already exists.';
    }
    if (!candidate.modules.length) nextErrors.modules = 'Select at least one module.';
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const saveStudent = async () => {
    const autoModules = store.modules
      .filter((m) => m.levelCode === draft.levelCode)
      .map((m) => m.code);

    const candidate: StudentDraft = {
      ...draft,
      studentId: draft.studentId.trim(),
      fullName: draft.fullName.trim(),
      email: draft.email.trim(),
      modules: autoModules.length ? autoModules : draft.modules
    };
    if (!validate(candidate)) return;

    const nextPasswordHash = passwordDraft.trim()
      ? await createPasswordRecord(passwordDraft.trim())
      : null;

    const isEditing = Boolean(editingStudentId);
    setStore((current) => {
      const next = { ...current, students: current.students.slice() };
      if (isEditing) {
        const index = next.students.findIndex((s) => s.studentId === editingStudentId);
        if (index >= 0) {
          next.students[index] = {
            ...next.students[index]!,
            ...candidate,
            passwordHash: nextPasswordHash ?? next.students[index]!.passwordHash
          };
        }
      } else {
        next.students.unshift({ ...candidate, status: 'active', passwordHash: nextPasswordHash ?? '' });
      }
      return next;
    });

    if (!isEditing) {
      const emailSent = simulateWelcomeEmail();
      if (emailSent) {
        toast.success('Student account created successfully.');
      } else {
        toast.warning(
          'Account created but welcome email could not be sent. Please notify the student manually.'
        );
      }
    } else {
      toast.success('Student information updated successfully.');
    }

    setPasswordDraft('');
    setEditorOpen(false);
  };

  const deactivateStudent = async (studentId: string) => {
    setStore((current) => ({
      ...current,
      students: current.students.map((s) =>
        s.studentId === studentId ? { ...s, status: 'inactive' } : s
      )
    }));
    toast.success('Student account has been deactivated.');
  };

  const downloadTemplate = () => {
    downloadCsv('students-template.csv', [
      ['studentId', 'fullName', 'email', 'levelCode'],
      ['STU-0001', 'Student One', 'student.one@hodory.local', 'LMD1'],
      ['STU-0002', 'Student Two', 'student.two@hodory.local', 'ING3']
    ]);
  };

  const validateImportRow = (row: string[], rowIndex: number) => {
    const issues: string[] = [];
    const [studentId, fullName, email, levelCodeRaw, modulesRaw] = row;

    const student: StudentDraft = {
      studentId: (studentId ?? '').trim(),
      fullName: (fullName ?? '').trim(),
      email: (email ?? '').trim(),
      levelCode: ((levelCodeRaw ?? '').trim() as LevelCode) || 'LMD1',
      modules: (modulesRaw ?? '')
        .split(';')
        .map((m) => m.trim())
        .filter(Boolean)
    };

    if (!student.studentId) issues.push('Missing studentId.');
    if (!student.fullName) issues.push('Missing fullName.');
    if (!student.email) issues.push('Missing email.');
    if (student.email && !isValidEmail(student.email)) issues.push('Invalid email.');
    if (!LEVELS.some((l) => l.code === student.levelCode)) issues.push('Invalid levelCode.');
    if (!student.modules.length) {
      const defaults = store.modules
        .filter((m) => m.levelCode === student.levelCode)
        .map((m) => m.code);
      student.modules = defaults;
    }
    if (!student.modules.length) issues.push('No modules.');

    const idTaken = store.students.some((s) => s.studentId === student.studentId);
    const emailTaken = store.students.some((s) => s.email.toLowerCase() === student.email.toLowerCase());
    if (idTaken || emailTaken) issues.push('Duplicate ID or email.');

    const unknownModules = student.modules.filter((code) => !store.modules.some((m) => m.code === code));
    if (unknownModules.length) issues.push(`Unknown modules: ${unknownModules.join(', ')}`);

    return { row: rowIndex, student, errors: issues };
  };

  const loadImportFile = async (file: File) => {
    const text = await file.text();
    const parsed = parseCsv(text);
    const header = parsed.headers.map((h) => h.toLowerCase());
    const expected = ['studentid', 'fullname', 'email', 'levelcode', 'modules'];
    const hasAll = expected.every((h) => header.includes(h));
    if (!hasAll) {
      toast.error('Invalid CSV format. Please use the template.');
      setImportPreview([]);
      return;
    }
    const preview = parsed.rows.slice(0, 200).map((row, idx) => validateImportRow(row, idx + 1));
    setImportPreview(preview);
  };

  const confirmImport = async () => {
    const creatable = importPreview.filter((r) => r.errors.length === 0 && r.student);
    if (!creatable.length) {
      toast.error('No valid rows to import.');
      return;
    }

    setStore((current) => {
      const next = { ...current, students: current.students.slice() };
      for (const row of creatable) {
        next.students.push({ ...(row.student as StudentDraft), status: 'active', passwordHash: '' });
      }
      return next;
    });

    const emailSuccess = Math.round(creatable.length * 0.85);
    const emailFailed = creatable.length - emailSuccess;
    toast.success(
      `Import complete: created ${creatable.length}, skipped ${importPreview.length - creatable.length}. Emails: ${emailSuccess} sent, ${emailFailed} failed.`
    );
    setImportOpen(false);
  };

  const columns: Array<DataTableColumn<Student>> = [
    { key: 'studentId', header: 'Student ID', sortable: true, accessor: (s) => s.studentId, cell: (s) => <span className='font-medium'>{s.studentId}</span> },
    { key: 'fullName', header: 'Full name', sortable: true, accessor: (s) => s.fullName },
    { key: 'email', header: 'Email', sortable: true, accessor: (s) => s.email },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      accessor: (s) => s.status,
      cell: (s) => (
        <Badge variant={s.status === 'active' ? 'secondary' : 'outline'}>
          {s.status}
        </Badge>
      )
    },
    {
      key: 'password',
      header: 'Password',
      accessor: (s) => (s.passwordHash ? 'set' : 'unset'),
      cell: (s) => (
        <Badge variant={s.passwordHash ? 'secondary' : 'outline'}>
          {s.passwordHash ? 'Set' : 'Not set'}
        </Badge>
      )
    },
    { key: 'levelCode', header: 'Level', sortable: true, accessor: (s) => s.levelCode },
    {
      key: 'actions',
      header: '',
      cell: (s) => (
        <div className='flex justify-end gap-2'>
          <Button size='sm' variant='outline' onClick={(e) => { e.stopPropagation(); openEdit(s); }}>
            View/Edit
          </Button>
          <ConfirmDialog
            title='Deactivate student?'
            description='This action will set the account to inactive (soft delete).'
            confirmLabel='Deactivate'
            destructive
            trigger={
              <Button size='sm' variant='destructive' onClick={(e) => e.stopPropagation()}>
                Deactivate
              </Button>
            }
            onConfirm={() => deactivateStudent(s.studentId)}
          />
        </div>
      )
    }
  ];

  return (
    <PageContainer
      pageTitle='Students'
      pageDescription='Manage student accounts: add, update, deactivate, search, and bulk import.'
      pageHeaderAction={
        <div className='flex flex-wrap gap-2'>
          <Button onClick={openCreate}>Add Student</Button>
          <Button variant='outline' onClick={() => setImportOpen(true)}>
            Import Students
          </Button>
        </div>
      }
    >

      <Card>
        <CardHeader className='flex flex-row items-start justify-between gap-2'>
          <div>
            <CardTitle>Student list</CardTitle>
            <CardDescription>Search by ID, name, or email. Sort and paginate.</CardDescription>
          </div>
          <Button
            variant='outline'
            onClick={() => {
              const rows = filteredStudents.map((s) => [
                s.studentId,
                s.fullName,
                s.email,
                s.status,
                s.levelCode,
                s.modules.join(';')
              ]);
              downloadCsv('students.csv', [
                ['Student ID', 'Full name', 'Email', 'Status', 'Level', 'Modules'],
                ...rows
              ]);
              toast.success('Export generated.');
            }}
          >
            Export CSV
          </Button>
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
        </CardContent>
        <CardContent>
          <DataTable
            rows={filteredStudents}
            columns={columns}
            searchPlaceholder='Search by ID, name, or email…'
            searchFn={(row, q) =>
              [row.studentId, row.fullName, row.email].some((value) =>
                value.toLowerCase().includes(q)
              )
            }
          />
        </CardContent>
      </Card>

      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingStudentId ? 'Update student' : 'Add student'}</DialogTitle>
            <DialogDescription>
              {editingStudentId ? 'Edit information and save changes.' : 'Create a new student account.'}
            </DialogDescription>
          </DialogHeader>

          {errors.uniqueness ? (
            <div className='rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive'>
              {errors.uniqueness}
            </div>
          ) : null}

	          <div className='grid gap-4 md:grid-cols-2'>
            <div className='grid gap-2'>
              <Label htmlFor='studentId'>Student ID</Label>
              <Input
                id='studentId'
                value={draft.studentId}
                disabled={Boolean(editingStudentId)}
                onChange={(e) => setDraft((d) => ({ ...d, studentId: e.target.value }))}
              />
              {errors.studentId ? <p className='text-xs text-destructive'>{errors.studentId}</p> : null}
            </div>
            <div className='grid gap-2'>
              <Label htmlFor='fullName'>Full name</Label>
              <Input
                id='fullName'
                value={draft.fullName}
                onChange={(e) => setDraft((d) => ({ ...d, fullName: e.target.value }))}
              />
              {errors.fullName ? <p className='text-xs text-destructive'>{errors.fullName}</p> : null}
            </div>
	            <div className='grid gap-2'>
	              <Label htmlFor='email'>Email</Label>
	              <Input
	                id='email'
	                type='email'
	                value={draft.email}
	                onChange={(e) => setDraft((d) => ({ ...d, email: e.target.value }))}
	              />
	              {errors.email ? <p className='text-xs text-destructive'>{errors.email}</p> : null}
	            </div>
	            <div className='grid gap-2'>
	              <div className='flex items-center justify-between gap-2'>
	                <Label htmlFor='studentPassword'>Password</Label>
	                <Button
	                  type='button'
	                  size='sm'
	                  variant='outline'
	                  onClick={() => {
	                    setPasswordDraft(generatePassword());
	                    setPasswordVisible(true);
	                  }}
	                >
	                  Generate
	                </Button>
	              </div>
	              <Input
	                id='studentPassword'
	                value={passwordDraft}
	                type={passwordVisible ? 'text' : 'password'}
	                placeholder={editingStudentId ? 'Leave blank to keep current password' : 'Set initial password'}
	                onChange={(e) => setPasswordDraft(e.target.value)}
	              />
	              <div className='flex items-center justify-between text-xs text-muted-foreground'>
	                <span>{passwordDraft.trim() ? 'Will update on save.' : 'No change.'}</span>
	                <button
	                  type='button'
	                  className='underline underline-offset-2'
	                  onClick={() => setPasswordVisible((v) => !v)}
	                >
	                  {passwordVisible ? 'Hide' : 'Show'}
	                </button>
	              </div>
	            </div>
	            <div className='grid gap-2'>
	              <Label>Level</Label>
	              <Select
	                value={draft.levelCode}
	                onValueChange={(value) => {
                  const levelCode = value as LevelCode;
                  const moduleCodes = store.modules
                    .filter((m) => m.levelCode === levelCode)
                    .map((m) => m.code);
                  setDraft((d) => ({
                    ...d,
                    levelCode,
                    modules: moduleCodes.length ? moduleCodes : d.modules
                  }));
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LEVELS.map((l) => (
                    <SelectItem key={l.code} value={l.code}>
                      {l.code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className='grid gap-2 md:col-span-2'>
              <Label>Module enrollment</Label>
              <div className='grid gap-2 rounded-md border border-border/60 p-3'>
                {canAutoAssignModules ? (
                  <>
                    <p className='text-xs text-muted-foreground'>
                      Modules are auto-assigned based on speciality + level.
                    </p>
                    <div className='grid gap-2 md:grid-cols-2'>
                      {modulesForDraftLevel.map((m) => (
                        <div key={m.code} className='flex items-start gap-2 text-sm'>
                          <Checkbox checked disabled />
                          <span>
                            <span className='font-medium'>{m.name}</span>
                            <span className='text-muted-foreground'> ({m.semester ?? '—'})</span>
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <>
                    <p className='text-xs text-muted-foreground'>
                      No module mapping configured for this level yet. Select modules manually.
                    </p>
                    <div className='grid gap-2 md:grid-cols-2'>
                      {modules.map((m) => {
                          const checked = draft.modules.includes(m.code);
                          return (
                            <label key={m.code} className='flex items-center gap-2 text-sm'>
                              <Checkbox
                                checked={checked}
                                onCheckedChange={(next) => {
                                  setDraft((d) => ({
                                    ...d,
                                    modules: next
                                      ? Array.from(new Set([...d.modules, m.code]))
                                      : d.modules.filter((code) => code !== m.code)
                                  }));
                                }}
                              />
                              <span>
                                <span className='font-medium'>{m.name}</span>
                                <span className='text-muted-foreground'> ({m.semester ?? '—'})</span>
                              </span>
                            </label>
                          );
                        })}
                    </div>
                  </>
                )}
                {errors.modules ? <p className='text-xs text-destructive'>{errors.modules}</p> : null}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant='outline' onClick={() => setEditorOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void saveStudent()}>
              {editingStudentId ? 'Save Changes' : 'Create Account'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className='max-w-[900px]'>
          <DialogHeader>
            <DialogTitle>Bulk import students</DialogTitle>
            <DialogDescription>
              Upload a CSV, validate format, preview issues, then confirm import.
            </DialogDescription>
          </DialogHeader>

          <div className='flex flex-wrap items-center gap-2'>
            <Button variant='outline' onClick={downloadTemplate}>
              Download CSV template
            </Button>
            <Input
              type='file'
              accept='.csv,text/csv'
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setImportFileName(file.name);
                void loadImportFile(file);
              }}
            />
          </div>

          <div className='rounded-lg border border-border/60 p-3'>
            <div className='text-sm font-medium'>Preview</div>
            <div className='text-xs text-muted-foreground'>
              {importFileName ? `File: ${importFileName}` : 'No file loaded.'}
            </div>

            <div className='mt-3 max-h-[340px] overflow-auto'>
              <table className='w-full text-sm'>
                <thead className='text-left text-xs text-muted-foreground'>
                  <tr>
                    <th className='p-2'>Row</th>
                    <th className='p-2'>Student ID</th>
                    <th className='p-2'>Email</th>
                    <th className='p-2'>Modules</th>
                    <th className='p-2'>Issues</th>
                  </tr>
                </thead>
                <tbody>
                  {importPreview.map((row) => (
                    <tr key={row.row} className='border-t'>
                      <td className='p-2'>{row.row}</td>
                      <td className='p-2'>{row.student?.studentId ?? '—'}</td>
                      <td className='p-2'>{row.student?.email ?? '—'}</td>
                      <td className='p-2'>{row.student?.modules.join(';') ?? '—'}</td>
                      <td className='p-2'>
                        {row.errors.length ? (
                          <span className='text-destructive'>{row.errors.join(' ')}</span>
                        ) : (
                          <span className='text-emerald-600'>OK</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {!importPreview.length ? (
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
            <Button variant='outline' onClick={() => setImportOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void confirmImport()}>Confirm import</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
