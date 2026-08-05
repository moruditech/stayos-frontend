'use client';

import React from 'react';
import { Pagination } from './primitives';
import type { Pagination as PaginationMeta } from '@stayos/types';

export interface ColumnDef<T> {
  key: string;
  header: string;
  /** Render the cell. Return null to show an empty cell. */
  render: (row: T) => React.ReactNode;
  /** Whether this column is sortable — requires onSort to be provided */
  sortable?: boolean;
  className?: string;
}

interface DataTableProps<T> {
  columns: ColumnDef<T>[];
  rows: T[];
  /** Unique key per row — used as the React list key */
  rowKey: (row: T) => string;
  pagination?: PaginationMeta;
  onPageChange?: (page: number) => void;
  sortKey?: string;
  sortDir?: 'asc' | 'desc';
  onSort?: (key: string) => void;
  onRowClick?: (row: T) => void;
  loading?: boolean;
  className?: string;
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  pagination,
  onPageChange,
  sortKey,
  sortDir,
  onSort,
  onRowClick,
  loading = false,
  className,
}: DataTableProps<T>): React.ReactElement {
  return (
    <div data-data-table className={className}>
      <div role="region" aria-busy={loading} data-data-table-scroll>
        <table>
          <thead>
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={col.className}
                  aria-sort={
                    sortKey === col.key
                      ? sortDir === 'asc'
                        ? 'ascending'
                        : 'descending'
                      : undefined
                  }
                >
                  {col.sortable && onSort ? (
                    <button
                      type="button"
                      onClick={() => onSort(col.key)}
                      data-sort-button
                      data-sort-active={sortKey === col.key || undefined}
                    >
                      {col.header}
                      {sortKey === col.key && (
                        <span aria-hidden="true">{sortDir === 'asc' ? ' ↑' : ' ↓'}</span>
                      )}
                    </button>
                  ) : (
                    col.header
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={rowKey(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                data-clickable={onRowClick ? '' : undefined}
                style={onRowClick ? { cursor: 'pointer' } : undefined}
              >
                {columns.map((col) => (
                  <td key={col.key} className={col.className}>
                    {col.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {pagination && onPageChange && (
        <Pagination meta={pagination} onPageChange={onPageChange} />
      )}
    </div>
  );
}
