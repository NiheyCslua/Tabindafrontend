import { create } from 'zustand'
import { api, API_ENDPOINTS } from '@/lib/api'
import { asArray, asObject, toDateString, toNumber, toStringValue } from '@/lib/api-normalizers'
import type { MonthlyEarningsEntry, MonthlyEarningsReport } from '@/lib/types'

interface MonthlyEarningsFilters {
  month?: string
  from?: string
  to?: string
}

interface MonthlyEarningsState {
  report: MonthlyEarningsReport | null
  isLoading: boolean
  error: string | null
  fetchReport: (filters?: MonthlyEarningsFilters) => Promise<MonthlyEarningsReport>
}

const currentMonth = () => {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

const normalizeEntry = (payload: unknown): MonthlyEarningsEntry => {
  const item = asObject<Record<string, any>>(payload)

  return {
    id: toStringValue(item.id),
    type: item.type === 'income' ? 'income' : 'outgoing',
    sourceType: ['customer_invoice', 'vendor_bill', 'debit_bill', 'misc_expense', 'employee_salary'].includes(String(item.sourceType))
      ? String(item.sourceType) as MonthlyEarningsEntry['sourceType']
      : 'misc_expense',
    referenceId: toStringValue(item.referenceId ?? item.id),
    referenceNumber: toStringValue(item.referenceNumber ?? item.reference ?? item.id),
    partyName: toStringValue(item.partyName ?? item.label),
    partyEmail: item.partyEmail ? String(item.partyEmail) : undefined,
    date: toDateString(item.date),
    documentDate: item.documentDate ? toDateString(item.documentDate) : undefined,
    dueDate: item.dueDate ? toDateString(item.dueDate) : undefined,
    status: toStringValue(item.status, 'paid').toLowerCase(),
    description: toStringValue(item.description),
    amount: toNumber(item.amount, 0),
    paymentMethod: item.paymentMethod ? String(item.paymentMethod) : undefined,
    itemCount: item.itemCount !== undefined ? toNumber(item.itemCount, 0) : undefined,
    label: item.label ? String(item.label) : undefined,
    notes: item.notes ? String(item.notes) : undefined,
    createdByName: item.createdByName ? String(item.createdByName) : undefined,
  }
}

const normalizeReport = (payload: unknown): MonthlyEarningsReport => {
  const item = asObject<Record<string, any>>(payload)
  const totals = asObject<Record<string, any>>(item.totals)

  return {
    month: toStringValue(item.month, currentMonth()),
    from: toStringValue(item.from),
    to: toStringValue(item.to),
    totals: {
      income: toNumber(totals.income, 0),
      vendorOutgoing: toNumber(totals.vendorOutgoing, 0),
      miscOutgoing: toNumber(totals.miscOutgoing, 0),
      salaryOutgoing: toNumber(totals.salaryOutgoing, 0),
      totalOutgoing: toNumber(totals.totalOutgoing, 0),
      netEarnings: toNumber(totals.netEarnings, 0),
      incomeCount: toNumber(totals.incomeCount, 0),
      vendorPaymentCount: toNumber(totals.vendorPaymentCount, 0),
      miscExpenseCount: toNumber(totals.miscExpenseCount, 0),
      salaryPaymentCount: toNumber(totals.salaryPaymentCount, 0),
      totalEntryCount: toNumber(totals.totalEntryCount, 0),
    },
    incomeEntries: asArray(item.incomeEntries).map(normalizeEntry),
    vendorOutgoingEntries: asArray(item.vendorOutgoingEntries).map(normalizeEntry),
    miscExpenseEntries: asArray(item.miscExpenseEntries).map(normalizeEntry),
    salaryOutgoingEntries: asArray(item.salaryOutgoingEntries).map(normalizeEntry),
  }
}

const buildQuery = (filters?: MonthlyEarningsFilters) => {
  const params = new URLSearchParams()
  if (filters?.month) params.set('month', filters.month)
  if (filters?.from) params.set('from', filters.from)
  if (filters?.to) params.set('to', filters.to)
  const query = params.toString()
  return query ? `?${query}` : ''
}

export const useMonthlyEarningsStore = create<MonthlyEarningsState>((set) => ({
  report: null,
  isLoading: false,
  error: null,

  fetchReport: async (filters) => {
    set({ isLoading: true, error: null })
    try {
      const response = await api(`${API_ENDPOINTS.monthlyEarnings}${buildQuery(filters)}`)
      const report = normalizeReport(response)
      set({ report, isLoading: false, error: null })
      return report
    } catch (error: any) {
      set({ isLoading: false, error: error.message || 'Failed to fetch monthly earnings report' })
      throw error
    }
  },
}))
