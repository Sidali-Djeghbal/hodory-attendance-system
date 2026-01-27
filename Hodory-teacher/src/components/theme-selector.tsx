'use client';

import { useThemeConfig } from '@/components/active-theme';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';

const DEFAULT_SCALED_THEME = {
  name: 'Default (Scaled)',
  value: 'default-scaled'
};

export function ThemeSelector() {
  const { activeTheme, setActiveTheme } = useThemeConfig();

  return (
    <div className='flex items-center gap-2'>
      <Label htmlFor='theme-selector' className='sr-only'>
        Theme
      </Label>
      <Select value={activeTheme} onValueChange={setActiveTheme}>
        <SelectTrigger
          id='theme-selector'
          className='justify-start *:data-[slot=select-value]:w-12'
        >
          <span className='text-muted-foreground hidden sm:block'>
            Select a theme:
          </span>
          <span className='text-muted-foreground block sm:hidden'>Theme</span>
          <SelectValue placeholder='Select a theme' />
        </SelectTrigger>
        <SelectContent align='end'>
          <SelectGroup>
            <SelectLabel>Default</SelectLabel>
            <SelectItem
              key={DEFAULT_SCALED_THEME.name}
              value={DEFAULT_SCALED_THEME.value}
            >
              {DEFAULT_SCALED_THEME.name}
            </SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  );
}
