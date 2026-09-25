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
import { useBillStore } from '@/lib/store/bill-store'
import { useVendorStore } from '@/lib/store/vendor-store'
import {
  getUnpaidBills,
  getDuePriority,
  DUE_PRIORITY_LABELS,
  exportToCsv,
  type DuePriority,
} from '@/lib/reports/report-utils'
import { printReport } from '@/lib/reports/print-utils'
import { formatCurrency, formatDate } from '@/lib/utils/format'
import type { Bill, DateSortOrder } from '@/lib/types'

const BILL_STATUS_COLOR: Record<string, string> = {
  unpaid: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  overdue: 'bg-red-500/10 text-red-500 border-red-500/20',
  paid: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  cancelled: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
}

type BillStatusFilter = 'unpaid' | 'overdue' | 'both'

type UnpaidBillFilters = {
  vendorId: string
  statusFilter: BillStatusFilter
  startDate: string
  endDate: string
  sortOrder: DateSortOrder
}

type ValidationErrors = Partial<Record<'startDate' | 'endDate' | 'dateRange', string>>

const INITIAL_FILTERS: UnpaidBillFilters = {
  vendorId: 'all',
  statusFilter: 'both',
  startDate: '',
  endDate: '',
  sortOrder: 'oldest',
}

function validateFilters(filters: UnpaidBillFilters): ValidationErrors {
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

export function UnpaidBillsReport() {
  const { bills, fetchBills, isLoading } = useBillStore()
  const { vendors, fetchVendors } = useVendorStore()

  const [filters, setFilters] = useState<UnpaidBillFilters>(INITIAL_FILTERS)
  const [appliedFilters, setAppliedFilters] = useState<UnpaidBillFilters | null>(null)
  const [hasGenerated, setHasGenerated] = useState(false)
  const [errors, setErrors] = useState<ValidationErrors>({})

  useEffect(() => {
    fetchBills()
    fetchVendors()
  }, [fetchBills, fetchVendors])

  const filtered = useMemo<Bill[]>(() => {
    if (!hasGenerated || !appliedFilters) return []

    return getUnpaidBills(bills, {
      vendorId: appliedFilters.vendorId,
      statusFilter: appliedFilters.statusFilter,
      range: { startDate: appliedFilters.startDate, endDate: appliedFilters.endDate },
      sortOrder: appliedFilters.sortOrder,
    })
  }, [bills, hasGenerated, appliedFilters])

  const filtersChanged = hasGenerated && JSON.stringify(filters) !== JSON.stringify(appliedFilters)
  const totalAmount = filtered.reduce((s, b) => s + b.amount, 0)
  const unpaidAmount = filtered.filter(b => b.status === 'unpaid').reduce((s, b) => s + b.amount, 0)
  const overdueAmount = filtered.filter(b => b.status === 'overdue').reduce((s, b) => s + b.amount, 0)
  const uniqueVendors = new Set(filtered.map(b => b.vendorId)).size

  const dueCounts = useMemo(() => {
    const counts: Record<DuePriority, number> = {
      overdue: 0,
      today: 0,
      this_week: 0,
      future: 0,
    }
    filtered.forEach(b => {
      if (b.dueDate) counts[getDuePriority(b.dueDate)]++
    })
    return counts
  }, [filtered])

  const updateFilter = <K extends keyof UnpaidBillFilters>(key: K, value: UnpaidBillFilters[K]) => {
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
      'unpaid-bills.csv',
      filtered.map(b => ({
        'Bill #': b.billNumber,
        Vendor: b.vendorName,
        Date: formatDate(b.date),
        'Due Date': b.dueDate ? formatDate(b.dueDate) : '-',
        Status: b.status,
        Amount: b.amount,
      }))
    )
  }

  const handlePrintReport = () => {
    if (!filtered.length || !appliedFilters) return
    const selectedVendor = vendors.find(v => v.id === appliedFilters.vendorId)
    printReport({
      title: 'Unpaid Vendor Bills',
      subtitle: filtered.length + ' ' + (filtered.length === 1 ? 'bill' : 'bills'),
      metadata: [
        'Date Range: ' + formatDate(appliedFilters.startDate) + ' - ' + formatDate(appliedFilters.endDate),
        'Vendor: ' + (selectedVendor?.company ?? 'All Vendors'),
        'Status: ' + (appliedFilters.statusFilter === 'both' ? 'Unpaid and Overdue' : appliedFilters.statusFilter.charAt(0).toUpperCase() + appliedFilters.statusFilter.slice(1)),
        'Sort: ' + (appliedFilters.sortOrder === 'newest' ? 'Newest to Oldest' : 'Oldest to Newest'),
      ],
      orientation: 'landscape',
      tables: [{
        title: 'Bill Details',
        columns: [
          { key: 'Bill #', label: 'Bill #' },
          { key: 'Vendor', label: 'Vendor' },
          { key: 'Date', label: 'Date' },
          { key: 'Due Date', label: 'Due Date' },
          { key: 'Status', label: 'Status' },
          { key: 'Amount', label: 'Amount', align: 'right' },
        ],
        rows: filtered.map(bill => ({
          'Bill #': bill.billNumber,
          Vendor: bill.vendorName,
          Date: formatDate(bill.date),
          'Due Date': bill.dueDate ? formatDate(bill.dueDate) : '-',
          Status: bill.status.charAt(0).toUpperCase() + bill.status.slice(1),
          Amount: formatCurrency(bill.amount),
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
              <Label>Vendor</Label>
              <Select value={filters.vendorId} onValueChange={value => updateFilter('vendorId', value)}>
                <SelectTrigger><SelectValue placeholder="All vendors" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Vendors</SelectItem>
                  {vendors.map(v => (
                    <SelectItem key={v.id} value={v.id}>{v.company}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={filters.statusFilter} onValueChange={v => updateFilter('statusFilter', v as BillStatusFilter)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="both">Unpaid & Overdue</SelectItem>
                  <SelectItem value="unpaid">Unpaid Only</SelectItem>
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
              Choose a date range and vendor/status filters to generate the unpaid bills report.
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
            <SummaryCard label="Total Unpaid Bills" value={filtered.length.toString()} sub="bills" />
            <SummaryCard label="Total Payable" value={formatCurrency(totalAmount)} highlight />
            <SummaryCard label="Unpaid" value={formatCurrency(unpaidAmount)} color="amber" />
            <SummaryCard label="Overdue" value={formatCurrency(overdueAmount)} color="red" />
            <SummaryCard label="Vendors Owed" value={uniqueVendors.toString()} sub="vendors" />
          </div>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Due Date Priority</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
                {(Object.entries(DUE_PRIORITY_LABELS) as [DuePriority, string][]).map(([key, label]) => (
                  <div key={key} className="rounded-lg border bg-muted/20 px-3 py-2 text-center">
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className={`font-semibold text-lg mt-0.5 ${key === 'overdue' ? 'text-red-500' : key === 'today' ? 'text-amber-500' : ''}`}>
                      {dueCounts[key]}
                    </p>
                    <p className="text-xs text-muted-foreground">bills</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base">
                Bill Details
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  ({filtered.length} {filtered.length === 1 ? 'bill' : 'bills'})
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
                        <TableHead>Bill #</TableHead>
                        <TableHead>Vendor</TableHead>
                        <TableHead>Bill Date</TableHead>
                        <TableHead>Due Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map(bill => (
                        <TableRow key={bill.id}>
                          <TableCell className="font-mono text-sm font-medium">{bill.billNumber}</TableCell>
                          <TableCell>{bill.vendorName}</TableCell>
                          <TableCell className="text-muted-foreground text-sm">{formatDate(bill.date)}</TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {bill.dueDate ? formatDate(bill.dueDate) : '-'}
                          </TableCell>
                          <TableCell>
                            <Badge className={`border text-xs ${BILL_STATUS_COLOR[bill.status] ?? ''}`}>
                              {bill.status.charAt(0).toUpperCase() + bill.status.slice(1)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-semibold tabular-nums">
                            {formatCurrency(bill.amount)}
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
  label, value, sub, highlight, color,
}: {
  label: string; value: string; sub?: string; highlight?: boolean; color?: 'amber' | 'red'
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
