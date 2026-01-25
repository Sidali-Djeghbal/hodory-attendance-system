import { apiJson } from '@/lib/api-client';

export type TeacherProfile = {
  success: true;
  teacher_id: number;
  user_id: number;
  full_name: string;
  email: string;
  department: string;
  role: 'teacher';
  is_active: boolean;
  is_verified: boolean;
  created_at?: string | null;
  modules_count: number;
  sessions_count: number;
};

export type TeacherModuleSummary = {
  teacher_module_id: number;
  module_id: number;
  module_name: string;
  module_code: string;
  module_room?: string | null;
  level_id?: number | null;
  enrolled_students: number;
};

export type MyModulesResponse = {
  success: true;
  teacher_id: number;
  total_modules: number;
  modules: TeacherModuleSummary[];
};

export type CreateSessionResponse = {
  success: true;
  message: string;
  session_id: number;
  module_id: number;
  module_name: string;
  teacher_id: number;
  share_code: string;
  date_time: string;
  duration_minutes: number;
  room: string | null;
  is_active: boolean;
  students_enrolled: number;
};

export type SessionAttendanceResponse = {
  success: true;
  session_id: number;
  share_code: string;
  room: string | null;
  is_active: boolean;
  date_time: string;
  statistics: {
    total: number;
    present: number;
    absent: number;
    excluded: number;
    attendance_rate: number;
  };
  students: Array<{
    attendance_id: number;
    status: string;
    marked_at?: string | null;
    student?: {
      student_id: number;
      user_id: number;
      full_name: string;
      email: string;
      department?: string | null;
      level_id?: number | null;
    } | null;
    enrollment?: {
      enrollment_id: number;
      student_id: number;
      student_name?: string | null;
      student_email?: string | null;
      number_of_absences: number;
      number_of_absences_justified: number;
      is_excluded: boolean;
    } | null;
  }>;
};

export type TeacherJustificationsResponse = {
  success: true;
  teacher_id: number;
  total_justifications: number;
  justifications: Array<{
    justification_id: number;
    comment?: string | null;
    file_url?: string | null;
    status: string;
    created_at: string;
    attendance_record: {
      attendance_id: number;
      status: string;
      marked_at?: string | null;
    };
    student?: {
      student_id: number;
      user_id: number;
      full_name: string;
      email: string;
    } | null;
    module?: { code: string; name: string } | null;
    session?: {
      session_id: number;
      session_code: string;
      date_time: string;
      room?: string | null;
      is_active: boolean;
    } | null;
  }>;
};

export type TeacherSession = {
  session_id: number;
  session_code: string;
  date_time: string;
  duration_minutes: number;
  room?: string | null;
  is_active: boolean;
  module: {
    code: string;
    name: string;
    room?: string | null;
    level_id?: number | null;
    level?: { id: number; name: string; year_level: string } | null;
  };
  statistics: {
    total: number;
    present: number;
    absent: number;
    excluded: number;
    attendance_rate: number;
  };
};

export type TeacherSessionsResponse = {
  success: true;
  teacher_id: number;
  total_sessions: number;
  active_sessions: number;
  sessions: TeacherSession[];
};

export async function getTeacherProfile(token: string) {
  return apiJson<TeacherProfile>('/teacher/profile', { token });
}

export async function getMyModules(token: string) {
  return apiJson<MyModulesResponse>('/teacher/my-modules', { token });
}

export async function getTeacherSessions(token: string) {
  return apiJson<TeacherSessionsResponse>('/teacher/sessions', { token });
}

export async function createSession(
  token: string,
  request: { module_id: number; duration_minutes?: number; room?: string | null }
) {
  return apiJson<CreateSessionResponse>('/teacher/sessions', {
    token,
    method: 'POST',
    body: request
  });
}

export async function closeSession(token: string, sessionId: number) {
  return apiJson<{
    success: true;
    message: string;
    session_id: number;
    is_active: boolean;
    closed_at: string;
  }>(`/teacher/sessions/${sessionId}/close`, { token, method: 'POST' });
}

export async function getSessionAttendance(token: string, sessionId: number) {
  return apiJson<SessionAttendanceResponse>(
    `/teacher/sessions/${sessionId}/attendance`,
    { token }
  );
}

export async function getTeacherJustifications(
  token: string,
  statusFilter?: 'pending' | 'approved' | 'rejected'
) {
  const qs = statusFilter
    ? `?status_filter=${encodeURIComponent(statusFilter)}`
    : '';
  return apiJson<TeacherJustificationsResponse>(`/teacher/justifications${qs}`, {
    token
  });
}

export async function validateJustification(
  token: string,
  justificationId: number,
  payload: { decision: 'approve' | 'reject'; teacher_notes?: string | null }
) {
  return apiJson<{
    success: true;
    message: string;
  }>(`/teacher/justifications/${justificationId}/validate`, {
    token,
    method: 'POST',
    body: payload
  });
}
