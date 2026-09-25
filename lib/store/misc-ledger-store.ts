import { create } from 'zustand'
import { api, API_ENDPOINTS } from '@/lib/api'
import { asArray, asObject, toDateOnly, toDateString, toNumber, toStringValue } from '@/lib/api-normalizers'
import type { CreateMiscLedgerEntryDTO, MiscLedgerEntry, UpdateMiscLedgerEntryDTO } from '@/lib/types'

interface MiscLedgerFilters {
  label?: string
  from?: string
  to?: string
  search?: string
}

interface MiscLedgerState {
  entries: MiscLedgerEntry[]
  isLoading: boolean
  error: string | null

  fetchEntries: (filters?: MiscLedgerFilters) => Promise<void>
  addEntry: (data: CreateMiscLedgerEntryDTO) => Promise<MiscLedgerEntry>
  updateEntry: (id: string, data: UpdateMiscLedgerEntryDTO) => Promise<MiscLedgerEntry>
  deleteEntry: (id: string) => Promise<void>
}

const normalizeMiscLedgerEntry = (payload: unknown): MiscLedgerEntry => {
  const item = asObject<Record<string, any>>(payload)

  return {
    id: toStringValue(item.id),
    label: toStringValue(item.label),
    description: item.description ? String(item.description) : undefined,
    amount: toNumber(item.amount, 0),
    date: toDateOnly(item.date),
    // Standard financial metadata
    paymentMethod: item.paymentMethod ? String(item.paymentMethod) : 'cash',
    financialAccountId: item.financialAccountId ? String(item.financialAccountId) : undefined,
    referenceNumber: item.referenceNumber ? String(item.referenceNumber) : item.reference ? String(item.reference) : undefined,
    paymentDate: item.paymentDate ? toDateOnly(item.paymentDate) : undefined,
    // Legacy fields
    reference: item.reference ? String(item.reference) : undefined,
    notes: item.notes ? String(item.notes) : undefined,
    createdById: item.createdById ? String(item.createdById) : undefined,
    createdByName: item.createdByName ? String(item.createdByName) : undefined,
    createdAt: toDateString(item.createdAt),
    updatedAt: item.updatedAt ? toDateString(item.updatedAt) : undefined,
  }
}

const buildQuery = (filters?: MiscLedgerFilters) => {
  if (!filters) return ''
  const params = new URLSearchParams()
  if (filters.label) params.set('label', filters.label)
  if (filters.from) params.set('from', filters.from)
  if (filters.to) params.set('to', filters.to)
  if (filters.search) params.set('search', filters.search)
  const query = params.toString()
  return query ? `?${query}` : ''
}

export const useMiscLedgerStore = create<MiscLedgerState>((set, get) => ({
  entries: [],
  isLoading: false,
  error: null,

  fetchEntries: async (filters) => {
    set({ isLoading: true, error: null })
    try {
      const data = await api(`${API_ENDPOINTS.miscLedger}${buildQuery(filters)}`)
      set({ entries: asArray(data).map(normalizeMiscLedgerEntry), isLoading: false, error: null })
    } catch (error: any) {
      set({ isLoading: false, error: error.message || 'Failed to fetch miscellaneous ledger entries' })
      throw error
    }
  },

  addEntry: async (data) => {
    set({ isLoading: true, error: null })
    try {
      const response = await api(API_ENDPOINTS.miscLedger, {
        method: 'POST',
        body: JSON.stringify(data),
      })
      const entry = normalizeMiscLedgerEntry(response)
      set((state) => ({ entries: [entry, ...state.entries], isLoading: false, error: null }))
      return entry
    } catch (error: any) {
      set({ isLoading: false, error: error.message || 'Failed to add miscellaneous ledger entry' })
      throw error
    }
  },

  updateEntry: async (id, data) => {
    set({ isLoading: true, error: null })
    try {
      const response = await api(`${API_ENDPOINTS.miscLedger}/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      })
      const updated = normalizeMiscLedgerEntry(response)
      set((state) => ({
        entries: state.entries.map((entry) => entry.id === id ? updated : entry),
        isLoading: false,
        error: null,
      }))
      return updated
    } catch (error: any) {
      set({ isLoading: false, error: error.message || 'Failed to update miscellaneous ledger entry' })
      throw error
    }
  },

  deleteEntry: async (id) => {
    set({ isLoading: true, error: null })
    try {
      await api(`${API_ENDPOINTS.miscLedger}/${id}`, { method: 'DELETE' })
      set((state) => ({
        entries: state.entries.filter((entry) => entry.id !== id),
        isLoading: false,
        error: null,
      }))
    } catch (error: any) {
      set({ isLoading: false, error: error.message || 'Failed to delete miscellaneous ledger entry' })
      throw error
    }
  },
}))
