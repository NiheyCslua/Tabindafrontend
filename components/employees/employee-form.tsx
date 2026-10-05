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
  FormDescription,
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
import { Loader2 } from 'lucide-react'
import type { Employee, CreateEmployeeDTO, UserRole } from '@/lib/types'

// App Role determines whether this employee gets application login
// credentials. Kept as a plain array (rather than hard-coded selects) so
// additional App Roles can be added later without redesigning the form.
const APP_ROLES: { value: UserRole; label: string }[] = [
  { value: 'no_app_access', label: 'No App Access' },
  { value: 'admin', label: 'Admin' },
  { value: 'sales', label: 'Sales' },
  { value: 'inventory_manager', label: 'Inventory Manager' },
]

const employeeSchema = z
  .object({
    name: z.string().min(2, 'Name is required'),
    phone: z.string().optional(),
    email: z.string().optional(),
    password: z.string().optional(),
    role: z.enum(['no_app_access', 'admin', 'sales', 'inventory_manager']),
    cnic: z.string().optional(),
    position: z.string().optional(),
    status: z.enum(['active', 'inactive', 'on_leave', 'terminated']),
    hireDate: z.string().optional(),
    baseSalary: z.coerce.number().min(0, 'Base salary must be 0 or more').optional(),
    address: z.string().optional(),
  })
  .superRefine((values, ctx) => {
    if (values.role !== 'no_app_access') {
      if (!values.email || !z.string().email().safeParse(values.email).success) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['email'], message: 'Valid email is required for this App Role' })
      }
    }
  })

type EmployeeFormValues = z.infer<typeof employeeSchema>

interface EmployeeFormProps {
  employee?: Employee | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: CreateEmployeeDTO) => Promise<void>
  isLoading?: boolean
}

const today = () => new Date().toISOString().split('T')[0]

const defaultValues: EmployeeFormValues = {
  name: '',
  phone: '',
  email: '',
  password: '',
  role: 'no_app_access',
  cnic: '',
  position: '',
  status: 'active',
  hireDate: today(),
  baseSalary: 0,
  address: '',
}

export function EmployeeForm({
  employee,
  open,
  onOpenChange,
  onSubmit,
  isLoading,
}: EmployeeFormProps) {
  const form = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeSchema),
    defaultValues,
  })

  const appRole = form.watch('role')
  const requiresAppAccess = appRole !== 'no_app_access'

  useEffect(() => {
    if (employee) {
      form.reset({
        name: employee.name,
        phone: employee.phone,
        email: employee.email || '',
        password: '',
        role: employee.role === 'employee' ? 'sales' : employee.role,
        cnic: employee.cnic || '',
        position: employee.position,
        status: employee.status,
        hireDate: employee.joiningDate || employee.hireDate,
        baseSalary: employee.baseSalary ?? employee.salary ?? 0,
        address: employee.address || '',
      })
    } else {
      form.reset(defaultValues)
    }
  }, [employee, form])

  const handleSubmit = async (values: EmployeeFormValues) => {
    await onSubmit({
      ...values,
      email: values.role === 'no_app_access' ? undefined : values.email,
      password: values.role === 'no_app_access' ? undefined : values.password,
      designation: values.position,
      joiningDate: values.hireDate,
      salary: values.baseSalary,
      baseSalary: values.baseSalary ?? 0,
      position: values.position ?? '',
    })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{employee ? 'Edit Employee' : 'Add Employee'}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Employee Name</FormLabel>
                  <FormControl><Input placeholder="Ahmed Ali" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact Number</FormLabel>
                    <FormControl><Input placeholder="+92 300 0000000" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="cnic"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CNIC Number</FormLabel>
                    <FormControl><Input placeholder="35202-1234567-1" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-1 rounded-md border p-4">
              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>App Role</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        {APP_ROLES.map(option => (
                          <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {requiresAppAccess && (
                <div className="grid gap-4 pt-3 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl><Input type="email" placeholder="employee@tabindamachinery.com" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {!employee && (
                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="Enter employee password" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>
              )}
              {!requiresAppAccess && (
                <p className="pt-2 text-xs text-muted-foreground">
                  Login credentials are not required for employees with no app access.
                </p>
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="position"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role / Designation (Job Title)</FormLabel>
                    <FormControl><Input placeholder="Sales Executive" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                        <SelectItem value="on_leave">On Leave</SelectItem>
                        <SelectItem value="terminated">Terminated</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="hireDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Joining Date</FormLabel>
                    <FormControl><Input type="date" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="baseSalary"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Base Salary</FormLabel>
                    <FormControl><Input type="number" min="0" step="0.01" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address</FormLabel>
                  <FormControl><Textarea rows={1} placeholder="Optional address" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-4 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {employee ? 'Update Employee' : 'Add Employee'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
