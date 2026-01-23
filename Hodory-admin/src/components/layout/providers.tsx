'use client';
import React from 'react';
import { ActiveThemeProvider } from '../active-theme';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

export default function Providers({
	activeThemeValue,
	children
}: {
	activeThemeValue: string;
	children: React.ReactNode;
}) {
	return (
		<QueryClientProvider client={queryClient}>
			<ActiveThemeProvider initialTheme={activeThemeValue}>
				{children}
			</ActiveThemeProvider>
		</QueryClientProvider>
	);
}
