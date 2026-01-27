export type DateRangePreset = 'today' | 'week' | 'month' | 'custom';

export type DateRangeValue = {
  preset: DateRangePreset;
  from?: string; // yyyy-mm-dd
  to?: string; // yyyy-mm-dd
};

function pad2(value: number) {
  return String(value).padStart(2, '0');
}

export function toYmd(date: Date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(
    date.getDate()
  )}`;
}

export function resolveDateRange(value: DateRangeValue, now = new Date()) {
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  if (value.preset === 'today') {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    return { start, end, label: 'Today' };
  }

  if (value.preset === 'week') {
    const start = new Date(now);
    start.setDate(now.getDate() - 6);
    start.setHours(0, 0, 0, 0);
    return { start, end, label: 'This week' };
  }

  if (value.preset === 'month') {
    const start = new Date(now);
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    return { start, end, label: 'This month' };
  }

  const start = value.from ? new Date(`${value.from}T00:00:00`) : new Date(now);
  const customEnd = value.to
    ? new Date(`${value.to}T23:59:59`)
    : new Date(now);
  if (Number.isNaN(start.getTime()) || Number.isNaN(customEnd.getTime())) {
    return resolveDateRange({ preset: 'today' }, now);
  }
  return { start, end: customEnd, label: 'Custom' };
}

