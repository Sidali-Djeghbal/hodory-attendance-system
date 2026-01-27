import { apiJson } from './api-client';

export type AdminLevel = {
  id: number;
  name: string;
  year_level: string | number;
  created_at?: string | null;
  modules?: Array<{ id: number; name: string; code?: string | null; room?: string | null }>;
  module_count?: number;
  schedule?: {
    id: number;
    last_updated?: string | null;
    sdays?: Array<{
      id: number;
      day?: string | null;
      time: string;
      module_id: number;
      module_name?: string | null;
      module_code?: string | null;
    }>;
    sdays_count?: number;
  } | null;
  students_count?: number;
};

export async function getAdminLevels() {
  return apiJson<{ success: true; data: AdminLevel[]; total: number }>('/admin/levels');
}

export type AdminStudentRow = {
  id: number;
  user_id: number;
  full_name: string;
  email: string;
  department: string;
  is_active: boolean;
  created_at?: string | null;
  level?: { id: number; name: string; year_level?: string | number } | null;
  enrollments_count?: number;
};

export async function getAdminStudents(params?: { skip?: number; limit?: number }) {
  const qs = new URLSearchParams();
  if (params?.skip !== undefined) qs.set('skip', String(params.skip));
  if (params?.limit !== undefined) qs.set('limit', String(params.limit));
  const suffix = qs.toString() ? `?${qs.toString()}` : '';
  return apiJson<{ success: true; data: AdminStudentRow[]; total: number; skip: number; limit: number }>(
    `/admin/students${suffix}`
  );
}

export async function createAdminStudent(body: {
  full_name: string;
  email: string;
  password: string;
  department: string;
  level_id: number;
}) {
  return apiJson('/admin/students', { method: 'POST', body });
}

export async function updateAdminStudent(studentId: number, body: Partial<{
  full_name: string;
  email: string;
  department: string;
  level_id: number;
}>) {
  return apiJson(`/admin/students/${studentId}`, { method: 'PUT', body });
}

export async function deleteAdminStudent(studentId: number) {
  return apiJson(`/admin/students/${studentId}`, { method: 'DELETE' });
}

export type AdminTeacherRow = {
  id: number;
  user_id: number;
  full_name: string;
  email: string;
  department: string;
  is_active: boolean;
  created_at?: string | null;
  assigned_modules_count?: number;
  assigned_modules?: string[];
};

export async function getAdminTeachers(params?: { skip?: number; limit?: number }) {
  const qs = new URLSearchParams();
  if (params?.skip !== undefined) qs.set('skip', String(params.skip));
  if (params?.limit !== undefined) qs.set('limit', String(params.limit));
  const suffix = qs.toString() ? `?${qs.toString()}` : '';
  return apiJson<{ success: true; data: AdminTeacherRow[]; total: number; skip: number; limit: number }>(
    `/admin/teachers${suffix}`
  );
}

export async function createAdminTeacher(body: {
  full_name: string;
  email: string;
  password: string;
  department: string;
}) {
  return apiJson('/admin/teachers', { method: 'POST', body });
}

export async function updateAdminTeacher(teacherId: number, body: Partial<{
  full_name: string;
  email: string;
  department: string;
}>) {
  return apiJson(`/admin/teachers/${teacherId}`, { method: 'PUT', body });
}

export async function deleteAdminTeacher(teacherId: number) {
  return apiJson(`/admin/teachers/${teacherId}`, { method: 'DELETE' });
}

export type AdminModuleRow = {
  id: number;
  name: string;
  code?: string | null;
  room?: string | null;
  level?: { id: number; name: string; year_level?: string | number } | null;
};

export async function getAdminModules(params?: { skip?: number; limit?: number }) {
  const qs = new URLSearchParams();
  if (params?.skip !== undefined) qs.set('skip', String(params.skip));
  if (params?.limit !== undefined) qs.set('limit', String(params.limit));
  const suffix = qs.toString() ? `?${qs.toString()}` : '';
  return apiJson<{ success: true; data: AdminModuleRow[]; total: number; skip: number; limit: number }>(
    `/admin/modules${suffix}`
  );
}

export async function createAdminModule(body: { name: string; level_id: number; room?: string | null }) {
  return apiJson('/admin/modules', { method: 'POST', body });
}

export async function updateAdminModule(moduleId: number, body: Partial<{ name: string; room: string | null }>) {
  return apiJson(`/admin/modules/${moduleId}`, { method: 'PUT', body });
}

export async function deleteAdminModule(moduleId: number) {
  return apiJson(`/admin/modules/${moduleId}`, { method: 'DELETE' });
}

export type AdminTeacherModuleAssignment = {
  id: number;
  teacher: { id: number; full_name?: string | null; email?: string | null; department?: string | null } | null;
  module: { id: number; name?: string | null; code?: string | null; level?: { id: number; name: string; year_level: string | number } | null } | null;
};

export async function getAdminTeacherModules() {
  return apiJson<{ success: true; data: AdminTeacherModuleAssignment[]; total: number }>('/admin/teacher-modules');
}

export async function createAdminTeacherModule(body: { teacher_id: number; module_id: number }) {
  return apiJson('/admin/teacher-modules', { method: 'POST', body });
}

export async function bulkCreateAdminTeacherModules(body: { assignments: Array<{ teacher_id: number; module_id: number }> }) {
  return apiJson('/admin/teacher-modules/bulk', { method: 'POST', body });
}

export async function deleteAdminTeacherModule(teacherModuleId: number) {
  return apiJson(`/admin/teacher-modules/${teacherModuleId}`, { method: 'DELETE' });
}

export async function createAdminSchedule(body: { level_id: number }) {
  return apiJson('/admin/schedules', { method: 'POST', body });
}

export async function createAdminSDay(body: { level_id: number; day: string; time: string; module_id: number }) {
  return apiJson('/admin/sdays', { method: 'POST', body });
}

export async function updateAdminSDay(sdayId: number, body: Partial<{ day: string; time: string; module_id: number }>) {
  return apiJson(`/admin/sdays/${sdayId}`, { method: 'PUT', body });
}

export async function deleteAdminSDay(sdayId: number) {
  return apiJson(`/admin/sdays/${sdayId}`, { method: 'DELETE' });
}

export async function getAdminMonitor() {
  return apiJson<{ success: true; data: any }>('/admin/monitor');
}
