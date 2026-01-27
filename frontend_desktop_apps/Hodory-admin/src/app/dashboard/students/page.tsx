'use client';

import * as React from 'react';
import { toast } from 'sonner';

import PageContainer from '@/components/layout/page-container';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { DataTable, type DataTableColumn } from '@/components/data-table/data-table';

import { readCache, writeCache } from '@/lib/cache';
import {
  createAdminStudent,
  deleteAdminStudent,
  getAdminLevels,
  getAdminStudents,
  updateAdminStudent,
  type AdminLevel,
  type AdminStudentRow
} from '@/lib/admin-api';

type Row = AdminStudentRow & { levelLabel: string };

type Draft = {
  full_name: string;
  email: string;
  password: string;
  department: string;
  level_id: string;
};

const CACHE_LEVELS = 'hodory_admin_levels_v1';
const CACHE_STUDENTS = 'hodory_admin_students_v1';
const CACHE_MAX_AGE = 5 * 60_000;

export default function StudentsPage() {
  const [levels, setLevels] = React.useState<AdminLevel[]>([]);
  const [rows, setRows] = React.useState<Row[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  const [editorOpen, setEditorOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState<number | null>(null);
  const [draft, setDraft] = React.useState<Draft>({
    full_name: '',
    email: '',
    password: '',
    department: 'Computer Science',
    level_id: ''
  });

  const load = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const [levelsRes, studentsRes] = await Promise.all([
        getAdminLevels(),
        getAdminStudents({ skip: 0, limit: 500 })
      ]);

      setLevels(levelsRes.data ?? []);
      writeCache(CACHE_LEVELS, levelsRes.data ?? []);

      const mapped = (studentsRes.data ?? []).map((s) => ({
        ...s,
        levelLabel: s.level?.name ?? '—'
      }));
      setRows(mapped);
      writeCache(CACHE_STUDENTS, mapped);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load students');
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    const cachedLevels = readCache<AdminLevel[]>(CACHE_LEVELS, CACHE_MAX_AGE);
    if (cachedLevels) setLevels(cachedLevels);
    const cachedStudents = readCache<Row[]>(CACHE_STUDENTS, CACHE_MAX_AGE);
    if (cachedStudents) {
      setRows(cachedStudents);
      setIsLoading(false);
    }
    void load();
  }, [load]);

  const openCreate = () => {
    setEditingId(null);
    setDraft({
      full_name: '',
      email: '',
      password: '',
      department: 'Computer Science',
      level_id: levels[0]?.id ? String(levels[0].id) : ''
    });
    setEditorOpen(true);
  };

  const openEdit = (row: Row) => {
    setEditingId(row.id);
    setDraft({
      full_name: row.full_name ?? '',
      email: row.email ?? '',
      password: '',
      department: row.department ?? 'Computer Science',
      level_id: row.level?.id ? String(row.level.id) : ''
    });
    setEditorOpen(true);
  };

  const save = async () => {
    const levelId = Number(draft.level_id);
    if (!draft.full_name.trim()) return toast.error('Full name is required.');
    if (!draft.email.trim()) return toast.error('Email is required.');
    if (!Number.isFinite(levelId)) return toast.error('Select a level.');

    try {
      if (editingId) {
        await updateAdminStudent(editingId, {
          full_name: draft.full_name.trim(),
          email: draft.email.trim(),
          department: draft.department.trim(),
          level_id: levelId
        });
        toast.success('Student updated.');
      } else {
        if (!draft.password.trim()) return toast.error('Password is required.');
        await createAdminStudent({
          full_name: draft.full_name.trim(),
          email: draft.email.trim(),
          password: draft.password.trim(),
          department: draft.department.trim(),
          level_id: levelId
        });
        toast.success('Student created.');
      }
      setEditorOpen(false);
      void load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Save failed');
    }
  };

  const remove = async (studentId: number) => {
    try {
      await deleteAdminStudent(studentId);
      toast.success('Student deleted.');
      setRows((prev) => prev.filter((r) => r.id !== studentId));
      writeCache(CACHE_STUDENTS, rows.filter((r) => r.id !== studentId));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Delete failed');
    }
  };

  const columns: Array<DataTableColumn<Row>> = [
    { key: 'id', header: 'ID', sortable: true, accessor: (r) => String(r.id), cell: (r) => <span className='font-medium'>{r.id}</span> },
    { key: 'full_name', header: 'Full name', sortable: true, accessor: (r) => r.full_name ?? '—' },
    { key: 'email', header: 'Email', sortable: true, accessor: (r) => r.email ?? '—' },
    { key: 'department', header: 'Department', sortable: true, accessor: (r) => r.department ?? '—' },
    { key: 'levelLabel', header: 'Level', sortable: true, accessor: (r) => r.levelLabel ?? '—' },
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
            title='Delete student?'
            description='This will delete the student and their user account.'
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
      pageTitle='Students'
      pageDescription='Manage students (create, update, delete).'
      pageHeaderAction={
        <div className='flex gap-2'>
          <Button variant='outline' onClick={load} disabled={isLoading}>Refresh</Button>
          <Button onClick={openCreate}>Add student</Button>
        </div>
      }
    >
      <Card>
        <CardHeader>
          <CardTitle>Student list</CardTitle>
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
            emptyState={isLoading ? 'Loading…' : 'No students.'}
          />
        </CardContent>
      </Card>

      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? 'Update student' : 'Add student'}</DialogTitle>
            <DialogDescription>
              {editingId ? 'Update student details.' : 'Create a student account.'}
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
            <div className='grid gap-2'>
              <Label>Level</Label>
              <Select value={draft.level_id} onValueChange={(value) => setDraft((d) => ({ ...d, level_id: value }))}>
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
