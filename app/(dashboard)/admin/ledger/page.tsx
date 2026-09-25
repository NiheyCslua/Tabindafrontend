'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowDownLeft,
  ArrowUpRight,
  BookOpenCheck,
  ChevronLeft,
  ChevronRight,
  Eye,
  ReceiptText,
  Search,
  TrendingUp,
  WalletCards,
} from 'lucide-react'

import { BillDetailsModal } from '@/components/bills/bill-details-modal'
import { InvoiceDetailsModal } from '@/components/invoices/invoice-details-modal'
import { InvoicePrintView } from '@/components/invoices/invoice-print-view'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
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
import { useInvoiceStore } from '@/lib/store/invoice-store'
import { useMonthlyEarningsStore } from '@/lib/store/monthly-earnings-store'
import type { Bill, Invoice, MonthlyEarningsEntry, MonthlyEarningsSourceType } from '@/lib/types'
import { formatCurrency, formatDate, formatInvoiceStatus, formatPaymentMethod, getBillStatusColor, getInvoiceStatusColor } from '@/lib/utils/format'
import { printHtmlElement } from '@/lib/utils/print-html'

type EntryFilter = 'all' | 'income' | 'vendor_bill' | 'debit_bill' | 'misc_expense' | 'employee_salary'

const currentMonth = () => {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

const monthLabel = (month: string) => {
  const [year, monthNumber] = month.split('-').map(Number)
  if (!year || !monthNumber) return month
  return new Date(year, monthNumber - 1, 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  })
}

const shiftMonth = (month: string, delta: number) => {
  const [year, monthNumber] = month.split('-').map(Number)
  const date = new Date(year, monthNumber - 1 + delta, 1)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

const sourceLabels: Record<MonthlyEarningsSourceType, string> = {
  customer_invoice: 'Client Invoice',
  vendor_bill: 'Vendor Bill',
  debit_bill: 'Debit Bill',
  misc_expense: 'Misc. Expense',
  employee_salary: 'Employee Salary',
}

const sourceVariants: Record<MonthlyEarningsSourceType, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  customer_invoice: 'default',
  vendor_bill: 'secondary',
  debit_bill: 'default',
  misc_expense: 'outline',
  employee_salary: 'destructive',
}

export default function AdminLedgerPage() {
  const printRef = useRef<HTMLDivElement>(null)
  const [month, setMonth] = useState(currentMonth())
  const [search, setSearch] = useState('')
  const [entryFilter, setEntryFilter] = useState<EntryFilter>('all')
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null)
  const [invoiceDetailsOpen, setInvoiceDetailsOpen] = useState(false)
  const [billDetailsOpen, setBillDetailsOpen] = useState(false)
  const [printInvoice, setPrintInvoice] = useState<Invoice | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const report = useMonthlyEarningsStore((state) => state.report)
  const fetchReport = useMonthlyEarningsStore((state) => state.fetchReport)
  const reportLoading = useMonthlyEarningsStore((state) => state.isLoading)
  const reportError = useMonthlyEarningsStore((state) => state.error)

  const fetchInvoiceById = useInvoiceStore((state) => state.fetchInvoiceById)
  const bills = useBillStore((state) => state.bills)
  const fetchBills = useBillStore((state) => state.fetchBills)

  useEffect(() => {
    fetchReport({ month }).catch((err) => {
      setActionError(err instanceof Error ? err.message : 'Unable to load monthly earnings report')
    })
  }, [fetchReport, month])

  useEffect(() => {
    if (!printInvoice) return

    const timer = window.setTimeout(() => {
      printHtmlElement(printRef.current, `Invoice-${printInvoice.invoiceNumber}`)
      setPrintInvoice(null)
    }, 150)

    return () => window.clearTimeout(timer)
  }, [printInvoice])

  const allEntries = useMemo(() => {
    if (!report) return []
    return [
      ...report.incomeEntries,
      ...report.vendorOutgoingEntries,
      ...report.miscExpenseEntries,
      ...report.salaryOutgoingEntries,
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [report])

  const visibleEntries = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()

    return allEntries.filter((entry) => {
      const matchesType =
        entryFilter === 'all' ||
        (entryFilter === 'income' && entry.type === 'income') ||
        entry.sourceType === entryFilter

      const searchable = [
        entry.referenceNumber,
        entry.partyName,
        entry.partyEmail,
        entry.sourceType,
        sourceLabels[entry.sourceType],
        entry.status,
        entry.description,
        entry.label,
        entry.notes,
        entry.paymentMethod,
        entry.amount.toString(),
        entry.amount.toFixed(2),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()

      return matchesType && (!normalizedSearch || searchable.includes(normalizedSearch))
    })
  }, [allEntries, entryFilter, search])

  const visibleIncomeEntries = visibleEntries.filter((entry) => entry.sourceType === 'customer_invoice' || entry.sourceType === 'debit_bill')
  const visibleVendorEntries = visibleEntries.filter((entry) => entry.sourceType === 'vendor_bill')
  const visibleMiscEntries = visibleEntries.filter((entry) => entry.sourceType === 'misc_expense')
  const visibleSalaryEntries = visibleEntries.filter((entry) => entry.sourceType === 'employee_salary')

  const handleViewEntry = async (entry: MonthlyEarningsEntry) => {
    setActionError(null)

    if (entry.sourceType === 'customer_invoice') {
      const invoice = await fetchInvoiceById(entry.referenceId)
      if (!invoice) {
        setActionError('Unable to open invoice details')
        return
      }
      setSelectedInvoice(invoice)
      setInvoiceDetailsOpen(true)
      return
    }

    if (entry.sourceType === 'vendor_bill' || entry.sourceType === 'debit_bill') {
      let bill = bills.find((item) => item.id === entry.referenceId)
      if (!bill) {
        await fetchBills()
        bill = useBillStore.getState().bills.find((item) => item.id === entry.referenceId)
      }
      if (!bill) {
        setActionError('Unable to open bill details')
        return
      }
      setSelectedBill(bill)
      setBillDetailsOpen(true)
    }
  }

  const handlePrintInvoice = (invoice: Invoice) => {
    setPrintInvoice(invoice)
  }

  const isLoading = reportLoading && !report
  const totals = report?.totals

  if (isLoading) {
    return <div className="flex h-96 items-center justify-center text-muted-foreground">Loading monthly earnings...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <BookOpenCheck className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight">Income & Outgoing Ledger</h1>
          </div>
          <p className="text-muted-foreground">
            Monthly earnings report from paid client invoices, paid vendor bills, employee salaries, and miscellaneous expenses.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Button variant="outline" onClick={() => setMonth((value) => shiftMonth(value, -1))}>
            <ChevronLeft className="mr-2 h-4 w-4" />Previous Month
          </Button>
          <Input
            type="month"
            value={month}
            onChange={(event) => setMonth(event.target.value || currentMonth())}
            className="w-full sm:w-[180px]"
          />
          <Button variant="outline" onClick={() => setMonth((value) => shiftMonth(value, 1))}>
            Next Month<ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>

      {(actionError || reportError) && (
        <div className="rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {actionError || reportError}
        </div>
      )}

      <div className="rounded-xl border bg-card p-4 shadow-sm">
        <div className="flex flex-col gap-1">
          <div className="text-sm font-medium text-muted-foreground">Selected period</div>
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-xl font-semibold">{monthLabel(report?.month || month)}</div>
            <div className="text-sm text-muted-foreground">
              {report?.from && report?.to ? `${formatDate(report.from)} - ${formatDate(report.to)}` : 'Current month'}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <SummaryCard
          title="Total Income"
          value={formatCurrency(totals?.income || 0)}
          helper={`${totals?.incomeCount || 0} income entr${totals?.incomeCount === 1 ? 'y' : 'ies'} (invoices & debit bills)`}
          icon={ArrowDownLeft}
        />
        <SummaryCard
          title="Vendor Outgoing"
          value={formatCurrency(totals?.vendorOutgoing || 0)}
          helper={`${totals?.vendorPaymentCount || 0} vendor payment${totals?.vendorPaymentCount === 1 ? '' : 's'}`}
          icon={ArrowUpRight}
        />
        <SummaryCard
          title="Employee Salaries"
          value={formatCurrency(totals?.salaryOutgoing || 0)}
          helper={`${totals?.salaryPaymentCount || 0} paid salary payment${totals?.salaryPaymentCount === 1 ? '' : 's'}`}
          icon={WalletCards}
        />
        <SummaryCard
          title="Misc. Expenses"
          value={formatCurrency(totals?.miscOutgoing || 0)}
          helper={`${totals?.miscExpenseCount || 0} miscellaneous expense${totals?.miscExpenseCount === 1 ? '' : 's'}`}
          icon={WalletCards}
        />
        <SummaryCard
          title="Net Earnings"
          value={formatCurrency(totals?.netEarnings || 0)}
          helper="Income minus all outgoing, including salaries"
          icon={TrendingUp}
        />
      </div>

      <div className="flex flex-col gap-4 rounded-xl border bg-card p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div className="relative min-w-0 flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search invoice, bill, salary, vendor, customer, label, amount..."
            className="pl-9"
          />
        </div>

        <Select value={entryFilter} onValueChange={(value) => setEntryFilter(value as EntryFilter)}>
          <SelectTrigger className="w-full sm:w-[220px]">
            <SelectValue placeholder="Entry type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Entries</SelectItem>
            <SelectItem value="income">Income Only</SelectItem>
            <SelectItem value="vendor_bill">Paid Vendor Bills</SelectItem>
            <SelectItem value="debit_bill">Debit Bills</SelectItem>
            <SelectItem value="employee_salary">Employee Salaries</SelectItem>
            <SelectItem value="misc_expense">Misc. Expenses</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <ReportTable
        title="Income: Client Invoices & Debit Bills"
        description="Paid client invoices and debit bills (money owed to the business) counted by their paid date."
        entries={visibleIncomeEntries}
        emptyMessage="No income entries found for this month."
        onViewEntry={handleViewEntry}
      />

      <ReportTable
        title="Outgoing: Paid Vendor Bills"
        description="Vendor bills counted by their paid date. Unpaid bills are excluded from this report."
        entries={visibleVendorEntries}
        emptyMessage="No paid vendor bills found for this month."
        onViewEntry={handleViewEntry}
      />

      <ReportTable
        title="Outgoing: Employee Salaries"
        description="Salary payments counted by their payment date. Pending salaries are excluded from this report."
        entries={visibleSalaryEntries}
        emptyMessage="No paid salary payments found for this month."
        onViewEntry={handleViewEntry}
      />

      <ReportTable
        title="Outgoing: Miscellaneous Expenses"
        description="Admin-entered miscellaneous ledger expenses in this month."
        entries={visibleMiscEntries}
        emptyMessage="No miscellaneous expenses found for this month."
        onViewEntry={handleViewEntry}
      />

      <InvoiceDetailsModal
        invoice={selectedInvoice}
        open={invoiceDetailsOpen}
        onOpenChange={setInvoiceDetailsOpen}
        onPrint={handlePrintInvoice}
      />

      <BillDetailsModal
        bill={selectedBill}
        open={billDetailsOpen}
        onOpenChange={setBillDetailsOpen}
      />

      <div className="hidden">
        {printInvoice && <InvoicePrintView ref={printRef} invoice={printInvoice} />}
      </div>
    </div>
  )
}

function SummaryCard({
  title,
  value,
  helper,
  icon: Icon,
}: {
  title: string
  value: string
  helper: string
  icon: React.ElementType
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold tracking-tight">{value}</div>
        <p className="mt-1 text-xs text-muted-foreground">{helper}</p>
      </CardContent>
    </Card>
  )
}

function ReportTable({
  title,
  description,
  entries,
  emptyMessage,
  onViewEntry,
}: {
  title: string
  description: string
  entries: MonthlyEarningsEntry[]
  emptyMessage: string
  onViewEntry: (entry: MonthlyEarningsEntry) => void
}) {
  const total = entries.reduce((sum, entry) => sum + entry.amount, 0)

  return (
    <Card>
      <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <ReceiptText className="h-5 w-5 text-primary" />
            {title}
          </CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
        <div className="text-left md:text-right">
          <div className="text-sm text-muted-foreground">Section Total</div>
          <div className="text-lg font-semibold">{formatCurrency(total)}</div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>Party / Label</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                    {emptyMessage}
                  </TableCell>
                </TableRow>
              ) : (
                entries.map((entry) => (
                  <TableRow key={`${entry.sourceType}-${entry.id}`}>
                    <TableCell className="whitespace-nowrap">
                      <div className="font-medium">{formatDate(entry.date)}</div>
                      {entry.documentDate && entry.documentDate !== entry.date && (
                        <div className="text-xs text-muted-foreground">
                          Doc {formatDate(entry.documentDate)}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={sourceVariants[entry.sourceType]} className="whitespace-nowrap">
                        {sourceLabels[entry.sourceType]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="font-mono text-sm font-medium">{entry.referenceNumber}</div>
                      <div className="text-xs text-muted-foreground">{entry.description}</div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{entry.partyName}</div>
                      {entry.partyEmail && <div className="text-xs text-muted-foreground">{entry.partyEmail}</div>}
                    </TableCell>
                    <TableCell>
                      <Badge className={`border text-xs ${(entry.sourceType === 'vendor_bill' || entry.sourceType === 'debit_bill') ? getBillStatusColor(entry.status) : getInvoiceStatusColor(entry.status)}`}>
                        {formatInvoiceStatus(entry.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                      {entry.paymentMethod ? formatPaymentMethod(entry.paymentMethod) : '—'}
                    </TableCell>
                    <TableCell className="text-right font-semibold">{formatCurrency(entry.amount)}</TableCell>
                    <TableCell className="text-right">
                      {entry.sourceType === 'misc_expense' || entry.sourceType === 'employee_salary' ? (
                        <span className="text-sm text-muted-foreground">—</span>
                      ) : (
                        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => onViewEntry(entry)}>
                          <Eye className="h-3.5 w-3.5" />View
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
