import { create } from 'zustand'
import type { Invoice, InvoiceStatus, CreateInvoiceDTO, InvoiceLineItem, InvoiceKind } from '@/lib/types'
import { api, API_ENDPOINTS } from '@/lib/api'
import { asArray, asObject, toDateString, toLowerStatus, toNumber, toStringValue, uniqueStrings } from '@/lib/api-normalizers'
import { useAuthStore } from '@/lib/store/auth-store'
import { useSerialStore } from '@/lib/store/serial-store'

const normalizeSerials = (item: { serialNumber?: string; serialNumbers?: string[] }) => {
  const serials = Array.isArray(item.serialNumbers)
    ? item.serialNumbers
    : item.serialNumber
      ? [item.serialNumber]
      : []
  return uniqueStrings(serials)
}

interface InvoiceFilters {
  search?: string
  status?: InvoiceStatus
  startDate?: string
  endDate?: string
}

interface InvoiceState {
  invoices: Invoice[]
  currentInvoice: Invoice | null
  filters: InvoiceFilters
  isLoading: boolean
  error: string | null

  fetchInvoices: () => Promise<void>
  getInvoiceById: (id: string) => Invoice | undefined
  fetchInvoiceById: (id: string) => Promise<Invoice | undefined>
  setCurrentInvoice: (invoice: Invoice | null) => void
  createInvoice: (data: CreateInvoiceDTO, createdBy: string) => Promise<Invoice>
  updateInvoice: (id: string, data: CreateInvoiceDTO) => Promise<Invoice>
  updateInvoiceStatus: (id: string, status: InvoiceStatus) => Promise<Invoice>
  deleteInvoice: (id: string) => Promise<void>
  setFilters: (filters: InvoiceFilters) => void
  clearFilters: () => void
}

const normalizeInvoiceItem = (payload: unknown, fallback?: CreateInvoiceDTO['items'][number], index = 0): InvoiceLineItem => {
  const item = asObject<Record<string, any>>(payload)
  const source: Partial<CreateInvoiceDTO['items'][number]> = fallback ?? {}
  const quantity = toNumber(item.quantity ?? source.quantity, 0)
  const unitPrice = toNumber(item.unitPrice ?? source.unitPrice, 0)
  const taxRate = toNumber(item.taxRate ?? source.taxRate, 0)
  const discount = toNumber(item.discount ?? source.discount, 0)
  const serialNumbers = normalizeSerials({
    serialNumber: item.serialNumber ?? source.serialNumber,
    serialNumbers: item.serialNumbers ?? source.serialNumbers,
  })

  return {
    id: toStringValue(item.id, `item-${index}`),
    productId: toStringValue(item.productId ?? source.productId),
    productName: toStringValue(item.productName ?? source.productName),
    productSku: toStringValue(item.productSku ?? source.productSku),
    // null/undefined preserved as-is (not coerced to '') so the frontend
    // can tell "intentionally blank" apart from "never set" if that ever
    // matters — both currently render the same (nothing printed).
    productDescription: item.productDescription ?? source.productDescription ?? undefined,
    serialNumber: item.serialNumber ? String(item.serialNumber) : source.serialNumber ?? (serialNumbers.length === 1 ? serialNumbers[0] : undefined),
    serialNumbers,
    quantity,
    unitPrice,
    taxRate,
    discount,
    total: toNumber(item.total, quantity * unitPrice + (quantity * unitPrice * taxRate) / 100 - (quantity * unitPrice * discount) / 100),
  }
}

const normalizeInvoice = (payload: unknown, fallbackItems?: CreateInvoiceDTO['items']): Invoice => {
  const item = asObject<Record<string, any>>(payload)
  const itemsPayload = asArray(item.items)
  const items = (itemsPayload.length ? itemsPayload : fallbackItems ?? []).map((line, index) =>
    normalizeInvoiceItem(line, fallbackItems?.[index], index)
  )
  const subtotal = toNumber(item.subtotal, items.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0))
  const taxAmount = toNumber(item.taxAmount, items.reduce((sum, line) => sum + (line.quantity * line.unitPrice * line.taxRate) / 100, 0))
  const discountAmount = toNumber(item.discountAmount, items.reduce((sum, line) => sum + (line.quantity * line.unitPrice * line.discount) / 100, 0))
  const shippingCost = toNumber(item.shippingCost, 0)

  return {
    id: toStringValue(item.id ?? item._id),
    invoiceNumber: toStringValue(item.invoiceNumber ?? item.id),
    customerId: toStringValue(item.customerId),
    customerName: toStringValue(item.customerName ?? item.customer?.name),
    customerEmail: toStringValue(item.customerEmail ?? item.customer?.email),
    customerPhone: toStringValue(item.customerPhone ?? item.customer?.phone),
    invoiceType: toLowerStatus<InvoiceKind>(item.invoiceType, 'product'),
    items,
    subtotal,
    taxAmount,
    discountAmount,
    shippingCost,
    total: toNumber(item.total, subtotal + taxAmount - discountAmount + shippingCost),
    status: toLowerStatus<InvoiceStatus>(item.status, 'pending'),
    paymentMethod: toLowerStatus(item.paymentMethod, 'cash'),
    bankAccount: item.bankAccount ? String(item.bankAccount) : null,
    financialAccountId: item.financialAccountId ? String(item.financialAccountId) : null,
    template: toStringValue(item.template, ''),
    // null (not '') distinguishes "no saved copy — fall back to template
    // default" (legacy invoices) from "an empty T&C was intentionally saved".
    termsAndConditions: item.termsAndConditions === null || item.termsAndConditions === undefined
      ? null
      : String(item.termsAndConditions),
    notes: item.notes ? String(item.notes) : undefined,
    poNumber: item.poNumber === null || item.poNumber === undefined ? null : String(item.poNumber),
    dueDate: toDateString(item.dueDate),
    paidAt: item.paidAt ? toDateString(item.paidAt) : undefined,
    createdAt: toDateString(item.invoiceDate ?? item.createdAt),
    createdBy: toStringValue(item.createdBy),
  }
}

const toBackendInvoicePayload = (data: CreateInvoiceDTO, createdBy?: string) => ({
  customerId: data.customerId || undefined,
  customerName: data.customerName || undefined,
  customerPhone: data.customerPhone,
  invoiceType: data.invoiceType ? data.invoiceType.toUpperCase() : undefined,
  status: data.status ? data.status.toUpperCase() : undefined,
  items: data.items.map(item => ({
    productId: item.productId || undefined,
    productName: item.productName,
    productSku: item.productSku,
    productDescription: item.productDescription,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    taxRate: item.taxRate,
    discount: item.discount,
    serialNumber: item.serialNumber,
    serialNumbers: item.serialNumbers,
  })),
  paymentMethod: data.paymentMethod,
  bankAccount: data.bankAccount || undefined,
  financialAccountId: data.financialAccountId || undefined,
  template: data.template,
  termsAndConditions: data.termsAndConditions,
  invoiceDate: data.invoiceDate,
  dueDate: data.dueDate,
  notes: data.notes,
  poNumber: data.poNumber,
  createdBy,
})

export const useInvoiceStore = create<InvoiceState>((set, get) => ({
  invoices: [],
  currentInvoice: null,
  filters: {},
  isLoading: false,
  error: null,

  fetchInvoices: async () => {
    set({ isLoading: true, error: null })
    try {
      const data = await api(API_ENDPOINTS.invoices)
      set({ invoices: asArray(data).map(item => normalizeInvoice(item)), isLoading: false, error: null })
    } catch (error: any) {
      set({ isLoading: false, error: error.message || 'Failed to fetch invoices' })
      throw error
    }
  },

  getInvoiceById: (id: string) => get().invoices.find(invoice => invoice.id === id),

  // Always fetches the authoritative record from the server — never
  // short-circuits from the in-memory `invoices` array. That array can be
  // stale (e.g. populated once from the list endpoint, then never
  // refreshed for the lifetime of this browser tab/session), and silently
  // returning it here was the root cause of edited Terms & Conditions (and
  // any other field) appearing correct on the device that made the edit
  // but missing everywhere else: any other open session already holding a
  // cached copy of this invoice would get that stale copy back instead of
  // ever asking the server for the current one.
  fetchInvoiceById: async (id: string) => {
    set({ isLoading: true, error: null })
    try {
      const response = await api(`${API_ENDPOINTS.invoices}/${id}`)
      const invoice = normalizeInvoice(response)
      set(state => ({
        invoices: state.invoices.some(item => item.id === invoice.id)
          ? state.invoices.map(item => item.id === invoice.id ? invoice : item)
          : [invoice, ...state.invoices],
        currentInvoice: invoice,
        isLoading: false,
        error: null,
      }))
      return invoice
    } catch (error: any) {
      set({ isLoading: false, error: error.message || 'Failed to fetch invoice' })
      return undefined
    }
  },

  setCurrentInvoice: (invoice: Invoice | null) => set({ currentInvoice: invoice }),

  createInvoice: async (data: CreateInvoiceDTO, createdBy: string) => {
    set({ isLoading: true, error: null })
    try {
      if (!data.customerId && !data.customerName?.trim()) throw new Error('Customer is required')
      const response = await api(API_ENDPOINTS.invoices, {
        method: 'POST',
        body: JSON.stringify(toBackendInvoicePayload(data, createdBy)),
      })
      const invoice = normalizeInvoice(response, data.items)
      const finalInvoice = data.status ? { ...invoice, status: data.status } : invoice
      set(state => ({ invoices: [finalInvoice, ...state.invoices], isLoading: false, error: null }))
      return finalInvoice
    } catch (error: any) {
      set({ isLoading: false, error: error.message || 'Failed to create invoice' })
      throw error
    }
  },

  updateInvoice: async (id: string, data: CreateInvoiceDTO) => {
    set({ isLoading: true, error: null })
    try {
      const response = await api(`${API_ENDPOINTS.invoices}/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(toBackendInvoicePayload(data)),
      })
      const invoice = normalizeInvoice(response, data.items)
      set(state => ({
        invoices: state.invoices.map(inv => inv.id === id ? invoice : inv),
        currentInvoice: state.currentInvoice?.id === id ? invoice : state.currentInvoice,
        isLoading: false,
        error: null,
      }))
      return invoice
    } catch (error: any) {
      set({ isLoading: false, error: error.message || 'Failed to update invoice' })
      throw error
    }
  },

  updateInvoiceStatus: async (id: string, status: InvoiceStatus) => {
    set({ isLoading: true, error: null })
    try {
      const response = await api(`${API_ENDPOINTS.invoices}/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: status.toUpperCase() }),
      })
      const existing = get().invoices.find(inv => inv.id === id)
      const invoice = normalizeInvoice({ ...existing, ...(response ?? {}), status })
      set(state => ({
        invoices: state.invoices.map(inv => inv.id === id ? invoice : inv),
        currentInvoice: state.currentInvoice?.id === id ? invoice : state.currentInvoice,
        isLoading: false,
        error: null,
      }))
      return invoice
    } catch (error: any) {
      set({ isLoading: false, error: error.message || 'Failed to update invoice status' })
      throw error
    }
  },

  deleteInvoice: async (id: string) => {
    const user = useAuthStore.getState().user

    if (user?.role !== 'admin') {
      const message = 'Only admin users can delete invoices'
      set({ error: message })
      throw new Error(message)
    }

    const invoiceToDelete =
      get().invoices.find(inv => inv.id === id) ??
      (get().currentInvoice?.id === id ? get().currentInvoice : null)

    set({ isLoading: true, error: null })
    try {
      await api(`${API_ENDPOINTS.invoices}/${id}`, { method: 'DELETE' })

      const serialNumbers = uniqueStrings(
        (invoiceToDelete?.items ?? []).flatMap(item =>
          item.serialNumbers && item.serialNumbers.length > 0
            ? item.serialNumbers
            : item.serialNumber
              ? [item.serialNumber]
              : []
        )
      )

      for (const serialNumber of serialNumbers) {
        await useSerialStore.getState().markInStock(serialNumber, {
          saleInvoiceId: undefined,
          saleInvoiceNumber: undefined,
          soldAt: undefined,
          customerId: undefined,
          customerName: undefined,
          saleUnitPrice: undefined,
        })
      }

      set(state => ({
        invoices: state.invoices.filter(inv => inv.id !== id),
        currentInvoice: state.currentInvoice?.id === id ? null : state.currentInvoice,
        isLoading: false,
        error: null,
      }))
    } catch (error: any) {
      set({ isLoading: false, error: error.message || 'Failed to delete invoice' })
      throw error
    }
  },

  setFilters: (filters: InvoiceFilters) => set({ filters }),
  clearFilters: () => set({ filters: {} }),
}))

export const getFilteredInvoices = (state: InvoiceState): Invoice[] => {
  const invoices = Array.isArray(state.invoices) ? state.invoices : []
  const filters = state.filters ?? {}

  return invoices.filter((invoice) => {
    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      const matchesSearch =
        invoice.invoiceNumber.toLowerCase().includes(searchLower) ||
        invoice.customerName.toLowerCase().includes(searchLower)
      if (!matchesSearch) return false
    }

    if (filters.status && invoice.status !== filters.status) return false

    if (filters.startDate && new Date(invoice.createdAt) < new Date(filters.startDate)) return false
    if (filters.endDate) {
      const endDate = new Date(filters.endDate)
      endDate.setHours(23, 59, 59, 999)
      if (new Date(invoice.createdAt) > endDate) return false
    }

    return true
  }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}
