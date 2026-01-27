'use client';

import type { LevelCode } from '@/features/admin/catalog/levels';

export const SCHEDULE_DAYS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday'
] as const;

export type ScheduleDay = (typeof SCHEDULE_DAYS)[number];

export const SCHEDULE_SLOTS = [
  '08:00-09:30',
  '09:30-11:00',
  '11:00-12:30',
  '12:30-14:00',
  '14:00-15:30',
  '15:30-17:00'
] as const;

export type ScheduleSlot = (typeof SCHEDULE_SLOTS)[number];

export type LevelScheduleEntry = {
  id: string; // `${day}|${time}`
  day: ScheduleDay;
  time: ScheduleSlot;
  moduleCode: string;
};

export type LevelSchedule = {
  levelCode: LevelCode;
  lastUpdated: string; // ISO
  entries: LevelScheduleEntry[];
};

export function createEmptyLevelSchedule(
  levelCode: LevelCode,
  now = new Date()
): LevelSchedule {
  return {
    levelCode,
    lastUpdated: now.toISOString(),
    entries: []
  };
}

export function getScheduleEntry(
  schedule: LevelSchedule,
  day: ScheduleDay,
  time: ScheduleSlot
) {
  return schedule.entries.find(
    (entry) => entry.day === day && entry.time === time
  );
}

export function upsertScheduleEntry(
  schedule: LevelSchedule,
  day: ScheduleDay,
  time: ScheduleSlot,
  moduleCode: string | null,
  now = new Date()
): LevelSchedule {
  const nextEntries = schedule.entries.slice();
  const index = nextEntries.findIndex(
    (entry) => entry.day === day && entry.time === time
  );

  if (!moduleCode) {
    if (index >= 0) nextEntries.splice(index, 1);
    return {
      ...schedule,
      lastUpdated: now.toISOString(),
      entries: nextEntries
    };
  }

  const id = `${day}|${time}`;
  if (index >= 0) {
    nextEntries[index] = { ...nextEntries[index]!, moduleCode, id };
  } else {
    nextEntries.push({ id, day, time, moduleCode });
  }

  return { ...schedule, lastUpdated: now.toISOString(), entries: nextEntries };
}
