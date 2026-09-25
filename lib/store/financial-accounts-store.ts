import { create } from 'zustand'
import { api, API_ENDPOINTS } from '@/lib/api'
import { asArray, asObject, toNumber, toStringValue } from '@/lib/api-normalizers'
import type {
  ChartOfAccountsEntry,
  CreateFinancialAccountDTO,
  FinancialAccount,
  FinancialAccountLedgerResponse,
  SetOpeningBalanceDTO,
  UpdateFinancialAccountDTO,
} from '@/lib/types'

const normalizeAccount = (payload: unknown): FinancialAccount => {
  const item = asObject<Record<string, any>>(payload)
  return {
    id: toStringValue(item.id),
    name: toStringValue(item.name),
    type: (item.type || 'BANK') as FinancialAccount['type'],
    openingBalance: toNumber(item.openingBalance, 0),
    openingBalanceDate: item.openingBalanceDate ? String(item.openingBalanceDate) : null,
    description: item.description ? String(item.description) : null,
    isActive: item.isActive !== false,
    createdAt: toStringValue(item.createdAt),
    updatedAt: toStringValue(item.updatedAt),
  }
}

const normalizeChartEntry = (payload: unknown): ChartOfAccountsEntry => {
  const item = asObject<Record<string, any>>(payload)
  return {
    ...normalizeAccount(item),
    moneyIn: toNumber(item.moneyIn, 0),
    moneyOut: toNumber(item.moneyOut, 0),
    currentBalance: toNumber(item.currentBalance, 0),
  }
}

const normalizeLedger = (payload: unknown): FinancialAccountLedgerResponse => {
  const item = asObject<Record<string, any>>(payload)
  return {
    account: normalizeAccount(item.account),
    openingBalance: toNumber(item.openingBalance, 0),
    currentBalance: toNumber(item.currentBalance, 0),
    total: toNumber(item.total, 0),
    page: toNumber(item.page, 1),
    pageSize: toNumber(item.pageSize, 25),
    entries: asArray(item.entries).map((e: any) => ({
      date: toStringValue(e.date),
      source: e.source,
      reference: toStringValue(e.reference),
      moneyIn: toNumber(e.moneyIn, 0),
      moneyOut: toNumber(e.moneyOut, 0),
      runningBalance: toNumber(e.runningBalance, 0),
    })),
  }
}

interface FinancialAccountsState {
  accounts: FinancialAccount[]
  chartOfAccounts: ChartOfAccountsEntry[]
  isLoading: boolean
  error: string | null

  fetchAccounts: (activeOnly?: boolean) => Promise<void>
  fetchChartOfAccounts: () => Promise<void>
  getLedger: (accountId: string, page?: number, pageSize?: number) => Promise<FinancialAccountLedgerResponse>
  createAccount: (data: CreateFinancialAccountDTO) => Promise<FinancialAccount>
  updateAccount: (id: string, data: UpdateFinancialAccountDTO) => Promise<FinancialAccount>
  setOpeningBalance: (id: string, data: SetOpeningBalanceDTO) => Promise<FinancialAccount>
}

export const useFinancialAccountsStore = create<FinancialAccountsState>((set, get) => ({
  accounts: [],
  chartOfAccounts: [],
  isLoading: false,
  error: null,

  fetchAccounts: async (activeOnly = true) => {
    set({ isLoading: true, error: null })
    try {
      const query = activeOnly ? '?activeOnly=true' : ''
      const data = await api(`${API_ENDPOINTS.financialAccounts}${query}`)
      set({ accounts: asArray(data).map(normalizeAccount), isLoading: false, error: null })
    } catch (error: any) {
      set({ isLoading: false, error: error.message || 'Failed to fetch financial accounts' })
      throw error
    }
  },

  fetchChartOfAccounts: async () => {
    set({ isLoading: true, error: null })
    try {
      const data = await api(API_ENDPOINTS.chartOfAccounts)
      set({ chartOfAccounts: asArray(data).map(normalizeChartEntry), isLoading: false, error: null })
    } catch (error: any) {
      set({ isLoading: false, error: error.message || 'Failed to fetch chart of accounts' })
      throw error
    }
  },

  getLedger: async (accountId, page = 1, pageSize = 25) => {
    const data = await api(`${API_ENDPOINTS.financialAccounts}/${accountId}/ledger?page=${page}&pageSize=${pageSize}`)
    return normalizeLedger(data)
  },

  createAccount: async (data) => {
    const response = await api(API_ENDPOINTS.financialAccounts, { method: 'POST', body: JSON.stringify(data) })
    const account = normalizeAccount(response)
    set((state) => ({ accounts: [...state.accounts, account] }))
    return account
  },

  updateAccount: async (id, data) => {
    const response = await api(`${API_ENDPOINTS.financialAccounts}/${id}`, { method: 'PATCH', body: JSON.stringify(data) })
    const updated = normalizeAccount(response)
    set((state) => ({ accounts: state.accounts.map((a) => (a.id === id ? updated : a)) }))
    return updated
  },

  setOpeningBalance: async (id, data) => {
    const response = await api(`${API_ENDPOINTS.financialAccounts}/${id}/opening-balance`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
    const updated = normalizeAccount(response)
    set((state) => ({ accounts: state.accounts.map((a) => (a.id === id ? updated : a)) }))
    void get().fetchChartOfAccounts().catch(() => undefined)
    return updated
  },
}))
