import { create } from 'zustand'
import { api, API_ENDPOINTS } from '@/lib/api'
import type {
  VendorPayment, VendorReceipt, CreateVendorPaymentDTO, CreateVendorReceiptDTO,
  UnpaidBill, VendorSummary, VendorLedger, BillStatus,
} from '@/lib/types'

interface VendorPaymentState {
  payments: VendorPayment[]
  receipts: VendorReceipt[]
  unpaidBills: UnpaidBill[]
  unpaidDebitBills: UnpaidBill[]
  vendorSummaries: VendorSummary[]
  vendorLedger: VendorLedger | null
  isLoading: boolean
  error: string | null

  fetchPayments: () => Promise<void>
  fetchReceipts: () => Promise<void>
  fetchUnpaidBills: () => Promise<void>
  fetchUnpaidDebitBills: () => Promise<void>
  fetchVendorSummaries: () => Promise<void>
  fetchVendorLedger: (vendorId: string) => Promise<void>
  fetchPaymentsByBill: (billId: string) => Promise<VendorPayment[]>
  fetchReceiptsByBill: (billId: string) => Promise<VendorReceipt[]>
  createPayment: (data: CreateVendorPaymentDTO) => Promise<VendorPayment>
  createReceipt: (data: CreateVendorReceiptDTO) => Promise<VendorReceipt>
}

const normalizePayment = (p: any): VendorPayment => ({
  id: String(p.id || ''),
  paymentNumber: String(p.paymentNumber || ''),
  vendorId: String(p.vendorId || ''),
  vendorName: String(p.vendorName || ''),
  vendorBillId: String(p.vendorBillId || ''),
  billNumber: String(p.billNumber || ''),
  billAmount: Number(p.billAmount || 0),
  amount: Number(p.amount || 0),
  paymentMethod: p.paymentMethod || 'cash',
  bankAccount: p.bankAccount || null,
  financialAccountId: p.financialAccountId || null,
  referenceNumber: p.referenceNumber || null,
  paymentDate: String(p.paymentDate || ''),
  balanceAfterPayment: Number(p.balanceAfterPayment ?? 0),
  notes: p.notes || null,
  createdBy: String(p.createdBy || ''),
  createdAt: String(p.createdAt || ''),
  updatedAt: String(p.updatedAt || ''),
})

const normalizeReceipt = (r: any): VendorReceipt => ({
  id: String(r.id || ''),
  receiptNumber: String(r.receiptNumber || ''),
  vendorId: String(r.vendorId || ''),
  vendorName: String(r.vendorName || ''),
  vendorBillId: String(r.vendorBillId || ''),
  billNumber: String(r.billNumber || ''),
  billAmount: Number(r.billAmount || 0),
  amount: Number(r.amount || 0),
  paymentMethod: r.paymentMethod || 'cash',
  bankAccount: r.bankAccount || null,
  financialAccountId: r.financialAccountId || null,
  referenceNumber: r.referenceNumber || null,
  paymentDate: String(r.paymentDate || ''),
  balanceAfterPayment: Number(r.balanceAfterPayment ?? 0),
  notes: r.notes || null,
  createdBy: String(r.createdBy || ''),
  createdAt: String(r.createdAt || ''),
  updatedAt: String(r.updatedAt || ''),
})

const normalizeUnpaidBill = (b: any): UnpaidBill => ({
  id: String(b.id || ''),
  billNumber: String(b.billNumber || ''),
  billType: b.billType === 'DEBIT' ? 'DEBIT' : 'CREDIT',
  vendorId: String(b.vendorId || ''),
  vendorName: String(b.vendorName || ''),
  amount: Number(b.amount || 0),
  paidAmount: Number(b.paidAmount || 0),
  balanceAmount: Number(b.balanceAmount ?? b.amount ?? 0),
  date: String(b.date || ''),
  dueDate: b.dueDate ? String(b.dueDate) : undefined,
  status: b.status || 'unpaid',
  payments: Array.isArray(b.payments) ? b.payments.map(normalizePayment) : [],
})

const optimisticBillUpdate = (bills: UnpaidBill[], billId: string, amount: number): UnpaidBill[] =>
  bills
    .map(b => {
      if (b.id !== billId) return b
      const newPaidAmount = b.paidAmount + amount
      const newBalance    = Math.max(0, b.amount - newPaidAmount)
      const newStatus: BillStatus = newBalance <= 0.01 ? 'paid' : 'partially_paid'
      return { ...b, paidAmount: newPaidAmount, balanceAmount: newBalance, status: newStatus }
    })
    .filter(b => b.status !== 'paid')

export const useVendorPaymentStore = create<VendorPaymentState>((set) => ({
  payments: [],
  receipts: [],
  unpaidBills: [],
  unpaidDebitBills: [],
  vendorSummaries: [],
  vendorLedger: null,
  isLoading: false,
  error: null,

  fetchPayments: async () => {
    set({ isLoading: true, error: null })
    try {
      const data = await api(API_ENDPOINTS.vendorPayments)
      set({ payments: (Array.isArray(data) ? data : []).map(normalizePayment), isLoading: false })
    } catch (e: any) { set({ isLoading: false, error: e.message }) }
  },

  fetchReceipts: async () => {
    set({ isLoading: true, error: null })
    try {
      const data = await api(API_ENDPOINTS.vendorReceipts)
      set({ receipts: (Array.isArray(data) ? data : []).map(normalizeReceipt), isLoading: false })
    } catch (e: any) { set({ isLoading: false, error: e.message }) }
  },

  fetchUnpaidBills: async () => {
    set({ isLoading: true, error: null })
    try {
      const data = await api(API_ENDPOINTS.vendorPaymentsUnpaid)
      set({ unpaidBills: (Array.isArray(data) ? data : []).map(normalizeUnpaidBill), isLoading: false })
    } catch (e: any) { set({ isLoading: false, error: e.message }) }
  },

  fetchUnpaidDebitBills: async () => {
    set({ isLoading: true, error: null })
    try {
      const data = await api(API_ENDPOINTS.vendorReceiptsUnpaid)
      set({ unpaidDebitBills: (Array.isArray(data) ? data : []).map(normalizeUnpaidBill), isLoading: false })
    } catch (e: any) { set({ isLoading: false, error: e.message }) }
  },

  fetchVendorSummaries: async () => {
    set({ isLoading: true, error: null })
    try {
      const data = await api(API_ENDPOINTS.vendorSummaries)
      set({ vendorSummaries: Array.isArray(data) ? data : [], isLoading: false })
    } catch (e: any) { set({ isLoading: false, error: e.message }) }
  },

  fetchVendorLedger: async (vendorId) => {
    set({ isLoading: true, error: null })
    try {
      const data = await api(`${API_ENDPOINTS.vendorPayments}/vendor/${vendorId}/ledger`)
      set({ vendorLedger: data, isLoading: false })
    } catch (e: any) { set({ isLoading: false, error: e.message }) }
  },

  fetchPaymentsByBill: async (billId) => {
    const data = await api(`${API_ENDPOINTS.vendorPayments}/bill/${billId}`)
    return (Array.isArray(data) ? data : []).map(normalizePayment)
  },

  fetchReceiptsByBill: async (billId) => {
    const data = await api(`${API_ENDPOINTS.vendorReceipts}/bill/${billId}`)
    return (Array.isArray(data) ? data : []).map(normalizeReceipt)
  },

  createPayment: async (data) => {
    set({ isLoading: true, error: null })
    try {
      const response = await api(API_ENDPOINTS.vendorPayments, { method: 'POST', body: JSON.stringify(data) })
      const payment = normalizePayment(response)
      set(state => ({
        payments: [payment, ...state.payments],
        unpaidBills: optimisticBillUpdate(state.unpaidBills, data.vendorBillId, payment.amount),
        isLoading: false,
      }))
      return payment
    } catch (e: any) { set({ isLoading: false, error: e.message }); throw e }
  },

  createReceipt: async (data) => {
    set({ isLoading: true, error: null })
    try {
      const response = await api(API_ENDPOINTS.vendorReceipts, { method: 'POST', body: JSON.stringify(data) })
      const receipt = normalizeReceipt(response)
      set(state => ({
        receipts: [receipt, ...state.receipts],
        unpaidDebitBills: optimisticBillUpdate(state.unpaidDebitBills, data.vendorBillId, receipt.amount),
        isLoading: false,
      }))
      return receipt
    } catch (e: any) { set({ isLoading: false, error: e.message }); throw e }
  },
}))
