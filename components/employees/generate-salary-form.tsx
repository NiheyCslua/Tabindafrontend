"use client"

import { useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import type { Employee, GenerateSalaryPaymentDTO, SalaryAdvance, SalaryPayment } from '@/lib/types'
import { calculateSalaryPreview, formatSalaryPeriod } from '@/lib/payroll/payroll-utils'
import { formatCurrency } from '@/lib/utils/format'

const schema = z.object({
  employeeId: z.string().min(1, 'Employee is required'),
  salaryPeriod: z.string().min(1, 'Salary period is required'),
  bonus: z.coerce.number().min(0, 'Bonus cannot be negative'),
  otherDeductions: z.coerce.number().min(0, 'Other deductions cannot be negative'),
  advanceDeduction: z.coerce.number().min(0, 'Advance deduction cannot be negative'),
  notes: z.string().optional(),
})

type GenerateSalaryFormValues = z.infer<typeof schema>

interface GenerateSalaryFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  employees: Employee[]
  selectedEmployee?: Employee | null
  advances: SalaryAdvance[]
  payments: SalaryPayment[]
  onSubmit: (data: GenerateSalaryPaymentDTO) => Promise<void>
  isLoading?: boolean
}

const currentMonth = () => new Date().toISOString().slice(0, 7)

export function GenerateSalaryForm({
  open,
  onOpenChange,
  employees,
  selectedEmployee,
  advances,
  payments,
  onSubmit,
  isLoading,
}: GenerateSalaryFormProps) {
  const form = useForm<GenerateSalaryFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      employeeId: selectedEmployee?.id || '',
      salaryPeriod: currentMonth(),
      bonus: 0,
      otherDeductions: 0,
      advanceDeduction: 0,
      notes: '',
    },
  })

  const employeeId = form.watch('employeeId')
  const salaryPeriod = form.watch('salaryPeriod')
  const bonus = form.watch('bonus')
  const otherDeductions = form.watch('otherDeductions')
  const requestedAdvanceDeduction = form.watch('advanceDeduction')
  const employee = employees.find(item => item.id === employeeId)

  const preview = useMemo(() => {
    if (!employee) return null
    return calculateSalaryPreview(employee, advances, bonus, otherDeductions, requestedAdvanceDeduction)
  }, [employee, advances, bonus, otherDeductions, requestedAdvanceDeduction])

  useEffect(() => {
    if (open) {
      const initialEmployee = selectedEmployee || employees.find(item => item.status === 'active') || null
      form.reset({
        employeeId: initialEmployee?.id || '',
        salaryPeriod: currentMonth(),
        bonus: 0,
        otherDeductions: 0,
        advanceDeduction: 0,
        notes: '',
      })
    }
  }, [open, selectedEmployee, employees, form])

  useEffect(() => {
    if (employee) {
      const suggested = calculateSalaryPreview(employee, advances, bonus, otherDeductions).advanceDeduction
      form.setValue('advanceDeduction', suggested, { shouldValidate: true })
    }
  }, [employeeId, employee, advances, bonus, otherDeductions, form])

  const duplicateExists = payments.some(payment =>
    payment.employeeId === employeeId &&
    payment.salaryPeriod === salaryPeriod &&
    payment.status !== 'cancelled'
  )

  const handleSubmit = async (values: GenerateSalaryFormValues) => {
    if (!employee) return
    const safePreview = calculateSalaryPreview(employee, advances, values.bonus, values.otherDeductions, values.advanceDeduction)
    await onSubmit({
      ...values,
      advanceDeduction: safePreview.advanceDeduction,
    })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Generate Salary</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="employeeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Employee</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={!!selectedEmployee}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {employees.filter(item => item.status === 'active' || item.status === 'on_leave').map(item => (
                          <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="salaryPeriod"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Salary Period</FormLabel>
                    <FormControl><Input type="month" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {duplicateExists && (
              <div className="rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                A non-cancelled salary payment already exists for this employee and salary period.
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-4">
              <div className="space-y-1.5">
                <FormLabel>Base Salary</FormLabel>
                <Input value={preview ? preview.baseSalary : 0} readOnly />
              </div>
              <FormField
                control={form.control}
                name="bonus"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bonus</FormLabel>
                    <FormControl><Input type="number" min="0" step="0.01" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="otherDeductions"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Other Deductions</FormLabel>
                    <FormControl><Input type="number" min="0" step="0.01" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="advanceDeduction"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Advance Deduction</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        max={preview?.maxAdvanceDeduction ?? undefined}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {preview && (
              <div className="grid gap-3 md:grid-cols-4">
                <PreviewCard label="Outstanding Advances" value={formatCurrency(preview.outstandingAdvance)} />
                <PreviewCard label="Gross Salary" value={formatCurrency(preview.grossSalary)} />
                <PreviewCard label="Capped Advance Deduction" value={formatCurrency(preview.advanceDeduction)} />
                <PreviewCard label="Net Payable" value={formatCurrency(preview.netPayable)} emphasize />
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              Generate creates a pending salary record. Advance balances are only reduced when the salary is marked as paid.
            </p>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl><Textarea rows={3} placeholder="Optional notes for salary period" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                {salaryPeriod ? `Period: ${formatSalaryPeriod(salaryPeriod)}` : 'Select a salary period'}
              </p>
              <div className="flex gap-3">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                <Button type="submit" disabled={isLoading || duplicateExists || !employee}>Generate Pending Salary</Button>
              </div>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

function PreviewCard({ label, value, emphasize }: { label: string; value: string; emphasize?: boolean }) {
  return (
    <Card>
      <CardContent className="pt-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={`mt-1 text-lg font-semibold tabular-nums ${emphasize ? 'text-primary' : ''}`}>{value}</p>
      </CardContent>
    </Card>
  )
}
