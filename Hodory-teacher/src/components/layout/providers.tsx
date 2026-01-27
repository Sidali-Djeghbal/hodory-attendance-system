'use client';
import React from 'react';
import { ActiveThemeProvider } from '../active-theme';
import { AuthProvider } from '@/features/auth/auth-context';

export default function Providers({
  activeThemeValue,
  children
}: {
  activeThemeValue: string;
  children: React.ReactNode;
}) {
  return (
    <ActiveThemeProvider initialTheme={activeThemeValue}>
      <AuthProvider>{children}</AuthProvider>
    </ActiveThemeProvider>
  );
}
