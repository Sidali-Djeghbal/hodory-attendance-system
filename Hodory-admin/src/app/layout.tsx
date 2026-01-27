import Providers from '@/components/layout/providers';
import { Toaster } from '@/components/ui/sonner';
import { fontVariables } from '@/lib/font';
import ThemeProvider from '@/components/layout/ThemeToggle/theme-provider';
import { cn } from '@/lib/utils';
import type { Metadata, Viewport } from 'next';
import { cookies } from 'next/headers';
import NextTopLoader from 'nextjs-toploader';
import { NuqsAdapter } from 'nuqs/adapters/next/app';
import './globals.css';
import './theme.css';

const META_THEME_COLORS = {
	light: '#ffffff',
	dark: '#09090b'
};

export const metadata: Metadata = {
	title: 'Next Shadcn',
	description: 'Basic dashboard with Next.js and Shadcn'
};

export const viewport: Viewport = {
	themeColor: META_THEME_COLORS.light
};

export default async function RootLayout({
	children
}: {
	children: React.ReactNode;
}) {
	const cookieStore = await cookies();
	const rawThemeValue = cookieStore.get('active_theme')?.value;
	const activeThemeValue =
		!rawThemeValue || rawThemeValue === 'default'
			? 'default-scaled'
			: rawThemeValue;
	const isScaled = activeThemeValue.endsWith('-scaled');

	return (
		<html lang='en' suppressHydrationWarning>
			<head>
				<script
					dangerouslySetInnerHTML={{
						__html: `
              try {
                const storedTheme = localStorage.getItem('theme')
                if (storedTheme === 'system') localStorage.setItem('theme', 'light')

                const activeTheme = localStorage.getItem('theme') || 'light'
                const metaThemeColor = document.querySelector('meta[name="theme-color"]')
                if (metaThemeColor) {
                  metaThemeColor.setAttribute('content', activeTheme === 'dark' ? '${META_THEME_COLORS.dark}' : '${META_THEME_COLORS.light}')
                }
              } catch (_) {}
            `
					}}
				/>
			</head>
			<body
				suppressHydrationWarning
				className={cn(
					'bg-background overflow-hidden overscroll-none font-sans antialiased',
					`theme-${activeThemeValue}`,
					isScaled ? 'theme-scaled' : '',
					fontVariables
				)}
			>
				<NextTopLoader color='var(--primary)' showSpinner={false} />
				<NuqsAdapter>
					<ThemeProvider
						attribute='class'
						defaultTheme='light'
						enableSystem={false}
						disableTransitionOnChange
						enableColorScheme
					>
						<Providers activeThemeValue={activeThemeValue as string}>
							<Toaster />
							{children}
						</Providers>
					</ThemeProvider>
				</NuqsAdapter>
			</body>
		</html>
	);
}
