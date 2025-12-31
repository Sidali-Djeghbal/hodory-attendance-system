'use client';

import * as React from 'react';
import {
  LEVELS,
  getDefaultModulesForLevel,
  toModuleCode,
  type LevelCode,
  type SemesterCode,
  type SpecialityCode
} from '@/features/admin/catalog/levels';

export type AccountStatus = 'active' | 'inactive';

export type Student = {
  studentId: string;
  fullName: string;
  email: string;
  status: AccountStatus;
  levelCode: LevelCode;
  modules: string[];
  passwordHash: string;
};

export type Teacher = {
  teacherId: string;
  fullName: string;
  email: string;
  status: AccountStatus;
  passwordHash: string;
};

export type Module = {
  code: string;
  name: string;
  speciality: SpecialityCode;
  levelCode: LevelCode;
  semester?: SemesterCode;
};

export type ModuleAssignment = {
  moduleCode: string;
  teacherId: string;
  semester?: SemesterCode;
};

export type AbsenceType = 'justified' | 'unjustified' | 'pending';

export type AttendanceSession = {
  id: string;
  moduleCode: string;
  teacherId: string;
  startAt: string; // ISO
  status: 'active' | 'ended';
  expectedCount: number;
  presentCount: number;
  absences: Array<{ studentId: string; type: AbsenceType }>;
};

export type AdminStore = {
  version: 5;
  students: Student[];
  teachers: Teacher[];
  modules: Module[];
  assignments: ModuleAssignment[];
  sessions: AttendanceSession[];
};

const STORAGE_KEY = 'hodory_admin_store_v5';

function pad4(value: number) {
  return String(value).padStart(4, '0');
}

function isBrowser() {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
}

function seededRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 2 ** 32;
  };
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(date.getDate() + days);
  return next;
}

function toIsoDate(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function seedStore(now = new Date()): AdminStore {
  const rand = seededRandom(
    Number(toIsoDate(now).replaceAll('-', '')) || 20250101
  );

  const modules: Module[] = [];
  const moduleCodes = new Set<string>();
  for (const level of LEVELS) {
    const defaults = getDefaultModulesForLevel(level.code);
    for (const entry of defaults) {
      const code = toModuleCode(entry.level, entry.semester, entry.name);
      const uniqueCode = moduleCodes.has(code)
        ? `${code}-${Math.floor(rand() * 1000)}`
        : code;
      moduleCodes.add(uniqueCode);
      modules.push({
        code: uniqueCode,
        name: entry.name,
        speciality: level.speciality,
        levelCode: level.code,
        semester: entry.semester
      });
    }
  }

  const teachers: Teacher[] = Array.from({ length: 10 }).map((_, index) => {
    const id = `TCH-${pad4(index + 1)}`;
    return {
      teacherId: id,
      fullName: `Teacher ${index + 1}`,
      email: `teacher${index + 1}@hodory.local`,
      status: 'active',
      passwordHash: ''
    };
  });

  const assignments: ModuleAssignment[] = modules.flatMap((module, index) => {
    const primary = teachers[index % teachers.length]!;
    const secondary = rand() > 0.7 ? teachers[(index + 3) % teachers.length]! : null;
    const rows: ModuleAssignment[] = [
      {
        moduleCode: module.code,
        teacherId: primary.teacherId,
        semester: module.semester
      }
    ];
    if (secondary) {
      rows.push({
        moduleCode: module.code,
        teacherId: secondary.teacherId,
        semester: module.semester
      });
    }
    return rows;
  });

  const students: Student[] = Array.from({ length: 80 }).map((_, index) => {
    const studentId = `STU-${pad4(index + 1)}`;
    const levelCode = LEVELS[Math.floor(rand() * LEVELS.length)]?.code ?? 'LMD1';
    const levelModules = modules
      .filter((m) => m.levelCode === levelCode)
      .map((m) => m.code);
    const fallbackModules = modules.slice(0, 6).map((m) => m.code);
    const selectedModules = levelModules.length
      ? levelModules
      : fallbackModules;

    return {
      studentId,
      fullName: `Student ${index + 1}`,
      email: `student${index + 1}@hodory.local`,
      status: 'active',
      levelCode,
      modules: selectedModules,
      passwordHash: ''
    };
  });

  const sessions: AttendanceSession[] = [];
  const startDate = addDays(now, -35);
  const days = 36;
  let sessionSeq = 1;

  const enrolledByModule = new Map<string, string[]>();
  for (const module of modules) {
    enrolledByModule.set(
      module.code,
      students.filter((s) => s.modules.includes(module.code)).map((s) => s.studentId)
    );
  }

  for (let dayOffset = 0; dayOffset < days; dayOffset++) {
    const day = addDays(startDate, dayOffset);
    const weekday = day.getDay();
    if (weekday === 0) continue; // Sunday

    for (const module of modules) {
      if (rand() < 0.78 && (weekday === 2 || weekday === 4 || rand() > 0.9)) {
        const teacherIds = assignments
          .filter((a) => a.moduleCode === module.code)
          .map((a) => a.teacherId);
        const teacherId = teacherIds[Math.floor(rand() * teacherIds.length)]!;
        const enrolled = enrolledByModule.get(module.code) ?? [];
        const expectedCount = Math.max(enrolled.length, 12);
        const absentCount = Math.max(0, Math.round(expectedCount * (0.08 + rand() * 0.12)));
        const absentStudents = enrolled
          .slice()
          .sort(() => rand() - 0.5)
          .slice(0, Math.min(absentCount, enrolled.length));

        const absences: AttendanceSession['absences'] = absentStudents.map((studentId) => {
          const r = rand();
          const type: AbsenceType = r < 0.5 ? 'unjustified' : r < 0.8 ? 'justified' : 'pending';
          return { studentId, type };
        });

        const presentCount = expectedCount - absences.length;
        const startAt = new Date(day);
        startAt.setHours(8 + Math.floor(rand() * 7), rand() > 0.5 ? 0 : 30, 0, 0);
        sessions.push({
          id: `SES-${pad4(sessionSeq++)}`,
          moduleCode: module.code,
          teacherId,
          startAt: startAt.toISOString(),
          status: 'ended',
          expectedCount,
          presentCount,
          absences
        });
      }
    }
  }

  const today = toIsoDate(now);
  const todaySessions = sessions.filter((s) => s.startAt.startsWith(today));
  const activeCount = Math.max(1, Math.min(2, todaySessions.length));
  for (let i = 0; i < activeCount; i++) {
    const target = todaySessions[i];
    if (target) target.status = 'active';
  }

  return { version: 5, students, teachers, modules, assignments, sessions };
}

export function loadAdminStore(): AdminStore {
  if (!isBrowser()) return seedStore();
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return seedStore();
  try {
    const parsed = JSON.parse(raw) as Partial<AdminStore>;
    if (parsed.version !== 5) return seedStore();
    return parsed as AdminStore;
  } catch {
    return seedStore();
  }
}

export function saveAdminStore(next: AdminStore) {
  if (!isBrowser()) return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

export function useAdminStore() {
  const [store, setStore] = React.useState<AdminStore>(() => loadAdminStore());

  const updateStore = React.useCallback((updater: (current: AdminStore) => AdminStore) => {
    setStore((current) => {
      const next = updater(current);
      saveAdminStore(next);
      return next;
    });
  }, []);

  React.useEffect(() => {
    saveAdminStore(store);
  }, [store]);

  return { store, setStore: updateStore };
}

export function simulateWelcomeEmail() {
  return Math.random() > 0.15;
}
