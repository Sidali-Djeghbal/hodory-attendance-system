import { NavItem } from '@/types';

/**
 * Navigation configuration with RBAC support
 *
 * This configuration is used for both the sidebar navigation and Cmd+K bar.
 *
 * RBAC Access Control:
 * Each navigation item can have an `access` property that controls visibility
 * based on permissions, plans, features, roles, and organization context.
 *
 * Examples:
 *
 * 1. Require organization:
 *    access: { requireOrg: true }
 *
 * 2. Require specific permission:
 *    access: { requireOrg: true, permission: 'org:projects:manage' }
 *
 * 3. Require specific plan:
 *    access: { plan: 'pro' }
 *
 * 4. Require specific feature:
 *    access: { feature: 'premium_access' }
 *
 * 5. Require specific role:
 *    access: { role: 'admin' }
 *
 * 6. Multiple conditions (all must be true):
 *    access: { requireOrg: true, permission: 'org:projects:manage', plan: 'pro' }
 *
 * Note: The `visible` function is deprecated but still supported for backward compatibility.
 * Use the `access` property for new items.
 */
export const navItems: NavItem[] = [
  {
    title: 'Dashboard',
    url: '/dashboard/overview',
    icon: 'dashboard',
    isActive: false,
    shortcut: ['d', 'd'],
    items: []
  },
  {
    title: 'Students',
    url: '/dashboard/students',
    icon: 'students',
    shortcut: ['s', 't'],
    isActive: false,
    items: []
  },
  {
    title: 'Teachers',
    url: '/dashboard/teachers',
    icon: 'teachers',
    shortcut: ['t', 'c'],
    isActive: false,
    items: []
  },
  {
    title: 'Modules',
    url: '/dashboard/modules',
    icon: 'modules',
    shortcut: ['m', 'm'],
    isActive: false,
    items: []
  },
  {
    title: 'Module Assignments',
    url: '/dashboard/module-assignments',
    icon: 'assignments',
    shortcut: ['m', 'a'],
    isActive: false,
    items: []
  }
];
