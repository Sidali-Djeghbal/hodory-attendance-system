'use client';

import * as React from 'react';
import {
  getTeacherOverview,
  type TeacherOverviewResponse,
  type TeacherModuleSummary,
  type TeacherSession
} from '@/lib/teacher-api';

type OverviewMetrics = {
  totalSessions: number;
  todaySessions: number;
  excludedRecords: number;
  pendingJustifications: number;
  nextSessionLabel: string;
};

type OverviewData = {
  isLoading: boolean;
  isRefreshing: boolean;
  lastUpdatedAt: number | null;
  modules: TeacherModuleSummary[];
  sessions: TeacherSession[];
  metrics: OverviewMetrics;
  refresh: () => void;
};

const OverviewDataContext = React.createContext<OverviewData | null>(null);

function makeCacheKey(userId: number | null) {
  return `hodory_teacher_overview_v1:${userId ?? 'anon'}`;
}

type OverviewCacheSnapshot = {
  ts: number;
  data: Omit<OverviewData, 'refresh'>;
};

function parseCache(raw: string | null): { ts: number; data: Omit<OverviewData, 'refresh'> } | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { ts: number; data: unknown };
    if (!parsed || typeof parsed !== 'object') return null;
    if (typeof parsed.ts !== 'number') return null;
    if (!parsed.data || typeof parsed.data !== 'object') return null;
    return parsed as { ts: number; data: Omit<OverviewData, 'refresh'> };
  } catch {
    return null;
  }
}

function formatNextSessionLabel(next: { module?: { code: string; name: string } | null; date_time: string } | null) {
  if (!next) return 'No upcoming sessions';
  const time = new Date(next.date_time);
  const timeLabel = Number.isNaN(time.getTime())
    ? '—'
    : new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit' }).format(time);
  const code = next.module?.code ?? '—';
  return `${code} - ${timeLabel}`;
}

function toMetrics(payload: TeacherOverviewResponse): OverviewMetrics {
  return {
    totalSessions: payload.total_sessions ?? (payload.sessions?.length ?? 0),
    todaySessions: payload.today_sessions ?? 0,
    excludedRecords: payload.excluded_records ?? 0,
    pendingJustifications: payload.pending_justifications ?? 0,
    nextSessionLabel: formatNextSessionLabel(payload.next_session ?? null)
  };
}

function buildSnapshot(payload: TeacherOverviewResponse): OverviewCacheSnapshot {
  const ts = Date.now();
  return {
    ts,
    data: {
      isLoading: false,
      isRefreshing: false,
      lastUpdatedAt: ts,
      modules: payload.modules ?? [],
      sessions: payload.sessions ?? [],
      metrics: toMetrics(payload)
    }
  };
}

function writeCache(userId: number | null, snapshot: OverviewCacheSnapshot) {
  try {
    sessionStorage.setItem(makeCacheKey(userId), JSON.stringify(snapshot));
  } catch {
    // Ignore storage failures (private mode, disabled storage, etc.)
  }
}

export async function primeOverviewCache(options: {
  token: string;
  userId: number;
  sessionsLimit?: number;
  timeoutMs?: number;
}) {
  const payload = await getTeacherOverview(options.token, {
    sessionsLimit: options.sessionsLimit ?? 60,
    timeoutMs: options.timeoutMs
  });
  writeCache(options.userId, buildSnapshot(payload));
}

export function OverviewDataProvider({
  token,
  userId,
  children
}: {
  token: string | null;
  userId: number | null;
  children: React.ReactNode;
}) {
  const [modules, setModules] = React.useState<TeacherModuleSummary[]>([]);
  const [sessions, setSessions] = React.useState<TeacherSession[]>([]);
  const [metrics, setMetrics] = React.useState<OverviewMetrics>({
    totalSessions: 0,
    todaySessions: 0,
    excludedRecords: 0,
    pendingJustifications: 0,
    nextSessionLabel: '—'
  });
  const [isLoading, setIsLoading] = React.useState(true);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = React.useState<number | null>(null);
  const inFlight = React.useRef(false);

  const cacheKey = React.useMemo(() => makeCacheKey(userId), [userId]);

  const apply = React.useCallback((payload: {
    modules: TeacherModuleSummary[];
    sessions: TeacherSession[];
    total_sessions: number;
    today_sessions: number;
    excluded_records: number;
    pending_justifications: number;
    next_session: { module?: { code: string; name: string } | null; date_time: string } | null;
  }) => {
    setModules(payload.modules ?? []);
    setSessions(payload.sessions ?? []);
    setMetrics({
      totalSessions: payload.total_sessions ?? (payload.sessions?.length ?? 0),
      todaySessions: payload.today_sessions ?? 0,
      excludedRecords: payload.excluded_records ?? 0,
      pendingJustifications: payload.pending_justifications ?? 0,
      nextSessionLabel: formatNextSessionLabel(payload.next_session ?? null)
    });
  }, []);

  const refresh = React.useCallback(() => {
    if (!token) return;
    if (inFlight.current) return;
    inFlight.current = true;
    setIsRefreshing(true);

    getTeacherOverview(token, { sessionsLimit: 60 })
      .then((result) => {
        apply(result);
        const snapshot = buildSnapshot(result);
        setLastUpdatedAt(snapshot.data.lastUpdatedAt);
        writeCache(userId, snapshot);
      })
      .catch(() => {
        // Keep cached data if fetch fails.
      })
      .finally(() => {
        inFlight.current = false;
        setIsLoading(false);
        setIsRefreshing(false);
      });
  }, [token, cacheKey, apply]);

  React.useEffect(() => {
    setIsLoading(true);
    setIsRefreshing(false);
    setLastUpdatedAt(null);

    const cached = parseCache(sessionStorage.getItem(cacheKey));
    const maxAgeMs = 5 * 60_000;
    if (cached && Date.now() - cached.ts < maxAgeMs) {
      setModules(cached.data.modules ?? []);
      setSessions(cached.data.sessions ?? []);
      setMetrics(cached.data.metrics);
      setLastUpdatedAt(cached.data.lastUpdatedAt ?? cached.ts);
      setIsLoading(false);
    }

    if (!token) {
      setIsLoading(false);
      return;
    }

    refresh();
  }, [token, cacheKey, refresh]);

  const value = React.useMemo<OverviewData>(
    () => ({
      isLoading,
      isRefreshing,
      lastUpdatedAt,
      modules,
      sessions,
      metrics,
      refresh
    }),
    [isLoading, isRefreshing, lastUpdatedAt, modules, sessions, metrics, refresh]
  );

  return <OverviewDataContext.Provider value={value}>{children}</OverviewDataContext.Provider>;
}

export function useOverviewData() {
  const ctx = React.useContext(OverviewDataContext);
  if (!ctx) throw new Error('useOverviewData must be used within <OverviewDataProvider />');
  return ctx;
}
