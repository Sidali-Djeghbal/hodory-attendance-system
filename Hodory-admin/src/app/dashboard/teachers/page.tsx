'use client';

import * as React from 'react';
import Link from 'next/link';
import { toast } from 'sonner';

import PageContainer from '@/components/layout/page-container';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { DataTable, type DataTableColumn } from '@/components/data-table/data-table';
import { createPasswordRecord, generatePassword } from '@/lib/password';

import { simulateWelcomeEmail, useAdminStore, type Teacher } from '@/features/admin/store/admin-store';

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

type TeacherDraft = {
  teacherId: string;
  fullName: string;
  email: string;
};

export default function TeachersPage() {
  const { store, setStore } = useAdminStore();

  const [editorOpen, setEditorOpen] = React.useState(false);
  const [editingTeacherId, setEditingTeacherId] = React.useState<string | null>(null);
  const [draft, setDraft] = React.useState<TeacherDraft>({ teacherId: '', fullName: '', email: '' });
  const [passwordDraft, setPasswordDraft] = React.useState('');
  const [passwordVisible, setPasswordVisible] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const assignedCountByTeacher = React.useMemo(() => {
    const map = new Map<string, number>();
    for (const assignment of store.assignments) {
      map.set(assignment.teacherId, (map.get(assignment.teacherId) ?? 0) + 1);
    }
    return map;
  }, [store.assignments]);

  const hasActiveSession = React.useCallback(
    (teacherId: string) => store.sessions.some((s) => s.status === 'active' && s.teacherId === teacherId),
    [store.sessions]
  );

  const openCreate = () => {
    setEditingTeacherId(null);
    setDraft({ teacherId: '', fullName: '', email: '' });
    setPasswordDraft('');
    setPasswordVisible(false);
    setErrors({});
    setEditorOpen(true);
  };

  const openEdit = (teacher: Teacher) => {
    setEditingTeacherId(teacher.teacherId);
    setDraft({ teacherId: teacher.teacherId, fullName: teacher.fullName, email: teacher.email });
    setPasswordDraft('');
    setPasswordVisible(false);
    setErrors({});
    setEditorOpen(true);
  };

  const validate = (candidate: TeacherDraft) => {
    const nextErrors: Record<string, string> = {};
    if (!candidate.teacherId.trim()) nextErrors.teacherId = 'Teacher ID is required.';
    if (!candidate.fullName.trim()) nextErrors.fullName = 'Full name is required.';
    if (!candidate.email.trim()) nextErrors.email = 'Email is required.';
    else if (!isValidEmail(candidate.email.trim())) nextErrors.email = 'Invalid email.';

    const isEditing = Boolean(editingTeacherId);
    const idTaken = store.teachers.some(
      (t) => t.teacherId === candidate.teacherId && (!isEditing || t.teacherId !== editingTeacherId)
    );
    const emailTaken = store.teachers.some(
      (t) => t.email.toLowerCase() === candidate.email.toLowerCase() && (!isEditing || t.teacherId !== editingTeacherId)
    );
    if (idTaken || emailTaken) nextErrors.uniqueness = 'A teacher with this ID or email already exists.';
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const saveTeacher = async () => {
    const candidate: TeacherDraft = {
      teacherId: draft.teacherId.trim(),
      fullName: draft.fullName.trim(),
      email: draft.email.trim()
    };
    if (!validate(candidate)) return;

    const nextPasswordHash = passwordDraft.trim()
      ? await createPasswordRecord(passwordDraft.trim())
      : null;

    const isEditing = Boolean(editingTeacherId);
    setStore((current) => {
      const next = { ...current, teachers: current.teachers.slice() };
      if (isEditing) {
        const index = next.teachers.findIndex((t) => t.teacherId === editingTeacherId);
        if (index >= 0) {
          next.teachers[index] = {
            ...next.teachers[index]!,
            ...candidate,
            passwordHash: nextPasswordHash ?? next.teachers[index]!.passwordHash
          };
        }
      } else {
        next.teachers.unshift({ ...candidate, status: 'active', passwordHash: nextPasswordHash ?? '' });
      }
      return next;
    });

    if (!isEditing) {
      const emailSent = simulateWelcomeEmail();
      if (emailSent) toast.success('Teacher account created successfully.');
      else toast.warning('Account created but welcome email could not be sent.');
    } else {
      toast.success('Teacher information updated successfully.');
    }
    setPasswordDraft('');
    setEditorOpen(false);
  };

  const attemptDeactivate = async (teacherId: string) => {
    if (hasActiveSession(teacherId)) {
      toast.error('This teacher has active attendance sessions. Deactivation is not allowed for now.');
      return;
    }

    const assignedCount = assignedCountByTeacher.get(teacherId) ?? 0;
    if (assignedCount > 0) {
      toast.error(
        'This teacher is currently assigned to active modules. Please reassign these modules before deletion.'
      );
      return;
    }

    setStore((current) => ({
      ...current,
      teachers: current.teachers.map((t) =>
        t.teacherId === teacherId ? { ...t, status: 'inactive' } : t
      )
    }));
    toast.success('Teacher account has been deactivated.');
  };

  const rows = React.useMemo(() => {
    return store.teachers.map((t) => ({
      ...t,
      assignedModulesCount: assignedCountByTeacher.get(t.teacherId) ?? 0
    }));
  }, [store.teachers, assignedCountByTeacher]);

  const columns: Array<DataTableColumn<(Teacher & { assignedModulesCount: number })>> = [
    { key: 'teacherId', header: 'Teacher ID', sortable: true, accessor: (t) => t.teacherId, cell: (t) => <span className='font-medium'>{t.teacherId}</span> },
    { key: 'fullName', header: 'Full name', sortable: true, accessor: (t) => t.fullName },
    { key: 'email', header: 'Email', sortable: true, accessor: (t) => t.email },
    { key: 'assignedModulesCount', header: 'Assigned modules', sortable: true, accessor: (t) => t.assignedModulesCount },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      accessor: (t) => t.status,
      cell: (t) => <Badge variant={t.status === 'active' ? 'secondary' : 'outline'}>{t.status}</Badge>
    },
    {
      key: 'password',
      header: 'Password',
      accessor: (t) => (t.passwordHash ? 'set' : 'unset'),
      cell: (t) => (
        <Badge variant={t.passwordHash ? 'secondary' : 'outline'}>
          {t.passwordHash ? 'Set' : 'Not set'}
        </Badge>
      )
    },
    {
      key: 'actions',
      header: '',
      cell: (t) => {
        const assignedCount = t.assignedModulesCount;
        const activeSession = hasActiveSession(t.teacherId);
        const disabled = activeSession || assignedCount > 0;
        const description = activeSession
          ? 'This teacher has active attendance sessions. Deactivation is not allowed for now.'
          : assignedCount > 0
          ? `This teacher is currently assigned to active modules (${assignedCount}). Please reassign these modules before deletion.`
          : 'This action will set the account to inactive (soft delete).';

        return (
          <div className='flex justify-end gap-2'>
            <Button size='sm' variant='outline' onClick={(e) => { e.stopPropagation(); openEdit(t); }}>
              View/Edit
            </Button>
            <ConfirmDialog
              title='Deactivate teacher?'
              description={description}
              confirmLabel='Deactivate'
              destructive
              disabled={disabled}
              trigger={
                <Button size='sm' variant='destructive' onClick={(e) => e.stopPropagation()}>
                  Deactivate
                </Button>
              }
              onConfirm={() => attemptDeactivate(t.teacherId)}
            />
            {assignedCount > 0 ? (
              <Button size='sm' variant='ghost' asChild>
                <Link href={`/dashboard/module-assignments?teacher=${encodeURIComponent(t.teacherId)}`}>
                  Reassign
                </Link>
              </Button>
            ) : null}
          </div>
        );
      }
    }
  ];

  return (
    <PageContainer
      pageTitle='Teachers'
      pageDescription='Manage teacher accounts: add, update, deactivate, and search.'
      pageHeaderAction={<Button onClick={openCreate}>Add Teacher</Button>}
    >
      <Card>
        <CardHeader>
          <CardTitle>Teacher list</CardTitle>
          <CardDescription>Search by ID, name, or email. Teacher ID is not editable.</CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            rows={rows}
            columns={columns}
            searchPlaceholder='Search by ID, name, or email…'
            searchFn={(row, q) =>
              [row.teacherId, row.fullName, row.email].some((value) =>
                value.toLowerCase().includes(q)
              )
            }
          />
        </CardContent>
      </Card>

      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTeacherId ? 'Update teacher' : 'Add teacher'}</DialogTitle>
            <DialogDescription>
              {editingTeacherId ? 'Edit information and save changes.' : 'Create a new teacher account.'}
            </DialogDescription>
          </DialogHeader>

          {errors.uniqueness ? (
            <div className='rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive'>
              {errors.uniqueness}
            </div>
          ) : null}

	          <div className='grid gap-4 md:grid-cols-2'>
            <div className='grid gap-2'>
              <Label htmlFor='teacherId'>Teacher ID</Label>
              <Input
                id='teacherId'
                value={draft.teacherId}
                disabled={Boolean(editingTeacherId)}
                onChange={(e) => setDraft((d) => ({ ...d, teacherId: e.target.value }))}
              />
              {errors.teacherId ? <p className='text-xs text-destructive'>{errors.teacherId}</p> : null}
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
	            <div className='grid gap-2 md:col-span-2'>
	              <Label htmlFor='email'>Email</Label>
	              <Input
	                id='email'
	                type='email'
	                value={draft.email}
	                onChange={(e) => setDraft((d) => ({ ...d, email: e.target.value }))}
	              />
	              {errors.email ? <p className='text-xs text-destructive'>{errors.email}</p> : null}
	            </div>
	            <div className='grid gap-2 md:col-span-2'>
	              <div className='flex items-center justify-between gap-2'>
	                <Label htmlFor='teacherPassword'>Password</Label>
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
	                id='teacherPassword'
	                value={passwordDraft}
	                type={passwordVisible ? 'text' : 'password'}
	                placeholder={editingTeacherId ? 'Leave blank to keep current password' : 'Set initial password'}
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
	          </div>

          <DialogFooter>
            <Button variant='outline' onClick={() => setEditorOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void saveTeacher()}>
              {editingTeacherId ? 'Save Changes' : 'Create Account'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
