'use client';

import * as React from 'react';
import { toast } from 'sonner';

import PageContainer from '@/components/layout/page-container';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { DataTable, type DataTableColumn } from '@/components/data-table/data-table';

import { readCache, writeCache } from '@/lib/cache';
import {
  createAdminTeacher,
  deleteAdminTeacher,
  getAdminTeachers,
  updateAdminTeacher,
  type AdminTeacherRow
} from '@/lib/admin-api';

type Row = AdminTeacherRow;

type Draft = {
  full_name: string;
  email: string;
  password: string;
  department: string;
};

const CACHE_TEACHERS = 'hodory_admin_teachers_v1';
const CACHE_MAX_AGE = 5 * 60_000;

export default function TeachersPage() {
  const [rows, setRows] = React.useState<Row[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  const [editorOpen, setEditorOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState<number | null>(null);
  const [draft, setDraft] = React.useState<Draft>({
    full_name: '',
    email: '',
    password: '',
    department: 'Computer Science'
  });

  const load = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await getAdminTeachers({ skip: 0, limit: 500 });
      setRows(res.data ?? []);
      writeCache(CACHE_TEACHERS, res.data ?? []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load teachers');
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    const cached = readCache<Row[]>(CACHE_TEACHERS, CACHE_MAX_AGE);
    if (cached) {
      setRows(cached);
      setIsLoading(false);
    }
    void load();
  }, [load]);

  const openCreate = () => {
    setEditingId(null);
    setDraft({ full_name: '', email: '', password: '', department: 'Computer Science' });
    setEditorOpen(true);
  };

  const openEdit = (row: Row) => {
    setEditingId(row.id);
    setDraft({
      full_name: row.full_name ?? '',
      email: row.email ?? '',
      password: '',
      department: row.department ?? 'Computer Science'
    });
    setEditorOpen(true);
  };

  const save = async () => {
    if (!draft.full_name.trim()) return toast.error('Full name is required.');
    if (!draft.email.trim()) return toast.error('Email is required.');

    try {
      if (editingId) {
        await updateAdminTeacher(editingId, {
          full_name: draft.full_name.trim(),
          email: draft.email.trim(),
          department: draft.department.trim()
        });
        toast.success('Teacher updated.');
      } else {
        if (!draft.password.trim()) return toast.error('Password is required.');
        await createAdminTeacher({
          full_name: draft.full_name.trim(),
          email: draft.email.trim(),
          password: draft.password.trim(),
          department: draft.department.trim()
        });
        toast.success('Teacher created.');
      }
      setEditorOpen(false);
      void load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Save failed');
    }
  };

  const remove = async (teacherId: number) => {
    try {
      await deleteAdminTeacher(teacherId);
      toast.success('Teacher deleted.');
      setRows((prev) => prev.filter((r) => r.id !== teacherId));
      writeCache(CACHE_TEACHERS, rows.filter((r) => r.id !== teacherId));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Delete failed');
    }
  };

  const columns: Array<DataTableColumn<Row>> = [
    { key: 'id', header: 'ID', sortable: true, accessor: (r) => String(r.id), cell: (r) => <span className='font-medium'>{r.id}</span> },
    { key: 'full_name', header: 'Full name', sortable: true, accessor: (r) => r.full_name ?? '—' },
    { key: 'email', header: 'Email', sortable: true, accessor: (r) => r.email ?? '—' },
    { key: 'department', header: 'Department', sortable: true, accessor: (r) => r.department ?? '—' },
    { key: 'assigned_modules_count', header: 'Assigned modules', sortable: true, accessor: (r) => r.assigned_modules_count ?? 0 },
    {
      key: 'is_active',
      header: 'Status',
      sortable: true,
      accessor: (r) => (r.is_active ? 'active' : 'inactive'),
      cell: (r) => <Badge variant={r.is_active ? 'secondary' : 'outline'}>{r.is_active ? 'active' : 'inactive'}</Badge>
    },
    {
      key: 'actions',
      header: '',
      cell: (r) => (
        <div className='flex justify-end gap-2'>
          <Button size='sm' variant='outline' onClick={(e) => { e.stopPropagation(); openEdit(r); }}>
            Edit
          </Button>
          <ConfirmDialog
            title='Delete teacher?'
            description='This will delete the teacher and their user account.'
            confirmLabel='Delete'
            destructive
            trigger={
              <Button size='sm' variant='destructive' onClick={(e) => e.stopPropagation()}>
                Delete
              </Button>
            }
            onConfirm={() => remove(r.id)}
          />
        </div>
      )
    }
  ];

  return (
    <PageContainer
      pageTitle='Teachers'
      pageDescription='Manage teachers (create, update, delete).'
      pageHeaderAction={
        <div className='flex gap-2'>
          <Button variant='outline' onClick={load} disabled={isLoading}>Refresh</Button>
          <Button onClick={openCreate}>Add teacher</Button>
        </div>
      }
    >
      <Card>
        <CardHeader>
          <CardTitle>Teacher list</CardTitle>
          <CardDescription>Loaded from backend.</CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            rows={rows}
            columns={columns}
            searchPlaceholder='Search by name or email…'
            searchFn={(row, q) =>
              [row.full_name, row.email].some((value) => (value ?? '').toLowerCase().includes(q))
            }
            emptyState={isLoading ? 'Loading…' : 'No teachers.'}
          />
        </CardContent>
      </Card>

      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? 'Update teacher' : 'Add teacher'}</DialogTitle>
            <DialogDescription>
              {editingId ? 'Update teacher details.' : 'Create a teacher account.'}
            </DialogDescription>
          </DialogHeader>

          <div className='grid gap-3'>
            <div className='grid gap-2'>
              <Label>Full name</Label>
              <Input value={draft.full_name} onChange={(e) => setDraft((d) => ({ ...d, full_name: e.target.value }))} />
            </div>
            <div className='grid gap-2'>
              <Label>Email</Label>
              <Input value={draft.email} onChange={(e) => setDraft((d) => ({ ...d, email: e.target.value }))} />
            </div>
            {!editingId ? (
              <div className='grid gap-2'>
                <Label>Password</Label>
                <Input type='password' value={draft.password} onChange={(e) => setDraft((d) => ({ ...d, password: e.target.value }))} />
              </div>
            ) : null}
            <div className='grid gap-2'>
              <Label>Department</Label>
              <Input value={draft.department} onChange={(e) => setDraft((d) => ({ ...d, department: e.target.value }))} />
            </div>
          </div>

          <DialogFooter>
            <Button variant='outline' onClick={() => setEditorOpen(false)}>Cancel</Button>
            <Button onClick={save}>{editingId ? 'Save' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}

