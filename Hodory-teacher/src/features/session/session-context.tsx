'use client';

import * as React from 'react';

type SessionContextValue = {
  isActive: boolean;
  module: string;
  room: string;
  code: string;
  remainingSeconds: number;
  startSession: (details: { module: string; room: string }) => void;
  stopSession: () => void;
};

const SessionContext = React.createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [isActive, setIsActive] = React.useState(false);
  const [remainingSeconds, setRemainingSeconds] = React.useState(0);
  const [module, setModule] = React.useState('—');
  const [room, setRoom] = React.useState('—');
  const [code, setCode] = React.useState('—');

  const generateCode = () => {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const randomChar = () =>
      alphabet[Math.floor(Math.random() * alphabet.length)];

    const part = (length: number) =>
      Array.from({ length }, () => randomChar()).join('');

    return `${part(4)}-${part(4)}`;
  };

  React.useEffect(() => {
    if (!isActive || remainingSeconds <= 0) return;

    const interval = setInterval(() => {
      setRemainingSeconds((prev) => Math.max(prev - 1, 0));
    }, 1000);

    return () => clearInterval(interval);
  }, [isActive, remainingSeconds]);

  React.useEffect(() => {
    if (remainingSeconds === 0 && isActive) {
      setIsActive(false);
    }
  }, [remainingSeconds, isActive]);

  const stopSession = () => {
    setIsActive(false);
    setRemainingSeconds(0);
  };

  const startSession = (details: { module: string; room: string }) => {
    setModule(details.module);
    setRoom(details.room);
    setCode(generateCode());
    setIsActive(true);
    setRemainingSeconds(90 * 60);
  };

  return (
    <SessionContext.Provider
      value={{
        isActive,
        module,
        room,
        code,
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
