'use client';

import * as React from 'react';
import { useAuth } from '@/features/auth/auth-context';
import { closeSession, createSession } from '@/lib/teacher-api';
import {
  hotspotStart,
  hotspotStatus as readHotspotStatus,
  hotspotStop,
  type HotspotSecurity,
  type HotspotStatus
} from '@/lib/electron-hotspot';

type SessionContextValue = {
  isActive: boolean;
  module: string;
  room: string;
  code: string;
  sessionId: number | null;
  startedAt: string | null;
  durationMinutes: number;
  wifiSsid: string;
  wifiPassword: string;
  wifiSecurity: 'WPA' | 'WEP' | 'nopass';
  hotspotPhase: 'idle' | 'starting' | 'active' | 'inactive' | 'error';
  hotspotStatus: HotspotStatus | null;
  hotspotError: string | null;
  remainingSeconds: number;
  startSession: (details: {
    moduleId: number;
    moduleCode: string;
    moduleName: string;
    room?: string;
    durationMinutes?: number;
    wifiSsid?: string;
    wifiPassword?: string;
    wifiSecurity?: 'WPA' | 'WEP' | 'nopass';
  }) => Promise<void>;
  startHotspot: (details?: {
    ssid?: string;
    password?: string;
    security?: HotspotSecurity;
  }) => Promise<void>;
  stopHotspot: () => Promise<void>;
  refreshHotspot: () => Promise<void>;
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
  const [wifiSsid, setWifiSsid] = React.useState('Hodory-AP');
  const [wifiPassword, setWifiPassword] = React.useState('AP-ATTEND');
  const [wifiSecurity, setWifiSecurity] =
    React.useState<'WPA' | 'WEP' | 'nopass'>('WPA');
  const [hotspotPhase, setHotspotPhase] = React.useState<
    'idle' | 'starting' | 'active' | 'inactive' | 'error'
  >('idle');
  const [hotspotStatus, setHotspotStatus] = React.useState<HotspotStatus | null>(
    null
  );
  const [hotspotError, setHotspotError] = React.useState<string | null>(null);

  const refreshHotspot = React.useCallback(async () => {
    const status = await readHotspotStatus();
    setHotspotStatus(status);

    if ('error' in status) {
      setHotspotError(status.error);
      setHotspotPhase(status.supported ? 'error' : 'idle');
      return;
    }

    setHotspotError(null);
    setHotspotPhase(status.isHotspotActive ? 'active' : 'inactive');
  }, []);

  const startHotspot = React.useCallback(
    async (details?: { ssid?: string; password?: string; security?: HotspotSecurity }) => {
      const ssid = details?.ssid ?? wifiSsid;
      const security = (details?.security ?? wifiSecurity) as HotspotSecurity;
      const normalizedSecurity: HotspotSecurity = security === 'WEP' ? 'WPA' : security;
      const password = details?.password ?? wifiPassword;

      setHotspotPhase('starting');
      setHotspotError(null);
      try {
        const status = await hotspotStart({
          ssid,
          password: normalizedSecurity === 'nopass' ? undefined : password,
          security: normalizedSecurity
        });
        setHotspotStatus(status);
        if ('error' in status) {
          setHotspotError(status.error);
          setHotspotPhase(status.supported ? 'error' : 'idle');
        } else {
          setHotspotPhase(status.isHotspotActive ? 'active' : 'inactive');
          setHotspotError(null);
        }
      } catch (error) {
        setHotspotPhase('error');
        setHotspotError(error instanceof Error ? error.message : 'Failed to start hotspot');
      }
    },
    [wifiSsid, wifiPassword, wifiSecurity]
  );

  const stopHotspotCb = React.useCallback(async () => {
    try {
      await hotspotStop();
    } finally {
      await refreshHotspot();
    }
  }, [refreshHotspot]);

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
    stopHotspotCb().catch(() => null);
    setIsActive(false);
    setRemainingSeconds(0);
  }, [token, sessionId, stopHotspotCb]);

  const startSession = React.useCallback(
    async (details: {
      moduleId: number;
      moduleCode: string;
      moduleName: string;
      room?: string;
      durationMinutes?: number;
      wifiSsid?: string;
      wifiPassword?: string;
      wifiSecurity?: 'WPA' | 'WEP' | 'nopass';
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

      if (details.wifiSsid) setWifiSsid(details.wifiSsid);
      if (details.wifiPassword !== undefined) setWifiPassword(details.wifiPassword);
      if (details.wifiSecurity) setWifiSecurity(details.wifiSecurity);

      // Best-effort: start hotspot in Electron builds (no-op in browser builds).
      startHotspot({
        ssid: details.wifiSsid ?? wifiSsid,
        security: (details.wifiSecurity ?? wifiSecurity) as HotspotSecurity,
        password:
          (details.wifiSecurity ?? wifiSecurity) === 'nopass'
            ? undefined
            : details.wifiPassword ?? wifiPassword
      }).catch(() => null);
    },
    [token, startHotspot, wifiSsid, wifiSecurity, wifiPassword]
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
        wifiSsid,
        wifiPassword,
        wifiSecurity,
        hotspotPhase,
        hotspotStatus,
        hotspotError,
        remainingSeconds,
        startSession,
        startHotspot,
        stopHotspot: stopHotspotCb,
        refreshHotspot,
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
