"use client"

import { useEffect } from 'react'
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
import type { CreateSalaryAdvanceDTO, Employee } from '@/lib/types'

const schema = z.object({
  employeeId: z.string().min(1, 'Employee is required'),
  date: z.string().min(1, 'Date is required'),
  amount: z.coerce.number().positive('Amount must be greater than zero'),
  reason: z.string().optional(),
  notes: z.string().optional(),
})

type SalaryAdvanceFormValues = z.infer<typeof schema>

interface SalaryAdvanceFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  employees: Employee[]
  selectedEmployee?: Employee | null
  onSubmit: (data: CreateSalaryAdvanceDTO) => Promise<void>
  isLoading?: boolean
}

const today = () => new Date().toISOString().split('T')[0]

export function SalaryAdvanceForm({
  open,
  onOpenChange,
  employees,
  selectedEmployee,
  onSubmit,
  isLoading,
}: SalaryAdvanceFormProps) {
  const form = useForm<SalaryAdvanceFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      employeeId: selectedEmployee?.id || '',
      date: today(),
      amount: 0,
      reason: '',
      notes: '',
    },
  })

  useEffect(() => {
    if (open) {
      form.reset({
        employeeId: selectedEmployee?.id || '',
        date: today(),
        amount: 0,
        reason: '',
        notes: '',
      })
    }
  }, [open, selectedEmployee, form])

  const activeEmployees = employees.filter(employee => employee.status !== 'inactive' && employee.status !== 'terminated')

  const handleSubmit = async (values: SalaryAdvanceFormValues) => {
    await onSubmit(values)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Salary Advance</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="employeeId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Employee</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={!!selectedEmployee}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {activeEmployees.map(employee => (
                        <SelectItem key={employee.id} value={employee.id}>{employee.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date</FormLabel>
                    <FormControl><Input type="date" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount</FormLabel>
                    <FormControl><Input type="number" min="1" step="0.01" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason</FormLabel>
                  <FormControl><Input placeholder="Family expenses, travel, etc." {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl><Textarea rows={3} placeholder="Optional notes" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={isLoading}>Save Advance</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
