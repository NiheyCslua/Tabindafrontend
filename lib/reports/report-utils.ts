import type {
  Invoice,
  Bill,
  SerialUnit,
  ProductLedgerTransaction,
  ReceivablesPayablesSummary,
  ReportDateRange,
  DateSortOrder,
} from '@/lib/types'

// ─── Date helpers ─────────────────────────────────────────────────────────────

export function getSafeTime(value?: string | Date | null): number | null {
  if (!value) return null
  const time = new Date(value).getTime()
  return Number.isNaN(time) ? null : time
}

export function compareDates(
  aDate: string | Date | undefined | null,
  bDate: string | Date | undefined | null,
  sortOrder: DateSortOrder = 'oldest'
): number {
  const timeA = getSafeTime(aDate)
  const timeB = getSafeTime(bDate)

  // Keep invalid/missing dates at the bottom for both sort orders.
  if (timeA === null && timeB === null) return 0
  if (timeA === null) return 1
  if (timeB === null) return -1

  return sortOrder === 'oldest' ? timeA - timeB : timeB - timeA
}

export function sortByDate<T>(
  rows: T[],
  getDate: (row: T) => string | Date | undefined | null,
  sortOrder: DateSortOrder = 'oldest',
  tieBreaker?: (a: T, b: T) => number
): T[] {
  return [...rows].sort((a, b) => {
    const dateCompare = compareDates(getDate(a), getDate(b), sortOrder)
    if (dateCompare !== 0) return dateCompare
    return tieBreaker ? tieBreaker(a, b) : 0
  })
}

export function isWithinDateRange(
  dateStr: string,
  range: ReportDateRange
): boolean {
  if (!range.startDate && !range.endDate) return true
  const d = new Date(dateStr).getTime()
  if (range.startDate && d < new Date(range.startDate).getTime()) return false
  if (range.endDate) {
    // include the entire end day
    const end = new Date(range.endDate)
    end.setHours(23, 59, 59, 999)
    if (d > end.getTime()) return false
  }
  return true
}

export function daysBetween(from: string, to: Date = new Date()): number {
  return Math.floor(
    (to.getTime() - new Date(from).getTime()) / (1000 * 60 * 60 * 24)
  )
}

/** Aging bucket label for a due date */
export type AgingBucket =
  | 'not_overdue'
  | '0_30'
  | '31_60'
  | '61_90'
  | '90_plus'

export function getAgingBucket(dueDateStr: string): AgingBucket {
  const days = daysBetween(dueDateStr)
  if (days <= 0) return 'not_overdue'
  if (days <= 30) return '0_30'
  if (days <= 60) return '31_60'
  if (days <= 90) return '61_90'
  return '90_plus'
}

export const AGING_LABELS: Record<AgingBucket, string> = {
  not_overdue: 'Not Overdue',
  '0_30': '1–30 days',
  '31_60': '31–60 days',
  '61_90': '61–90 days',
  '90_plus': '90+ days',
}

// ─── Bill due-date priority ───────────────────────────────────────────────────

export type DuePriority = 'overdue' | 'today' | 'this_week' | 'future'

export function getDuePriority(dueDateStr: string): DuePriority {
  const days = daysBetween(dueDateStr)
  if (days > 0) return 'overdue'
  if (days === 0) return 'today'
  const abs = Math.abs(days)
  if (abs <= 7) return 'this_week'
  return 'future'
}

export const DUE_PRIORITY_LABELS: Record<DuePriority, string> = {
  overdue: 'Overdue',
  today: 'Due Today',
  this_week: 'Due This Week',
  future: 'Upcoming',
}

// ─── Unpaid invoices ──────────────────────────────────────────────────────────

export function getUnpaidInvoices(
  invoices: Invoice[],
  opts: {
    customerId?: string
    statusFilter?: 'pending' | 'overdue' | 'both'
    range?: ReportDateRange
    sortOrder?: DateSortOrder
  } = {}
): Invoice[] {
  const { customerId, statusFilter = 'both', range = {}, sortOrder = 'oldest' } = opts
  const filtered = invoices.filter(inv => {
    if (inv.status !== 'pending' && inv.status !== 'overdue') return false
    if (statusFilter !== 'both' && inv.status !== statusFilter) return false
    if (customerId && customerId !== 'all' && inv.customerId !== customerId)
      return false
    if (!isWithinDateRange(inv.createdAt, range)) return false
    return true
  })

  return sortByDate(
    filtered,
    inv => inv.createdAt,
    sortOrder,
    (a, b) => a.invoiceNumber.localeCompare(b.invoiceNumber)
  )
}

// ─── Unpaid bills ─────────────────────────────────────────────────────────────

export function getUnpaidBills(
  bills: Bill[],
  opts: {
    vendorId?: string
    statusFilter?: 'unpaid' | 'overdue' | 'both'
    range?: ReportDateRange
    sortOrder?: DateSortOrder
  } = {}
): Bill[] {
  const { vendorId, statusFilter = 'both', range = {}, sortOrder = 'oldest' } = opts
  const filtered = bills.filter(bill => {
    if (bill.status !== 'unpaid' && bill.status !== 'overdue') return false
    if (statusFilter !== 'both' && bill.status !== statusFilter) return false
    if (vendorId && vendorId !== 'all' && bill.vendorId !== vendorId) return false
    if (!isWithinDateRange(bill.date, range)) return false
    return true
  })

  return sortByDate(
    filtered,
    bill => bill.date || bill.createdAt,
    sortOrder,
    (a, b) => a.billNumber.localeCompare(b.billNumber)
  )
}

// ─── Receivables / Payables summary ──────────────────────────────────────────

export function calcReceivablesPayables(
  invoices: Invoice[],
  bills: Bill[]
): ReceivablesPayablesSummary {
  const totalReceivables = invoices.reduce((s, i) => s + i.total, 0)
  const totalPayables = bills.reduce((s, b) => s + b.amount, 0)
  const overdueReceivables = invoices
    .filter(i => i.status === 'overdue')
    .reduce((s, i) => s + i.total, 0)
  const overduePayables = bills
    .filter(b => b.status === 'overdue')
    .reduce((s, b) => s + b.amount, 0)
  return {
    totalReceivables,
    totalPayables,
    netPosition: totalReceivables - totalPayables,
    overdueReceivables,
    overduePayables,
  }
}

// ─── Product ledger ───────────────────────────────────────────────────────────

type LedgerLineItem = {
  id: string
  productId: string
  productName: string
  productSku: string
  serialNumber?: string
  serialNumbers?: string[]
  quantity: number
  unitPrice: number
  total: number
}

export function normalizeSerials(item: { serialNumber?: string; serialNumbers?: string[] }): string[] {
  const serials = Array.isArray(item.serialNumbers)
    ? item.serialNumbers
    : item.serialNumber
      ? [item.serialNumber]
      : []

  return Array.from(new Set(serials.map(serial => serial.trim()).filter(Boolean)))
}

const serialsFromStore = (
  serialUnits: SerialUnit[],
  productId: string,
  source: 'invoice' | 'bill',
  documentId: string,
  documentNumber: string
) => {
  return serialUnits
    .filter(unit => {
      if (unit.productId !== productId) return false
      if (source === 'invoice') {
        return unit.saleInvoiceId === documentId || unit.saleInvoiceNumber === documentNumber
      }
      return unit.purchaseBillId === documentId || unit.purchaseBillNumber === documentNumber
    })
    .map(unit => unit.serialNumber)
}

const buildRowsForItem = (params: {
  item: LedgerLineItem
  source: 'invoice' | 'bill'
  documentId: string
  documentNumber: string
  date: string
  partyName: string
  status: string
  serialUnits: SerialUnit[]
}): ProductLedgerTransaction[] => {
  const { item, source, documentId, documentNumber, date, partyName, status, serialUnits } = params
  const directSerials = normalizeSerials(item)
  const serials = directSerials.length > 0
    ? directSerials
    : serialsFromStore(serialUnits, item.productId, source, documentId, documentNumber)

  if (serials.length > 0) {
    return serials.map(serialNumber => ({
      id: `${source}-${documentId}-${item.id}-${serialNumber}`,
      type: source === 'invoice' ? 'sold' : 'bought',
      date,
      documentNumber,
      partyName,
      productId: item.productId,
      productName: item.productName,
      productSku: item.productSku,
      quantity: 1,
      unitPrice: item.unitPrice,
      total: item.unitPrice,
      status,
      source,
      sourceId: documentId,
      serialNumber,
      serialNumbers: [serialNumber],
    }))
  }

  return [{
    id: `${source}-${documentId}-${item.id}-aggregate`,
    type: source === 'invoice' ? 'sold' : 'bought',
    date,
    documentNumber,
    partyName,
    productId: item.productId,
    productName: item.productName,
    productSku: item.productSku,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    total: item.total || item.quantity * item.unitPrice,
    status,
    source,
    sourceId: documentId,
    serialNumber: null,
    serialNumbers: [],
    isAggregateFallback: true,
  }]
}

export function buildProductLedger(
  productId: string,
  invoices: Invoice[],
  bills: Bill[],
  opts: {
    range?: ReportDateRange
    typeFilter?: 'all' | 'sold' | 'bought'
    serialUnits?: SerialUnit[]
    sortOrder?: DateSortOrder
  } = {}
): ProductLedgerTransaction[] {
  const { range = {}, typeFilter = 'all', serialUnits = [], sortOrder = 'oldest' } = opts

  const soldRows: ProductLedgerTransaction[] = invoices.flatMap(invoice =>
    invoice.items
      .filter(item => item.productId === productId)
      .flatMap(item => buildRowsForItem({
        item,
        source: 'invoice',
        documentId: invoice.id,
        documentNumber: invoice.invoiceNumber,
        date: invoice.createdAt,
        partyName: invoice.customerName,
        status: invoice.status,
        serialUnits,
      }))
  )

  const boughtRows: ProductLedgerTransaction[] = bills.flatMap(bill =>
    bill.items
      .filter(item => item.productId === productId)
      .flatMap(item => buildRowsForItem({
        item,
        source: 'bill',
        documentId: bill.id,
        documentNumber: bill.billNumber,
        date: bill.date || bill.createdAt,
        partyName: bill.vendorName,
        status: bill.status,
        serialUnits,
      }))
  )

  // Important: build sold and bought movements independently, then merge them into
  // one ledger before filtering and doing one final sort. This keeps purchases and
  // sales interleaved chronologically instead of grouped by source.
  const mergedRows: ProductLedgerTransaction[] = [...soldRows, ...boughtRows]

  const filteredRows = mergedRows
    .filter(tx => isWithinDateRange(tx.date, range))
    .filter(tx => typeFilter === 'all' || tx.type === typeFilter)

  return sortByDate(
    filteredRows,
    tx => tx.date,
    sortOrder,
    (a, b) => {
      const documentDiff = String(a.documentNumber || '').localeCompare(String(b.documentNumber || ''))
      if (documentDiff !== 0) return documentDiff

      return String(a.serialNumber || '').localeCompare(String(b.serialNumber || ''))
    }
  )

}

// ─── CSV export ───────────────────────────────────────────────────────────────

export function exportToCsv(filename: string, rows: Record<string, unknown>[]) {
  if (!rows.length) return
  const headers = Object.keys(rows[0])
  const csv = [
    headers.join(','),
    ...rows.map(row =>
      headers
        .map(h => {
          const val = String(row[h] ?? '')
          return val.includes(',') || val.includes('"') || val.includes('\n')
            ? `"${val.replace(/"/g, '""')}"`
            : val
        })
        .join(',')
    ),
  ].join('\n')

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// ─── Expanded accounting report helpers ──────────────────────────────────────

export type StandardAgingBucket = 'current' | '1_30' | '31_60' | '61_90' | '90_plus'

export const STANDARD_AGING_LABELS: Record<StandardAgingBucket, string> = {
  current: 'Current',
  '1_30': '1-30',
  '31_60': '31-60',
  '61_90': '61-90',
  '90_plus': '90+',
}

export type AgingSummaryRow = {
  id: string
  partyId: string
  partyName: string
  current: number
  oneToThirty: number
  thirtyOneToSixty: number
  sixtyOneToNinety: number
  ninetyPlus: number
  total: number
}

export type CustomerSalesSummaryRow = {
  id: string
  customerId: string
  customerName: string
  invoiceCount: number
  totalSales: number
  paidAmount: number
  outstandingAmount: number
  averageInvoiceValue: number
  lastInvoiceDate: string
}

export type VendorPurchaseSummaryRow = {
  id: string
  vendorId: string
  vendorName: string
  billCount: number
  totalPurchases: number
  paidAmount: number
  outstandingAmount: number
  averageBillValue: number
  lastBillDate: string
}

export function getInvoiceDate(invoice: Invoice): string {
  return invoice.createdAt
}

export function getBillDate(bill: Bill): string {
  return bill.date || bill.createdAt
}

export function getInvoicePaidAmount(invoice: Invoice): number {
  return invoice.status === 'paid' ? invoice.total : 0
}

export function getInvoiceOutstandingAmount(invoice: Invoice): number {
  return invoice.status === 'pending' || invoice.status === 'overdue' ? invoice.total : 0
}

export function getBillPaidAmount(bill: Bill): number {
  return bill.status === 'paid' ? bill.amount : 0
}

export function getBillOutstandingAmount(bill: Bill): number {
  return bill.status === 'unpaid' || bill.status === 'overdue' ? bill.amount : 0
}

export function calculateDaysOverdue(dueDate?: string, asOfDate?: string): number {
  if (!dueDate || !asOfDate) return 0
  const due = getSafeTime(dueDate)
  const asOf = getSafeTime(asOfDate)
  if (due === null || asOf === null) return 0
  return Math.floor((asOf - due) / (1000 * 60 * 60 * 24))
}

export function getAgingBucketAsOf(dueDate?: string, asOfDate?: string): StandardAgingBucket {
  const days = calculateDaysOverdue(dueDate, asOfDate)
  if (days <= 0) return 'current'
  if (days <= 30) return '1_30'
  if (days <= 60) return '31_60'
  if (days <= 90) return '61_90'
  return '90_plus'
}

export function isInvoiceUnpaid(invoice: Invoice): boolean {
  return invoice.status === 'pending' || invoice.status === 'overdue'
}

export function isBillUnpaid(bill: Bill): boolean {
  return bill.status === 'unpaid' || bill.status === 'overdue'
}

export function filterInvoicesForReport(
  invoices: Invoice[],
  opts: {
    range?: ReportDateRange
    customerId?: string
    status?: Invoice['status'] | 'all'
    sortOrder?: DateSortOrder
  } = {}
): Invoice[] {
  const { range = {}, customerId = 'all', status = 'all', sortOrder = 'oldest' } = opts
  const filtered = invoices.filter(invoice => {
    if (customerId !== 'all' && invoice.customerId !== customerId) return false
    if (status !== 'all' && invoice.status !== status) return false
    if (!isWithinDateRange(getInvoiceDate(invoice), range)) return false
    return true
  })

  return sortByDate(
    filtered,
    getInvoiceDate,
    sortOrder,
    (a, b) => a.invoiceNumber.localeCompare(b.invoiceNumber)
  )
}

export function filterBillsForReport(
  bills: Bill[],
  opts: {
    range?: ReportDateRange
    vendorId?: string
    status?: Bill['status'] | 'all'
    sortOrder?: DateSortOrder
  } = {}
): Bill[] {
  const { range = {}, vendorId = 'all', status = 'all', sortOrder = 'oldest' } = opts
  const filtered = bills.filter(bill => {
    if (vendorId !== 'all' && bill.vendorId !== vendorId) return false
    if (status !== 'all' && bill.status !== status) return false
    if (!isWithinDateRange(getBillDate(bill), range)) return false
    return true
  })

  return sortByDate(
    filtered,
    getBillDate,
    sortOrder,
    (a, b) => a.billNumber.localeCompare(b.billNumber)
  )
}

export function getOverdueInvoicesForReport(
  invoices: Invoice[],
  opts: {
    range: ReportDateRange
    customerId?: string
    agingBucket?: StandardAgingBucket | 'all'
    sortOrder?: DateSortOrder
  }
): Invoice[] {
  const asOfDate = opts.range.endDate
  const filtered = invoices.filter(invoice => {
    if (opts.customerId && opts.customerId !== 'all' && invoice.customerId !== opts.customerId) return false
    if (!isWithinDateRange(getInvoiceDate(invoice), opts.range)) return false

    const isOverdue = invoice.status === 'overdue' || (isInvoiceUnpaid(invoice) && calculateDaysOverdue(invoice.dueDate, asOfDate) > 0)
    if (!isOverdue) return false

    const bucket = getAgingBucketAsOf(invoice.dueDate, asOfDate)
    if (opts.agingBucket && opts.agingBucket !== 'all' && bucket !== opts.agingBucket) return false
    return true
  })

  return sortByDate(filtered, getInvoiceDate, opts.sortOrder ?? 'oldest', (a, b) => a.invoiceNumber.localeCompare(b.invoiceNumber))
}

export function getOverdueBillsForReport(
  bills: Bill[],
  opts: {
    range: ReportDateRange
    vendorId?: string
    agingBucket?: StandardAgingBucket | 'all'
    sortOrder?: DateSortOrder
  }
): Bill[] {
  const asOfDate = opts.range.endDate
  const filtered = bills.filter(bill => {
    if (opts.vendorId && opts.vendorId !== 'all' && bill.vendorId !== opts.vendorId) return false
    if (!isWithinDateRange(getBillDate(bill), opts.range)) return false

    const isOverdue = bill.status === 'overdue' || (isBillUnpaid(bill) && calculateDaysOverdue(bill.dueDate, asOfDate) > 0)
    if (!isOverdue) return false

    const bucket = getAgingBucketAsOf(bill.dueDate, asOfDate)
    if (opts.agingBucket && opts.agingBucket !== 'all' && bucket !== opts.agingBucket) return false
    return true
  })

  return sortByDate(filtered, getBillDate, opts.sortOrder ?? 'oldest', (a, b) => a.billNumber.localeCompare(b.billNumber))
}

export function buildCustomerSalesSummary(
  invoices: Invoice[],
  opts: {
    range: ReportDateRange
    customerId?: string
    status?: Invoice['status'] | 'all'
    sortOrder?: DateSortOrder
  }
): CustomerSalesSummaryRow[] {
  const filtered = filterInvoicesForReport(invoices, opts)
  const groups = new Map<string, CustomerSalesSummaryRow>()

  for (const invoice of filtered) {
    const key = invoice.customerId || invoice.customerName
    const current = groups.get(key) ?? {
      id: key,
      customerId: invoice.customerId,
      customerName: invoice.customerName,
      invoiceCount: 0,
      totalSales: 0,
      paidAmount: 0,
      outstandingAmount: 0,
      averageInvoiceValue: 0,
      lastInvoiceDate: invoice.createdAt,
    }

    current.invoiceCount += 1
    current.totalSales += invoice.status === 'cancelled' ? 0 : invoice.total
    current.paidAmount += getInvoicePaidAmount(invoice)
    current.outstandingAmount += getInvoiceOutstandingAmount(invoice)
    if (compareDates(current.lastInvoiceDate, invoice.createdAt, 'oldest') < 0) current.lastInvoiceDate = invoice.createdAt
    current.averageInvoiceValue = current.invoiceCount > 0 ? current.totalSales / current.invoiceCount : 0
    groups.set(key, current)
  }

  return sortByDate(Array.from(groups.values()), row => row.lastInvoiceDate, opts.sortOrder ?? 'oldest', (a, b) => a.customerName.localeCompare(b.customerName))
}

export function buildVendorPurchaseSummary(
  bills: Bill[],
  opts: {
    range: ReportDateRange
    vendorId?: string
    status?: Bill['status'] | 'all'
    sortOrder?: DateSortOrder
  }
): VendorPurchaseSummaryRow[] {
  const filtered = filterBillsForReport(bills, opts)
  const groups = new Map<string, VendorPurchaseSummaryRow>()

  for (const bill of filtered) {
    const key = bill.vendorId || bill.vendorName
    const current = groups.get(key) ?? {
      id: key,
      vendorId: bill.vendorId,
      vendorName: bill.vendorName,
      billCount: 0,
      totalPurchases: 0,
      paidAmount: 0,
      outstandingAmount: 0,
      averageBillValue: 0,
      lastBillDate: getBillDate(bill),
    }

    current.billCount += 1
    current.totalPurchases += bill.status === 'cancelled' ? 0 : bill.amount
    current.paidAmount += getBillPaidAmount(bill)
    current.outstandingAmount += getBillOutstandingAmount(bill)
    if (compareDates(current.lastBillDate, getBillDate(bill), 'oldest') < 0) current.lastBillDate = getBillDate(bill)
    current.averageBillValue = current.billCount > 0 ? current.totalPurchases / current.billCount : 0
    groups.set(key, current)
  }

  return sortByDate(Array.from(groups.values()), row => row.lastBillDate, opts.sortOrder ?? 'oldest', (a, b) => a.vendorName.localeCompare(b.vendorName))
}

function emptyAgingRow(id: string, partyName: string): AgingSummaryRow {
  return {
    id,
    partyId: id,
    partyName,
    current: 0,
    oneToThirty: 0,
    thirtyOneToSixty: 0,
    sixtyOneToNinety: 0,
    ninetyPlus: 0,
    total: 0,
  }
}

function addToAgingRow(row: AgingSummaryRow, bucket: StandardAgingBucket, amount: number) {
  if (bucket === 'current') row.current += amount
  if (bucket === '1_30') row.oneToThirty += amount
  if (bucket === '31_60') row.thirtyOneToSixty += amount
  if (bucket === '61_90') row.sixtyOneToNinety += amount
  if (bucket === '90_plus') row.ninetyPlus += amount
  row.total += amount
}

export function buildAgingReceivables(
  invoices: Invoice[],
  opts: { asOfDate: string; customerId?: string } 
): AgingSummaryRow[] {
  const groups = new Map<string, AgingSummaryRow>()

  for (const invoice of invoices) {
    if (!isInvoiceUnpaid(invoice)) continue
    if (opts.customerId && opts.customerId !== 'all' && invoice.customerId !== opts.customerId) continue

    const key = invoice.customerId || invoice.customerName
    const row = groups.get(key) ?? emptyAgingRow(key, invoice.customerName)
    addToAgingRow(row, getAgingBucketAsOf(invoice.dueDate, opts.asOfDate), getInvoiceOutstandingAmount(invoice))
    groups.set(key, row)
  }

  return Array.from(groups.values()).sort((a, b) => a.partyName.localeCompare(b.partyName))
}

export function buildAgingPayables(
  bills: Bill[],
  opts: { asOfDate: string; vendorId?: string }
): AgingSummaryRow[] {
  const groups = new Map<string, AgingSummaryRow>()

  for (const bill of bills) {
    if (!isBillUnpaid(bill)) continue
    if (opts.vendorId && opts.vendorId !== 'all' && bill.vendorId !== opts.vendorId) continue

    const key = bill.vendorId || bill.vendorName
    const row = groups.get(key) ?? emptyAgingRow(key, bill.vendorName)
    addToAgingRow(row, getAgingBucketAsOf(bill.dueDate, opts.asOfDate), getBillOutstandingAmount(bill))
    groups.set(key, row)
  }

  return Array.from(groups.values()).sort((a, b) => a.partyName.localeCompare(b.partyName))
}

export function getCashForecastData(
  invoices: Invoice[],
  bills: Bill[],
  opts: {
    range: ReportDateRange
    customerId?: string
    vendorId?: string
    sortOrder?: DateSortOrder
  }
): { receivables: Invoice[]; payables: Bill[] } {
  const { range, customerId = 'all', vendorId = 'all', sortOrder = 'oldest' } = opts

  const receivables = invoices.filter(invoice => {
    if (!isInvoiceUnpaid(invoice)) return false
    if (customerId !== 'all' && invoice.customerId !== customerId) return false
    if (!invoice.dueDate) return false
    return isWithinDateRange(invoice.dueDate, range) || (range.startDate ? calculateDaysOverdue(invoice.dueDate, range.startDate) > 0 : false)
  })

  const payables = bills.filter(bill => {
    if (!isBillUnpaid(bill)) return false
    if (vendorId !== 'all' && bill.vendorId !== vendorId) return false
    if (!bill.dueDate) return false
    return isWithinDateRange(bill.dueDate, range) || (range.startDate ? calculateDaysOverdue(bill.dueDate, range.startDate) > 0 : false)
  })

  return {
    receivables: sortByDate(receivables, invoice => invoice.dueDate, sortOrder, (a, b) => a.invoiceNumber.localeCompare(b.invoiceNumber)),
    payables: sortByDate(payables, bill => bill.dueDate, sortOrder, (a, b) => a.billNumber.localeCompare(b.billNumber)),
  }
}
