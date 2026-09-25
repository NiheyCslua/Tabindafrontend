import { create } from 'zustand'
import type { Vendor, CreateVendorDTO, UpdateVendorDTO } from '@/lib/types'
import { api, API_ENDPOINTS } from '@/lib/api'
import { asArray, asObject, toDateString, toLowerStatus, toNumber, toStringValue } from '@/lib/api-normalizers'

interface VendorState {
  vendors: Vendor[]
  isLoading: boolean
  error: string | null
  fetchVendors: () => Promise<void>
  getVendorById: (id: string) => Vendor | undefined
  createVendor: (data: CreateVendorDTO) => Promise<Vendor>
  updateVendor: (id: string, updates: UpdateVendorDTO) => Promise<Vendor>
  deleteVendor: (id: string) => Promise<void>
}

const normalizeVendor = (payload: unknown): Vendor => {
  const item = asObject<Record<string, any>>(payload)
  return {
    id: toStringValue(item.id ?? item._id),
    name: toStringValue(item.name),
    company: toStringValue(item.company ?? item.name),
    email: toStringValue(item.email),
    phone: toStringValue(item.phone),
    address: toStringValue(item.address),
    city: toStringValue(item.city),
    state: toStringValue(item.state),
    country: toStringValue(item.country),
    totalPurchases: toNumber(item.totalPurchases, 0),
    status: toLowerStatus(item.status, 'active'),
    notes: item.notes ? String(item.notes) : undefined,
    createdAt: toDateString(item.createdAt),
    updatedAt: toDateString(item.updatedAt),
  }
}

export const useVendorStore = create<VendorState>((set, get) => ({
  vendors: [],
  isLoading: false,
  error: null,

  fetchVendors: async () => {
    set({ isLoading: true, error: null })
    try {
      const data = await api(API_ENDPOINTS.vendors)
      set({ vendors: asArray(data).map(normalizeVendor), isLoading: false, error: null })
    } catch (error: any) {
      set({ isLoading: false, error: error.message || 'Failed to fetch vendors' })
      throw error
    }
  },

  getVendorById: (id) => get().vendors.find(v => v.id === id),

  createVendor: async (data) => {
    set({ isLoading: true, error: null })
    try {
      const response = await api(API_ENDPOINTS.vendors, { method: 'POST', body: JSON.stringify(data) })
      const vendor = normalizeVendor(response)
      set(state => ({ vendors: [vendor, ...state.vendors], isLoading: false, error: null }))
      return vendor
    } catch (error: any) {
      set({ isLoading: false, error: error.message || 'Failed to create vendor' })
      throw error
    }
  },

  updateVendor: async (id, updates) => {
    set({ isLoading: true, error: null })
    try {
      const response = await api(`${API_ENDPOINTS.vendors}/${id}`, { method: 'PATCH', body: JSON.stringify(updates) })
      const vendor = normalizeVendor(response)
      set(state => ({ vendors: state.vendors.map(v => v.id === id ? vendor : v), isLoading: false, error: null }))
      return vendor
    } catch (error: any) {
      set({ isLoading: false, error: error.message || 'Failed to update vendor' })
      throw error
    }
  },

  deleteVendor: async (id) => {
    set({ isLoading: true, error: null })
    try {
      await api(`${API_ENDPOINTS.vendors}/${id}`, { method: 'DELETE' })
      set(state => ({ vendors: state.vendors.filter(v => v.id !== id), isLoading: false, error: null }))
    } catch (error: any) {
      set({ isLoading: false, error: error.message || 'Failed to delete vendor' })
      throw error
    }
  },
}))
