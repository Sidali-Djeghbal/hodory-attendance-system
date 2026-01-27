'use client';

import { usePathname } from 'next/navigation';
import { useMemo } from 'react';

type BreadcrumbItem = {
  title: string;
  link: string;
};

// This allows to add custom title as well
const routeMapping: Record<string, BreadcrumbItem[]> = {
  '/dashboard': [{ title: 'Dashboard', link: '/dashboard' }],
  '/dashboard/overview': [{ title: 'Dashboard', link: '/dashboard/overview' }],
  '/dashboard/session': [
    { title: 'Dashboard', link: '/dashboard/overview' },
    { title: 'Create Session', link: '/dashboard/session' }
  ],
  '/dashboard/active-session': [
    { title: 'Dashboard', link: '/dashboard/overview' },
    { title: 'Active Session', link: '/dashboard/active-session' }
  ],
  '/dashboard/attendance': [
    { title: 'Dashboard', link: '/dashboard/overview' },
    { title: 'Attendance Records', link: '/dashboard/attendance' }
  ],
  '/dashboard/justifications': [
    { title: 'Dashboard', link: '/dashboard/overview' },
    { title: 'Justifications', link: '/dashboard/justifications' }
  ],
  '/dashboard/justifications/review': [
    { title: 'Dashboard', link: '/dashboard/overview' },
    { title: 'Justifications', link: '/dashboard/justifications' },
    { title: 'Review', link: '/dashboard/justifications/review' }
  ],
  '/dashboard/profile': [
    { title: 'Dashboard', link: '/dashboard/overview' },
    { title: 'Personal Info', link: '/dashboard/profile' }
  ],
  '/dashboard/timetable': [
    { title: 'Dashboard', link: '/dashboard/overview' },
    { title: 'Timetable', link: '/dashboard/timetable' }
  ]
  // Add more custom mappings as needed
};

export function useBreadcrumbs() {
  const pathname = usePathname();

  const breadcrumbs = useMemo(() => {
    // Check if we have a custom mapping for this exact path
    if (routeMapping[pathname]) {
      return routeMapping[pathname];
    }

    // If no exact match, fall back to generating breadcrumbs from the path
    const segments = pathname.split('/').filter(Boolean);
    return segments.map((segment, index) => {
      const path = `/${segments.slice(0, index + 1).join('/')}`;
      return {
        title: segment.charAt(0).toUpperCase() + segment.slice(1),
        link: path
      };
    });
  }, [pathname]);

  return breadcrumbs;
}
