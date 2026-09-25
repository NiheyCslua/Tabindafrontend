import { create } from 'zustand'
import type { Bill, BillLineItem, CreateBillDTO, UpdateBillDTO, BillStatus } from '@/lib/types'
import { api, API_ENDPOINTS } from '@/lib/api'
import { asArray, asObject, toDateString, toLowerStatus, toNumber, toStringValue, uniqueStrings } from '@/lib/api-normalizers'
import { useSerialStore } from '@/lib/store/serial-store'

interface BillState {
  bills: Bill[]
  isLoading: boolean
  error: string | null
  fetchBills: () => Promise<void>
  getBillById: (id: string) => Bill | undefined
  createBill: (data: CreateBillDTO, createdBy: string) => Promise<Bill & { duplicateWarning?: string }>
  updateBill: (id: string, updates: UpdateBillDTO) => Promise<Bill & { duplicateWarning?: string }>
  updateBillStatus: (id: string, status: BillStatus) => Promise<Bill>
  deleteBill: (id: string) => Promise<void>
}

const normalizeSerials = (item: { serialNumber?: string; serialNumbers?: string[] }) => {
  const serials = Array.isArray(item.serialNumbers)
    ? item.serialNumbers
    : item.serialNumber
      ? [item.serialNumber]
      : []
  return uniqueStrings(serials)
}

const normalizeBillItem = (payload: unknown, fallback?: CreateBillDTO['items'][number], index = 0): BillLineItem => {
  const item = asObject<Record<string, any>>(payload)
  const source = fallback ?? {}
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
    serialNumber: item.serialNumber ? String(item.serialNumber) : source.serialNumber ?? (serialNumbers.length === 1 ? serialNumbers[0] : undefined),
    serialNumbers,
    quantity,
    unitPrice,
    taxRate,
    discount,
    total: toNumber(item.total, quantity * unitPrice + (quantity * unitPrice * taxRate) / 100 - (quantity * unitPrice * discount) / 100),
  }
}

const normalizeBill = (payload: unknown, fallbackItems?: CreateBillDTO['items']): Bill => {
  const item = asObject<Record<string, any>>(payload)
  const itemsPayload = asArray(item.items)
  const items = (itemsPayload.length ? itemsPayload : fallbackItems ?? []).map((line, index) =>
    normalizeBillItem(line, fallbackItems?.[index], index)
  )
  const subtotal = toNumber(item.subtotal, items.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0))
  const taxAmount = toNumber(item.taxAmount, items.reduce((sum, line) => sum + (line.quantity * line.unitPrice * line.taxRate) / 100, 0))
  const discountAmount = toNumber(item.discountAmount, items.reduce((sum, line) => sum + (line.quantity * line.unitPrice * line.discount) / 100, 0))

  return {
    id: toStringValue(item.id ?? item._id),
    billNumber: toStringValue(item.billNumber ?? item.id),
    billType: (item.billType === 'DEBIT' ? 'DEBIT' : 'CREDIT') as import('@/lib/types').BillType,
    vendorId: toStringValue(item.vendorId),
    vendorName: toStringValue(item.vendorName ?? item.vendor?.company ?? item.vendor?.name),
    vendorEmail: toStringValue(item.vendorEmail ?? item.vendor?.email),
    items,
    subtotal,
    taxAmount,
    discountAmount,
    amount: toNumber(item.amount, subtotal + taxAmount - discountAmount),
    paidAmount: toNumber(item.paidAmount, 0),
    balanceAmount: toNumber(item.balanceAmount, toNumber(item.amount, subtotal + taxAmount - discountAmount)),
    status: toLowerStatus<BillStatus>(item.status, 'unpaid'),
    date: toDateString(item.date),
    dueDate: toDateString(item.dueDate),
    paidAt: item.paidAt ? toDateString(item.paidAt) : undefined,
    notes: item.notes ? String(item.notes) : undefined,
    createdAt: toDateString(item.createdAt),
    createdBy: toStringValue(item.createdBy),
  }
}

const toBackendBillPayload = (data: CreateBillDTO | UpdateBillDTO, createdBy?: string) => ({
  billNumber: (data as CreateBillDTO).billNumber,
  billType: (data as CreateBillDTO).billType || 'CREDIT',
  vendorId: data.vendorId,
  vendorName: data.vendorName,
  items: data.items?.map(item => ({
    productId: item.productId || undefined,
    productName: item.productName,
    productSku: item.productSku,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    taxRate: item.taxRate,
    discount: item.discount,
    serialNumber: item.serialNumber,
    serialNumbers: item.serialNumbers,
  })),
  status: data.status,
  date: data.date,
  dueDate: data.dueDate,
  notes: data.notes,
  createdBy,
})

async function registerPurchasedSerials(bill: Bill) {
  const serialStore = useSerialStore.getState()
  const units = bill.items.flatMap(item =>
    (item.serialNumbers ?? []).map(serialNumber => ({
      serialNumber,
      productId: item.productId,
      productName: item.productName,
      productSku: item.productSku,
      sku: item.productSku,
      barcode: '',
      vendorId: bill.vendorId,
      vendorName: bill.vendorName,
      purchaseDate: bill.date || bill.createdAt,
      costPrice: item.unitPrice,
      purchaseBillId: bill.id,
      purchaseBillNumber: bill.billNumber,
      purchaseUnitPrice: item.unitPrice,
      status: 'in_stock' as const,
    }))
  )
  await serialStore.addUnits(units)
}

export const useBillStore = create<BillState>((set, get) => ({
  bills: [],
  isLoading: false,
  error: null,

  fetchBills: async () => {
    set({ isLoading: true, error: null })
    try {
      const data = await api(API_ENDPOINTS.bills)
      set({ bills: asArray(data).map(item => normalizeBill(item)), isLoading: false, error: null })
    } catch (error: any) {
      set({ isLoading: false, error: error.message || 'Failed to fetch bills' })
      throw error
    }
  },

  getBillById: (id) => get().bills.find(b => b.id === id),

  createBill: async (data, createdBy) => {
    set({ isLoading: true, error: null })
    try {
      const response = await api(API_ENDPOINTS.bills, {
        method: 'POST',
        body: JSON.stringify(toBackendBillPayload(data, createdBy)),
      })
      const bill = normalizeBill(response, data.items)
      await registerPurchasedSerials(bill)
      set(state => ({ bills: [bill, ...state.bills], isLoading: false, error: null }))
      const duplicateWarning = (response as any)?.duplicateWarning
      return duplicateWarning ? { ...bill, duplicateWarning } : bill
    } catch (error: any) {
      set({ isLoading: false, error: error.message || 'Failed to create bill' })
      throw error
    }
  },

  updateBill: async (id, updates) => {
    set({ isLoading: true, error: null })
    try {
      const response = await api(`${API_ENDPOINTS.bills}/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(toBackendBillPayload(updates)),
      })
      const bill = normalizeBill(response, updates.items)
      await registerPurchasedSerials(bill)
      set(state => ({ bills: state.bills.map(b => b.id === id ? bill : b), isLoading: false, error: null }))
      const duplicateWarning = (response as any)?.duplicateWarning
      return duplicateWarning ? { ...bill, duplicateWarning } : bill
    } catch (error: any) {
      set({ isLoading: false, error: error.message || 'Failed to update bill' })
      throw error
    }
  },

  updateBillStatus: async (id, status) => {
    set({ isLoading: true, error: null })
    try {
      const response = await api(`${API_ENDPOINTS.bills}/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      })
      const existing = get().bills.find(b => b.id === id)
      const bill = normalizeBill({ ...existing, ...(response ?? {}), status })
      set(state => ({ bills: state.bills.map(b => b.id === id ? bill : b), isLoading: false, error: null }))
      return bill
    } catch (error: any) {
      set({ isLoading: false, error: error.message || 'Failed to update bill status' })
      throw error
    }
  },

  deleteBill: async (id) => {
    set({ isLoading: true, error: null })
    try {
      await api(`${API_ENDPOINTS.bills}/${id}`, { method: 'DELETE' })
      set(state => ({ bills: state.bills.filter(b => b.id !== id), isLoading: false, error: null }))
    } catch (error: any) {
      set({ isLoading: false, error: error.message || 'Failed to delete bill' })
      throw error
    }
  },
}))
