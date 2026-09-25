import { create } from 'zustand'
import type { Customer, CreateCustomerDTO, UpdateCustomerDTO } from '@/lib/types'
import { api, API_ENDPOINTS } from '@/lib/api'
import { asArray, asObject, toDateString, toLowerStatus, toNumber, toStringValue } from '@/lib/api-normalizers'

interface CustomerFilters {
  search?: string
  status?: 'active' | 'inactive'
}

interface CustomerState {
  customers: Customer[]
  selectedCustomer: Customer | null
  filters: CustomerFilters
  isLoading: boolean
  error: string | null

  fetchCustomers: () => Promise<void>
  getCustomerById: (id: string) => Customer | undefined
  setSelectedCustomer: (customer: Customer | null) => void
  addCustomer: (customer: CreateCustomerDTO) => Promise<Customer>
  createCustomer: (customer: CreateCustomerDTO) => Promise<Customer>
  updateCustomer: (id: string, updates: UpdateCustomerDTO) => Promise<Customer>
  deleteCustomer: (id: string) => Promise<void>
  setFilters: (filters: CustomerFilters) => void
  clearFilters: () => void
}

const normalizeCustomer = (payload: unknown): Customer => {
  const item = asObject<Record<string, any>>(payload)
  return {
    id: toStringValue(item.id ?? item._id),
    name: toStringValue(item.name),
    email: toStringValue(item.email),
    phone: toStringValue(item.phone),
    company: item.company ? String(item.company) : undefined,
    address: toStringValue(item.address),
    city: toStringValue(item.city),
    state: toStringValue(item.state),
    zipCode: toStringValue(item.zipCode),
    country: toStringValue(item.country),
    creditLimit: toNumber(item.creditLimit, 0),
    totalPurchases: toNumber(item.totalPurchases, 0),
    status: toLowerStatus(item.status, 'active'),
    notes: item.notes ? String(item.notes) : undefined,
    createdAt: toDateString(item.createdAt),
  }
}

export const useCustomerStore = create<CustomerState>((set, get) => ({
  customers: [],
  selectedCustomer: null,
  filters: {},
  isLoading: false,
  error: null,

  fetchCustomers: async () => {
    set({ isLoading: true, error: null })
    try {
      const data = await api(API_ENDPOINTS.customers)
      set({ customers: asArray(data).map(normalizeCustomer), isLoading: false, error: null })
    } catch (error: any) {
      set({ isLoading: false, error: error.message || 'Failed to fetch customers' })
      throw error
    }
  },

  getCustomerById: (id: string) => get().customers.find(c => c.id === id),
  setSelectedCustomer: (customer: Customer | null) => set({ selectedCustomer: customer }),

  addCustomer: async (customerData: CreateCustomerDTO) => {
    set({ isLoading: true, error: null })
    try {
      const response = await api(API_ENDPOINTS.customers, {
        method: 'POST',
        body: JSON.stringify(customerData),
      })
      const newCustomer = normalizeCustomer(response)
      set(state => ({ customers: [newCustomer, ...state.customers], isLoading: false, error: null }))
      return newCustomer
    } catch (error: any) {
      set({ isLoading: false, error: error.message || 'Failed to create customer' })
      throw error
    }
  },

  createCustomer: async (customerData: CreateCustomerDTO) => get().addCustomer(customerData),

  updateCustomer: async (id: string, updates: UpdateCustomerDTO) => {
    set({ isLoading: true, error: null })
    try {
      const response = await api(`${API_ENDPOINTS.customers}/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
      })
      const updatedCustomer = normalizeCustomer(response)
      set(state => ({
        customers: state.customers.map(c => c.id === id ? updatedCustomer : c),
        selectedCustomer: state.selectedCustomer?.id === id ? updatedCustomer : state.selectedCustomer,
        isLoading: false,
        error: null,
      }))
      return updatedCustomer
    } catch (error: any) {
      set({ isLoading: false, error: error.message || 'Failed to update customer' })
      throw error
    }
  },

  deleteCustomer: async (id: string) => {
    set({ isLoading: true, error: null })
    try {
      await api(`${API_ENDPOINTS.customers}/${id}`, { method: 'DELETE' })
      set(state => ({ customers: state.customers.filter(c => c.id !== id), isLoading: false, error: null }))
    } catch (error: any) {
      set({ isLoading: false, error: error.message || 'Failed to delete customer' })
      throw error
    }
  },

  setFilters: (filters: CustomerFilters) => set({ filters }),
  clearFilters: () => set({ filters: {} }),
}))

export const getFilteredCustomers = (state: CustomerState): Customer[] => {
  const { customers, filters } = state

  return customers.filter(customer => {
    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      const matchesSearch =
        customer.name.toLowerCase().includes(searchLower) ||
        customer.email.toLowerCase().includes(searchLower) ||
        customer.company?.toLowerCase().includes(searchLower)
      if (!matchesSearch) return false
    }

    if (filters.status && customer.status !== filters.status) return false

    return true
  })
}
