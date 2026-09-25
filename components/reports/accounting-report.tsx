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
import { useInvoiceStore } from '@/lib/store/invoice-store'
import { useBillStore } from '@/lib/store/bill-store'
import { useCustomerStore } from '@/lib/store/customer-store'
import { useVendorStore } from '@/lib/store/vendor-store'
import {
  buildAgingPayables,
  buildAgingReceivables,
  buildCustomerSalesSummary,
  buildVendorPurchaseSummary,
  calcReceivablesPayables,
  calculateDaysOverdue,
  exportToCsv,
  filterBillsForReport,
  filterInvoicesForReport,
  getAgingBucketAsOf,
  getBillOutstandingAmount,
  getBillPaidAmount,
  getCashForecastData,
  getInvoiceOutstandingAmount,
  getInvoicePaidAmount,
  getOverdueBillsForReport,
  getOverdueInvoicesForReport,
  getUnpaidBills,
  getUnpaidInvoices,
  isWithinDateRange,
  STANDARD_AGING_LABELS,
  sortByDate,
  type StandardAgingBucket,
} from '@/lib/reports/report-utils'
import { printReport } from '@/lib/reports/print-utils'
import { formatCurrency, formatDate, getInvoiceStatusColor } from '@/lib/utils/format'
import type { Bill, DateSortOrder, Invoice, ReportType } from '@/lib/types'

type AccountingReportType = Exclude<ReportType, 'product-ledger' | 'payroll-monthly' | 'payroll-advances' | 'payroll-outstanding-advances' | 'payroll-ledger' | 'payroll-payments'>
type RowValue = string | number | null | undefined

type Column = {
  key: string
  label: string
  align?: 'left' | 'right'
  kind?: 'status'
}

type ReportTableView = {
  title: string
  description?: string
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

type InvoiceStatusFilter = Invoice['status'] | 'all'
type BillStatusFilter = Bill['status'] | 'all'
type UnpaidInvoiceStatusFilter = 'both' | 'pending' | 'overdue'
type UnpaidBillStatusFilter = 'both' | 'unpaid' | 'overdue'
type AgingFilter = StandardAgingBucket | 'all'

type ReportFilters = {
  startDate: string
  endDate: string
  asOfDate: string
  customerId: string
  vendorId: string
  invoiceStatus: InvoiceStatusFilter
  billStatus: BillStatusFilter
  unpaidInvoiceStatus: UnpaidInvoiceStatusFilter
  unpaidBillStatus: UnpaidBillStatusFilter
  agingBucket: AgingFilter
  sortOrder: DateSortOrder
}

type ValidationErrors = Partial<Record<'startDate' | 'endDate' | 'asOfDate' | 'customerId' | 'vendorId' | 'dateRange', string>>

const INITIAL_FILTERS: ReportFilters = {
  startDate: '',
  endDate: '',
  asOfDate: '',
  customerId: 'all',
  vendorId: 'all',
  invoiceStatus: 'all',
  billStatus: 'all',
  unpaidInvoiceStatus: 'both',
  unpaidBillStatus: 'both',
  agingBucket: 'all',
  sortOrder: 'oldest',
}

const REPORT_COPY: Record<AccountingReportType, { title: string; prompt: string }> = {
  'all-customer-invoices': {
    title: 'All Customer Invoices',
    prompt: 'Choose a date range and optional customer/status filters to generate all customer invoices.',
  },
  'unpaid-invoices': {
    title: 'Unpaid Customer Invoices',
    prompt: 'Choose a date range and customer/status filters to generate the unpaid invoices report.',
  },
  'paid-customer-invoices': {
    title: 'Paid Customer Invoices',
    prompt: 'Choose a date range and optional customer filter to review collected invoice revenue.',
  },
  'overdue-customer-invoices': {
    title: 'Overdue Customer Invoices',
    prompt: 'Choose a date range and optional customer/aging filters to find collection follow-ups.',
  },
  'customer-statement': {
    title: 'Customer Statement',
    prompt: 'Choose one customer and a date range to generate a printable statement of account.',
  },
  'customer-sales-summary': {
    title: 'Customer Sales Summary',
    prompt: 'Choose a date range to summarize invoice activity by customer.',
  },
  'all-vendor-bills': {
    title: 'All Vendor Bills',
    prompt: 'Choose a date range and optional vendor/status filters to generate all vendor bills.',
  },
  'unpaid-bills': {
    title: 'Unpaid Vendor Bills',
    prompt: 'Choose a date range and vendor/status filters to generate the unpaid bills report.',
  },
  'paid-vendor-bills': {
    title: 'Paid Vendor Bills',
    prompt: 'Choose a date range and optional vendor filter to review paid vendor obligations.',
  },
  'overdue-vendor-bills': {
    title: 'Overdue Vendor Bills',
    prompt: 'Choose a date range and optional vendor/aging filters to find payment follow-ups.',
  },
  'vendor-statement': {
    title: 'Vendor Statement',
    prompt: 'Choose one vendor and a date range to generate a vendor account statement.',
  },
  'vendor-purchase-summary': {
    title: 'Vendor Purchase Summary',
    prompt: 'Choose a date range to summarize purchase activity by vendor.',
  },
  'receivables-payables': {
    title: 'Receivables vs Payables',
    prompt: 'Choose a date range to compare money owed to you and money you owe.',
  },
  'aging-receivables': {
    title: 'Aging Receivables',
    prompt: 'Choose an as-of date to group unpaid customer invoices by aging bucket.',
  },
  'aging-payables': {
    title: 'Aging Payables',
    prompt: 'Choose an as-of date to group unpaid vendor bills by aging bucket.',
  },
  'cash-obligation-forecast': {
    title: 'Cash Obligation Forecast',
    prompt: 'Choose a date range to forecast expected collections and vendor payments.',
  },
}

const currencyColumns = new Set([
  'Subtotal', 'Tax', 'Discount', 'Total', 'Paid Amount', 'Balance Due', 'Amount Due', 'Total Amount',
  'Debit / Invoice Amount', 'Credit / Paid Amount', 'Balance', 'Bill Amount', 'Paid Amount',
  'Total Sales', 'Total Purchases', 'Outstanding Amount', 'Average Invoice Value', 'Average Bill Value',
  'Current', '1-30', '31-60', '61-90', '90+', 'Expected Amount', 'Amount',
])

function isAgingReport(type: AccountingReportType) {
  return type === 'aging-receivables' || type === 'aging-payables'
}

function hasCustomerFilter(type: AccountingReportType) {
  return [
    'all-customer-invoices',
    'unpaid-invoices',
    'paid-customer-invoices',
    'overdue-customer-invoices',
    'customer-statement',
    'customer-sales-summary',
    'receivables-payables',
    'aging-receivables',
    'cash-obligation-forecast',
  ].includes(type)
}

function hasVendorFilter(type: AccountingReportType) {
  return [
    'all-vendor-bills',
    'unpaid-bills',
    'paid-vendor-bills',
    'overdue-vendor-bills',
    'vendor-statement',
    'vendor-purchase-summary',
    'receivables-payables',
    'aging-payables',
    'cash-obligation-forecast',
  ].includes(type)
}

function needsSpecificCustomer(type: AccountingReportType) {
  return type === 'customer-statement'
}

function needsSpecificVendor(type: AccountingReportType) {
  return type === 'vendor-statement'
}

function hasInvoiceStatusFilter(type: AccountingReportType) {
  return type === 'all-customer-invoices' || type === 'customer-statement' || type === 'customer-sales-summary'
}

function hasBillStatusFilter(type: AccountingReportType) {
  return type === 'all-vendor-bills' || type === 'vendor-statement' || type === 'vendor-purchase-summary'
}

function hasUnpaidInvoiceStatusFilter(type: AccountingReportType) {
  return type === 'unpaid-invoices'
}

function hasUnpaidBillStatusFilter(type: AccountingReportType) {
  return type === 'unpaid-bills'
}

function hasAgingBucketFilter(type: AccountingReportType) {
  return type === 'overdue-customer-invoices' || type === 'overdue-vendor-bills'
}

function hasSortFilter(type: AccountingReportType) {
  return !isAgingReport(type)
}

function validateFilters(type: AccountingReportType, filters: ReportFilters): ValidationErrors {
  const errors: ValidationErrors = {}

  if (isAgingReport(type)) {
    if (!filters.asOfDate) errors.asOfDate = 'Please select an as-of date.'
  } else {
    if (!filters.startDate) errors.startDate = 'Please select a start date.'
    if (!filters.endDate) errors.endDate = 'Please select an end date.'
    if (filters.startDate && filters.endDate && new Date(filters.startDate).getTime() > new Date(filters.endDate).getTime()) {
      errors.dateRange = 'Start date cannot be after end date.'
    }
  }

  if (needsSpecificCustomer(type) && filters.customerId === 'all') {
    errors.customerId = 'Please select a customer.'
  }

  if (needsSpecificVendor(type) && filters.vendorId === 'all') {
    errors.vendorId = 'Please select a vendor.'
  }

  return errors
}

function sum<T>(items: T[], getValue: (item: T) => number): number {
  return items.reduce((total, item) => total + getValue(item), 0)
}

function average(total: number, count: number): number {
  return count > 0 ? total / count : 0
}

function statusLabel(status: string) {
  return status.charAt(0).toUpperCase() + status.slice(1)
}

function getStatusColor(status: string) {
  if (status === 'unpaid') return 'bg-amber-500/10 text-amber-500 border-amber-500/20'
  return getInvoiceStatusColor(status)
}

function formatCellValue(column: Column, value: RowValue) {
  if (value === null || value === undefined || value === '') return '-'
  if (typeof value === 'number' && currencyColumns.has(column.label)) return formatCurrency(value)
  return String(value)
}

function invoiceListRows(invoices: Invoice[], kind: 'all' | 'unpaid' | 'paid' | 'overdue' | 'statement') {
  if (kind === 'all') {
    return invoices.map(invoice => ({
      'Invoice #': invoice.invoiceNumber,
      Customer: invoice.customerName,
      'Invoice Date': formatDate(invoice.createdAt),
      'Due Date': invoice.dueDate ? formatDate(invoice.dueDate) : '-',
      Status: invoice.status,
      Subtotal: invoice.subtotal,
      Tax: invoice.taxAmount,
      Discount: invoice.discountAmount,
      Total: invoice.total,
      'Paid Amount': getInvoicePaidAmount(invoice),
      'Balance Due': getInvoiceOutstandingAmount(invoice),
    }))
  }

  if (kind === 'paid') {
    return invoices.map(invoice => ({
      'Invoice #': invoice.invoiceNumber,
      Customer: invoice.customerName,
      'Invoice Date': formatDate(invoice.createdAt),
      'Paid Date': formatDate(invoice.createdAt),
      Status: invoice.status,
      'Total Amount': invoice.total,
    }))
  }

  if (kind === 'overdue') {
    return invoices.map(invoice => ({
      'Invoice #': invoice.invoiceNumber,
      Customer: invoice.customerName,
      'Invoice Date': formatDate(invoice.createdAt),
      'Due Date': invoice.dueDate ? formatDate(invoice.dueDate) : '-',
      'Days Overdue': calculateDaysOverdue(invoice.dueDate, invoice.createdAt) > 0 ? calculateDaysOverdue(invoice.dueDate, invoice.createdAt) : calculateDaysOverdue(invoice.dueDate, new Date().toISOString()),
      'Aging Bucket': STANDARD_AGING_LABELS[getAgingBucketAsOf(invoice.dueDate, new Date().toISOString())],
      Status: invoice.status,
      'Amount Due': getInvoiceOutstandingAmount(invoice),
    }))
  }

  return invoices.map(invoice => ({
    'Invoice #': invoice.invoiceNumber,
    Customer: invoice.customerName,
    'Invoice Date': formatDate(invoice.createdAt),
    'Due Date': invoice.dueDate ? formatDate(invoice.dueDate) : '-',
    Status: invoice.status,
    'Amount Due': getInvoiceOutstandingAmount(invoice) || invoice.total,
  }))
}

function billListRows(bills: Bill[], kind: 'all' | 'unpaid' | 'paid' | 'overdue') {
  if (kind === 'all') {
    return bills.map(bill => ({
      'Bill #': bill.billNumber,
      Vendor: bill.vendorName,
      'Bill Date': formatDate(bill.date),
      'Due Date': bill.dueDate ? formatDate(bill.dueDate) : '-',
      Status: bill.status,
      'Total Amount': bill.amount,
      'Paid Amount': getBillPaidAmount(bill),
      'Balance Due': getBillOutstandingAmount(bill),
    }))
  }

  if (kind === 'paid') {
    return bills.map(bill => ({
      'Bill #': bill.billNumber,
      Vendor: bill.vendorName,
      'Bill Date': formatDate(bill.date),
      'Paid Date': formatDate(bill.date),
      Status: bill.status,
      'Total Amount': bill.amount,
    }))
  }

  if (kind === 'overdue') {
    return bills.map(bill => ({
      'Bill #': bill.billNumber,
      Vendor: bill.vendorName,
      'Bill Date': formatDate(bill.date),
      'Due Date': bill.dueDate ? formatDate(bill.dueDate) : '-',
      'Days Overdue': calculateDaysOverdue(bill.dueDate, new Date().toISOString()),
      'Aging Bucket': STANDARD_AGING_LABELS[getAgingBucketAsOf(bill.dueDate, new Date().toISOString())],
      Status: bill.status,
      'Amount Due': getBillOutstandingAmount(bill),
    }))
  }

  return bills.map(bill => ({
    'Bill #': bill.billNumber,
    Vendor: bill.vendorName,
    'Bill Date': formatDate(bill.date),
    'Due Date': bill.dueDate ? formatDate(bill.dueDate) : '-',
    Status: bill.status,
    Amount: getBillOutstandingAmount(bill) || bill.amount,
  }))
}

function columnsFromRows(rows: Record<string, RowValue>[]): Column[] {
  if (!rows.length) return []
  return Object.keys(rows[0]).map(key => ({
    key,
    label: key,
    kind: key === 'Status' ? 'status' : undefined,
    align: currencyColumns.has(key) || key.includes('Amount') || key.includes('Total') || key.includes('Balance') || key.includes('Days') || key.includes('Count') || key.includes('Invoices') || key.includes('Bills') ? 'right' : 'left',
  }))
}

function buildCustomerStatement(invoices: Invoice[], sortOrder: DateSortOrder): ReportTableView {
  const chronological = sortByDate(invoices, inv => inv.createdAt, 'oldest', (a, b) => a.invoiceNumber.localeCompare(b.invoiceNumber))
  let balance = 0
  const rows = chronological.map(invoice => {
    const debit = invoice.status === 'cancelled' ? 0 : invoice.total
    const credit = getInvoicePaidAmount(invoice)
    balance += debit - credit
    return {
      Date: formatDate(invoice.createdAt),
      'Document Type': 'Invoice',
      'Invoice #': invoice.invoiceNumber,
      Description: `Invoice ${invoice.invoiceNumber}`,
      Status: invoice.status,
      'Debit / Invoice Amount': debit,
      'Credit / Paid Amount': credit,
      Balance: balance,
    }
  })

  const displayRows = sortOrder === 'oldest' ? rows : [...rows].reverse()
  return { title: 'Customer Statement Activity', columns: columnsFromRows(displayRows), rows: displayRows }
}

function buildVendorStatement(bills: Bill[], sortOrder: DateSortOrder): ReportTableView {
  const chronological = sortByDate(bills, bill => bill.date, 'oldest', (a, b) => a.billNumber.localeCompare(b.billNumber))
  let balance = 0
  const rows = chronological.map(bill => {
    const billAmount = bill.status === 'cancelled' ? 0 : bill.amount
    const paidAmount = getBillPaidAmount(bill)
    balance += billAmount - paidAmount
    return {
      Date: formatDate(bill.date),
      'Document Type': 'Vendor Bill',
      'Bill #': bill.billNumber,
      Description: `Bill ${bill.billNumber}`,
      Status: bill.status,
      'Bill Amount': billAmount,
      'Paid Amount': paidAmount,
      Balance: balance,
    }
  })

  const displayRows = sortOrder === 'oldest' ? rows : [...rows].reverse()
  return { title: 'Vendor Statement Activity', columns: columnsFromRows(displayRows), rows: displayRows }
}

function buildView(type: AccountingReportType, filters: ReportFilters, invoices: Invoice[], bills: Bill[]): ReportView {
  const range = { startDate: filters.startDate, endDate: filters.endDate }

  if (type === 'all-customer-invoices') {
    const rows = filterInvoicesForReport(invoices, { range, customerId: filters.customerId, status: filters.invoiceStatus, sortOrder: filters.sortOrder })
    const tableRows = invoiceListRows(rows, 'all')
    return {
      summary: [
        { label: 'Total Invoices', value: String(rows.length), sub: 'invoices' },
        { label: 'Total Invoice Value', value: formatCurrency(sum(rows, r => r.status === 'cancelled' ? 0 : r.total)), color: 'blue' },
        { label: 'Paid Amount', value: formatCurrency(sum(rows, getInvoicePaidAmount)), color: 'green' },
        { label: 'Outstanding Amount', value: formatCurrency(sum(rows, getInvoiceOutstandingAmount)), color: 'amber' },
        { label: 'Cancelled Amount', value: formatCurrency(sum(rows.filter(r => r.status === 'cancelled'), r => r.total)) },
      ],
      tables: [{ title: 'Customer Invoices', columns: columnsFromRows(tableRows), rows: tableRows }],
    }
  }

  if (type === 'unpaid-invoices') {
    const rows = getUnpaidInvoices(invoices, { customerId: filters.customerId, statusFilter: filters.unpaidInvoiceStatus, range, sortOrder: filters.sortOrder })
    const tableRows = invoiceListRows(rows, 'unpaid')
    return {
      summary: [
        { label: 'Total Unpaid Invoices', value: String(rows.length), sub: 'invoices' },
        { label: 'Total Unpaid Amount', value: formatCurrency(sum(rows, r => r.total)), color: 'amber' },
        { label: 'Pending Amount', value: formatCurrency(sum(rows.filter(r => r.status === 'pending'), r => r.total)) },
        { label: 'Overdue Amount', value: formatCurrency(sum(rows.filter(r => r.status === 'overdue'), r => r.total)), color: 'red' },
        { label: 'Customers Owing', value: String(new Set(rows.map(r => r.customerId)).size), sub: 'customers' },
      ],
      tables: [{ title: 'Unpaid Customer Invoices', columns: columnsFromRows(tableRows), rows: tableRows }],
    }
  }

  if (type === 'paid-customer-invoices') {
    const rows = filterInvoicesForReport(invoices, { range, customerId: filters.customerId, status: 'paid', sortOrder: filters.sortOrder })
    const tableRows = invoiceListRows(rows, 'paid')
    const byCustomer = new Map<string, number>()
    rows.forEach(row => byCustomer.set(row.customerName, (byCustomer.get(row.customerName) ?? 0) + row.total))
    const top = [...byCustomer.entries()].sort((a, b) => b[1] - a[1])[0]
    return {
      summary: [
        { label: 'Total Paid Invoices', value: String(rows.length), sub: 'invoices' },
        { label: 'Revenue Collected', value: formatCurrency(sum(rows, r => r.total)), color: 'green' },
        { label: 'Average Invoice Value', value: formatCurrency(average(sum(rows, r => r.total), rows.length)) },
        { label: 'Paying Customers', value: String(new Set(rows.map(r => r.customerId)).size) },
        { label: 'Top Paying Customer', value: top ? top[0] : '-', sub: top ? formatCurrency(top[1]) : undefined },
      ],
      tables: [{ title: 'Paid Customer Invoices', columns: columnsFromRows(tableRows), rows: tableRows }],
    }
  }

  if (type === 'overdue-customer-invoices') {
    const rows = getOverdueInvoicesForReport(invoices, { range, customerId: filters.customerId, agingBucket: filters.agingBucket, sortOrder: filters.sortOrder })
    const tableRows = rows.map(invoice => {
      const days = calculateDaysOverdue(invoice.dueDate, filters.endDate)
      return {
        'Invoice #': invoice.invoiceNumber,
        Customer: invoice.customerName,
        'Invoice Date': formatDate(invoice.createdAt),
        'Due Date': invoice.dueDate ? formatDate(invoice.dueDate) : '-',
        'Days Overdue': Math.max(days, 0),
        'Aging Bucket': STANDARD_AGING_LABELS[getAgingBucketAsOf(invoice.dueDate, filters.endDate)],
        Status: invoice.status,
        'Amount Due': getInvoiceOutstandingAmount(invoice) || invoice.total,
      }
    })
    const bucketSum = (bucket: StandardAgingBucket) => sum(rows.filter(row => getAgingBucketAsOf(row.dueDate, filters.endDate) === bucket), row => getInvoiceOutstandingAmount(row) || row.total)
    return {
      summary: [
        { label: 'Overdue Invoices', value: String(rows.length), sub: 'invoices' },
        { label: 'Overdue Amount', value: formatCurrency(sum(rows, row => getInvoiceOutstandingAmount(row) || row.total)), color: 'red' },
        { label: '1-30 Days', value: formatCurrency(bucketSum('1_30')) },
        { label: '31-60 Days', value: formatCurrency(bucketSum('31_60')) },
        { label: '61-90 Days', value: formatCurrency(bucketSum('61_90')) },
        { label: '90+ Days', value: formatCurrency(bucketSum('90_plus')) },
      ],
      tables: [{ title: 'Overdue Customer Invoices', columns: columnsFromRows(tableRows), rows: tableRows }],
    }
  }

  if (type === 'customer-statement') {
    const rows = filterInvoicesForReport(invoices, { range, customerId: filters.customerId, status: filters.invoiceStatus, sortOrder: filters.sortOrder })
    return {
      summary: [
        { label: 'Total Invoiced', value: formatCurrency(sum(rows, r => r.status === 'cancelled' ? 0 : r.total)), color: 'blue' },
        { label: 'Total Paid', value: formatCurrency(sum(rows, getInvoicePaidAmount)), color: 'green' },
        { label: 'Outstanding Balance', value: formatCurrency(sum(rows, getInvoiceOutstandingAmount)), color: 'amber' },
        { label: 'Invoices', value: String(rows.length), sub: 'documents' },
        { label: 'Last Invoice Date', value: rows.length ? formatDate(sortByDate(rows, r => r.createdAt, 'newest')[0].createdAt) : '-' },
      ],
      tables: [buildCustomerStatement(rows, filters.sortOrder)],
    }
  }

  if (type === 'customer-sales-summary') {
    const rows = buildCustomerSalesSummary(invoices, { range, customerId: filters.customerId, status: filters.invoiceStatus, sortOrder: filters.sortOrder })
    const tableRows = rows.map(row => ({
      Customer: row.customerName,
      'Number of Invoices': row.invoiceCount,
      'Total Sales': row.totalSales,
      'Paid Amount': row.paidAmount,
      'Outstanding Amount': row.outstandingAmount,
      'Average Invoice Value': row.averageInvoiceValue,
      'Last Invoice Date': row.lastInvoiceDate ? formatDate(row.lastInvoiceDate) : '-',
    }))
    const top = [...rows].sort((a, b) => b.totalSales - a.totalSales)[0]
    return {
      summary: [
        { label: 'Total Customers', value: String(rows.length) },
        { label: 'Total Sales', value: formatCurrency(sum(rows, r => r.totalSales)), color: 'blue' },
        { label: 'Total Paid', value: formatCurrency(sum(rows, r => r.paidAmount)), color: 'green' },
        { label: 'Total Outstanding', value: formatCurrency(sum(rows, r => r.outstandingAmount)), color: 'amber' },
        { label: 'Top Customer by Sales', value: top ? top.customerName : '-', sub: top ? formatCurrency(top.totalSales) : undefined },
      ],
      tables: [{ title: 'Customer Sales Summary', columns: columnsFromRows(tableRows), rows: tableRows }],
    }
  }

  if (type === 'all-vendor-bills') {
    const rows = filterBillsForReport(bills, { range, vendorId: filters.vendorId, status: filters.billStatus, sortOrder: filters.sortOrder })
    const tableRows = billListRows(rows, 'all')
    return {
      summary: [
        { label: 'Total Bills', value: String(rows.length), sub: 'bills' },
        { label: 'Total Bill Value', value: formatCurrency(sum(rows, r => r.status === 'cancelled' ? 0 : r.amount)), color: 'blue' },
        { label: 'Paid Amount', value: formatCurrency(sum(rows, getBillPaidAmount)), color: 'green' },
        { label: 'Outstanding Payable', value: formatCurrency(sum(rows, getBillOutstandingAmount)), color: 'amber' },
        { label: 'Vendors', value: String(new Set(rows.map(r => r.vendorId)).size) },
      ],
      tables: [{ title: 'Vendor Bills', columns: columnsFromRows(tableRows), rows: tableRows }],
    }
  }

  if (type === 'unpaid-bills') {
    const rows = getUnpaidBills(bills, { vendorId: filters.vendorId, statusFilter: filters.unpaidBillStatus, range, sortOrder: filters.sortOrder })
    const tableRows = billListRows(rows, 'unpaid')
    return {
      summary: [
        { label: 'Total Unpaid Bills', value: String(rows.length), sub: 'bills' },
        { label: 'Total Payable Amount', value: formatCurrency(sum(rows, r => r.amount)), color: 'amber' },
        { label: 'Unpaid Amount', value: formatCurrency(sum(rows.filter(r => r.status === 'unpaid'), r => r.amount)) },
        { label: 'Overdue Amount', value: formatCurrency(sum(rows.filter(r => r.status === 'overdue'), r => r.amount)), color: 'red' },
        { label: 'Vendors Owed', value: String(new Set(rows.map(r => r.vendorId)).size) },
      ],
      tables: [{ title: 'Unpaid Vendor Bills', columns: columnsFromRows(tableRows), rows: tableRows }],
    }
  }

  if (type === 'paid-vendor-bills') {
    const rows = filterBillsForReport(bills, { range, vendorId: filters.vendorId, status: 'paid', sortOrder: filters.sortOrder })
    const tableRows = billListRows(rows, 'paid')
    return {
      summary: [
        { label: 'Total Paid Bills', value: String(rows.length), sub: 'bills' },
        { label: 'Amount Paid', value: formatCurrency(sum(rows, r => r.amount)), color: 'green' },
        { label: 'Vendors Paid', value: String(new Set(rows.map(r => r.vendorId)).size) },
        { label: 'Average Bill Value', value: formatCurrency(average(sum(rows, r => r.amount), rows.length)) },
      ],
      tables: [{ title: 'Paid Vendor Bills', columns: columnsFromRows(tableRows), rows: tableRows }],
    }
  }

  if (type === 'overdue-vendor-bills') {
    const rows = getOverdueBillsForReport(bills, { range, vendorId: filters.vendorId, agingBucket: filters.agingBucket, sortOrder: filters.sortOrder })
    const tableRows = rows.map(bill => {
      const days = calculateDaysOverdue(bill.dueDate, filters.endDate)
      return {
        'Bill #': bill.billNumber,
        Vendor: bill.vendorName,
        'Bill Date': formatDate(bill.date),
        'Due Date': bill.dueDate ? formatDate(bill.dueDate) : '-',
        'Days Overdue': Math.max(days, 0),
        'Aging Bucket': STANDARD_AGING_LABELS[getAgingBucketAsOf(bill.dueDate, filters.endDate)],
        Status: bill.status,
        'Amount Due': getBillOutstandingAmount(bill) || bill.amount,
      }
    })
    const bucketSum = (bucket: StandardAgingBucket) => sum(rows.filter(row => getAgingBucketAsOf(row.dueDate, filters.endDate) === bucket), row => getBillOutstandingAmount(row) || row.amount)
    return {
      summary: [
        { label: 'Overdue Bills', value: String(rows.length), sub: 'bills' },
        { label: 'Overdue Amount', value: formatCurrency(sum(rows, row => getBillOutstandingAmount(row) || row.amount)), color: 'red' },
        { label: '1-30 Days', value: formatCurrency(bucketSum('1_30')) },
        { label: '31-60 Days', value: formatCurrency(bucketSum('31_60')) },
        { label: '61-90 Days', value: formatCurrency(bucketSum('61_90')) },
        { label: '90+ Days', value: formatCurrency(bucketSum('90_plus')) },
      ],
      tables: [{ title: 'Overdue Vendor Bills', columns: columnsFromRows(tableRows), rows: tableRows }],
    }
  }

  if (type === 'vendor-statement') {
    const rows = filterBillsForReport(bills, { range, vendorId: filters.vendorId, status: filters.billStatus, sortOrder: filters.sortOrder })
    return {
      summary: [
        { label: 'Total Billed', value: formatCurrency(sum(rows, r => r.status === 'cancelled' ? 0 : r.amount)), color: 'blue' },
        { label: 'Total Paid', value: formatCurrency(sum(rows, getBillPaidAmount)), color: 'green' },
        { label: 'Payable Balance', value: formatCurrency(sum(rows, getBillOutstandingAmount)), color: 'amber' },
        { label: 'Bills', value: String(rows.length), sub: 'documents' },
        { label: 'Last Bill Date', value: rows.length ? formatDate(sortByDate(rows, r => r.date, 'newest')[0].date) : '-' },
      ],
      tables: [buildVendorStatement(rows, filters.sortOrder)],
    }
  }

  if (type === 'vendor-purchase-summary') {
    const rows = buildVendorPurchaseSummary(bills, { range, vendorId: filters.vendorId, status: filters.billStatus, sortOrder: filters.sortOrder })
    const tableRows = rows.map(row => ({
      Vendor: row.vendorName,
      'Number of Bills': row.billCount,
      'Total Purchases': row.totalPurchases,
      'Paid Amount': row.paidAmount,
      'Outstanding Amount': row.outstandingAmount,
      'Average Bill Value': row.averageBillValue,
      'Last Bill Date': row.lastBillDate ? formatDate(row.lastBillDate) : '-',
    }))
    const top = [...rows].sort((a, b) => b.totalPurchases - a.totalPurchases)[0]
    return {
      summary: [
        { label: 'Total Vendors', value: String(rows.length) },
        { label: 'Total Purchases', value: formatCurrency(sum(rows, r => r.totalPurchases)), color: 'blue' },
        { label: 'Total Paid', value: formatCurrency(sum(rows, r => r.paidAmount)), color: 'green' },
        { label: 'Total Outstanding', value: formatCurrency(sum(rows, r => r.outstandingAmount)), color: 'amber' },
        { label: 'Top Vendor', value: top ? top.vendorName : '-', sub: top ? formatCurrency(top.totalPurchases) : undefined },
      ],
      tables: [{ title: 'Vendor Purchase Summary', columns: columnsFromRows(tableRows), rows: tableRows }],
    }
  }

  if (type === 'receivables-payables') {
    const receivables = getUnpaidInvoices(invoices, { customerId: filters.customerId, range, sortOrder: filters.sortOrder })
    const payables = getUnpaidBills(bills, { vendorId: filters.vendorId, range, sortOrder: filters.sortOrder })
    const summary = calcReceivablesPayables(receivables, payables)
    const receivableRows = invoiceListRows(receivables, 'unpaid')
    const payableRows = billListRows(payables, 'unpaid')
    return {
      summary: [
        { label: 'Total Receivables', value: formatCurrency(summary.totalReceivables), color: 'green' },
        { label: 'Total Payables', value: formatCurrency(summary.totalPayables), color: 'red' },
        { label: 'Net Position', value: formatCurrency(summary.netPosition), color: summary.netPosition >= 0 ? 'green' : 'red' },
        { label: 'Overdue Receivables', value: formatCurrency(summary.overdueReceivables), color: 'amber' },
        { label: 'Overdue Payables', value: formatCurrency(summary.overduePayables), color: 'amber' },
      ],
      tables: [
        { title: 'Customer Receivables', columns: columnsFromRows(receivableRows), rows: receivableRows },
        { title: 'Vendor Payables', columns: columnsFromRows(payableRows), rows: payableRows },
      ],
    }
  }

  if (type === 'aging-receivables') {
    const rows = buildAgingReceivables(invoices, { asOfDate: filters.asOfDate, customerId: filters.customerId })
    const tableRows = rows.map(row => ({
      Customer: row.partyName,
      Current: row.current,
      '1-30': row.oneToThirty,
      '31-60': row.thirtyOneToSixty,
      '61-90': row.sixtyOneToNinety,
      '90+': row.ninetyPlus,
      Total: row.total,
    }))
    return {
      summary: [
        { label: 'Total Receivables', value: formatCurrency(sum(rows, r => r.total)), color: 'green' },
        { label: 'Current', value: formatCurrency(sum(rows, r => r.current)) },
        { label: '1-30 Days', value: formatCurrency(sum(rows, r => r.oneToThirty)) },
        { label: '31-60 Days', value: formatCurrency(sum(rows, r => r.thirtyOneToSixty)) },
        { label: '61-90 Days', value: formatCurrency(sum(rows, r => r.sixtyOneToNinety)) },
        { label: '90+ Days', value: formatCurrency(sum(rows, r => r.ninetyPlus)), color: 'red' },
      ],
      tables: [{ title: 'Aging Receivables by Customer', columns: columnsFromRows(tableRows), rows: tableRows }],
    }
  }

  if (type === 'aging-payables') {
    const rows = buildAgingPayables(bills, { asOfDate: filters.asOfDate, vendorId: filters.vendorId })
    const tableRows = rows.map(row => ({
      Vendor: row.partyName,
      Current: row.current,
      '1-30': row.oneToThirty,
      '31-60': row.thirtyOneToSixty,
      '61-90': row.sixtyOneToNinety,
      '90+': row.ninetyPlus,
      Total: row.total,
    }))
    return {
      summary: [
        { label: 'Total Payables', value: formatCurrency(sum(rows, r => r.total)), color: 'red' },
        { label: 'Current', value: formatCurrency(sum(rows, r => r.current)) },
        { label: '1-30 Days', value: formatCurrency(sum(rows, r => r.oneToThirty)) },
        { label: '31-60 Days', value: formatCurrency(sum(rows, r => r.thirtyOneToSixty)) },
        { label: '61-90 Days', value: formatCurrency(sum(rows, r => r.sixtyOneToNinety)) },
        { label: '90+ Days', value: formatCurrency(sum(rows, r => r.ninetyPlus)), color: 'red' },
      ],
      tables: [{ title: 'Aging Payables by Vendor', columns: columnsFromRows(tableRows), rows: tableRows }],
    }
  }

  const forecast = getCashForecastData(invoices, bills, { range, customerId: filters.customerId, vendorId: filters.vendorId, sortOrder: filters.sortOrder })
  const receivableRows = forecast.receivables.map(invoice => ({
    'Invoice #': invoice.invoiceNumber,
    Customer: invoice.customerName,
    'Due Date': invoice.dueDate ? formatDate(invoice.dueDate) : '-',
    Status: invoice.status,
    'Expected Amount': getInvoiceOutstandingAmount(invoice),
  }))
  const payableRows = forecast.payables.map(bill => ({
    'Bill #': bill.billNumber,
    Vendor: bill.vendorName,
    'Due Date': bill.dueDate ? formatDate(bill.dueDate) : '-',
    Status: bill.status,
    'Expected Amount': getBillOutstandingAmount(bill),
  }))
  const expectedReceivables = sum(forecast.receivables, getInvoiceOutstandingAmount)
  const expectedPayables = sum(forecast.payables, getBillOutstandingAmount)

  return {
    summary: [
      { label: 'Expected Receivables', value: formatCurrency(expectedReceivables), color: 'green' },
      { label: 'Expected Payables', value: formatCurrency(expectedPayables), color: 'red' },
      { label: 'Net Expected Cash', value: formatCurrency(expectedReceivables - expectedPayables), color: expectedReceivables - expectedPayables >= 0 ? 'green' : 'red' },
      { label: 'Overdue Receivables Included', value: formatCurrency(sum(forecast.receivables.filter(i => i.dueDate && filters.startDate && !isWithinDateRange(i.dueDate, range)), getInvoiceOutstandingAmount)) },
      { label: 'Overdue Payables Included', value: formatCurrency(sum(forecast.payables.filter(b => b.dueDate && filters.startDate && !isWithinDateRange(b.dueDate, range)), getBillOutstandingAmount)) },
    ],
    tables: [
      { title: 'Expected Customer Collections', columns: columnsFromRows(receivableRows), rows: receivableRows },
      { title: 'Expected Vendor Payments', columns: columnsFromRows(payableRows), rows: payableRows },
    ],
  }
}

export function AccountingReport({ type }: { type: AccountingReportType }) {
  const { invoices, fetchInvoices } = useInvoiceStore()
  const { bills, fetchBills } = useBillStore()
  const { customers, fetchCustomers } = useCustomerStore()
  const { vendors, fetchVendors } = useVendorStore()

  const [filters, setFilters] = useState<ReportFilters>(INITIAL_FILTERS)
  const [appliedFilters, setAppliedFilters] = useState<ReportFilters | null>(null)
  const [hasGenerated, setHasGenerated] = useState(false)
  const [errors, setErrors] = useState<ValidationErrors>({})

  useEffect(() => {
    fetchInvoices()
    fetchBills()
    fetchCustomers()
    fetchVendors()
  }, [fetchInvoices, fetchBills, fetchCustomers, fetchVendors])

  const view = useMemo<ReportView | null>(() => {
    if (!hasGenerated || !appliedFilters) return null
    return buildView(type, appliedFilters, invoices, bills)
  }, [type, hasGenerated, appliedFilters, invoices, bills])

  const totalRows = view?.tables.reduce((total, table) => total + table.rows.length, 0) ?? 0
  const filtersChanged = hasGenerated && JSON.stringify(filters) !== JSON.stringify(appliedFilters)

  const updateFilter = <K extends keyof ReportFilters>(key: K, value: ReportFilters[K]) => {
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
    const selectedCustomer = customers.find(customer => customer.id === appliedFilters.customerId)
    const selectedVendor = vendors.find(vendor => vendor.id === appliedFilters.vendorId)

    if (isAgingReport(type)) {
      metadata.push('As Of Date: ' + formatDate(appliedFilters.asOfDate))
    } else {
      metadata.push('Date Range: ' + formatDate(appliedFilters.startDate) + ' - ' + formatDate(appliedFilters.endDate))
    }

    if (hasCustomerFilter(type)) {
      metadata.push('Customer: ' + (selectedCustomer?.name ?? 'All Customers'))
    }

    if (hasVendorFilter(type)) {
      metadata.push('Vendor: ' + (selectedVendor?.company ?? 'All Vendors'))
    }

    if (hasInvoiceStatusFilter(type)) {
      metadata.push('Invoice Status: ' + (appliedFilters.invoiceStatus === 'all' ? 'All Statuses' : statusLabel(appliedFilters.invoiceStatus)))
    }

    if (hasBillStatusFilter(type)) {
      metadata.push('Bill Status: ' + (appliedFilters.billStatus === 'all' ? 'All Statuses' : statusLabel(appliedFilters.billStatus)))
    }

    if (hasUnpaidInvoiceStatusFilter(type)) {
      metadata.push('Status: ' + (appliedFilters.unpaidInvoiceStatus === 'both' ? 'Pending and Overdue' : statusLabel(appliedFilters.unpaidInvoiceStatus)))
    }

    if (hasUnpaidBillStatusFilter(type)) {
      metadata.push('Status: ' + (appliedFilters.unpaidBillStatus === 'both' ? 'Unpaid and Overdue' : statusLabel(appliedFilters.unpaidBillStatus)))
    }

    if (hasAgingBucketFilter(type)) {
      metadata.push('Aging Bucket: ' + (appliedFilters.agingBucket === 'all' ? 'All Buckets' : STANDARD_AGING_LABELS[appliedFilters.agingBucket]))
    }

    if (hasSortFilter(type)) {
      metadata.push('Sort: ' + (appliedFilters.sortOrder === 'newest' ? 'Newest to Oldest' : 'Oldest to Newest'))
    }

    return metadata
  }

  const handlePrintReport = () => {
    if (!view || totalRows === 0) return

    printReport({
      title: REPORT_COPY[type].title,
      subtitle: totalRows + ' ' + (totalRows === 1 ? 'row' : 'rows'),
      metadata: getPrintMetadata(),
      orientation: 'landscape',
      tables: view.tables.map(table => ({
        title: table.title,
        description: table.description,
        columns: table.columns.map(column => ({
          key: column.key,
          label: column.label,
          align: column.align,
        })),
        rows: table.rows.map(row => {
          const printableRow: Record<string, string> = {}
          table.columns.forEach(column => {
            printableRow[column.key] = column.kind === 'status'
              ? statusLabel(String(row[column.key] ?? ''))
              : formatCellValue(column, row[column.key])
          })
          return printableRow
        }),
      })),
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
            {hasCustomerFilter(type) && (
              <div className="space-y-1.5">
                <Label>Customer {needsSpecificCustomer(type) && <span className="text-red-500">*</span>}</Label>
                <Select value={filters.customerId} onValueChange={value => updateFilter('customerId', value)}>
                  <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
                  <SelectContent>
                    {!needsSpecificCustomer(type) && <SelectItem value="all">All Customers</SelectItem>}
                    {customers.map(customer => <SelectItem key={customer.id} value={customer.id}>{customer.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                {errors.customerId && <p className="text-xs text-red-500">{errors.customerId}</p>}
              </div>
            )}

            {hasVendorFilter(type) && (
              <div className="space-y-1.5">
                <Label>Vendor {needsSpecificVendor(type) && <span className="text-red-500">*</span>}</Label>
                <Select value={filters.vendorId} onValueChange={value => updateFilter('vendorId', value)}>
                  <SelectTrigger><SelectValue placeholder="Select vendor" /></SelectTrigger>
                  <SelectContent>
                    {!needsSpecificVendor(type) && <SelectItem value="all">All Vendors</SelectItem>}
                    {vendors.map(vendor => <SelectItem key={vendor.id} value={vendor.id}>{vendor.company}</SelectItem>)}
                  </SelectContent>
                </Select>
                {errors.vendorId && <p className="text-xs text-red-500">{errors.vendorId}</p>}
              </div>
            )}

            {hasInvoiceStatusFilter(type) && (
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={filters.invoiceStatus} onValueChange={value => updateFilter('invoiceStatus', value as InvoiceStatusFilter)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {hasBillStatusFilter(type) && (
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={filters.billStatus} onValueChange={value => updateFilter('billStatus', value as BillStatusFilter)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="unpaid">Unpaid</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {hasUnpaidInvoiceStatusFilter(type) && (
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={filters.unpaidInvoiceStatus} onValueChange={value => updateFilter('unpaidInvoiceStatus', value as UnpaidInvoiceStatusFilter)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="both">Pending & Overdue</SelectItem>
                    <SelectItem value="pending">Pending Only</SelectItem>
                    <SelectItem value="overdue">Overdue Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {hasUnpaidBillStatusFilter(type) && (
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={filters.unpaidBillStatus} onValueChange={value => updateFilter('unpaidBillStatus', value as UnpaidBillStatusFilter)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="both">Unpaid & Overdue</SelectItem>
                    <SelectItem value="unpaid">Unpaid Only</SelectItem>
                    <SelectItem value="overdue">Overdue Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {hasAgingBucketFilter(type) && (
              <div className="space-y-1.5">
                <Label>Aging Bucket</Label>
                <Select value={filters.agingBucket} onValueChange={value => updateFilter('agingBucket', value as AgingFilter)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Buckets</SelectItem>
                    <SelectItem value="1_30">1-30 Days</SelectItem>
                    <SelectItem value="31_60">31-60 Days</SelectItem>
                    <SelectItem value="61_90">61-90 Days</SelectItem>
                    <SelectItem value="90_plus">90+ Days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {isAgingReport(type) ? (
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

            {hasSortFilter(type) && (
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
            )}
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

      {!hasGenerated && <PreGenerateState message="Select filters and click Generate Report to view results." />}

      {filtersChanged && (
        <div className="rounded-md border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-300">
          Filters changed. Click Generate Report to refresh results.
        </div>
      )}

      {hasGenerated && totalRows > 500 && (
        <div className="rounded-md border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-300">
          This report returned many rows. Consider narrowing your filters for better performance.
        </div>
      )}

      {hasGenerated && view && totalRows === 0 && <EmptyState message="No records found for the selected filters." />}

      {hasGenerated && view && totalRows > 0 && (
        <>
          <div className="no-print flex flex-col items-end gap-1">
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={handleExport}>
                <Download className="mr-1.5 h-3.5 w-3.5" />CSV
              </Button>
              <Button variant="outline" size="sm" onClick={handlePrintReport}>
                <Printer className="mr-1.5 h-3.5 w-3.5" />Print
              </Button>
            </div>
            <p className="max-w-lg text-right text-[11px] text-muted-foreground">
              Browser title, URL, page numbers, or timestamp can be removed by disabling Headers and footers in the print dialog.
            </p>
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
        <CardTitle className="text-base">
          {table.title}
          <span className="ml-2 text-sm font-normal text-muted-foreground">
            ({table.rows.length} {table.rows.length === 1 ? 'row' : 'rows'})
          </span>
        </CardTitle>
        {table.description && <p className="text-sm text-muted-foreground">{table.description}</p>}
      </CardHeader>
      <CardContent>
        <div className="rounded-md border overflow-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                {table.columns.map(column => (
                  <TableHead key={column.key} className={column.align === 'right' ? 'text-right' : ''}>{column.label}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {table.rows.map((row, index) => (
                <TableRow key={index}>
                  {table.columns.map(column => (
                    <TableCell key={column.key} className={column.align === 'right' ? 'text-right font-medium tabular-nums' : ''}>
                      {column.kind === 'status' ? (
                        <Badge className={`border text-xs ${getStatusColor(String(row[column.key] ?? ''))}`}>
                          {statusLabel(String(row[column.key] ?? ''))}
                        </Badge>
                      ) : (
                        formatCellValue(column, row[column.key])
                      )}
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
