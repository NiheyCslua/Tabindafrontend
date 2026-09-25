"use client"

import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Banknote, Clock, Plus, Users, WalletCards, type LucideIcon } from 'lucide-react'
import { EmployeeTable } from '@/components/employees/employee-table'
import { EmployeeForm } from '@/components/employees/employee-form'
import { EmployeeDetailsModal } from '@/components/employees/employee-details-modal'
import { SalaryAdvanceForm } from '@/components/employees/salary-advance-form'
import { GenerateSalaryForm } from '@/components/employees/generate-salary-form'
import { MarkSalaryPaidDialog } from '@/components/employees/mark-salary-paid-dialog'
import { useEmployeeStore } from '@/lib/store/employee-store'
import { usePayrollStore } from '@/lib/store/payroll-store'
import { formatCurrency } from '@/lib/utils/format'
import type { CreateEmployeeDTO, Employee, SalaryAdvance, SalaryPayment } from '@/lib/types'

export default function AdminEmployeesPage() {
  const {
    employees,
    fetchEmployees,
    addEmployee,
    updateEmployee,
    deleteEmployee,
    isLoading: employeesLoading,
  } = useEmployeeStore()

  const {
    advances,
    payments,
    ledgerEntries,
    fetchPayrollData,
    addSalaryAdvance,
    generateSalaryPayment,
    markSalaryAsPaid,
    cancelSalaryPayment,
    cancelSalaryAdvance,
    getOutstandingAdvanceBalance,
    isLoading: payrollLoading,
  } = usePayrollStore()

  const [formOpen, setFormOpen] = useState(false)
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)
  const [viewModalOpen, setViewModalOpen] = useState(false)
  const [viewEmployee, setViewEmployee] = useState<Employee | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null)
  const [advanceDialogOpen, setAdvanceDialogOpen] = useState(false)
  const [advanceEmployee, setAdvanceEmployee] = useState<Employee | null>(null)
  const [salaryDialogOpen, setSalaryDialogOpen] = useState(false)
  const [salaryEmployee, setSalaryEmployee] = useState<Employee | null>(null)
  const [markPaidDialogOpen, setMarkPaidDialogOpen] = useState(false)
  const [paymentToMarkPaid, setPaymentToMarkPaid] = useState<SalaryPayment | null>(null)
  const [cancelPaymentDialogOpen, setCancelPaymentDialogOpen] = useState(false)
  const [paymentToCancel, setPaymentToCancel] = useState<SalaryPayment | null>(null)
  const [cancelAdvanceDialogOpen, setCancelAdvanceDialogOpen] = useState(false)
  const [advanceToCancel, setAdvanceToCancel] = useState<SalaryAdvance | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  useEffect(() => {
    fetchEmployees()
    fetchPayrollData()
  }, [fetchEmployees, fetchPayrollData])

  const loading = employeesLoading || payrollLoading

  const currentMonth = new Date().toISOString().slice(0, 7)
  const payrollSummary = useMemo(() => {
    const activeEmployees = employees.filter(employee => employee.status === 'active')
    const monthlyPayrollCost = activeEmployees.reduce((sum, employee) => sum + (employee.baseSalary ?? employee.salary ?? 0), 0)
    const outstandingAdvances = advances
      .filter(advance => advance.status !== 'cancelled')
      .reduce((sum, advance) => sum + advance.remainingAmount, 0)
    const paidThisMonth = payments
      .filter(payment => payment.status === 'paid' && (payment.paymentDate?.startsWith(currentMonth) || payment.salaryPeriod === currentMonth))
      .reduce((sum, payment) => sum + payment.amountPaid, 0)
    const pendingThisMonth = payments
      .filter(payment => payment.status === 'pending' && payment.salaryPeriod === currentMonth)
      .reduce((sum, payment) => sum + payment.netPayable, 0)

    return {
      totalEmployees: employees.length,
      activeEmployees: activeEmployees.length,
      monthlyPayrollCost,
      outstandingAdvances,
      paidThisMonth,
      pendingThisMonth,
    }
  }, [employees, advances, payments, currentMonth])

  const handleEdit = (employee: Employee) => {
    setSelectedEmployee(employee)
    setFormOpen(true)
  }

  const handleView = (employee: Employee) => {
    setViewEmployee(employee)
    setViewModalOpen(true)
  }

  const handleDelete = (employee: Employee) => {
    setEmployeeToDelete(employee)
    setDeleteDialogOpen(true)
  }

  const handleAddAdvance = (employee?: Employee | null) => {
    setAdvanceEmployee(employee || null)
    setAdvanceDialogOpen(true)
  }

  const handleGenerateSalary = (employee?: Employee | null) => {
    setSalaryEmployee(employee || null)
    setSalaryDialogOpen(true)
  }

  const handleMarkSalaryPaid = (payment: SalaryPayment) => {
    setPaymentToMarkPaid(payment)
    setMarkPaidDialogOpen(true)
  }

  const handleCancelPayment = (payment: SalaryPayment) => {
    setPaymentToCancel(payment)
    setCancelPaymentDialogOpen(true)
  }

  const handleCancelAdvance = (advance: SalaryAdvance) => {
    setAdvanceToCancel(advance)
    setCancelAdvanceDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (employeeToDelete) {
      await deleteEmployee(employeeToDelete.id)
      setDeleteDialogOpen(false)
      setEmployeeToDelete(null)
    }
  }

  const confirmCancelPayment = async () => {
    if (!paymentToCancel) return
    try {
      setActionError(null)
      await cancelSalaryPayment(paymentToCancel.id)
      setCancelPaymentDialogOpen(false)
      setPaymentToCancel(null)
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Unable to cancel salary payment')
    }
  }

  const confirmCancelAdvance = async () => {
    if (!advanceToCancel) return
    try {
      setActionError(null)
      await cancelSalaryAdvance(advanceToCancel.id)
      setCancelAdvanceDialogOpen(false)
      setAdvanceToCancel(null)
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Unable to cancel salary advance')
    }
  }

  const handleSubmitEmployee = async (data: CreateEmployeeDTO) => {
    if (selectedEmployee) {
      await updateEmployee(selectedEmployee.id, data)
    } else {
      await addEmployee(data)
    }
    setSelectedEmployee(null)
  }

  const handleOpenChange = (open: boolean) => {
    setFormOpen(open)
    if (!open) setSelectedEmployee(null)
  }

  const getLastSalaryPaid = (employeeId: string) => {
    return [...payments]
      .filter(payment => payment.employeeId === employeeId && payment.status === 'paid')
      .sort((a, b) => new Date(b.paymentDate || b.createdAt).getTime() - new Date(a.paymentDate || a.createdAt).getTime())[0]
      ?.paymentDate
  }

  if (loading && employees.length === 0) {
    return <div className="flex h-96 items-center justify-center text-muted-foreground">Loading employees and payroll...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Employees</h1>
          <p className="text-muted-foreground">Manage employee profiles, salary advances, payroll, payments, and ledgers.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => handleAddAdvance(null)}>Add Advance</Button>
          <Button variant="outline" onClick={() => handleGenerateSalary(null)}>Generate Salary</Button>
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />Add Employee
          </Button>
        </div>
      </div>

      {actionError && (
        <div className="rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">{actionError}</div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <SummaryCard icon={Users} label="Total Employees" value={String(payrollSummary.totalEmployees)} />
        <SummaryCard icon={Users} label="Active Employees" value={String(payrollSummary.activeEmployees)} />
        <SummaryCard icon={Banknote} label="Monthly Payroll Cost" value={formatCurrency(payrollSummary.monthlyPayrollCost)} />
        <SummaryCard icon={WalletCards} label="Outstanding Advances" value={formatCurrency(payrollSummary.outstandingAdvances)} />
        <SummaryCard icon={Banknote} label="Salaries Paid This Month" value={formatCurrency(payrollSummary.paidThisMonth)} />
        <SummaryCard icon={Clock} label="Pending This Month" value={formatCurrency(payrollSummary.pendingThisMonth)} />
      </div>

      <EmployeeTable
        employees={employees}
        getOutstandingAdvance={getOutstandingAdvanceBalance}
        getLastSalaryPaid={getLastSalaryPaid}
        onView={handleView}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onAddAdvance={handleAddAdvance}
        onGenerateSalary={handleGenerateSalary}
        onViewLedger={handleView}
      />

      <EmployeeDetailsModal
        employee={viewEmployee}
        open={viewModalOpen}
        onOpenChange={setViewModalOpen}
        advances={advances}
        payments={payments}
        ledgerEntries={ledgerEntries}
        onAddAdvance={handleAddAdvance}
        onGenerateSalary={handleGenerateSalary}
        onMarkSalaryPaid={handleMarkSalaryPaid}
        onCancelPayment={handleCancelPayment}
        onCancelAdvance={handleCancelAdvance}
      />

      <EmployeeForm
        employee={selectedEmployee}
        open={formOpen}
        onOpenChange={handleOpenChange}
        onSubmit={handleSubmitEmployee}
        isLoading={employeesLoading}
      />

      <SalaryAdvanceForm
        open={advanceDialogOpen}
        onOpenChange={setAdvanceDialogOpen}
        employees={employees}
        selectedEmployee={advanceEmployee}
        onSubmit={async (data) => { setActionError(null); await addSalaryAdvance(data) }}
        isLoading={payrollLoading}
      />

      <GenerateSalaryForm
        open={salaryDialogOpen}
        onOpenChange={setSalaryDialogOpen}
        employees={employees}
        selectedEmployee={salaryEmployee}
        advances={advances}
        payments={payments}
        onSubmit={async (data) => { setActionError(null); await generateSalaryPayment(data) }}
        isLoading={payrollLoading}
      />

      <MarkSalaryPaidDialog
        payment={paymentToMarkPaid}
        open={markPaidDialogOpen}
        onOpenChange={setMarkPaidDialogOpen}
        onConfirm={async (paymentId, options) => { setActionError(null); await markSalaryAsPaid(paymentId, options) }}
        isLoading={payrollLoading}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Employee</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to delete {employeeToDelete?.name}? This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-white hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={cancelPaymentDialogOpen} onOpenChange={setCancelPaymentDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Salary Payment</AlertDialogTitle>
            <AlertDialogDescription>Cancel pending salary payment {paymentToCancel?.paymentNumber}? Advance balances are unchanged because deductions are only applied when paid.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Payment</AlertDialogCancel>
            <AlertDialogAction onClick={confirmCancelPayment}>Cancel Payment</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={cancelAdvanceDialogOpen} onOpenChange={setCancelAdvanceDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Salary Advance</AlertDialogTitle>
            <AlertDialogDescription>Cancel this advance for {advanceToCancel?.employeeName}? Only advances with no deductions can be cancelled.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Advance</AlertDialogCancel>
            <AlertDialogAction onClick={confirmCancelAdvance}>Cancel Advance</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function SummaryCard({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 pt-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-lg font-semibold tabular-nums">{value}</p>
        </div>
      </CardContent>
    </Card>
  )
}
