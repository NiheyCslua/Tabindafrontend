"use client"

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
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
import { Plus } from 'lucide-react'
import { CustomerTable } from '@/components/customers/customer-table'
import { CustomerForm } from '@/components/customers/customer-form'
import { CustomerDetailsModal } from '@/components/customers/customer-details-modal'
import { useCustomerStore } from '@/lib/store/customer-store'
import type { Customer, CreateCustomerDTO } from '@/lib/types'

export default function AdminCustomersPage() {
  const { 
    customers, 
    fetchCustomers, 
    createCustomer, 
    updateCustomer, 
    deleteCustomer,
    isLoading 
  } = useCustomerStore()
  
  const [formOpen, setFormOpen] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [viewModalOpen, setViewModalOpen] = useState(false)
  const [viewCustomer, setViewCustomer] = useState<Customer | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null)

  useEffect(() => {
    fetchCustomers()
  }, [fetchCustomers])

  const handleEdit = (customer: Customer) => {
    setSelectedCustomer(customer)
    setFormOpen(true)
  }

  const handleView = (customer: Customer) => {
    setViewCustomer(customer)
    setViewModalOpen(true)
  }

  const handleDelete = (customer: Customer) => {
    setCustomerToDelete(customer)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (customerToDelete) {
      await deleteCustomer(customerToDelete.id)
      setDeleteDialogOpen(false)
      setCustomerToDelete(null)
    }
  }

  const handleSubmit = async (data: CreateCustomerDTO) => {
    if (selectedCustomer) {
      await updateCustomer(selectedCustomer.id, data)
    } else {
      await createCustomer(data)
    }
    setSelectedCustomer(null)
  }

  const handleOpenChange = (open: boolean) => {
    setFormOpen(open)
    if (!open) {
      setSelectedCustomer(null)
    }
  }

  if (isLoading && customers.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-muted-foreground">Loading customers...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Customers</h1>
          <p className="text-muted-foreground">
            Manage your customer database
          </p>
        </div>
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Customer
        </Button>
      </div>

      <CustomerTable
        customers={customers}
        onView={handleView}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      <CustomerDetailsModal
        customer={viewCustomer}
        open={viewModalOpen}
        onOpenChange={setViewModalOpen}
      />

      <CustomerForm
        customer={selectedCustomer}
        open={formOpen}
        onOpenChange={handleOpenChange}
        onSubmit={handleSubmit}
        isLoading={isLoading}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Customer</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {customerToDelete?.name}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-white hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
