import type { Bill, Invoice, LedgerEntry } from '@/lib/types'

export type LedgerTypeFilter = 'all' | 'debit' | 'credit' | 'customer_invoice' | 'vendor_bill' | 'misc_expense'
export type LedgerSortOrder = 'newest' | 'oldest' | 'amount_high' | 'amount_low'

export interface LedgerTotals {
  totalDebit: number
  totalCredit: number
  netBalance: number
  entryCount: number
  debitCount: number
  creditCount: number
}

const toTime = (value: string) => {
  const time = new Date(value).getTime()
  return Number.isNaN(time) ? 0 : time
}

export function buildLedgerEntries(invoices: Invoice[] = [], bills: Bill[] = []): LedgerEntry[] {
  const paidInvoiceEntries: LedgerEntry[] = invoices
    .filter((invoice) => invoice.status === 'paid')
    .map((invoice) => ({
      id: `invoice-${invoice.id}`,
      sourceType: 'customer_invoice',
      sourceLabel: 'Customer Invoice',
      referenceId: invoice.id,
      referenceNumber: invoice.invoiceNumber,
      partyName: invoice.customerName,
      partyEmail: invoice.customerEmail,
      partyType: 'customer',
      date: invoice.createdAt,
      dueDate: invoice.dueDate,
      status: invoice.status,
      description: `Paid customer invoice ${invoice.invoiceNumber}`,
      debit: invoice.total,
      credit: 0,
      amount: invoice.total,
    }))

  const unpaidBillEntries: LedgerEntry[] = bills
    .filter((bill) => bill.status === 'unpaid')
    .map((bill) => ({
      id: `bill-${bill.id}`,
      sourceType: 'vendor_bill',
      sourceLabel: 'Vendor Bill',
      referenceId: bill.id,
      referenceNumber: bill.billNumber,
      partyName: bill.vendorName,
      partyEmail: bill.vendorEmail,
      partyType: 'vendor',
      date: bill.date,
      dueDate: bill.dueDate,
      status: bill.status,
      description: `Unpaid vendor bill ${bill.billNumber}`,
      debit: 0,
      credit: bill.amount,
      amount: bill.amount,
    }))

  return sortLedgerEntries([...paidInvoiceEntries, ...unpaidBillEntries], 'newest')
}

export function sortLedgerEntries(entries: LedgerEntry[], sortOrder: LedgerSortOrder): LedgerEntry[] {
  return [...entries].sort((a, b) => {
    switch (sortOrder) {
      case 'oldest':
        return toTime(a.date) - toTime(b.date)
      case 'amount_high':
        return b.amount - a.amount
      case 'amount_low':
        return a.amount - b.amount
      case 'newest':
      default:
        return toTime(b.date) - toTime(a.date)
    }
  })
}

export function filterLedgerEntriesByType(
  entries: LedgerEntry[],
  typeFilter: LedgerTypeFilter,
): LedgerEntry[] {
  if (typeFilter === 'all') return entries
  if (typeFilter === 'debit') return entries.filter((entry) => entry.debit > 0)
  if (typeFilter === 'credit') return entries.filter((entry) => entry.credit > 0)
  return entries.filter((entry) => entry.sourceType === typeFilter)
}

export function searchLedgerEntries(entries: LedgerEntry[], searchTerm: string): LedgerEntry[] {
  const query = searchTerm.trim().toLowerCase()
  if (!query) return entries

  return entries.filter((entry) => {
    const searchable = [
      entry.referenceNumber,
      entry.partyName,
      entry.partyEmail ?? '',
      entry.partyType,
      entry.sourceType,
      entry.sourceLabel,
      entry.status,
      entry.description,
      entry.date,
      entry.dueDate ?? '',
      entry.amount.toString(),
      entry.amount.toFixed(2),
      entry.debit.toString(),
      entry.debit.toFixed(2),
      entry.credit.toString(),
      entry.credit.toFixed(2),
    ]

    return searchable.some((value) => value.toLowerCase().includes(query))
  })
}

export function calculateLedgerTotals(entries: LedgerEntry[]): LedgerTotals {
  const totalDebit = entries.reduce((sum, entry) => sum + entry.debit, 0)
  const totalCredit = entries.reduce((sum, entry) => sum + entry.credit, 0)

  return {
    totalDebit,
    totalCredit,
    netBalance: totalDebit - totalCredit,
    entryCount: entries.length,
    debitCount: entries.filter((entry) => entry.debit > 0).length,
    creditCount: entries.filter((entry) => entry.credit > 0).length,
  }
}
