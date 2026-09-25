'use client'

import { useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import {
  ChevronLeft,
  ChevronRight,
  Search,
  Pencil,
  Trash2,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import type { Invoice, InvoiceStatus } from '@/lib/types'
import { formatCurrency, formatDate, formatInvoiceStatus, getInvoiceStatusColor } from '@/lib/utils/format'
import { useTemplateStore } from '@/lib/store/template-store'

interface InvoiceTableProps {
  invoices: Invoice[]
  onView: (invoice: Invoice) => void
  onStatusChange: (id: string, status: InvoiceStatus) => void | Promise<void>
  onPrint?: (invoice: Invoice) => void
  onEdit?: (invoice: Invoice) => void
  onDelete?: (invoice: Invoice) => void
  isAdmin?: boolean
}

const ITEMS_PER_PAGE = 25

export function InvoiceTable({
  invoices,
  onView,
  onStatusChange,
  onPrint,
  onEdit,
  onDelete,
  isAdmin = false,
}: InvoiceTableProps) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const { templates: allTemplates } = useTemplateStore()

  const filteredInvoices = invoices.filter((invoice) => {
    const invoiceNumberMatch =
      invoice.invoiceNumber &&
      invoice.invoiceNumber.toLowerCase().includes(search.toLowerCase())

    const customerNameMatch =
      invoice.customerName &&
      invoice.customerName.toLowerCase().includes(search.toLowerCase())

    const matchesSearch = invoiceNumberMatch || customerNameMatch
    const matchesStatus =
      statusFilter === 'all' || invoice.status === statusFilter

    return matchesSearch && matchesStatus
  })

  const totalPages = Math.ceil(filteredInvoices.length / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const paginatedInvoices = filteredInvoices.slice(
    startIndex,
    startIndex + ITEMS_PER_PAGE
  )

  const handleStatusChange = async (
    invoiceId: string,
    newStatus: InvoiceStatus
  ) => {
    await onStatusChange(invoiceId, newStatus)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search invoices..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setCurrentPage(1)
            }}
            className="pl-9"
          />
        </div>

        <Select
          value={statusFilter}
          onValueChange={(value) => {
            setStatusFilter(value)
            setCurrentPage(1)
          }}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice #</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {paginatedInvoices.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center">
                  No invoices found.
                </TableCell>
              </TableRow>
            ) : (
              paginatedInvoices.map((invoice) => (
                <TableRow
                  key={invoice.id}
                  className="cursor-pointer hover:bg-muted/10"
                  onClick={() => onView(invoice)}
                >
                  <TableCell className="font-medium">
                    {invoice.invoiceNumber}
                  </TableCell>

                  <TableCell>
                    <div>
                      <div className="font-medium">{invoice.customerName}</div>
                      <div className="text-sm text-muted-foreground">
                        {invoice.customerEmail}
                      </div>
                    </div>
                  </TableCell>

                  <TableCell>{formatDate(invoice.createdAt)}</TableCell>
                  <TableCell>{formatDate(invoice.dueDate)}</TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(invoice.total)}
                  </TableCell>

                  <TableCell onClick={(e) => e.stopPropagation()}>
                    {isAdmin ? (
                      <Select
                        value={invoice.status}
                        onValueChange={(newStatus) =>
                          handleStatusChange(invoice.id, newStatus as InvoiceStatus)
                        }
                      >
                        <SelectTrigger className="w-[120px] h-7 text-xs border-0 px-2 shadow-none focus:ring-1">
                          <Badge className={`pointer-events-none border text-xs ${getInvoiceStatusColor(invoice.status)}`}>
                            {formatInvoiceStatus(invoice.status)}
                          </Badge>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="paid">Paid</SelectItem>
                          <SelectItem value="overdue">Overdue</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge className={`border text-xs ${getInvoiceStatusColor(invoice.status)}`}>
                        {formatInvoiceStatus(invoice.status)}
                      </Badge>
                    )}
                  </TableCell>

                  <TableCell>
                    {invoice.invoiceType === 'service' ? (
                      <Badge variant="secondary" className="text-xs font-normal whitespace-nowrap">
                        Service
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs font-normal whitespace-nowrap">
                        {(() => {
                          const idx = allTemplates.findIndex(t => t.id === (invoice.template ?? allTemplates[0]?.id))
                          return idx >= 0 ? `Template ${idx + 1}` : '—'
                        })()}
                      </Badge>
                    )}
                  </TableCell>

                  <TableCell>
                    <div
                      className="flex items-center gap-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {onEdit && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5"
                          onClick={() => onEdit(invoice)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Edit
                        </Button>
                      )}

                      {onPrint && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onPrint(invoice)}
                        >
                          Print
                        </Button>
                      )}

                      {isAdmin && onDelete && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => onDelete(invoice)}
                        >
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
            Showing {startIndex + 1} to{' '}
            {Math.min(startIndex + ITEMS_PER_PAGE, filteredInvoices.length)} of{' '}
            {filteredInvoices.length} invoices
          </p>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
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
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
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