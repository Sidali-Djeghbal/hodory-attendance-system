'use client';

import * as React from 'react';
import { useAuth } from '@/features/auth/auth-context';
import { closeSession, createSession } from '@/lib/teacher-api';

type SessionContextValue = {
  isActive: boolean;
  module: string;
  room: string;
  code: string;
  sessionId: number | null;
  startedAt: string | null;
  durationMinutes: number;
  remainingSeconds: number;
  startSession: (details: {
    moduleId: number;
    moduleCode: string;
    moduleName: string;
    room?: string;
    durationMinutes?: number;
  }) => Promise<void>;
  stopSession: () => Promise<void>;
};

const SessionContext = React.createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  const [isActive, setIsActive] = React.useState(false);
  const [remainingSeconds, setRemainingSeconds] = React.useState(0);
  const [module, setModule] = React.useState('—');
  const [room, setRoom] = React.useState('—');
  const [code, setCode] = React.useState('—');
  const [sessionId, setSessionId] = React.useState<number | null>(null);
  const [startedAt, setStartedAt] = React.useState<string | null>(null);
  const [durationMinutes, setDurationMinutes] = React.useState(90);

  React.useEffect(() => {
    if (!isActive || !startedAt) return;

    const interval = setInterval(() => {
      const startedMs = new Date(startedAt).getTime();
      const elapsedSeconds = Math.floor((Date.now() - startedMs) / 1000);
      const next = Math.max(durationMinutes * 60 - elapsedSeconds, 0);
      setRemainingSeconds(next);
    }, 1000);

    return () => clearInterval(interval);
  }, [isActive, startedAt, durationMinutes]);

  React.useEffect(() => {
    if (remainingSeconds === 0 && isActive) {
      setIsActive(false);
    }
  }, [remainingSeconds, isActive]);

  const stopSession = React.useCallback(async () => {
    if (token && sessionId) {
      try {
        await closeSession(token, sessionId);
      } catch {
        // Best-effort: still clear local state.
      }
    }
    setIsActive(false);
    setRemainingSeconds(0);
  }, [token, sessionId]);

  const startSession = React.useCallback(
    async (details: {
      moduleId: number;
      moduleCode: string;
      moduleName: string;
      room?: string;
      durationMinutes?: number;
    }) => {
      if (!token) throw new Error('Not authenticated');

      const result = await createSession(token, {
        module_id: details.moduleId,
        duration_minutes: details.durationMinutes ?? 90,
        room: details.room ?? null
      });

      setModule(details.moduleCode || details.moduleName);
      setRoom(result.room ?? details.room ?? '—');
      setCode(result.share_code);
      setSessionId(result.session_id);
      setStartedAt(result.date_time);
      setDurationMinutes(result.duration_minutes);
      setIsActive(true);
      setRemainingSeconds(result.duration_minutes * 60);
    },
    [token]
  );

  return (
    <SessionContext.Provider
      value={{
        isActive,
        module,
        room,
        code,
        sessionId,
        startedAt,
        durationMinutes,
        remainingSeconds,
        startSession,
        stopSession
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}

export function useSessionState() {
  const context = React.useContext(SessionContext);

  if (!context) {
    throw new Error('useSessionState must be used within <SessionProvider />');
  }

  return context;
}
