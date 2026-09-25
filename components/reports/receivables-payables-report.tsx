'use client'

import { useEffect, useMemo, useState } from 'react'
import { Download, Printer, TrendingUp, TrendingDown, Minus, AlertCircle } from 'lucide-react'
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
import { useBillStore } from '@/lib/store/bill-store'
import { useCustomerStore } from '@/lib/store/customer-store'
import { useVendorStore } from '@/lib/store/vendor-store'
import {
  getUnpaidInvoices,
  getUnpaidBills,
  calcReceivablesPayables,
  exportToCsv,
} from '@/lib/reports/report-utils'
import { printReport } from '@/lib/reports/print-utils'
import { formatCurrency, formatDate, getInvoiceStatusColor } from '@/lib/utils/format'
import type { Bill, DateSortOrder, Invoice } from '@/lib/types'

const BILL_STATUS_COLOR: Record<string, string> = {
  unpaid: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  overdue: 'bg-red-500/10 text-red-500 border-red-500/20',
  paid: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  cancelled: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
}

type ReceivablesPayablesFilters = {
  startDate: string
  endDate: string
  customerId: string
  vendorId: string
  sortOrder: DateSortOrder
}

type ValidationErrors = Partial<Record<'startDate' | 'endDate' | 'dateRange', string>>

const INITIAL_FILTERS: ReceivablesPayablesFilters = {
  startDate: '',
  endDate: '',
  customerId: 'all',
  vendorId: 'all',
  sortOrder: 'oldest',
}

function validateFilters(filters: ReceivablesPayablesFilters): ValidationErrors {
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

export function ReceivablesPayablesReport() {
  const { invoices, fetchInvoices } = useInvoiceStore()
  const { bills, fetchBills } = useBillStore()
  const { customers, fetchCustomers } = useCustomerStore()
  const { vendors, fetchVendors } = useVendorStore()

  const [filters, setFilters] = useState<ReceivablesPayablesFilters>(INITIAL_FILTERS)
  const [appliedFilters, setAppliedFilters] = useState<ReceivablesPayablesFilters | null>(null)
  const [hasGenerated, setHasGenerated] = useState(false)
  const [errors, setErrors] = useState<ValidationErrors>({})

  useEffect(() => {
    fetchInvoices()
    fetchBills()
    fetchCustomers()
    fetchVendors()
  }, [fetchInvoices, fetchBills, fetchCustomers, fetchVendors])

  const filteredInvoices = useMemo<Invoice[]>(() => {
    if (!hasGenerated || !appliedFilters) return []

    return getUnpaidInvoices(invoices, {
      customerId: appliedFilters.customerId,
      range: { startDate: appliedFilters.startDate, endDate: appliedFilters.endDate },
      sortOrder: appliedFilters.sortOrder,
    })
  }, [invoices, hasGenerated, appliedFilters])

  const filteredBills = useMemo<Bill[]>(() => {
    if (!hasGenerated || !appliedFilters) return []

    return getUnpaidBills(bills, {
      vendorId: appliedFilters.vendorId,
      range: { startDate: appliedFilters.startDate, endDate: appliedFilters.endDate },
      sortOrder: appliedFilters.sortOrder,
    })
  }, [bills, hasGenerated, appliedFilters])

  const summary = useMemo(
    () => calcReceivablesPayables(filteredInvoices, filteredBills),
    [filteredInvoices, filteredBills]
  )

  const filtersChanged = hasGenerated && JSON.stringify(filters) !== JSON.stringify(appliedFilters)
  const netPositive = summary.netPosition >= 0
  const totalRows = filteredInvoices.length + filteredBills.length

  const updateFilter = <K extends keyof ReceivablesPayablesFilters>(key: K, value: ReceivablesPayablesFilters[K]) => {
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
    if (totalRows === 0) return

    if (filteredInvoices.length > 0) {
      exportToCsv('receivables.csv', filteredInvoices.map(i => ({
        Type: 'Receivable',
        'Invoice #': i.invoiceNumber,
        Party: i.customerName,
        Date: formatDate(i.createdAt),
        'Due Date': i.dueDate ? formatDate(i.dueDate) : '-',
        Status: i.status,
        Amount: i.total,
      })))
    }

    if (filteredBills.length > 0) {
      exportToCsv('payables.csv', filteredBills.map(b => ({
        Type: 'Payable',
        'Bill #': b.billNumber,
        Party: b.vendorName,
        Date: formatDate(b.date),
        'Due Date': b.dueDate ? formatDate(b.dueDate) : '-',
        Status: b.status,
        Amount: b.amount,
      })))
    }
  }

  const handlePrintReport = () => {
    if (totalRows === 0 || !appliedFilters) return
    const selectedCustomer = customers.find(c => c.id === appliedFilters.customerId)
    const selectedVendor = vendors.find(v => v.id === appliedFilters.vendorId)
    printReport({
      title: 'Receivables vs Payables',
      subtitle: totalRows + ' ' + (totalRows === 1 ? 'row' : 'rows'),
      metadata: [
        'Date Range: ' + formatDate(appliedFilters.startDate) + ' - ' + formatDate(appliedFilters.endDate),
        'Customer: ' + (selectedCustomer?.name ?? 'All Customers'),
        'Vendor: ' + (selectedVendor?.company ?? 'All Vendors'),
        'Sort: ' + (appliedFilters.sortOrder === 'newest' ? 'Newest to Oldest' : 'Oldest to Newest'),
      ],
      orientation: 'landscape',
      tables: [
        {
          title: 'Customer Receivables',
          columns: [
            { key: 'Invoice #', label: 'Invoice #' },
            { key: 'Customer', label: 'Customer' },
            { key: 'Date', label: 'Date' },
            { key: 'Due Date', label: 'Due Date' },
            { key: 'Status', label: 'Status' },
            { key: 'Amount', label: 'Amount', align: 'right' },
          ],
          rows: filteredInvoices.map(inv => ({
            'Invoice #': inv.invoiceNumber,
            Customer: inv.customerName,
            Date: formatDate(inv.createdAt),
            'Due Date': inv.dueDate ? formatDate(inv.dueDate) : '-',
            Status: inv.status.charAt(0).toUpperCase() + inv.status.slice(1),
            Amount: formatCurrency(inv.total),
          })),
        },
        {
          title: 'Vendor Payables',
          columns: [
            { key: 'Bill #', label: 'Bill #' },
            { key: 'Vendor', label: 'Vendor' },
            { key: 'Date', label: 'Date' },
            { key: 'Due Date', label: 'Due Date' },
            { key: 'Status', label: 'Status' },
            { key: 'Amount', label: 'Amount', align: 'right' },
          ],
          rows: filteredBills.map(bill => ({
            'Bill #': bill.billNumber,
            Vendor: bill.vendorName,
            Date: formatDate(bill.date),
            'Due Date': bill.dueDate ? formatDate(bill.dueDate) : '-',
            Status: bill.status.charAt(0).toUpperCase() + bill.status.slice(1),
            Amount: formatCurrency(bill.amount),
          })),
        },
      ],
    })
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Filters</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div className="space-y-1.5">
              <Label>Customer</Label>
              <Select value={filters.customerId} onValueChange={value => updateFilter('customerId', value)}>
                <SelectTrigger><SelectValue placeholder="All customers" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Customers</SelectItem>
                  {customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Vendor</Label>
              <Select value={filters.vendorId} onValueChange={value => updateFilter('vendorId', value)}>
                <SelectTrigger><SelectValue placeholder="All vendors" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Vendors</SelectItem>
                  {vendors.map(v => <SelectItem key={v.id} value={v.id}>{v.company}</SelectItem>)}
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
              Choose a date range to compare receivables and payables.
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

      {hasGenerated && totalRows > 500 && (
        <div className="rounded-md border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-300">
          This report contains many rows. Use a smaller date range for faster results.
        </div>
      )}

      {hasGenerated && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <Card className="border-emerald-500/30 bg-emerald-500/5">
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground">Total Receivables</p>
                <p className="text-xl font-bold text-emerald-500 tabular-nums mt-1">{formatCurrency(summary.totalReceivables)}</p>
                <p className="text-xs text-muted-foreground mt-0.5">from {filteredInvoices.length} invoice{filteredInvoices.length !== 1 ? 's' : ''}</p>
              </CardContent>
            </Card>
            <Card className="border-red-500/30 bg-red-500/5">
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground">Total Payables</p>
                <p className="text-xl font-bold text-red-500 tabular-nums mt-1">{formatCurrency(summary.totalPayables)}</p>
                <p className="text-xs text-muted-foreground mt-0.5">from {filteredBills.length} bill{filteredBills.length !== 1 ? 's' : ''}</p>
              </CardContent>
            </Card>
            <Card className={netPositive ? 'border-blue-500/30 bg-blue-500/5' : 'border-orange-500/30 bg-orange-500/5'}>
              <CardContent className="pt-4">
                <div className="flex items-center gap-1.5">
                  {netPositive
                    ? <TrendingUp className="h-4 w-4 text-blue-500" />
                    : <TrendingDown className="h-4 w-4 text-orange-500" />}
                  <p className="text-xs text-muted-foreground">Net Position</p>
                </div>
                <p className={`text-xl font-bold tabular-nums mt-1 ${netPositive ? 'text-blue-500' : 'text-orange-500'}`}>
                  {formatCurrency(Math.abs(summary.netPosition))}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {netPositive ? 'Net receivable' : 'Net payable'}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground">Overdue Receivables</p>
                <p className="text-xl font-bold text-amber-500 tabular-nums mt-1">{formatCurrency(summary.overdueReceivables)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground">Overdue Payables</p>
                <p className="text-xl font-bold text-rose-500 tabular-nums mt-1">{formatCurrency(summary.overduePayables)}</p>
              </CardContent>
            </Card>
          </div>

          <div className={`flex items-center gap-3 rounded-lg border px-4 py-3 ${netPositive ? 'border-blue-500/20 bg-blue-500/5' : 'border-orange-500/20 bg-orange-500/5'}`}>
            {netPositive
              ? <TrendingUp className="h-5 w-5 text-blue-500 shrink-0" />
              : <TrendingDown className="h-5 w-5 text-orange-500 shrink-0" />}
            <p className="text-sm">
              {netPositive
                ? `Customers owe you ${formatCurrency(summary.netPosition)} more than you owe vendors.`
                : `You owe vendors ${formatCurrency(Math.abs(summary.netPosition))} more than customers owe you.`}
            </p>
            {totalRows > 0 && (
              <div className="ml-auto flex gap-2">
                <Button variant="outline" size="sm" onClick={handleExport}>
                  <Download className="mr-1.5 h-3.5 w-3.5" />Export
                </Button>
                <Button variant="outline" size="sm" onClick={handlePrintReport}>
                  <Printer className="mr-1.5 h-3.5 w-3.5" />Print
                </Button>
              </div>
            )}
          </div>

          {totalRows === 0 ? (
            <Card>
              <CardContent>
                <EmptyState message="No records found for the selected filters." />
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 inline-block" />
                    Customer Receivables
                    <span className="ml-1 text-sm font-normal text-muted-foreground">({filteredInvoices.length})</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {filteredInvoices.length === 0 ? (
                    <EmptyState message="No receivables found for the selected filters." />
                  ) : (
                    <div className="rounded-md border overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/40 hover:bg-muted/40">
                            <TableHead>Invoice #</TableHead>
                            <TableHead>Customer</TableHead>
                            <TableHead>Due</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredInvoices.map(inv => (
                            <TableRow key={inv.id}>
                              <TableCell className="font-mono text-xs">{inv.invoiceNumber}</TableCell>
                              <TableCell className="text-sm">{inv.customerName}</TableCell>
                              <TableCell className="text-xs text-muted-foreground">
                                {inv.dueDate ? formatDate(inv.dueDate) : '-'}
                              </TableCell>
                              <TableCell>
                                <Badge className={`border text-xs ${getInvoiceStatusColor(inv.status)}`}>
                                  {inv.status.charAt(0).toUpperCase() + inv.status.slice(1)}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right font-semibold text-sm tabular-nums">
                                {formatCurrency(inv.total)}
                              </TableCell>
                            </TableRow>
                          ))}
                          <TableRow className="bg-muted/30 font-semibold">
                            <TableCell colSpan={4} className="text-sm">Total Receivables</TableCell>
                            <TableCell className="text-right text-emerald-600 tabular-nums">
                              {formatCurrency(summary.totalReceivables)}
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-red-500 inline-block" />
                    Vendor Payables
                    <span className="ml-1 text-sm font-normal text-muted-foreground">({filteredBills.length})</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {filteredBills.length === 0 ? (
                    <EmptyState message="No payables found for the selected filters." />
                  ) : (
                    <div className="rounded-md border overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/40 hover:bg-muted/40">
                            <TableHead>Bill #</TableHead>
                            <TableHead>Vendor</TableHead>
                            <TableHead>Due</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredBills.map(bill => (
                            <TableRow key={bill.id}>
                              <TableCell className="font-mono text-xs">{bill.billNumber}</TableCell>
                              <TableCell className="text-sm">{bill.vendorName}</TableCell>
                              <TableCell className="text-xs text-muted-foreground">
                                {bill.dueDate ? formatDate(bill.dueDate) : '-'}
                              </TableCell>
                              <TableCell>
                                <Badge className={`border text-xs ${BILL_STATUS_COLOR[bill.status] ?? ''}`}>
                                  {bill.status.charAt(0).toUpperCase() + bill.status.slice(1)}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right font-semibold text-sm tabular-nums">
                                {formatCurrency(bill.amount)}
                              </TableCell>
                            </TableRow>
                          ))}
                          <TableRow className="bg-muted/30 font-semibold">
                            <TableCell colSpan={4} className="text-sm">Total Payables</TableCell>
                            <TableCell className="text-right text-red-500 tabular-nums">
                              {formatCurrency(summary.totalPayables)}
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function PreGenerateState({ message }: { message: string }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-14 gap-3 text-muted-foreground">
        <AlertCircle className="h-10 w-10 opacity-30" />
        <p className="font-medium text-foreground">{message}</p>
        <p className="text-sm opacity-70">Summary cards, tables, CSV, and print appear after generation.</p>
      </CardContent>
    </Card>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 gap-2 text-muted-foreground">
      <Minus className="h-7 w-7 opacity-40" />
      <p className="text-sm">{message}</p>
    </div>
  )
}
