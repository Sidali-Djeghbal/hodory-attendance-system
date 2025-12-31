import {
  IconCommand,
  IconLayoutDashboard,
  IconProps,
  IconUser,
  IconUsers,
  IconUserStar,
  IconBook2,
  IconArrowsShuffle,
  IconLogout
} from '@tabler/icons-react';

import type { ComponentType } from 'react';

export type Icon = ComponentType<IconProps>;

export const Icons = {
  logo: IconCommand,
  profile: IconUser,
  dashboard: IconLayoutDashboard,
  students: IconUsers,
  teachers: IconUserStar,
  modules: IconBook2,
  assignments: IconArrowsShuffle,
  logout: IconLogout
};
