'use client'

import { useEffect, useMemo, useState } from 'react'
import { Download, Printer, AlertCircle, Search } from 'lucide-react'
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
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { useInvoiceStore } from '@/lib/store/invoice-store'
import { useBillStore } from '@/lib/store/bill-store'
import { useInventoryStore } from '@/lib/store/inventory-store'
import { useSerialStore } from '@/lib/store/serial-store'
import { buildProductLedger, exportToCsv } from '@/lib/reports/report-utils'
import { printReport } from '@/lib/reports/print-utils'
import { formatCurrency, formatDate, getInvoiceStatusColor } from '@/lib/utils/format'
import type { DateSortOrder, ProductLedgerTransaction } from '@/lib/types'

const BILL_STATUS_COLOR: Record<string, string> = {
  unpaid: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  overdue: 'bg-red-500/10 text-red-500 border-red-500/20',
  paid: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  cancelled: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
}

type LedgerTypeFilter = 'all' | 'sold' | 'bought'

type ProductLedgerFilters = {
  productId: string
  startDate: string
  endDate: string
  typeFilter: LedgerTypeFilter
  sortOrder: DateSortOrder
}

type ValidationErrors = Partial<Record<'productId' | 'startDate' | 'endDate' | 'dateRange', string>>

const INITIAL_FILTERS: ProductLedgerFilters = {
  productId: '',
  startDate: '',
  endDate: '',
  typeFilter: 'all',
  sortOrder: 'oldest',
}

function validateFilters(filters: ProductLedgerFilters): ValidationErrors {
  const errors: ValidationErrors = {}

  if (!filters.productId) errors.productId = 'Please select a product.'
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

export function ProductTransactionLedger() {
  const { invoices, fetchInvoices } = useInvoiceStore()
  const { bills, fetchBills } = useBillStore()
  const { products, fetchProducts } = useInventoryStore()
  const { units: serialUnits, fetchUnits } = useSerialStore()

  const [filters, setFilters] = useState<ProductLedgerFilters>(INITIAL_FILTERS)
  const [appliedFilters, setAppliedFilters] = useState<ProductLedgerFilters | null>(null)
  const [hasGenerated, setHasGenerated] = useState(false)
  const [errors, setErrors] = useState<ValidationErrors>({})
  const [productOpen, setProductOpen] = useState(false)

  useEffect(() => {
    fetchInvoices()
    fetchBills()
    fetchProducts()
    fetchUnits()
  }, [fetchInvoices, fetchBills, fetchProducts, fetchUnits])

  const selectedDraftProduct = products.find(p => p.id === filters.productId)
  const selectedAppliedProduct = products.find(p => p.id === appliedFilters?.productId)
  const filtersChanged = hasGenerated && JSON.stringify(filters) !== JSON.stringify(appliedFilters)

  const transactions = useMemo<ProductLedgerTransaction[]>(() => {
    if (!hasGenerated || !appliedFilters) return []

    return buildProductLedger(appliedFilters.productId, invoices, bills, {
      range: {
        startDate: appliedFilters.startDate,
        endDate: appliedFilters.endDate,
      },
      typeFilter: appliedFilters.typeFilter,
      serialUnits,
      sortOrder: appliedFilters.sortOrder,
    })
  }, [hasGenerated, appliedFilters, invoices, bills, serialUnits])

  const totalBought = transactions.filter(t => t.type === 'bought').reduce((s, t) => s + t.quantity, 0)
  const totalSold = transactions.filter(t => t.type === 'sold').reduce((s, t) => s + t.quantity, 0)
  const totalPurchaseValue = transactions.filter(t => t.type === 'bought').reduce((s, t) => s + t.total, 0)
  const totalSalesValue = transactions.filter(t => t.type === 'sold').reduce((s, t) => s + t.total, 0)
  const netMovement = totalBought - totalSold
  const grossDiff = totalSalesValue - totalPurchaseValue

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
    setProductOpen(false)
  }

  const handleExport = () => {
    if (!transactions.length || !appliedFilters) return
    exportToCsv(
      `ledger-${selectedAppliedProduct?.sku ?? 'product'}.csv`,
      transactions.map(tx => ({
        Date: formatDate(tx.date),
        Type: tx.type === 'sold' ? 'Sold' : 'Bought',
        'Document Number': tx.documentNumber,
        Party: tx.partyName,
        Product: tx.productName,
        SKU: tx.productSku,
        Quantity: tx.quantity,
        'Unit Price': tx.unitPrice,
        Total: tx.total,
        Status: tx.status,
        'Serial Number': tx.serialNumber ?? 'Not recorded',
      }))
    )
  }

  const handlePrintReport = () => {
    if (!transactions.length || !appliedFilters) return

    const transactionTypeLabel = appliedFilters?.typeFilter === 'sold'
      ? 'Sold Only'
      : appliedFilters?.typeFilter === 'bought'
        ? 'Bought Only'
        : 'All Transactions'

    const sortLabel = appliedFilters?.sortOrder === 'newest'
      ? 'Newest to Oldest'
      : 'Oldest to Newest'

    const productTitle = selectedAppliedProduct?.name ?? 'Product'
    const productLabel = selectedAppliedProduct?.sku
      ? productTitle + ' (' + selectedAppliedProduct.sku + ')'
      : productTitle

    printReport({
      title: productTitle + ' - Transaction Ledger (serial-level)',
      subtitle: transactions.length + ' ' + (transactions.length === 1 ? 'entry' : 'entries'),
      metadata: [
        'Product: ' + productLabel,
        'Date Range: ' + formatDate(appliedFilters.startDate) + ' - ' + formatDate(appliedFilters.endDate),
        'Transaction Type: ' + transactionTypeLabel,
        'Sort: ' + sortLabel,
      ],
      orientation: 'landscape',
      tables: [
        {
          columns: [
            { key: 'Date', label: 'Date' },
            { key: 'Type', label: 'Type' },
            { key: 'Document #', label: 'Document #' },
            { key: 'Party', label: 'Party' },
            { key: 'SKU', label: 'SKU' },
            { key: 'Qty', label: 'Qty', align: 'right' },
            { key: 'Unit Price', label: 'Unit Price', align: 'right' },
            { key: 'Total', label: 'Total', align: 'right' },
            { key: 'Status', label: 'Status' },
            { key: 'Serial Number', label: 'Serial Number' },
          ],
          rows: transactions.map(tx => ({
            Date: formatDate(tx.date),
            Type: tx.type === 'sold' ? 'Sold' : 'Bought',
            'Document #': tx.documentNumber,
            Party: tx.partyName,
            SKU: tx.productSku,
            Qty: tx.quantity,
            'Unit Price': formatCurrency(tx.unitPrice),
            Total: formatCurrency(tx.total),
            Status: tx.status.charAt(0).toUpperCase() + tx.status.slice(1),
            'Serial Number': tx.serialNumber ?? '-',
          })),
        },
      ],
    })
  }

  const updateFilter = <K extends keyof ProductLedgerFilters>(key: K, value: ProductLedgerFilters[K]) => {
    setFilters(current => ({ ...current, [key]: value }))
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Filters</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
              <Label>Product <span className="text-red-500">*</span></Label>
              <Popover open={productOpen} onOpenChange={setProductOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className="w-full justify-between font-normal"
                  >
                    {selectedDraftProduct ? (
                      <span className="truncate">{selectedDraftProduct.name}</span>
                    ) : (
                      <span className="text-muted-foreground">Select product…</span>
                    )}
                    <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search product…" />
                    <CommandList>
                      <CommandEmpty>No product found.</CommandEmpty>
                      <CommandGroup>
                        {products.map(p => (
                          <CommandItem
                            key={p.id}
                            value={`${p.name} ${p.sku}`}
                            onSelect={() => {
                              updateFilter('productId', p.id)
                              setProductOpen(false)
                            }}
                          >
                            <div>
                              <div className="font-medium text-sm">{p.name}</div>
                              <div className="text-xs text-muted-foreground">{p.sku}</div>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              {errors.productId && <p className="text-xs text-red-500">{errors.productId}</p>}
            </div>

            <div className="space-y-1.5">
              <Label>Transaction Type</Label>
              <Select value={filters.typeFilter} onValueChange={v => updateFilter('typeFilter', v as LedgerTypeFilter)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Transactions</SelectItem>
                  <SelectItem value="sold">Sold Only</SelectItem>
                  <SelectItem value="bought">Bought Only</SelectItem>
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
              Choose a product and date range to generate the transaction ledger.
            </p>
            <div className="flex gap-2">
              <Button onClick={handleGenerate}>Generate Report</Button>
              <Button variant="outline" onClick={handleReset}>Reset Filters</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {!hasGenerated && (
        <PreGenerateState message="Select filters and click Generate Report to view results." />
      )}

      {filtersChanged && (
        <div className="rounded-md border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-300">
          Filters changed. Click Generate Report to refresh results.
        </div>
      )}

      {hasGenerated && transactions.length > 500 && (
        <div className="rounded-md border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-300">
          This report contains many rows. Use a smaller date range for faster results.
        </div>
      )}

      {hasGenerated && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground">Units Bought</p>
                <p className="text-2xl font-bold tabular-nums mt-1">{totalBought}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{formatCurrency(totalPurchaseValue)} purchase value</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground">Units Sold</p>
                <p className="text-2xl font-bold tabular-nums mt-1">{totalSold}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{formatCurrency(totalSalesValue)} sales value</p>
              </CardContent>
            </Card>
            <Card className={netMovement >= 0 ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-amber-500/30 bg-amber-500/5'}>
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground">Net Stock Movement</p>
                <p className={`text-2xl font-bold tabular-nums mt-1 ${netMovement >= 0 ? 'text-emerald-500' : 'text-amber-500'}`}>
                  {netMovement >= 0 ? '+' : ''}{netMovement}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">units (bought - sold)</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground">Total Purchase Value</p>
                <p className="text-xl font-bold tabular-nums mt-1">{formatCurrency(totalPurchaseValue)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground">Total Sales Value</p>
                <p className="text-xl font-bold tabular-nums mt-1">{formatCurrency(totalSalesValue)}</p>
              </CardContent>
            </Card>
            <Card className={grossDiff >= 0 ? 'border-blue-500/30 bg-blue-500/5' : 'border-rose-500/30 bg-rose-500/5'}>
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground">Gross Margin</p>
                <p className={`text-xl font-bold tabular-nums mt-1 ${grossDiff >= 0 ? 'text-blue-500' : 'text-rose-500'}`}>
                  {formatCurrency(grossDiff)}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">sales - purchases</p>
              </CardContent>
            </Card>
          </div>

          <Card className="report-print-area">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base">
                {selectedAppliedProduct?.name ?? 'Product'} - Transaction Ledger (serial-level)
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  ({transactions.length} {transactions.length === 1 ? 'entry' : 'entries'})
                </span>
              </CardTitle>
              {transactions.length > 0 && (
                <div className="no-print flex flex-col items-end gap-1">
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={handleExport}>
                      <Download className="mr-1.5 h-3.5 w-3.5" />CSV
                    </Button>
                    <Button variant="outline" size="sm" onClick={handlePrintReport}>
                      <Printer className="mr-1.5 h-3.5 w-3.5" />Print
                    </Button>
                  </div>
                  <p className="max-w-xs text-right text-[11px] text-muted-foreground">
                    Browser title, URL, page numbers, or timestamp can be removed by disabling Headers and footers in the print dialog.
                  </p>
                </div>
              )}
            </CardHeader>
            <CardContent>
              {transactions.length === 0 ? (
                <EmptyState message="No records found for the selected filters." />
              ) : (
                <>
                  {transactions.some(tx => tx.isAggregateFallback) && (
                    <div className="mb-3 rounded-md border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
                      Some older transactions do not have serial numbers recorded and are shown as aggregate rows.
                    </div>
                  )}
                  <div className="rounded-md border overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/40 hover:bg-muted/40">
                          <TableHead>Date</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Document #</TableHead>
                          <TableHead>Party</TableHead>
                          <TableHead>SKU</TableHead>
                          <TableHead className="text-right">Qty</TableHead>
                          <TableHead className="text-right">Unit Price</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Serial Number</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {transactions.map(tx => (
                          <TableRow key={tx.id}>
                            <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                              {formatDate(tx.date)}
                            </TableCell>
                            <TableCell>
                              <Badge
                                className={`border text-xs font-semibold ${
                                  tx.type === 'sold'
                                    ? 'bg-blue-500/10 text-blue-600 border-blue-500/20'
                                    : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                                }`}
                              >
                                {tx.type === 'sold' ? 'Sold' : 'Bought'}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-mono text-xs font-medium">{tx.documentNumber}</TableCell>
                            <TableCell className="text-sm">{tx.partyName}</TableCell>
                            <TableCell className="font-mono text-xs text-muted-foreground">{tx.productSku}</TableCell>
                            <TableCell className="text-right tabular-nums">{tx.quantity}</TableCell>
                            <TableCell className="text-right tabular-nums text-sm">{formatCurrency(tx.unitPrice)}</TableCell>
                            <TableCell className="text-right font-semibold tabular-nums">{formatCurrency(tx.total)}</TableCell>
                            <TableCell>
                              <Badge
                                className={`border text-xs ${
                                  tx.source === 'invoice'
                                    ? getInvoiceStatusColor(tx.status)
                                    : BILL_STATUS_COLOR[tx.status] ?? ''
                                }`}
                              >
                                {tx.status.charAt(0).toUpperCase() + tx.status.slice(1)}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground font-mono">
                              {tx.serialNumber ?? '-'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}

function PreGenerateState({ message }: { message: string }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-14 gap-3 text-muted-foreground">
        <Search className="h-10 w-10 opacity-30" />
        <p className="font-medium text-foreground">{message}</p>
        <p className="text-sm opacity-70">Results, summary cards, CSV, and print appear after generation.</p>
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
