'use client'

import * as React from 'react'
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'
import * as CheckboxPrimitive from '@radix-ui/react-checkbox'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

// ---------- Column definition ----------
export interface ColumnDef<T> {
  /** Unique key matching a field in the data row */
  id: string
  /** Column header label */
  header: string
  /** Custom cell renderer. Falls back to `row[id]` */
  cell?: (row: T) => React.ReactNode
  /** Accessor to get the sortable value. Defaults to `row[id]` */
  accessorFn?: (row: T) => unknown
  /** Whether the column is sortable */
  sortable?: boolean
  /** Optional className for the column */
  className?: string
}

export type SortDirection = 'asc' | 'desc' | null

export interface DataTableProps<T> {
  columns: ColumnDef<T>[]
  data: T[]
  /** Key extractor for stable row keys. Defaults to index. */
  getRowId?: (row: T, index: number) => string
  /** Enable row selection checkboxes */
  selectable?: boolean
  /** Controlled selected row IDs */
  selectedIds?: Set<string>
  /** Called when selection changes */
  onSelectionChange?: (ids: Set<string>) => void
  /** Called when a row is clicked */
  onRowClick?: (row: T) => void
  /** Empty state message */
  emptyMessage?: string
  className?: string
}

function DataTableInner<T>(
  {
    columns,
    data,
    getRowId,
    selectable = false,
    selectedIds: controlledSelectedIds,
    onSelectionChange,
    onRowClick,
    emptyMessage = 'No results found.',
    className,
  }: DataTableProps<T>,
  ref: React.ForwardedRef<HTMLDivElement>
) {
  // ---------- Sorting ----------
  const [sortColumn, setSortColumn] = React.useState<string | null>(null)
  const [sortDir, setSortDir] = React.useState<SortDirection>(null)

  // ---------- Selection ----------
  const [internalSelectedIds, setInternalSelectedIds] = React.useState<Set<string>>(new Set())
  const selectedIds = controlledSelectedIds ?? internalSelectedIds
  const setSelectedIds = onSelectionChange ?? setInternalSelectedIds

  const rowId = React.useCallback(
    (row: T, index: number) => (getRowId ? getRowId(row, index) : String(index)),
    [getRowId]
  )

  const handleSort = (colId: string) => {
    if (sortColumn === colId) {
      if (sortDir === 'asc') setSortDir('desc')
      else if (sortDir === 'desc') {
        setSortColumn(null)
        setSortDir(null)
      }
    } else {
      setSortColumn(colId)
      setSortDir('asc')
    }
  }

  const sortedData = React.useMemo(() => {
    if (!sortColumn || !sortDir) return data
    const col = columns.find((c) => c.id === sortColumn)
    if (!col) return data
    const accessor = col.accessorFn ?? ((row: T) => (row as Record<string, unknown>)[col.id])
    return [...data].sort((a, b) => {
      const aVal = accessor(a)
      const bVal = accessor(b)
      if (aVal == null) return 1
      if (bVal == null) return -1
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDir === 'asc' ? aVal - bVal : bVal - aVal
      }
      const aStr = String(aVal)
      const bStr = String(bVal)
      return sortDir === 'asc' ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr)
    })
  }, [data, sortColumn, sortDir, columns])

  // ---------- Select all ----------
  const allIds = React.useMemo(
    () => new Set(sortedData.map((row, i) => rowId(row, i))),
    [sortedData, rowId]
  )
  const allSelected = allIds.size > 0 && allIds.size === selectedIds.size
  const someSelected = selectedIds.size > 0 && !allSelected

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(allIds))
    }
  }

  const toggleRow = (id: string) => {
    const next = new Set(selectedIds)
    if (next.has(id)) {
      next.delete(id)
    } else {
      next.add(id)
    }
    setSelectedIds(next)
  }

  // ---------- Sort icon ----------
  const SortIcon = ({ colId }: { colId: string }) => {
    if (sortColumn !== colId) return <ArrowUpDown className="ml-1 h-3 w-3 text-slate-500" />
    if (sortDir === 'asc') return <ArrowUp className="ml-1 h-3 w-3 text-indigo-400" />
    return <ArrowDown className="ml-1 h-3 w-3 text-indigo-400" />
  }

  return (
    <div ref={ref} className={cn('w-full overflow-auto', className)}>
      <table className="w-full caption-bottom text-sm">
        <thead>
          <tr className="border-b border-slate-700/50">
            {selectable && (
              <th className="h-10 w-10 px-3">
                <Checkbox
                  checked={allSelected}
                  indeterminate={someSelected}
                  onCheckedChange={toggleAll}
                />
              </th>
            )}
            {columns.map((col) => (
              <th
                key={col.id}
                className={cn(
                  'h-10 px-3 text-left align-middle text-xs font-medium text-slate-400 uppercase tracking-wider',
                  col.sortable && 'cursor-pointer select-none hover:text-slate-300',
                  col.className
                )}
                onClick={() => col.sortable && handleSort(col.id)}
              >
                <span className="inline-flex items-center">
                  {col.header}
                  {col.sortable && <SortIcon colId={col.id} />}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedData.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length + (selectable ? 1 : 0)}
                className="h-24 text-center text-slate-500"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            sortedData.map((row, i) => {
              const id = rowId(row, i)
              const isSelected = selectedIds.has(id)
              return (
                <tr
                  key={id}
                  className={cn(
                    'border-b border-slate-800/50 transition-colors',
                    'hover:bg-slate-800/30',
                    isSelected && 'bg-indigo-500/5',
                    onRowClick && 'cursor-pointer'
                  )}
                  onClick={() => onRowClick?.(row)}
                >
                  {selectable && (
                    <td className="w-10 px-3 py-3">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleRow(id)}
                        onClick={(e: React.MouseEvent) => e.stopPropagation()}
                      />
                    </td>
                  )}
                  {columns.map((col) => (
                    <td key={col.id} className={cn('px-3 py-3 text-slate-300', col.className)}>
                      {col.cell
                        ? col.cell(row)
                        : String((row as Record<string, unknown>)[col.id] ?? '')}
                    </td>
                  ))}
                </tr>
              )
            })
          )}
        </tbody>
      </table>
    </div>
  )
}

// Wrap with forwardRef while keeping generic parameter
const DataTable = React.forwardRef(DataTableInner) as <T>(
  props: DataTableProps<T> & { ref?: React.ForwardedRef<HTMLDivElement> }
) => React.ReactElement

export { DataTable }

// ---------- Internal checkbox ----------
interface CheckboxProps {
  checked?: boolean
  indeterminate?: boolean
  onCheckedChange?: () => void
  onClick?: (e: React.MouseEvent) => void
}

function Checkbox({ checked, indeterminate, onCheckedChange, onClick }: CheckboxProps) {
  return (
    <CheckboxPrimitive.Root
      checked={indeterminate ? 'indeterminate' : checked}
      onCheckedChange={() => onCheckedChange?.()}
      onClick={onClick}
      className={cn(
        'flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors',
        'border-slate-600 bg-transparent',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500',
        'data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600',
        'data-[state=indeterminate]:bg-indigo-600 data-[state=indeterminate]:border-indigo-600'
      )}
    >
      <CheckboxPrimitive.Indicator className="text-white">
        {indeterminate ? (
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <rect x="2" y="4.5" width="6" height="1" rx="0.5" fill="currentColor" />
          </svg>
        ) : (
          <Check className="h-3 w-3" />
        )}
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}
