import {
  IconCommand,
  IconFileText,
  IconLayoutDashboard,
  IconProps,
  IconUser,
  IconCalendarEvent,
  IconClipboardList,
  IconBolt,
  IconClockHour4
} from '@tabler/icons-react';

import type { ComponentType } from 'react';

export type Icon = ComponentType<IconProps>;

export const Icons = {
  logo: IconCommand,
  profile: IconUser,
  dashboard: IconLayoutDashboard,
  session: IconCalendarEvent,
  attendance: IconClipboardList,
  justifications: IconFileText,
  activeSession: IconBolt,
  timetable: IconClockHour4
};
