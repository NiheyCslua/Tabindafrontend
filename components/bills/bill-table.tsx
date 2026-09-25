"use client"

import { useState } from 'react'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ChevronLeft, ChevronRight, Edit, Eye, MoreHorizontal, Pencil, Search, Trash2 } from 'lucide-react'
import type { Bill, BillStatus } from '@/lib/types'
import { formatCurrency, formatDate, getBillStatusColor } from '@/lib/utils/format'

interface BillTableProps {
  bills: Bill[]
  onView?: (bill: Bill) => void
  onEdit?: (bill: Bill) => void
  onDelete?: (bill: Bill) => void
  onStatusChange?: (id: string, status: BillStatus) => void
}

const statusLabels: Record<BillStatus, string> = {
  paid: 'Paid',
  unpaid: 'Unpaid',
  partially_paid: 'Partially Paid',
  overdue: 'Overdue',
  cancelled: 'Cancelled',
}

const ITEMS_PER_PAGE = 10

export function BillTable({ bills, onView, onEdit, onDelete, onStatusChange }: BillTableProps) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [currentPage, setCurrentPage] = useState(1)

  const filtered = bills.filter(b => {
    const matchSearch =
      b.billNumber.toLowerCase().includes(search.toLowerCase()) ||
      b.vendorName.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'all' || b.status === statusFilter
    return matchSearch && matchStatus
  })

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const paginated = filtered.slice(startIndex, startIndex + ITEMS_PER_PAGE)

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search bills..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1) }}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setCurrentPage(1) }}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="unpaid">Unpaid</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Bill #</TableHead>
              <TableHead>Vendor</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginated.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">No bills found.</TableCell>
              </TableRow>
            ) : (
              paginated.map((bill) => (
                <TableRow
                  key={bill.id}
                  className={onView ? 'cursor-pointer hover:bg-muted/10' : ''}
                  onClick={() => onView?.(bill)}
                >
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-1.5">
                      {bill.billNumber}
                      {bill.billType === 'DEBIT' && (
                        <Badge variant="outline" className="text-[10px] px-1 py-0 border-blue-500/40 bg-blue-500/10 text-blue-600">
                          Debit
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{bill.vendorName}</div>
                    <div className="text-sm text-muted-foreground">{bill.vendorEmail}</div>
                  </TableCell>
                  <TableCell>{formatDate(bill.date)}</TableCell>
                  <TableCell>{formatDate(bill.dueDate)}</TableCell>
                  <TableCell className="text-right font-medium">{formatCurrency(bill.amount)}</TableCell>

                  {/* Inline status change */}
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    {onStatusChange ? (
                      <Select
                        value={bill.status}
                        onValueChange={(v) => onStatusChange(bill.id, v as BillStatus)}
                      >
                        <SelectTrigger className="w-[110px] h-7 text-xs border-0 px-2 shadow-none focus:ring-1">
                          <Badge className={`pointer-events-none border text-xs ${getBillStatusColor(bill.status)}`}>
                            {statusLabels[bill.status]}
                          </Badge>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="unpaid">Unpaid</SelectItem>
                          <SelectItem value="paid">Paid</SelectItem>
                          <SelectItem value="overdue">Overdue</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge className={`border text-xs ${getBillStatusColor(bill.status)}`}>{statusLabels[bill.status]}</Badge>
                    )}
                  </TableCell>

                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-2">
                      {onEdit && (
                        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => onEdit(bill)}>
                          <Pencil className="h-3.5 w-3.5" /> Edit
                        </Button>
                      )}
                      {onDelete && (
                        <Button variant="destructive" size="sm" className="gap-1.5" onClick={() => onDelete(bill)}>
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {startIndex + 1} to {Math.min(startIndex + ITEMS_PER_PAGE, filtered.length)} of {filtered.length} bills
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
              <ChevronLeft className="h-4 w-4" /> Previous
            </Button>
            <span className="text-sm text-muted-foreground">Page {currentPage} of {totalPages}</span>
            <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
              Next <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
