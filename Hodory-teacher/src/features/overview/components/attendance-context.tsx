'use client';

import * as React from 'react';

type AttendanceContextValue = {
  selectedModule: string;
  setSelectedModule: (module: string) => void;
};

const AttendanceContext = React.createContext<AttendanceContextValue | null>(
  null
);

export function AttendanceProvider({
  children,
  defaultModule = 'COMPIL'
}: {
  children: React.ReactNode;
  defaultModule?: string;
}) {
  const [selectedModule, setSelectedModule] = React.useState(defaultModule);

  return (
    <AttendanceContext.Provider value={{ selectedModule, setSelectedModule }}>
      {children}
    </AttendanceContext.Provider>
  );
}

export function useAttendanceSelection() {
  const context = React.useContext(AttendanceContext);

  if (!context) {
    throw new Error(
      'useAttendanceSelection must be used within <AttendanceProvider />'
    );
  }

  return context;
}
