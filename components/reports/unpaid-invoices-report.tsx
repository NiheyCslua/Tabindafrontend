'use client'

import { useEffect, useMemo, useState } from 'react'
import { Download, Printer, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useInvoiceStore } from '@/lib/store/invoice-store'
import { useCustomerStore } from '@/lib/store/customer-store'
import {
  getUnpaidInvoices,
  getAgingBucket,
  AGING_LABELS,
  exportToCsv,
} from '@/lib/reports/report-utils'
import { printReport } from '@/lib/reports/print-utils'
import { formatCurrency, formatDate, getInvoiceStatusColor } from '@/lib/utils/format'
import type { DateSortOrder, Invoice } from '@/lib/types'

type InvoiceStatusFilter = 'pending' | 'overdue' | 'both'

type UnpaidInvoiceFilters = {
  customerId: string
  statusFilter: InvoiceStatusFilter
  startDate: string
  endDate: string
  sortOrder: DateSortOrder
}

type ValidationErrors = Partial<Record<'startDate' | 'endDate' | 'dateRange', string>>

const INITIAL_FILTERS: UnpaidInvoiceFilters = {
  customerId: 'all',
  statusFilter: 'both',
  startDate: '',
  endDate: '',
  sortOrder: 'oldest',
}

function validateFilters(filters: UnpaidInvoiceFilters): ValidationErrors {
  const errors: ValidationErrors = {}

  if (!filters.startDate) errors.startDate = 'Please select a start date.'
  if (!filters.endDate) errors.endDate = 'Please select an end date.'
  if (
    filters.startDate &&
    filters.endDate &&
    new Date(filters.startDate).getTime() > new Date(filters.endDate).getTime()
  ) {
    errors.dateRange = 'Start date cannot be after end date.'
  }

  return errors
}

export function UnpaidInvoicesReport() {
  const { invoices, fetchInvoices, isLoading } = useInvoiceStore()
  const { customers, fetchCustomers } = useCustomerStore()

  const [filters, setFilters] = useState<UnpaidInvoiceFilters>(INITIAL_FILTERS)
  const [appliedFilters, setAppliedFilters] = useState<UnpaidInvoiceFilters | null>(null)
  const [hasGenerated, setHasGenerated] = useState(false)
  const [errors, setErrors] = useState<ValidationErrors>({})

  useEffect(() => {
    fetchInvoices()
    fetchCustomers()
  }, [fetchInvoices, fetchCustomers])

  const filtered = useMemo<Invoice[]>(() => {
    if (!hasGenerated || !appliedFilters) return []

    return getUnpaidInvoices(invoices, {
      customerId: appliedFilters.customerId,
      statusFilter: appliedFilters.statusFilter,
      range: { startDate: appliedFilters.startDate, endDate: appliedFilters.endDate },
      sortOrder: appliedFilters.sortOrder,
    })
  }, [invoices, hasGenerated, appliedFilters])

  const filtersChanged = hasGenerated && JSON.stringify(filters) !== JSON.stringify(appliedFilters)
  const totalAmount = filtered.reduce((s, i) => s + i.total, 0)
  const pendingAmount = filtered.filter(i => i.status === 'pending').reduce((s, i) => s + i.total, 0)
  const overdueAmount = filtered.filter(i => i.status === 'overdue').reduce((s, i) => s + i.total, 0)
  const uniqueCustomers = new Set(filtered.map(i => i.customerId)).size

  const aging = useMemo(() => {
    const buckets: Record<string, number> = {
      not_overdue: 0,
      '0_30': 0,
      '31_60': 0,
      '61_90': 0,
      '90_plus': 0,
    }
    filtered.forEach(inv => {
      if (inv.dueDate) buckets[getAgingBucket(inv.dueDate)] += inv.total
    })
    return buckets
  }, [filtered])

  const updateFilter = <K extends keyof UnpaidInvoiceFilters>(key: K, value: UnpaidInvoiceFilters[K]) => {
    setFilters(current => ({ ...current, [key]: value }))
  }

  const handleGenerate = () => {
    const validationErrors = validateFilters(filters)
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      setHasGenerated(false)
      setAppliedFilters(null)
      return
    }

    setErrors({})
    setAppliedFilters({ ...filters })
    setHasGenerated(true)
  }

  const handleReset = () => {
    setFilters(INITIAL_FILTERS)
    setAppliedFilters(null)
    setHasGenerated(false)
    setErrors({})
  }

  const handleExport = () => {
    if (!filtered.length) return
    exportToCsv(
      'unpaid-invoices.csv',
      filtered.map(i => ({
        'Invoice #': i.invoiceNumber,
        Customer: i.customerName,
        Date: formatDate(i.createdAt),
        'Due Date': i.dueDate ? formatDate(i.dueDate) : '-',
        Status: i.status,
        Total: i.total,
      }))
    )
  }

  const handlePrintReport = () => {
    if (!filtered.length || !appliedFilters) return
    const selectedCustomer = customers.find(c => c.id === appliedFilters.customerId)
    printReport({
      title: 'Unpaid Customer Invoices',
      subtitle: filtered.length + ' ' + (filtered.length === 1 ? 'invoice' : 'invoices'),
      metadata: [
        'Date Range: ' + formatDate(appliedFilters.startDate) + ' - ' + formatDate(appliedFilters.endDate),
        'Customer: ' + (selectedCustomer?.name ?? 'All Customers'),
        'Status: ' + (appliedFilters.statusFilter === 'both' ? 'Pending and Overdue' : appliedFilters.statusFilter.charAt(0).toUpperCase() + appliedFilters.statusFilter.slice(1)),
        'Sort: ' + (appliedFilters.sortOrder === 'newest' ? 'Newest to Oldest' : 'Oldest to Newest'),
      ],
      orientation: 'landscape',
      tables: [{
        title: 'Invoice Details',
        columns: [
          { key: 'Invoice #', label: 'Invoice #' },
          { key: 'Customer', label: 'Customer' },
          { key: 'Date', label: 'Date' },
          { key: 'Due Date', label: 'Due Date' },
          { key: 'Status', label: 'Status' },
          { key: 'Amount', label: 'Amount', align: 'right' },
        ],
        rows: filtered.map(inv => ({
          'Invoice #': inv.invoiceNumber,
          Customer: inv.customerName,
          Date: formatDate(inv.createdAt),
          'Due Date': inv.dueDate ? formatDate(inv.dueDate) : '-',
          Status: inv.status.charAt(0).toUpperCase() + inv.status.slice(1),
          Amount: formatCurrency(inv.total),
        })),
      }],
    })
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div className="space-y-1.5">
              <Label>Customer</Label>
              <Select value={filters.customerId} onValueChange={value => updateFilter('customerId', value)}>
                <SelectTrigger><SelectValue placeholder="All customers" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Customers</SelectItem>
                  {customers.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={filters.statusFilter} onValueChange={v => updateFilter('statusFilter', v as InvoiceStatusFilter)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="both">Pending & Overdue</SelectItem>
                  <SelectItem value="pending">Pending Only</SelectItem>
                  <SelectItem value="overdue">Overdue Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Start Date <span className="text-red-500">*</span></Label>
              <Input type="date" value={filters.startDate} onChange={e => updateFilter('startDate', e.target.value)} />
              {errors.startDate && <p className="text-xs text-red-500">{errors.startDate}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>End Date <span className="text-red-500">*</span></Label>
              <Input type="date" value={filters.endDate} onChange={e => updateFilter('endDate', e.target.value)} />
              {errors.endDate && <p className="text-xs text-red-500">{errors.endDate}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Sort by Date</Label>
              <Select value={filters.sortOrder} onValueChange={v => updateFilter('sortOrder', v as DateSortOrder)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="oldest">Oldest to Newest</SelectItem>
                  <SelectItem value="newest">Newest to Oldest</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {errors.dateRange && <p className="text-sm text-red-500">{errors.dateRange}</p>}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              Choose a date range and customer/status filters to generate the unpaid invoices report.
            </p>
            <div className="flex gap-2">
              <Button onClick={handleGenerate}>Generate Report</Button>
              <Button variant="outline" onClick={handleReset}>Reset Filters</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {!hasGenerated && <PreGenerateState message="Select filters and click Generate Report to view results." />}

      {filtersChanged && (
        <div className="rounded-md border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-300">
          Filters changed. Click Generate Report to refresh results.
        </div>
      )}

      {hasGenerated && filtered.length > 500 && (
        <div className="rounded-md border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-300">
          This report contains many rows. Use a smaller date range for faster results.
        </div>
      )}

      {hasGenerated && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <SummaryCard label="Total Unpaid" value={filtered.length.toString()} sub="invoices" />
            <SummaryCard label="Total Amount" value={formatCurrency(totalAmount)} highlight />
            <SummaryCard label="Pending" value={formatCurrency(pendingAmount)} color="amber" />
            <SummaryCard label="Overdue" value={formatCurrency(overdueAmount)} color="red" />
            <SummaryCard label="Customers Owing" value={uniqueCustomers.toString()} sub="customers" />
          </div>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Aging Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 grid-cols-2 sm:grid-cols-5">
                {(Object.entries(AGING_LABELS) as [string, string][]).map(([key, label]) => (
                  <div key={key} className="rounded-lg border bg-muted/20 px-3 py-2 text-center">
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="font-semibold text-sm mt-0.5">{formatCurrency(aging[key] ?? 0)}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base">
                Invoice Details
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  ({filtered.length} {filtered.length === 1 ? 'invoice' : 'invoices'})
                </span>
              </CardTitle>
              {filtered.length > 0 && (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleExport}>
                    <Download className="mr-1.5 h-3.5 w-3.5" />CSV
                  </Button>
                  <Button variant="outline" size="sm" onClick={handlePrintReport}>
                    <Printer className="mr-1.5 h-3.5 w-3.5" />Print
                  </Button>
                </div>
              )}
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="py-8 text-center text-muted-foreground text-sm">Loading...</div>
              ) : filtered.length === 0 ? (
                <EmptyState message="No records found for the selected filters." />
              ) : (
                <div className="rounded-md border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/40 hover:bg-muted/40">
                        <TableHead>Invoice #</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Due Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map(inv => (
                        <TableRow key={inv.id}>
                          <TableCell className="font-mono text-sm font-medium">{inv.invoiceNumber}</TableCell>
                          <TableCell>{inv.customerName}</TableCell>
                          <TableCell className="text-muted-foreground text-sm">{formatDate(inv.createdAt)}</TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {inv.dueDate ? formatDate(inv.dueDate) : '-'}
                          </TableCell>
                          <TableCell>
                            <Badge className={`border text-xs ${getInvoiceStatusColor(inv.status)}`}>
                              {inv.status.charAt(0).toUpperCase() + inv.status.slice(1)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-semibold tabular-nums">
                            {formatCurrency(inv.total)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}

function SummaryCard({
  label,
  value,
  sub,
  highlight,
  color,
}: {
  label: string
  value: string
  sub?: string
  highlight?: boolean
  color?: 'amber' | 'red'
}) {
  return (
    <Card className={highlight ? 'border-primary/30 bg-primary/5' : ''}>
      <CardContent className="pt-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={`text-xl font-bold mt-1 tabular-nums ${color === 'red' ? 'text-red-500' : color === 'amber' ? 'text-amber-500' : ''}`}>
          {value}
        </p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </CardContent>
    </Card>
  )
}

function PreGenerateState({ message }: { message: string }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-14 gap-3 text-muted-foreground">
        <AlertCircle className="h-10 w-10 opacity-30" />
        <p className="font-medium text-foreground">{message}</p>
        <p className="text-sm opacity-70">Summary cards, table, CSV, and print appear after generation.</p>
      </CardContent>
    </Card>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 gap-2 text-muted-foreground">
      <AlertCircle className="h-8 w-8 opacity-40" />
      <p className="text-sm">{message}</p>
    </div>
  )
}
