'use client';

import * as React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { IconChevronDown, IconChevronUp } from '@tabler/icons-react';

export type DataTableColumn<Row> = {
  key: string;
  header: string;
  className?: string;
  sortable?: boolean;
  accessor?: (row: Row) => string | number | null | undefined;
  cell?: (row: Row) => React.ReactNode;
};

type Sort = { key: string; direction: 'asc' | 'desc' } | null;

type Props<Row> = {
  rows: Row[];
  columns: Array<DataTableColumn<Row>>;
  searchPlaceholder?: string;
  searchFn?: (row: Row, query: string) => boolean;
  emptyState?: React.ReactNode;
  onRowClick?: (row: Row) => void;
  initialPageSize?: 10 | 20 | 50;
};

export function DataTable<Row>({
  rows,
  columns,
  searchPlaceholder = 'Search…',
  searchFn,
  emptyState,
  onRowClick,
  initialPageSize = 10
}: Props<Row>) {
  const [query, setQuery] = React.useState('');
  const [sort, setSort] = React.useState<Sort>(null);
  const [pageSize, setPageSize] = React.useState<number>(initialPageSize);
  const [page, setPage] = React.useState(1);

  const normalizedQuery = query.trim().toLowerCase();

  const filtered = React.useMemo(() => {
    if (!normalizedQuery) return rows;
    const fn =
      searchFn ??
      ((row: Row, q: string) =>
        JSON.stringify(row).toLowerCase().includes(q));
    return rows.filter((row) => fn(row, normalizedQuery));
  }, [rows, normalizedQuery, searchFn]);

  const sorted = React.useMemo(() => {
    if (!sort) return filtered;
    const column = columns.find((c) => c.key === sort.key);
    const accessor = column?.accessor ?? ((row: Row) => (row as any)?.[sort.key]);
    const dir = sort.direction === 'asc' ? 1 : -1;
    return filtered.slice().sort((a, b) => {
      const av = accessor(a);
      const bv = accessor(b);
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
      return String(av).localeCompare(String(bv)) * dir;
    });
  }, [filtered, sort, columns]);

  const pageCount = Math.max(Math.ceil(sorted.length / pageSize), 1);
  const clampedPage = Math.min(page, pageCount);

  React.useEffect(() => {
    if (page !== clampedPage) setPage(clampedPage);
  }, [clampedPage, page]);

  const paged = React.useMemo(() => {
    const start = (clampedPage - 1) * pageSize;
    return sorted.slice(start, start + pageSize);
  }, [sorted, clampedPage, pageSize]);

  return (
    <div className='grid gap-3'>
      <div className='flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
        <Input
          value={query}
          onChange={(e) => {
            setPage(1);
            setQuery(e.target.value);
          }}
          placeholder={searchPlaceholder}
          className='h-9 sm:max-w-sm'
        />
        <div className='flex items-center justify-between gap-2 sm:justify-end'>
          <div className='text-xs text-muted-foreground'>
            {sorted.length} result{sorted.length === 1 ? '' : 's'}
          </div>
          <Select
            value={String(pageSize)}
            onValueChange={(value) => {
              setPage(1);
              setPageSize(Number(value));
            }}
          >
            <SelectTrigger className='h-9 w-[110px]'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='10'>10 / page</SelectItem>
              <SelectItem value='20'>20 / page</SelectItem>
              <SelectItem value='50'>50 / page</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className='overflow-hidden rounded-lg border border-border/60'>
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((column) => {
                const isActive = sort?.key === column.key;
                const indicator =
                  isActive && sort?.direction === 'asc' ? (
                    <IconChevronUp className='ml-1 inline-block h-3 w-3' />
                  ) : isActive ? (
                    <IconChevronDown className='ml-1 inline-block h-3 w-3' />
                  ) : null;

                return (
                  <TableHead
                    key={column.key}
                    className={cn(column.className, column.sortable ? 'cursor-pointer select-none' : '')}
                    onClick={() => {
                      if (!column.sortable) return;
                      setPage(1);
                      setSort((prev) => {
                        if (!prev || prev.key !== column.key) {
                          return { key: column.key, direction: 'asc' };
                        }
                        return {
                          key: column.key,
                          direction: prev.direction === 'asc' ? 'desc' : 'asc'
                        };
                      });
                    }}
                  >
                    <span className='inline-flex items-center'>
                      {column.header}
                      {indicator}
                    </span>
                  </TableHead>
                );
              })}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paged.map((row, index) => (
              <TableRow
                key={index}
                className={onRowClick ? 'cursor-pointer' : undefined}
                onClick={() => onRowClick?.(row)}
              >
                {columns.map((column) => (
                  <TableCell key={column.key} className={column.className}>
                    {column.cell ? column.cell(row) : String((row as any)?.[column.key] ?? '')}
                  </TableCell>
                ))}
              </TableRow>
            ))}
            {paged.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className='text-muted-foreground'>
                  {emptyState ?? 'No results.'}
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>

      <div className='flex items-center justify-between gap-2'>
        <div className='text-xs text-muted-foreground'>
          Page {clampedPage} of {pageCount}
        </div>
        <div className='flex items-center gap-2'>
          <Button
            variant='outline'
            size='sm'
            className='h-8'
            disabled={clampedPage <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </Button>
          <Button
            variant='outline'
            size='sm'
            className='h-8'
            disabled={clampedPage >= pageCount}
            onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}

