"use client"

import { useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { VendorTable } from '@/components/vendors/vendor-table'
import { VendorForm } from '@/components/vendors/vendor-form'
import { VendorDetailsModal } from '@/components/vendors/vendor-details-modal'
import { useVendorStore } from '@/lib/store/vendor-store'
import { useBillStore } from '@/lib/store/bill-store'
import type { Vendor, CreateVendorDTO } from '@/lib/types'

export default function AdminVendorsPage() {
  const { vendors, fetchVendors, createVendor, updateVendor, deleteVendor, isLoading } = useVendorStore()
  const { fetchBills } = useBillStore()

  const [formOpen, setFormOpen] = useState(false)
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null)
  const [viewModalOpen, setViewModalOpen] = useState(false)
  const [viewVendor, setViewVendor] = useState<Vendor | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [vendorToDelete, setVendorToDelete] = useState<Vendor | null>(null)

  useEffect(() => { fetchVendors(); fetchBills() }, [fetchVendors, fetchBills])

  const handleView = (vendor: Vendor) => { setViewVendor(vendor); setViewModalOpen(true) }
  const handleEdit = (vendor: Vendor) => { setSelectedVendor(vendor); setFormOpen(true) }
  const handleDelete = (vendor: Vendor) => { setVendorToDelete(vendor); setDeleteDialogOpen(true) }

  const confirmDelete = async () => {
    if (vendorToDelete) {
      await deleteVendor(vendorToDelete.id)
      setDeleteDialogOpen(false)
      setVendorToDelete(null)
    }
  }

  const handleSubmit = async (data: CreateVendorDTO) => {
    if (selectedVendor) {
      await updateVendor(selectedVendor.id, data)
    } else {
      await createVendor(data)
    }
    setSelectedVendor(null)
  }

  const handleOpenChange = (open: boolean) => {
    setFormOpen(open)
    if (!open) setSelectedVendor(null)
  }

  if (isLoading && vendors.length === 0) {
    return <div className="flex items-center justify-center h-96"><div className="text-muted-foreground">Loading vendors...</div></div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Vendors</h1>
          <p className="text-muted-foreground">Manage your vendor and supplier database</p>
        </div>
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Add Vendor
        </Button>
      </div>

      <VendorTable vendors={vendors} onView={handleView} onEdit={handleEdit} onDelete={handleDelete} />

      <VendorDetailsModal vendor={viewVendor} open={viewModalOpen} onOpenChange={setViewModalOpen} />

      <VendorForm vendor={selectedVendor} open={formOpen} onOpenChange={handleOpenChange} onSubmit={handleSubmit} isLoading={isLoading} />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Vendor</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {vendorToDelete?.company}? This action cannot be undone.
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
