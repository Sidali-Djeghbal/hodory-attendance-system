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
  const defaultRef = React.useRef(defaultModule);

  React.useEffect(() => {
    const previous = defaultRef.current;
    defaultRef.current = defaultModule;
    // If the selection was never changed (still on previous default), keep it in sync.
    if (selectedModule === previous) {
      setSelectedModule(defaultModule);
    }
  }, [defaultModule, selectedModule]);

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
