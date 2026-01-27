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
import { ConfirmDialog } from '@/components/confirm-dialog';
import { DataTable, type DataTableColumn } from '@/components/data-table/data-table';

import { readCache, writeCache } from '@/lib/cache';
import {
  createAdminModule,
  deleteAdminModule,
  getAdminLevels,
  getAdminModules,
  updateAdminModule,
  type AdminLevel,
  type AdminModuleRow
} from '@/lib/admin-api';

type Row = AdminModuleRow & { levelLabel: string };

type Draft = {
  name: string;
  room: string;
  level_id: string;
};

const CACHE_LEVELS = 'hodory_admin_levels_v1';
const CACHE_MODULES = 'hodory_admin_modules_v1';
const CACHE_MAX_AGE = 5 * 60_000;

export default function ModulesPage() {
  const [levels, setLevels] = React.useState<AdminLevel[]>([]);
  const [rows, setRows] = React.useState<Row[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  const [editorOpen, setEditorOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState<number | null>(null);
  const [draft, setDraft] = React.useState<Draft>({ name: '', room: '', level_id: '' });

  const load = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const [levelsRes, modulesRes] = await Promise.all([
        getAdminLevels(),
        getAdminModules({ skip: 0, limit: 500 })
      ]);

      setLevels(levelsRes.data ?? []);
      writeCache(CACHE_LEVELS, levelsRes.data ?? []);

      const mapped = (modulesRes.data ?? []).map((m) => ({
        ...m,
        levelLabel: m.level?.name ?? '—'
      }));
      setRows(mapped);
      writeCache(CACHE_MODULES, mapped);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load modules');
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    const cachedLevels = readCache<AdminLevel[]>(CACHE_LEVELS, CACHE_MAX_AGE);
    if (cachedLevels) setLevels(cachedLevels);
    const cachedModules = readCache<Row[]>(CACHE_MODULES, CACHE_MAX_AGE);
    if (cachedModules) {
      setRows(cachedModules);
      setIsLoading(false);
    }
    void load();
  }, [load]);

  const openCreate = () => {
    setEditingId(null);
    setDraft({
      name: '',
      room: '',
      level_id: levels[0]?.id ? String(levels[0].id) : ''
    });
    setEditorOpen(true);
  };

  const openEdit = (row: Row) => {
    setEditingId(row.id);
    setDraft({
      name: row.name ?? '',
      room: row.room ?? '',
      level_id: row.level?.id ? String(row.level.id) : ''
    });
    setEditorOpen(true);
  };

  const save = async () => {
    const levelId = Number(draft.level_id);
    if (!draft.name.trim()) return toast.error('Module name is required.');
    if (!Number.isFinite(levelId)) return toast.error('Select a level.');

    try {
      if (editingId) {
        await updateAdminModule(editingId, { name: draft.name.trim(), room: draft.room.trim() || null });
        toast.success('Module updated.');
      } else {
        await createAdminModule({ name: draft.name.trim(), level_id: levelId, room: draft.room.trim() || null });
        toast.success('Module created.');
      }
      setEditorOpen(false);
      void load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Save failed');
    }
  };

  const remove = async (moduleId: number) => {
    try {
      await deleteAdminModule(moduleId);
      toast.success('Module deleted.');
      setRows((prev) => prev.filter((r) => r.id !== moduleId));
      writeCache(CACHE_MODULES, rows.filter((r) => r.id !== moduleId));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Delete failed');
    }
  };

  const columns: Array<DataTableColumn<Row>> = [
    { key: 'code', header: 'Code', sortable: true, accessor: (r) => r.code ?? '—', cell: (r) => <span className='font-medium'>{r.code ?? '—'}</span> },
    { key: 'name', header: 'Name', sortable: true, accessor: (r) => r.name ?? '—' },
    { key: 'room', header: 'Room', sortable: true, accessor: (r) => r.room ?? '—' },
    { key: 'levelLabel', header: 'Level', sortable: true, accessor: (r) => r.levelLabel ?? '—' },
    {
      key: 'actions',
      header: '',
      cell: (r) => (
        <div className='flex justify-end gap-2'>
          <Button size='sm' variant='outline' onClick={(e) => { e.stopPropagation(); openEdit(r); }}>
            Edit
          </Button>
          <ConfirmDialog
            title='Delete module?'
            description='This will delete the module.'
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
      pageTitle='Modules'
      pageDescription='Manage modules (create, update, delete).'
      pageHeaderAction={
        <div className='flex gap-2'>
          <Button variant='outline' onClick={load} disabled={isLoading}>Refresh</Button>
          <Button onClick={openCreate}>Add module</Button>
        </div>
      }
    >
      <Card>
        <CardHeader>
          <CardTitle>Module list</CardTitle>
          <CardDescription>Loaded from backend.</CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            rows={rows}
            columns={columns}
            searchPlaceholder='Search by code or name…'
            searchFn={(row, q) =>
              [row.code, row.name].some((value) => (value ?? '').toLowerCase().includes(q))
            }
            emptyState={isLoading ? 'Loading…' : 'No modules.'}
          />
        </CardContent>
      </Card>

      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? 'Update module' : 'Add module'}</DialogTitle>
            <DialogDescription>
              {editingId ? 'Update module details.' : 'Create a module.'}
            </DialogDescription>
          </DialogHeader>

          <div className='grid gap-3'>
            <div className='grid gap-2'>
              <Label>Name</Label>
              <Input value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} />
            </div>
            <div className='grid gap-2'>
              <Label>Room</Label>
              <Input value={draft.room} onChange={(e) => setDraft((d) => ({ ...d, room: e.target.value }))} />
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

