import { create } from 'zustand'
import type {
  CreateSalaryAdvanceDTO,
  Employee,
  EmployeeLedgerEntry,
  GenerateSalaryPaymentDTO,
  SalaryAdvance,
  SalaryAdvanceDeduction,
  SalaryPayment,
} from '@/lib/types'
import { useEmployeeStore } from '@/lib/store/employee-store'
import {
  allocateAdvanceDeduction,
  buildEmployeeLedger,
  calculateOutstandingAdvance,
  calculateSalaryPreview,
  getOutstandingAdvances,
  getSalaryPeriodRange,
} from '@/lib/payroll/payroll-utils'
import { api, API_ENDPOINTS } from '@/lib/api'
import { asArray, asObject, toDateOnly, toDateString, toLowerStatus, toNumber, toStringValue } from '@/lib/api-normalizers'

interface PayrollState {
  advances: SalaryAdvance[]
  payments: SalaryPayment[]
  ledgerEntries: EmployeeLedgerEntry[]
  isLoading: boolean
  error: string | null

  fetchPayrollData: () => Promise<void>
  fetchSalaryAdvances: () => Promise<void>
  fetchSalaryPayments: () => Promise<void>
  fetchLedgerEntries: () => Promise<void>

  addSalaryAdvance: (data: CreateSalaryAdvanceDTO) => Promise<SalaryAdvance>
  updateSalaryAdvance: (id: string, updates: Partial<Pick<SalaryAdvance, 'reason' | 'notes'>>) => Promise<SalaryAdvance>
  cancelSalaryAdvance: (id: string) => Promise<SalaryAdvance>
  getAdvancesByEmployee: (employeeId: string) => SalaryAdvance[]
  getOutstandingAdvancesByEmployee: (employeeId: string) => SalaryAdvance[]
  getOutstandingAdvanceBalance: (employeeId: string) => number
  applyAdvanceDeduction: (employeeId: string, deductions: SalaryAdvanceDeduction[]) => void

  generateSalaryPayment: (data: GenerateSalaryPaymentDTO) => Promise<SalaryPayment>
  markSalaryAsPaid: (id: string, options?: { paymentDate?: string; paymentMethod?: string; financialAccountId?: string }) => Promise<SalaryPayment>
  cancelSalaryPayment: (id: string) => Promise<SalaryPayment>
  getPaymentsByEmployee: (employeeId: string) => SalaryPayment[]
  getPaymentsByPeriod: (period: string) => SalaryPayment[]

  addLedgerEntry: (entry: Omit<EmployeeLedgerEntry, 'id' | 'createdAt'>) => EmployeeLedgerEntry
  getLedgerByEmployee: (employeeId: string) => EmployeeLedgerEntry[]
  getLedgerByDateRange: (employeeId: string, startDate?: string, endDate?: string) => EmployeeLedgerEntry[]
}

function getEmployee(employeeId: string): Employee | undefined {
  return useEmployeeStore.getState().employees.find(employee => employee.id === employeeId)
    || useEmployeeStore.getState().getEmployeeById(employeeId)
}

function periodRangeOrProvided(data: GenerateSalaryPaymentDTO) {
  const range = getSalaryPeriodRange(data.salaryPeriod)
  return {
    periodStart: data.periodStart || range.start,
    periodEnd: data.periodEnd || range.end,
  }
}

const normalizeAdvance = (payload: unknown): SalaryAdvance => {
  const item = asObject<Record<string, any>>(payload)
  return {
    id: toStringValue(item.id),
    employeeId: toStringValue(item.employeeId),
    employeeName: toStringValue(item.employeeName),
    date: toDateOnly(item.date),
    amount: toNumber(item.amount, 0),
    deductedAmount: toNumber(item.deductedAmount, 0),
    remainingAmount: toNumber(item.remainingAmount, 0),
    reason: item.reason ? String(item.reason) : undefined,
    notes: item.notes ? String(item.notes) : undefined,
    status: toLowerStatus(item.status, 'outstanding'),
    createdAt: toDateString(item.createdAt),
    updatedAt: item.updatedAt ? toDateString(item.updatedAt) : undefined,
  }
}

const normalizePayment = (payload: unknown): SalaryPayment => {
  const item = asObject<Record<string, any>>(payload)
  return {
    id: toStringValue(item.id),
    paymentNumber: toStringValue(item.paymentNumber),
    employeeId: toStringValue(item.employeeId),
    employeeName: toStringValue(item.employeeName),
    salaryPeriod: toStringValue(item.salaryPeriod),
    periodStart: item.periodStart ? toDateOnly(item.periodStart) : undefined,
    periodEnd: item.periodEnd ? toDateOnly(item.periodEnd) : undefined,
    baseSalary: toNumber(item.baseSalary, 0),
    bonus: toNumber(item.bonus, 0),
    otherDeductions: toNumber(item.otherDeductions, 0),
    advanceDeduction: toNumber(item.advanceDeduction, 0),
    grossSalary: toNumber(item.grossSalary, 0),
    netPayable: toNumber(item.netPayable, 0),
    amountPaid: toNumber(item.amountPaid, 0),
    status: toLowerStatus(item.status, 'pending'),
    paymentDate: item.paymentDate ? toDateOnly(item.paymentDate) : undefined,
    paymentMethod: item.paymentMethod ? String(item.paymentMethod) : null,
    financialAccountId: item.financialAccountId ? String(item.financialAccountId) : null,
    notes: item.notes ? String(item.notes) : undefined,
    advanceDeductions: Array.isArray(item.advanceDeductions) ? item.advanceDeductions : undefined,
    createdAt: toDateString(item.createdAt),
    updatedAt: item.updatedAt ? toDateString(item.updatedAt) : undefined,
  }
}

const normalizeLedgerEntry = (payload: unknown): EmployeeLedgerEntry => {
  const item = asObject<Record<string, any>>(payload)
  return {
    id: toStringValue(item.id),
    employeeId: toStringValue(item.employeeId),
    employeeName: toStringValue(item.employeeName),
    date: toDateOnly(item.date),
    type: item.type as EmployeeLedgerEntry['type'],
    description: toStringValue(item.description),
    debit: toNumber(item.debit, 0),
    credit: toNumber(item.credit, 0),
    balance: toNumber(item.balance, 0),
    referenceId: item.referenceId ? String(item.referenceId) : undefined,
    referenceType: item.referenceType ? item.referenceType as EmployeeLedgerEntry['referenceType'] : undefined,
    createdAt: toDateString(item.createdAt),
  }
}

export const usePayrollStore = create<PayrollState>((set, get) => ({
  advances: [],
  payments: [],
  ledgerEntries: [],
  isLoading: false,
  error: null,

  fetchPayrollData: async () => {
    set({ isLoading: true, error: null })
    try {
      const [advances, payments, ledgerEntries] = await Promise.all([
        api(API_ENDPOINTS.salaryAdvances),
        api(API_ENDPOINTS.salaryPayments),
        api(API_ENDPOINTS.employeeLedger),
      ])
      set({
        advances: asArray(advances).map(normalizeAdvance),
        payments: asArray(payments).map(normalizePayment),
        ledgerEntries: asArray(ledgerEntries).map(normalizeLedgerEntry),
        isLoading: false,
        error: null,
      })
    } catch (error: any) {
      set({ isLoading: false, error: error.message || 'Failed to fetch payroll data' })
      throw error
    }
  },

  fetchSalaryAdvances: async () => {
    set({ isLoading: true, error: null })
    try {
      const data = await api(API_ENDPOINTS.salaryAdvances)
      set({ advances: asArray(data).map(normalizeAdvance), isLoading: false, error: null })
    } catch (error: any) {
      set({ isLoading: false, error: error.message || 'Failed to fetch salary advances' })
      throw error
    }
  },

  fetchSalaryPayments: async () => {
    set({ isLoading: true, error: null })
    try {
      const data = await api(API_ENDPOINTS.salaryPayments)
      set({ payments: asArray(data).map(normalizePayment), isLoading: false, error: null })
    } catch (error: any) {
      set({ isLoading: false, error: error.message || 'Failed to fetch salary payments' })
      throw error
    }
  },

  fetchLedgerEntries: async () => {
    set({ isLoading: true, error: null })
    try {
      const data = await api(API_ENDPOINTS.employeeLedger)
      set({ ledgerEntries: asArray(data).map(normalizeLedgerEntry), isLoading: false, error: null })
    } catch (error: any) {
      set({ isLoading: false, error: error.message || 'Failed to fetch employee ledger' })
      throw error
    }
  },

  addSalaryAdvance: async (data) => {
    set({ isLoading: true, error: null })
    try {
      const employee = getEmployee(data.employeeId)
      if (!employee) throw new Error('Employee is required')
      if (employee.status === 'inactive' || employee.status === 'terminated') {
        throw new Error('Cannot create salary advance for inactive or terminated employee')
      }
      if (!data.date) throw new Error('Advance date is required')
      if (Number(data.amount) <= 0) throw new Error('Advance amount must be greater than zero')

      const response = await api(API_ENDPOINTS.salaryAdvances, {
        method: 'POST',
        body: JSON.stringify({ ...data, employeeName: employee.name }),
      })
      const advance = normalizeAdvance(response)
      await get().fetchPayrollData().catch(() => undefined)
      set({ isLoading: false, error: null })
      return advance
    } catch (error: any) {
      set({ isLoading: false, error: error.message || 'Failed to add salary advance' })
      throw error
    }
  },

  updateSalaryAdvance: async (id, updates) => {
    set({ isLoading: true, error: null })
    try {
      const response = await api(`${API_ENDPOINTS.salaryAdvances}/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
      })
      const updated = normalizeAdvance(response)
      set(state => ({ advances: state.advances.map(advance => advance.id === id ? updated : advance), isLoading: false, error: null }))
      return updated
    } catch (error: any) {
      set({ isLoading: false, error: error.message || 'Failed to update salary advance' })
      throw error
    }
  },

  cancelSalaryAdvance: async (id) => {
    set({ isLoading: true, error: null })
    try {
      const response = await api(`${API_ENDPOINTS.salaryAdvances}/${id}/cancel`, { method: 'PATCH' })
      const cancelled = normalizeAdvance(response)
      await get().fetchPayrollData().catch(() => undefined)
      set({ isLoading: false, error: null })
      return cancelled
    } catch (error: any) {
      set({ isLoading: false, error: error.message || 'Failed to cancel salary advance' })
      throw error
    }
  },

  getAdvancesByEmployee: (employeeId) => get().advances.filter(advance => advance.employeeId === employeeId),
  getOutstandingAdvancesByEmployee: (employeeId) => getOutstandingAdvances(employeeId, get().advances),
  getOutstandingAdvanceBalance: (employeeId) => calculateOutstandingAdvance(employeeId, get().advances),

  applyAdvanceDeduction: (employeeId, deductions) => {
    if (deductions.length === 0) return
    const deductionMap = new Map(deductions.map(deduction => [deduction.advanceId, deduction.amount]))
    set(state => ({
      advances: state.advances.map(advance => {
        if (advance.employeeId !== employeeId || !deductionMap.has(advance.id)) return advance
        const amount = deductionMap.get(advance.id) || 0
        const remainingAmount = Math.max(0, advance.remainingAmount - amount)
        const deductedAmount = advance.deductedAmount + amount
        const status = remainingAmount === 0 ? 'deducted' : 'partially_deducted'
        return { ...advance, deductedAmount, remainingAmount, status, updatedAt: new Date().toISOString() }
      }),
    }))
  },

  generateSalaryPayment: async (data) => {
    set({ isLoading: true, error: null })
    try {
      const employee = getEmployee(data.employeeId)
      if (!employee) throw new Error('Employee is required')
      if (!data.salaryPeriod) throw new Error('Salary period is required')
      const duplicate = get().payments.some(payment =>
        payment.employeeId === employee.id && payment.salaryPeriod === data.salaryPeriod && payment.status !== 'cancelled'
      )
      if (duplicate) throw new Error('Salary already generated for this employee and period')

      const preview = calculateSalaryPreview(
        employee,
        get().advances,
        data.bonus ?? 0,
        data.otherDeductions ?? 0,
        data.advanceDeduction
      )
      const { periodStart, periodEnd } = periodRangeOrProvided(data)
      const allocation = allocateAdvanceDeduction(employee.id, preview.advanceDeduction, get().advances)

      const response = await api(API_ENDPOINTS.salaryPayments, {
        method: 'POST',
        body: JSON.stringify({
          employeeId: employee.id,
          employeeName: employee.name,
          salaryPeriod: data.salaryPeriod,
          periodStart,
          periodEnd,
          baseSalary: preview.baseSalary,
          bonus: preview.bonus,
          otherDeductions: preview.otherDeductions,
          advanceDeduction: allocation.appliedAmount,
          grossSalary: preview.grossSalary,
          netPayable: Math.max(0, preview.grossSalary - preview.otherDeductions - allocation.appliedAmount),
          notes: data.notes,
          advanceDeductions: allocation.deductions,
        }),
      })
      const payment = normalizePayment(response)
      await get().fetchPayrollData().catch(() => undefined)
      set({ isLoading: false, error: null })
      return payment
    } catch (error: any) {
      set({ isLoading: false, error: error.message || 'Failed to generate salary payment' })
      throw error
    }
  },

  markSalaryAsPaid: async (id, options) => {
    set({ isLoading: true, error: null })
    try {
      const response = await api(`${API_ENDPOINTS.salaryPayments}/${id}/pay`, {
        method: 'PATCH',
        body: JSON.stringify(options || {}),
      })
      const payment = normalizePayment(response)
      await get().fetchPayrollData().catch(() => undefined)
      set({ isLoading: false, error: null })
      return payment
    } catch (error: any) {
      set({ isLoading: false, error: error.message || 'Failed to mark salary as paid' })
      throw error
    }
  },

  cancelSalaryPayment: async (id) => {
    set({ isLoading: true, error: null })
    try {
      const response = await api(`${API_ENDPOINTS.salaryPayments}/${id}/cancel`, { method: 'PATCH' })
      const payment = normalizePayment(response)
      await get().fetchPayrollData().catch(() => undefined)
      set({ isLoading: false, error: null })
      return payment
    } catch (error: any) {
      set({ isLoading: false, error: error.message || 'Failed to cancel salary payment' })
      throw error
    }
  },

  getPaymentsByEmployee: (employeeId) => get().payments.filter(payment => payment.employeeId === employeeId),
  getPaymentsByPeriod: (period) => get().payments.filter(payment => payment.salaryPeriod === period),

  addLedgerEntry: (entry) => {
    const ledgerEntry: EmployeeLedgerEntry = {
      ...entry,
      id: `LED-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      createdAt: new Date().toISOString(),
    }
    set(state => ({ ledgerEntries: [...state.ledgerEntries, ledgerEntry] }))
    void api(API_ENDPOINTS.employeeLedger, { method: 'POST', body: JSON.stringify(entry) })
      .then(response => normalizeLedgerEntry(response))
      .then(saved => set(state => ({ ledgerEntries: state.ledgerEntries.map(item => item.id === ledgerEntry.id ? saved : item) })))
      .catch(() => undefined)
    return ledgerEntry
  },

  getLedgerByEmployee: (employeeId) => buildEmployeeLedger(
    employeeId,
    get().payments,
    get().advances,
    get().ledgerEntries
  ),

  getLedgerByDateRange: (employeeId, startDate, endDate) => {
    const startTime = startDate ? new Date(startDate).getTime() : null
    const endDateObj = endDate ? new Date(endDate) : null
    if (endDateObj) endDateObj.setHours(23, 59, 59, 999)
    const endTime = endDateObj?.getTime() ?? null

    return buildEmployeeLedger(employeeId, get().payments, get().advances, get().ledgerEntries)
      .filter(entry => {
        const entryTime = new Date(entry.date).getTime()
        if (startTime !== null && entryTime < startTime) return false
        if (endTime !== null && entryTime > endTime) return false
        return true
      })
  },
}))

export type { PayrollState }
