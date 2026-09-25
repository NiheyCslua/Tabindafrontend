import type {
  DateSortOrder,
  Employee,
  EmployeeLedgerEntry,
  EmployeeLedgerEntryType,
  SalaryAdvance,
  SalaryAdvanceDeduction,
  SalaryPayment,
} from '@/lib/types'

export function updateAdvanceStatus(advance: SalaryAdvance): SalaryAdvance {
  if (advance.status === 'cancelled') return advance
  const remainingAmount = Math.max(0, Number(advance.remainingAmount) || 0)
  const deductedAmount = Math.max(0, Number(advance.amount) - remainingAmount)
  const status = remainingAmount === 0
    ? 'deducted'
    : deductedAmount > 0
      ? 'partially_deducted'
      : 'outstanding'

  return {
    ...advance,
    deductedAmount,
    remainingAmount,
    status,
    updatedAt: new Date().toISOString(),
  }
}

export function getOutstandingAdvances(employeeId: string, advances: SalaryAdvance[]): SalaryAdvance[] {
  return advances
    .filter(advance => advance.employeeId === employeeId)
    .filter(advance => advance.status !== 'cancelled' && advance.remainingAmount > 0)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
}

export function calculateOutstandingAdvance(employeeId: string, advances: SalaryAdvance[]): number {
  return getOutstandingAdvances(employeeId, advances).reduce((sum, advance) => sum + advance.remainingAmount, 0)
}

export function calculateSalaryPreview(
  employee: Employee,
  advances: SalaryAdvance[],
  bonus = 0,
  otherDeductions = 0,
  requestedAdvanceDeduction?: number
) {
  const baseSalary = Number(employee.baseSalary ?? employee.salary ?? 0)
  const safeBonus = Math.max(0, Number(bonus) || 0)
  const safeOtherDeductions = Math.max(0, Number(otherDeductions) || 0)
  const grossSalary = baseSalary + safeBonus
  const outstandingAdvance = calculateOutstandingAdvance(employee.id, advances)
  const maxAdvanceDeduction = Math.max(0, grossSalary - safeOtherDeductions)
  const requested = requestedAdvanceDeduction === undefined || Number.isNaN(Number(requestedAdvanceDeduction))
    ? Math.min(outstandingAdvance, maxAdvanceDeduction)
    : Math.max(0, Number(requestedAdvanceDeduction) || 0)
  const advanceDeduction = Math.min(requested, outstandingAdvance, maxAdvanceDeduction)
  const netPayable = Math.max(0, grossSalary - safeOtherDeductions - advanceDeduction)

  return {
    baseSalary,
    bonus: safeBonus,
    otherDeductions: safeOtherDeductions,
    grossSalary,
    outstandingAdvance,
    maxAdvanceDeduction,
    advanceDeduction,
    netPayable,
  }
}

export function allocateAdvanceDeduction(
  employeeId: string,
  amount: number,
  advances: SalaryAdvance[]
): { updatedAdvances: SalaryAdvance[]; deductions: SalaryAdvanceDeduction[]; appliedAmount: number } {
  let remainingToAllocate = Math.max(0, Number(amount) || 0)
  const deductions: SalaryAdvanceDeduction[] = []
  const outstandingIds = new Set(getOutstandingAdvances(employeeId, advances).map(advance => advance.id))

  const updatedAdvances = advances.map(advance => {
    if (!outstandingIds.has(advance.id) || remainingToAllocate <= 0) return advance

    const applied = Math.min(advance.remainingAmount, remainingToAllocate)
    remainingToAllocate -= applied
    deductions.push({ advanceId: advance.id, amount: applied })

    return updateAdvanceStatus({
      ...advance,
      deductedAmount: advance.deductedAmount + applied,
      remainingAmount: Math.max(0, advance.remainingAmount - applied),
    })
  })

  return {
    updatedAdvances,
    deductions,
    appliedAmount: deductions.reduce((sum, deduction) => sum + deduction.amount, 0),
  }
}

function parseSalaryPeriod(period?: string): { year: number; month?: number; prefix: string } {
  const match = period?.match(/^(\d{4})(?:-(\d{1,2}))?/)
  const now = new Date()
  if (!match) {
    const year = now.getFullYear()
    return { year, prefix: `SAL-${year}` }
  }

  const year = Number(match[1])
  const parsedMonth = match[2] ? Number(match[2]) : undefined
  const month = parsedMonth && parsedMonth >= 1 && parsedMonth <= 12 ? parsedMonth : undefined

  if (month) {
    return { year, month, prefix: `SAL-${year}-${String(month).padStart(2, '0')}` }
  }

  return { year, prefix: `SAL-${year}` }
}

export function generateSalaryPaymentNumber(existingPayments: SalaryPayment[], salaryPeriod?: string): string {
  const { prefix } = parseSalaryPeriod(salaryPeriod)
  const existingNumbers = new Set(existingPayments.map(payment => payment.paymentNumber))
  const matchingSequences = existingPayments
    .map(payment => payment.paymentNumber)
    .filter(number => number.startsWith(`${prefix}-`))
    .map(number => Number(number.slice(prefix.length + 1)))
    .filter(number => Number.isFinite(number))

  let next = matchingSequences.length ? Math.max(...matchingSequences) + 1 : 1
  let candidate = `${prefix}-${String(next).padStart(3, '0')}`
  while (existingNumbers.has(candidate)) {
    next += 1
    candidate = `${prefix}-${String(next).padStart(3, '0')}`
  }

  return candidate
}

export function formatSalaryPeriod(period: string): string {
  if (!period) return '-'
  const [year, month] = period.split('-').map(Number)
  if (!year || !month) return period
  return new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(new Date(year, month - 1, 1))
}

export function getSalaryPeriodRange(period: string): { start?: string; end?: string } {
  const [year, month] = period.split('-').map(Number)
  if (!year || !month) return {}
  const start = new Date(year, month - 1, 1)
  const end = new Date(year, month, 0)
  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
  }
}

export function statusLabel(value: string): string {
  return value
    .split('_')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

export function getPayrollStatusColor(status: string): string {
  switch (status) {
    case 'paid':
    case 'deducted':
      return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
    case 'pending':
    case 'outstanding':
    case 'partially_deducted':
      return 'bg-amber-500/10 text-amber-500 border-amber-500/20'
    case 'cancelled':
    case 'salary_cancelled':
    case 'inactive':
    case 'terminated':
      return 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'
    default:
      return 'bg-blue-500/10 text-blue-500 border-blue-500/20'
  }
}

export function sortPayrollRowsByDate<T>(rows: T[], getDate: (row: T) => string | undefined, sortOrder: DateSortOrder = 'oldest'): T[] {
  return [...rows].sort((a, b) => {
    const aTime = new Date(getDate(a) || '').getTime()
    const bTime = new Date(getDate(b) || '').getTime()
    const safeA = Number.isFinite(aTime) ? aTime : Number.MAX_SAFE_INTEGER
    const safeB = Number.isFinite(bTime) ? bTime : Number.MAX_SAFE_INTEGER
    return sortOrder === 'oldest' ? safeA - safeB : safeB - safeA
  })
}

export function isLedgerEntryType(value: string): value is EmployeeLedgerEntryType {
  return [
    'salary_generated',
    'salary_paid',
    'salary_cancelled',
    'advance_taken',
    'advance_deducted',
    'bonus',
    'deduction',
    'adjustment',
    'advance_cancelled',
  ].includes(value)
}

const systemLedgerTypes: EmployeeLedgerEntryType[] = [
  'salary_generated',
  'salary_paid',
  'salary_cancelled',
  'advance_taken',
  'advance_deducted',
  'bonus',
  'deduction',
  'advance_cancelled',
]

function dateOnly(value?: string): string {
  if (!value) return new Date().toISOString().split('T')[0]
  return value.includes('T') ? value.split('T')[0] : value
}

function ledgerKey(entry: Pick<EmployeeLedgerEntry, 'type' | 'referenceId' | 'referenceType'>): string | null {
  if (!entry.referenceId) return null
  return `${entry.type}:${entry.referenceType ?? ''}:${entry.referenceId}`
}

function makeDerivedEntry(entry: Omit<EmployeeLedgerEntry, 'createdAt'> & { createdAt?: string }): EmployeeLedgerEntry {
  return {
    ...entry,
    createdAt: entry.createdAt || new Date().toISOString(),
  }
}

export function buildEmployeeLedger(
  employeeId: string,
  payments: SalaryPayment[],
  advances: SalaryAdvance[],
  ledgerEntries: EmployeeLedgerEntry[]
): EmployeeLedgerEntry[] {
  const employeeAdvances = advances.filter(advance => advance.employeeId === employeeId)
  const employeePayments = payments.filter(payment => payment.employeeId === employeeId)

  const derivedAdvanceEntries: EmployeeLedgerEntry[] = employeeAdvances.flatMap(advance => {
    const entries: EmployeeLedgerEntry[] = [makeDerivedEntry({
      id: `derived-advance-taken-${advance.id}`,
      employeeId: advance.employeeId,
      employeeName: advance.employeeName,
      date: advance.date,
      type: 'advance_taken',
      description: advance.reason ? `Salary advance taken - ${advance.reason}` : 'Salary advance taken',
      debit: advance.amount,
      credit: 0,
      referenceId: advance.id,
      referenceType: 'salary_advance',
      createdAt: advance.createdAt,
    })]

    if (advance.status === 'cancelled') {
      entries.push(makeDerivedEntry({
        id: `derived-advance-cancelled-${advance.id}`,
        employeeId: advance.employeeId,
        employeeName: advance.employeeName,
        date: dateOnly(advance.updatedAt || advance.createdAt || advance.date),
        type: 'advance_cancelled',
        description: 'Salary advance cancelled',
        debit: 0,
        credit: advance.amount,
        referenceId: advance.id,
        referenceType: 'salary_advance',
        createdAt: advance.updatedAt || advance.createdAt,
      }))
    }

    return entries
  })

  const derivedPaymentEntries: EmployeeLedgerEntry[] = employeePayments.flatMap(payment => {
    const generatedDate = payment.periodEnd || dateOnly(payment.createdAt)
    const paymentDate = payment.paymentDate || payment.periodEnd || dateOnly(payment.updatedAt || payment.createdAt)
    const entries: EmployeeLedgerEntry[] = [makeDerivedEntry({
      id: `derived-salary-generated-${payment.id}`,
      employeeId: payment.employeeId,
      employeeName: payment.employeeName,
      date: generatedDate,
      type: 'salary_generated',
      description: `Base salary generated for ${formatSalaryPeriod(payment.salaryPeriod)}`,
      debit: 0,
      credit: payment.baseSalary,
      referenceId: payment.id,
      referenceType: 'salary_payment',
      createdAt: payment.createdAt,
    })]

    if (payment.bonus > 0) {
      entries.push(makeDerivedEntry({
        id: `derived-bonus-${payment.id}`,
        employeeId: payment.employeeId,
        employeeName: payment.employeeName,
        date: generatedDate,
        type: 'bonus',
        description: `Bonus for ${formatSalaryPeriod(payment.salaryPeriod)}`,
        debit: 0,
        credit: payment.bonus,
        referenceId: payment.id,
        referenceType: 'salary_payment',
        createdAt: payment.createdAt,
      }))
    }

    if (payment.otherDeductions > 0) {
      entries.push(makeDerivedEntry({
        id: `derived-deduction-${payment.id}`,
        employeeId: payment.employeeId,
        employeeName: payment.employeeName,
        date: generatedDate,
        type: 'deduction',
        description: `Other deduction for ${formatSalaryPeriod(payment.salaryPeriod)}`,
        debit: payment.otherDeductions,
        credit: 0,
        referenceId: payment.id,
        referenceType: 'salary_payment',
        createdAt: payment.createdAt,
      }))
    }

    if (payment.status === 'paid') {
      if (payment.advanceDeduction > 0) {
        entries.push(makeDerivedEntry({
          id: `derived-advance-deducted-${payment.id}`,
          employeeId: payment.employeeId,
          employeeName: payment.employeeName,
          date: paymentDate,
          type: 'advance_deducted',
          description: `Advance deducted from salary for ${formatSalaryPeriod(payment.salaryPeriod)}`,
          debit: 0,
          credit: payment.advanceDeduction,
          referenceId: payment.id,
          referenceType: 'salary_payment',
          createdAt: payment.updatedAt || payment.createdAt,
        }))
      }

      entries.push(makeDerivedEntry({
        id: `derived-salary-paid-${payment.id}`,
        employeeId: payment.employeeId,
        employeeName: payment.employeeName,
        date: paymentDate,
        type: 'salary_paid',
        description: `Salary paid for ${formatSalaryPeriod(payment.salaryPeriod)}`,
        debit: payment.amountPaid,
        credit: 0,
        referenceId: payment.id,
        referenceType: 'salary_payment',
        createdAt: payment.updatedAt || payment.createdAt,
      }))
    }

    if (payment.status === 'cancelled') {
      const reversalAmount = Math.max(0, payment.grossSalary - payment.otherDeductions)
      entries.push(makeDerivedEntry({
        id: `derived-salary-cancelled-${payment.id}`,
        employeeId: payment.employeeId,
        employeeName: payment.employeeName,
        date: dateOnly(payment.updatedAt || payment.createdAt),
        type: 'salary_cancelled',
        description: `Salary payment cancelled for ${formatSalaryPeriod(payment.salaryPeriod)}`,
        debit: reversalAmount,
        credit: 0,
        referenceId: payment.id,
        referenceType: 'salary_payment',
        createdAt: payment.updatedAt || payment.createdAt,
      }))
    }

    return entries
  })

  const derivedEntries = [...derivedAdvanceEntries, ...derivedPaymentEntries]
  const derivedKeys = new Set(derivedEntries.map(ledgerKey).filter((key): key is string => Boolean(key)))
  const storedEntriesToKeep = ledgerEntries
    .filter(entry => entry.employeeId === employeeId)
    .filter(entry => {
      const key = ledgerKey(entry)
      if (key && derivedKeys.has(key) && systemLedgerTypes.includes(entry.type)) return false
      return entry.type === 'adjustment' || !key || !systemLedgerTypes.includes(entry.type)
    })

  const uniqueEntries = new Map<string, EmployeeLedgerEntry>()
  for (const entry of [...derivedEntries, ...storedEntriesToKeep]) {
    const key = ledgerKey(entry) || `id:${entry.id}`
    if (!uniqueEntries.has(key)) uniqueEntries.set(key, entry)
  }

  return sortPayrollRowsByDate([...uniqueEntries.values()], entry => entry.date, 'oldest')
}
