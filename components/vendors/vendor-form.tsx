"use client"

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2 } from 'lucide-react'
import type { Vendor, CreateVendorDTO } from '@/lib/types'

const vendorSchema = z.object({
  name: z.string().min(2, 'Contact name is required'),
  company: z.string().min(2, 'Company name is required'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().min(7, 'Contact number is required'),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  status: z.enum(['active', 'inactive']),
  notes: z.string().optional(),
})

type VendorFormValues = z.infer<typeof vendorSchema>

interface VendorFormProps {
  vendor?: Vendor | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: CreateVendorDTO) => Promise<void>
  isLoading?: boolean
}

export function VendorForm({ vendor, open, onOpenChange, onSubmit, isLoading }: VendorFormProps) {
  const form = useForm<VendorFormValues>({
    resolver: zodResolver(vendorSchema),
    defaultValues: {
      name: '', company: '', email: '', phone: '',
      address: '', city: '', state: '', country: 'Pakistan',
      status: 'active', notes: '',
    },
  })

  useEffect(() => {
    if (vendor) {
      form.reset({
        name: vendor.name, company: vendor.company,
        email: vendor.email, phone: vendor.phone,
        address: vendor.address, city: vendor.city,
        state: vendor.state, country: vendor.country,
        status: vendor.status, notes: vendor.notes || '',
      })
    } else {
      form.reset({
        name: '', company: '', email: '', phone: '',
        address: '', city: '', state: '', country: 'Pakistan',
        status: 'active', notes: '',
      })
    }
  }, [vendor, open, form])

  const handleSubmit = async (values: VendorFormValues) => {
    await onSubmit(values)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{vendor ? 'Edit Vendor' : 'Add Vendor'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Contact Name <span className="text-destructive">*</span></FormLabel>
                  <FormControl><Input {...field} placeholder="John Doe" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="company" render={({ field }) => (
                <FormItem>
                  <FormLabel>Company Name <span className="text-destructive">*</span></FormLabel>
                  <FormControl><Input {...field} placeholder="Acme Ltd" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem>
                  <FormLabel>Email <span className="text-xs text-muted-foreground font-normal">(optional)</span></FormLabel>
                  <FormControl><Input {...field} type="email" placeholder="vendor@example.com" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="phone" render={({ field }) => (
                <FormItem>
                  <FormLabel>Contact Number <span className="text-destructive">*</span></FormLabel>
                  <FormControl><Input {...field} placeholder="+92 300 1234567" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <FormField control={form.control} name="address" render={({ field }) => (
              <FormItem>
                <FormLabel>Address <span className="text-xs text-muted-foreground font-normal">(optional)</span></FormLabel>
                <FormControl><Input {...field} placeholder="Street address" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="grid grid-cols-3 gap-4">
              <FormField control={form.control} name="city" render={({ field }) => (
                <FormItem>
                  <FormLabel>City <span className="text-xs text-muted-foreground font-normal">(optional)</span></FormLabel>
                  <FormControl><Input {...field} placeholder="Islamabad" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="state" render={({ field }) => (
                <FormItem>
                  <FormLabel>State / Province <span className="text-xs text-muted-foreground font-normal">(optional)</span></FormLabel>
                  <FormControl><Input {...field} placeholder="Punjab" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="country" render={({ field }) => (
                <FormItem>
                  <FormLabel>Country <span className="text-xs text-muted-foreground font-normal">(optional)</span></FormLabel>
                  <FormControl><Input {...field} placeholder="Pakistan" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <FormField control={form.control} name="status" render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="notes" render={({ field }) => (
              <FormItem>
                <FormLabel>Notes (Optional)</FormLabel>
                <FormControl><Textarea {...field} placeholder="Additional notes..." rows={3} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {vendor ? 'Save Changes' : 'Add Vendor'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
