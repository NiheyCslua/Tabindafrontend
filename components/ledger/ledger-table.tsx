'use client'

import { useEffect, useMemo, useState } from 'react'
import { ArrowDownLeft, ArrowUpRight, ChevronLeft, ChevronRight, Eye } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { LedgerEntry } from '@/lib/types'
import { formatCurrency, formatDate, formatInvoiceStatus } from '@/lib/utils/format'

interface LedgerTableProps {
  entries: LedgerEntry[]
  onViewEntry: (entry: LedgerEntry) => void
}

const ITEMS_PER_PAGE = 10

const sourceVariants: Record<LedgerEntry['sourceType'], 'default' | 'secondary' | 'outline'> = {
  customer_invoice: 'default',
  vendor_bill: 'secondary',
  misc_expense: 'outline',
}

export function LedgerTable({ entries, onViewEntry }: LedgerTableProps) {
  const [currentPage, setCurrentPage] = useState(1)

  const totalPages = Math.max(1, Math.ceil(entries.length / ITEMS_PER_PAGE))
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE

  const paginatedEntries = useMemo(
    () => entries.slice(startIndex, startIndex + ITEMS_PER_PAGE),
    [entries, startIndex],
  )

  useEffect(() => {
    setCurrentPage(1)
  }, [entries])

  return (
    <div className="space-y-4">
      <div className="rounded-xl border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Reference</TableHead>
              <TableHead>Party</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Debit</TableHead>
              <TableHead className="text-right">Credit</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {paginatedEntries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-28 text-center text-muted-foreground">
                  No ledger entries found.
                </TableCell>
              </TableRow>
            ) : (
              paginatedEntries.map((entry) => {
                const isDebit = entry.debit > 0

                return (
                  <TableRow
                    key={entry.id}
                    className="cursor-pointer"
                    onClick={() => onViewEntry(entry)}
                  >
                    <TableCell className="whitespace-nowrap">
                      <div className="font-medium">{formatDate(entry.date)}</div>
                      {entry.dueDate && (
                        <div className="text-xs text-muted-foreground">
                          Due {formatDate(entry.dueDate)}
                        </div>
                      )}
                    </TableCell>

                    <TableCell>
                      <Badge variant={sourceVariants[entry.sourceType]} className="gap-1.5 whitespace-nowrap">
                        {isDebit ? (
                          <ArrowDownLeft className="h-3 w-3" />
                        ) : (
                          <ArrowUpRight className="h-3 w-3" />
                        )}
                        {entry.sourceLabel}
                      </Badge>
                    </TableCell>

                    <TableCell>
                      <div className="font-mono text-sm font-medium">{entry.referenceNumber}</div>
                      <div className="text-xs text-muted-foreground">{entry.description}</div>
                    </TableCell>

                    <TableCell>
                      <div className="font-medium">{entry.partyName}</div>
                      {entry.partyEmail && (
                        <div className="text-xs text-muted-foreground">{entry.partyEmail}</div>
                      )}
                    </TableCell>

                    <TableCell>
                      <Badge variant={entry.status === 'paid' ? 'default' : 'secondary'}>
                        {formatInvoiceStatus(entry.status)}
                      </Badge>
                    </TableCell>

                    <TableCell className="text-right font-medium">
                      {entry.debit > 0 ? formatCurrency(entry.debit) : '—'}
                    </TableCell>

                    <TableCell className="text-right font-medium">
                      {entry.credit > 0 ? formatCurrency(entry.credit) : '—'}
                    </TableCell>

                    <TableCell className="text-right" onClick={(event) => event.stopPropagation()}>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5"
                        onClick={() => onViewEntry(entry)}
                      >
                        <Eye className="h-3.5 w-3.5" />
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {entries.length > ITEMS_PER_PAGE && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {startIndex + 1} to {Math.min(startIndex + ITEMS_PER_PAGE, entries.length)} of {entries.length} entries
          </p>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
              disabled={currentPage === totalPages}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
