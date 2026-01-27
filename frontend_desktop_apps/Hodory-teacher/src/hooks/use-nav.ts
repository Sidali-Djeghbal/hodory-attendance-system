'use client';

import { useMemo } from 'react';
import type { NavItem } from '@/types';

export function useFilteredNavItems(items: NavItem[]) {
  return useMemo(() => {
    const filterItems = (navItems: NavItem[]): NavItem[] =>
      navItems
        .filter((item) => item.visible !== false)
        .map((item) => ({
          ...item,
          items: item.items ? filterItems(item.items) : item.items
        }));

    return filterItems(items);
  }, [items]);
}
