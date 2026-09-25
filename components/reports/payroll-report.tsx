'use client'

import { useEffect, useMemo, useState } from 'react'
import { AlertCircle, Download, Printer } from 'lucide-react'
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
import { useEmployeeStore } from '@/lib/store/employee-store'
import { usePayrollStore } from '@/lib/store/payroll-store'
import { exportToCsv, isWithinDateRange, sortByDate } from '@/lib/reports/report-utils'
import { printReport } from '@/lib/reports/print-utils'
import { formatCurrency, formatDate } from '@/lib/utils/format'
import {
  buildEmployeeLedger,
  formatSalaryPeriod,
  getPayrollStatusColor,
  isLedgerEntryType,
  statusLabel,
} from '@/lib/payroll/payroll-utils'
import type {
  DateSortOrder,
  EmployeeLedgerEntryType,
  ReportDateRange,
  ReportType,
  SalaryAdvanceStatus,
  SalaryPaymentStatus,
} from '@/lib/types'

type PayrollReportType = Extract<ReportType,
  | 'payroll-monthly'
  | 'payroll-advances'
  | 'payroll-outstanding-advances'
  | 'payroll-ledger'
  | 'payroll-payments'
>

type RowValue = string | number | null | undefined

type Column = {
  key: string
  label: string
  align?: 'left' | 'right'
  kind?: 'status'
}

type ReportTableView = {
  title: string
  columns: Column[]
  rows: Record<string, RowValue>[]
}

type SummaryItem = {
  label: string
  value: string
  sub?: string
  color?: 'green' | 'red' | 'amber' | 'blue'
}

type ReportView = {
  summary: SummaryItem[]
  tables: ReportTableView[]
}

type PayrollFilters = {
  startDate: string
  endDate: string
  asOfDate: string
  employeeId: string
  paymentStatus: SalaryPaymentStatus | 'all'
  advanceStatus: SalaryAdvanceStatus | 'all'
  ledgerType: EmployeeLedgerEntryType | 'all'
  sortOrder: DateSortOrder
}

type ValidationErrors = Partial<Record<'startDate' | 'endDate' | 'asOfDate' | 'employeeId' | 'dateRange', string>>

const INITIAL_FILTERS: PayrollFilters = {
  startDate: '',
  endDate: '',
  asOfDate: '',
  employeeId: 'all',
  paymentStatus: 'all',
  advanceStatus: 'all',
  ledgerType: 'all',
  sortOrder: 'oldest',
}

const REPORT_COPY: Record<PayrollReportType, { title: string; prompt: string }> = {
  'payroll-monthly': {
    title: 'Monthly Payroll Report',
    prompt: 'Choose a date range and optional employee/status filters to generate payroll totals.',
  },
  'payroll-advances': {
    title: 'Employee Advances Report',
    prompt: 'Choose a date range and optional employee/status filters to review salary advances.',
  },
  'payroll-outstanding-advances': {
    title: 'Outstanding Advances Report',
    prompt: 'Choose an as-of date and optional employee filter to review open advance balances.',
  },
  'payroll-ledger': {
    title: 'Employee Salary Ledger Report',
    prompt: 'Choose one employee and a date range to generate their salary ledger.',
  },
  'payroll-payments': {
    title: 'Salary Payments Report',
    prompt: 'Choose a date range and optional employee/status filters to review salary payments.',
  },
}

function requiresAsOf(type: PayrollReportType) {
  return type === 'payroll-outstanding-advances'
}

function requiresSpecificEmployee(type: PayrollReportType) {
  return type === 'payroll-ledger'
}

function hasPaymentStatus(type: PayrollReportType) {
  return type === 'payroll-monthly' || type === 'payroll-payments'
}

function hasAdvanceStatus(type: PayrollReportType) {
  return type === 'payroll-advances'
}

function hasLedgerType(type: PayrollReportType) {
  return type === 'payroll-ledger'
}

function validateFilters(type: PayrollReportType, filters: PayrollFilters): ValidationErrors {
  const errors: ValidationErrors = {}
  if (requiresAsOf(type)) {
    if (!filters.asOfDate) errors.asOfDate = 'As-of date is required'
  } else {
    if (!filters.startDate) errors.startDate = 'Start date is required'
    if (!filters.endDate) errors.endDate = 'End date is required'
    if (filters.startDate && filters.endDate && new Date(filters.startDate) > new Date(filters.endDate)) {
      errors.dateRange = 'Start date cannot be after end date'
    }
  }
  if (requiresSpecificEmployee(type) && filters.employeeId === 'all') {
    errors.employeeId = 'Employee is required for salary ledger report'
  }
  return errors
}

function columnsFromRows(rows: Record<string, RowValue>[]): Column[] {
  if (!rows.length) return []
  return Object.keys(rows[0]).map(key => ({
    key,
    label: key,
    align: typeof rows[0][key] === 'number' ? 'right' : 'left',
    kind: key.toLowerCase().includes('status') ? 'status' : undefined,
  }))
}

function sum<T>(rows: T[], getValue: (row: T) => number): number {
  return rows.reduce((total, row) => total + getValue(row), 0)
}

function buildView(type: PayrollReportType, filters: PayrollFilters): ReportView {
  const payrollStore = usePayrollStore.getState()
  const employeeStore = useEmployeeStore.getState()
  const { advances, payments, ledgerEntries } = payrollStore
  const { employees } = employeeStore
  const range: ReportDateRange = { startDate: filters.startDate, endDate: filters.endDate }
  const employeeName = (id: string) => employees.find(employee => employee.id === id)?.name || 'Unknown'

  if (type === 'payroll-monthly') {
    const rows = sortByDate(
      payments
        .filter(payment => isWithinDateRange(payment.periodEnd || payment.createdAt, range))
        .filter(payment => filters.employeeId === 'all' || payment.employeeId === filters.employeeId)
        .filter(payment => filters.paymentStatus === 'all' || payment.status === filters.paymentStatus),
      payment => payment.periodEnd || payment.createdAt,
      filters.sortOrder
    )
    const activeRows = rows.filter(payment => payment.status !== 'cancelled')
    const paidRows = rows.filter(payment => payment.status === 'paid')
    const pendingRows = rows.filter(payment => payment.status === 'pending')
    const tableRows = rows.map(payment => ({
      Employee: payment.employeeName,
      'Salary Period': formatSalaryPeriod(payment.salaryPeriod),
      'Base Salary': payment.baseSalary,
      Bonus: payment.bonus,
      Deductions: payment.otherDeductions,
      'Advance Deduction': payment.advanceDeduction,
      'Net Payable': payment.netPayable,
      'Amount Paid': payment.amountPaid,
      Status: payment.status,
    }))
    return {
      summary: [
        { label: 'Total Payroll', value: formatCurrency(sum(activeRows, row => row.netPayable)), color: 'blue' },
        { label: 'Total Paid', value: formatCurrency(sum(paidRows, row => row.amountPaid)), color: 'green' },
        { label: 'Total Pending', value: formatCurrency(sum(pendingRows, row => row.netPayable)), color: 'amber' },
        { label: 'Advance Deductions', value: formatCurrency(sum(paidRows, row => row.advanceDeduction)) },
        { label: 'Employees Paid', value: String(new Set(paidRows.map(row => row.employeeId)).size) },
      ],
      tables: [{ title: 'Monthly Payroll', columns: columnsFromRows(tableRows), rows: tableRows }],
    }
  }

  if (type === 'payroll-advances') {
    const rows = sortByDate(
      advances
        .filter(advance => isWithinDateRange(advance.date, range))
        .filter(advance => filters.employeeId === 'all' || advance.employeeId === filters.employeeId)
        .filter(advance => filters.advanceStatus === 'all' || advance.status === filters.advanceStatus),
      advance => advance.date,
      filters.sortOrder
    )
    const tableRows = rows.map(advance => ({
      Employee: advance.employeeName,
      Date: formatDate(advance.date),
      'Advance Amount': advance.amount,
      'Deducted Amount': advance.deductedAmount,
      'Remaining Amount': advance.remainingAmount,
      Status: advance.status,
      Reason: advance.reason || '-',
    }))
    return {
      summary: [
        { label: 'Total Advances Given', value: formatCurrency(sum(rows.filter(row => row.status !== 'cancelled'), row => row.amount)), color: 'blue' },
        { label: 'Total Deducted', value: formatCurrency(sum(rows, row => row.deductedAmount)), color: 'green' },
        { label: 'Total Outstanding', value: formatCurrency(sum(rows.filter(row => row.status !== 'cancelled'), row => row.remainingAmount)), color: 'amber' },
        { label: 'Employees with Advances', value: String(new Set(rows.map(row => row.employeeId)).size) },
      ],
      tables: [{ title: 'Employee Advances', columns: columnsFromRows(tableRows), rows: tableRows }],
    }
  }

  if (type === 'payroll-outstanding-advances') {
    const asOfTime = new Date(filters.asOfDate).getTime()
    const rows = sortByDate(
      advances
        .filter(advance => advance.status !== 'cancelled' && advance.remainingAmount > 0)
        .filter(advance => new Date(advance.date).getTime() <= asOfTime)
        .filter(advance => filters.employeeId === 'all' || advance.employeeId === filters.employeeId),
      advance => advance.date,
      filters.sortOrder
    )
    const tableRows = rows.map(advance => ({
      Employee: advance.employeeName,
      'Advance Date': formatDate(advance.date),
      'Original Amount': advance.amount,
      Deducted: advance.deductedAmount,
      Remaining: advance.remainingAmount,
      Status: advance.status,
      Reason: advance.reason || '-',
    }))
    const largest = [...rows].sort((a, b) => b.remainingAmount - a.remainingAmount)[0]
    return {
      summary: [
        { label: 'Outstanding Advances', value: formatCurrency(sum(rows, row => row.remainingAmount)), color: 'amber' },
        { label: 'Employees with Outstanding', value: String(new Set(rows.map(row => row.employeeId)).size) },
        { label: 'Largest Outstanding Advance', value: largest ? formatCurrency(largest.remainingAmount) : formatCurrency(0), sub: largest?.employeeName },
      ],
      tables: [{ title: 'Outstanding Advances', columns: columnsFromRows(tableRows), rows: tableRows }],
    }
  }

  if (type === 'payroll-ledger') {
    const derivedLedgerRows = buildEmployeeLedger(filters.employeeId, payments, advances, ledgerEntries)
    const rows = sortByDate(
      derivedLedgerRows
        .filter(entry => isWithinDateRange(entry.date, range))
        .filter(entry => filters.ledgerType === 'all' || entry.type === filters.ledgerType),
      entry => entry.date,
      filters.sortOrder
    )
    const tableRows = rows.map(entry => ({
      Date: formatDate(entry.date),
      Type: entry.type,
      Description: entry.description,
      Debit: entry.debit,
      Credit: entry.credit,
      Reference: entry.referenceId || '-',
    }))
    return {
      summary: [
        { label: 'Employee', value: employeeName(filters.employeeId) },
        { label: 'Ledger Entries', value: String(rows.length) },
        { label: 'Total Debit', value: formatCurrency(sum(rows, row => row.debit)), color: 'red' },
        { label: 'Total Credit', value: formatCurrency(sum(rows, row => row.credit)), color: 'green' },
      ],
      tables: [{ title: 'Employee Salary Ledger', columns: columnsFromRows(tableRows), rows: tableRows }],
    }
  }

  const rows = sortByDate(
    payments
      .filter(payment => isWithinDateRange(payment.paymentDate || payment.periodEnd || payment.createdAt, range))
      .filter(payment => filters.employeeId === 'all' || payment.employeeId === filters.employeeId)
      .filter(payment => filters.paymentStatus === 'all' || payment.status === filters.paymentStatus),
    payment => payment.paymentDate || payment.periodEnd || payment.createdAt,
    filters.sortOrder
  )
  const activeRowsForPayments = rows.filter(payment => payment.status !== 'cancelled')
  const paidRowsForPayments = rows.filter(payment => payment.status === 'paid')
  const pendingRowsForPayments = rows.filter(payment => payment.status === 'pending')
  const tableRows = rows.map(payment => ({
    'Payment #': payment.paymentNumber,
    Employee: payment.employeeName,
    'Salary Period': formatSalaryPeriod(payment.salaryPeriod),
    'Net Payable': payment.netPayable,
    'Amount Paid': payment.amountPaid,
    Status: payment.status,
    'Payment Date': payment.paymentDate ? formatDate(payment.paymentDate) : '-',
  }))
  return {
    summary: [
      { label: 'Salary Payments', value: String(rows.length) },
      { label: 'Net Payable', value: formatCurrency(sum(activeRowsForPayments, row => row.netPayable)), color: 'blue' },
      { label: 'Amount Paid', value: formatCurrency(sum(paidRowsForPayments, row => row.amountPaid)), color: 'green' },
      { label: 'Pending', value: formatCurrency(sum(pendingRowsForPayments, row => row.netPayable)), color: 'amber' },
    ],
    tables: [{ title: 'Salary Payments', columns: columnsFromRows(tableRows), rows: tableRows }],
  }
}

export function PayrollReport({ type }: { type: PayrollReportType }) {
  const { employees, fetchEmployees } = useEmployeeStore()
  const { advances, payments, ledgerEntries, fetchPayrollData } = usePayrollStore()
  const [filters, setFilters] = useState<PayrollFilters>(INITIAL_FILTERS)
  const [appliedFilters, setAppliedFilters] = useState<PayrollFilters | null>(null)
  const [hasGenerated, setHasGenerated] = useState(false)
  const [errors, setErrors] = useState<ValidationErrors>({})

  useEffect(() => {
    fetchEmployees()
    fetchPayrollData()
  }, [fetchEmployees, fetchPayrollData])

  useEffect(() => {
    setFilters(INITIAL_FILTERS)
    setAppliedFilters(null)
    setHasGenerated(false)
    setErrors({})
  }, [type])

  const view = useMemo<ReportView | null>(() => {
    if (!hasGenerated || !appliedFilters) return null
    return buildView(type, appliedFilters)
  }, [type, hasGenerated, appliedFilters, advances, payments, ledgerEntries, employees])

  const totalRows = view?.tables.reduce((total, table) => total + table.rows.length, 0) ?? 0
  const filtersChanged = hasGenerated && JSON.stringify(filters) !== JSON.stringify(appliedFilters)

  const updateFilter = <K extends keyof PayrollFilters>(key: K, value: PayrollFilters[K]) => {
    setFilters(current => ({ ...current, [key]: value }))
  }

  const handleGenerate = () => {
    const validationErrors = validateFilters(type, filters)
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
    if (!view || totalRows === 0) return
    const rows = view.tables.flatMap(table => table.rows.map(row => ({ Section: table.title, ...row })))
    exportToCsv(`${type}.csv`, rows)
  }

  const getPrintMetadata = () => {
    if (!appliedFilters) return []
    const metadata: string[] = []
    const selectedEmployee = employees.find(employee => employee.id === appliedFilters.employeeId)
    if (requiresAsOf(type)) {
      metadata.push('As Of Date: ' + formatDate(appliedFilters.asOfDate))
    } else {
      metadata.push('Date Range: ' + formatDate(appliedFilters.startDate) + ' - ' + formatDate(appliedFilters.endDate))
    }
    metadata.push('Employee: ' + (selectedEmployee?.name ?? (appliedFilters.employeeId === 'all' ? 'All Employees' : 'Unknown')))
    if (hasPaymentStatus(type)) metadata.push('Payment Status: ' + (appliedFilters.paymentStatus === 'all' ? 'All Statuses' : statusLabel(appliedFilters.paymentStatus)))
    if (hasAdvanceStatus(type)) metadata.push('Advance Status: ' + (appliedFilters.advanceStatus === 'all' ? 'All Statuses' : statusLabel(appliedFilters.advanceStatus)))
    if (hasLedgerType(type)) metadata.push('Transaction Type: ' + (appliedFilters.ledgerType === 'all' ? 'All Types' : statusLabel(appliedFilters.ledgerType)))
    metadata.push('Sort: ' + (appliedFilters.sortOrder === 'oldest' ? 'Oldest to Newest' : 'Newest to Oldest'))
    return metadata
  }

  const handlePrintReport = () => {
    if (!view || totalRows === 0) return
    printReport({
      title: REPORT_COPY[type].title,
      subtitle: `${totalRows} ${totalRows === 1 ? 'row' : 'rows'}`,
      metadata: getPrintMetadata(),
      orientation: 'landscape',
      tables: view.tables.map(table => ({
        title: table.title,
        columns: table.columns.map(column => ({ key: column.key, label: column.label, align: column.align })),
        rows: table.rows.map(row => {
          const printableRow: Record<string, string> = {}
          table.columns.forEach(column => {
            printableRow[column.key] = formatCellValue(column, row[column.key])
          })
          return printableRow
        }),
      })),
    })
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Filters</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div className="space-y-1.5">
              <Label>Employee {requiresSpecificEmployee(type) && <span className="text-red-500">*</span>}</Label>
              <Select value={filters.employeeId} onValueChange={value => updateFilter('employeeId', value)}>
                <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                <SelectContent>
                  {!requiresSpecificEmployee(type) && <SelectItem value="all">All Employees</SelectItem>}
                  {employees.map(employee => <SelectItem key={employee.id} value={employee.id}>{employee.name}</SelectItem>)}
                </SelectContent>
              </Select>
              {errors.employeeId && <p className="text-xs text-red-500">{errors.employeeId}</p>}
            </div>

            {hasPaymentStatus(type) && (
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={filters.paymentStatus} onValueChange={value => updateFilter('paymentStatus', value as PayrollFilters['paymentStatus'])}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {hasAdvanceStatus(type) && (
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={filters.advanceStatus} onValueChange={value => updateFilter('advanceStatus', value as PayrollFilters['advanceStatus'])}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="outstanding">Outstanding</SelectItem>
                    <SelectItem value="partially_deducted">Partially Deducted</SelectItem>
                    <SelectItem value="deducted">Deducted</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {hasLedgerType(type) && (
              <div className="space-y-1.5">
                <Label>Transaction Type</Label>
                <Select value={filters.ledgerType} onValueChange={value => updateFilter('ledgerType', isLedgerEntryType(value) ? value : 'all')}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="salary_generated">Salary Generated</SelectItem>
                    <SelectItem value="salary_paid">Salary Paid</SelectItem>
                    <SelectItem value="salary_cancelled">Salary Cancelled</SelectItem>
                    <SelectItem value="advance_taken">Advance Taken</SelectItem>
                    <SelectItem value="advance_deducted">Advance Deducted</SelectItem>
                    <SelectItem value="bonus">Bonus</SelectItem>
                    <SelectItem value="deduction">Deduction</SelectItem>
                    <SelectItem value="adjustment">Adjustment</SelectItem>
                    <SelectItem value="advance_cancelled">Advance Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {requiresAsOf(type) ? (
              <div className="space-y-1.5">
                <Label>As Of Date <span className="text-red-500">*</span></Label>
                <Input type="date" value={filters.asOfDate} onChange={event => updateFilter('asOfDate', event.target.value)} />
                {errors.asOfDate && <p className="text-xs text-red-500">{errors.asOfDate}</p>}
              </div>
            ) : (
              <>
                <div className="space-y-1.5">
                  <Label>Start Date <span className="text-red-500">*</span></Label>
                  <Input type="date" value={filters.startDate} onChange={event => updateFilter('startDate', event.target.value)} />
                  {errors.startDate && <p className="text-xs text-red-500">{errors.startDate}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label>End Date <span className="text-red-500">*</span></Label>
                  <Input type="date" value={filters.endDate} onChange={event => updateFilter('endDate', event.target.value)} />
                  {errors.endDate && <p className="text-xs text-red-500">{errors.endDate}</p>}
                </div>
              </>
            )}

            <div className="space-y-1.5">
              <Label>Sort by Date</Label>
              <Select value={filters.sortOrder} onValueChange={value => updateFilter('sortOrder', value as DateSortOrder)}>
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
            <p className="text-sm text-muted-foreground">{REPORT_COPY[type].prompt}</p>
            <div className="flex gap-2">
              <Button onClick={handleGenerate}>Generate Report</Button>
              <Button variant="outline" onClick={handleReset}>Reset Filters</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {!hasGenerated && <PreGenerateState message="Select filters and click Generate Report to view payroll results." />}

      {filtersChanged && (
        <div className="rounded-md border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-300">
          Filters changed. Click Generate Report to refresh results.
        </div>
      )}

      {hasGenerated && view && totalRows === 0 && <EmptyState message="No payroll records found for the selected filters." />}

      {hasGenerated && view && totalRows > 0 && (
        <>
          <div className="no-print flex flex-col items-end gap-1">
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={handleExport}><Download className="mr-1.5 h-3.5 w-3.5" />CSV</Button>
              <Button variant="outline" size="sm" onClick={handlePrintReport}><Printer className="mr-1.5 h-3.5 w-3.5" />Print</Button>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {view.summary.map(item => <SummaryCard key={item.label} item={item} />)}
          </div>
          <div className="report-print-area space-y-6">
            {view.tables.map(table => <ReportTable key={table.title} table={table} />)}
          </div>
        </>
      )}
    </div>
  )
}

function SummaryCard({ item }: { item: SummaryItem }) {
  const colorClass = item.color === 'green'
    ? 'text-emerald-500'
    : item.color === 'red'
      ? 'text-red-500'
      : item.color === 'amber'
        ? 'text-amber-500'
        : item.color === 'blue'
          ? 'text-blue-500'
          : ''
  return (
    <Card>
      <CardContent className="pt-4">
        <p className="text-xs text-muted-foreground">{item.label}</p>
        <p className={`mt-1 text-xl font-bold tabular-nums ${colorClass}`}>{item.value}</p>
        {item.sub && <p className="mt-0.5 text-xs text-muted-foreground">{item.sub}</p>}
      </CardContent>
    </Card>
  )
}

function ReportTable({ table }: { table: ReportTableView }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{table.title}<span className="ml-2 text-sm font-normal text-muted-foreground">({table.rows.length} {table.rows.length === 1 ? 'row' : 'rows'})</span></CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border overflow-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                {table.columns.map(column => <TableHead key={column.key} className={column.align === 'right' ? 'text-right' : ''}>{column.label}</TableHead>)}
              </TableRow>
            </TableHeader>
            <TableBody>
              {table.rows.map((row, index) => (
                <TableRow key={index}>
                  {table.columns.map(column => (
                    <TableCell key={column.key} className={column.align === 'right' ? 'text-right font-medium tabular-nums' : ''}>
                      {column.kind === 'status' ? <Badge className={`border text-xs ${getPayrollStatusColor(String(row[column.key] ?? ''))}`}>{statusLabel(String(row[column.key] ?? ''))}</Badge> : formatCellValue(column, row[column.key])}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}

function formatCellValue(column: Column, value: RowValue) {
  if (value === null || value === undefined || value === '') return '-'
  if (column.kind === 'status') return statusLabel(String(value))
  if (typeof value === 'number') return formatCurrency(value)
  return value
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
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-10 gap-2 text-muted-foreground">
        <AlertCircle className="h-8 w-8 opacity-40" />
        <p className="text-sm">{message}</p>
      </CardContent>
    </Card>
  )
}
