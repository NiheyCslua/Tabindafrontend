"use client"

import { useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { BillTable } from '@/components/bills/bill-table'
import { BillForm } from '@/components/bills/bill-form'
import { BillDetailsModal } from '@/components/bills/bill-details-modal'
import { useBillStore } from '@/lib/store/bill-store'
import { useVendorStore } from '@/lib/store/vendor-store'
import { useAuthStore } from '@/lib/store/auth-store'
import type { Bill, CreateBillDTO, BillStatus, BillType } from '@/lib/types'

export default function AdminBillsPage() {
  const { bills, fetchBills, createBill, updateBill, updateBillStatus, deleteBill, isLoading } = useBillStore()
  const { vendors, fetchVendors } = useVendorStore()
  const { user } = useAuthStore()

  const [formOpen, setFormOpen] = useState(false)
  const [formBillType, setFormBillType] = useState<BillType>('CREDIT')
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null)
  const [viewBill, setViewBill] = useState<Bill | null>(null)
  const [viewModalOpen, setViewModalOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [billToDelete, setBillToDelete] = useState<Bill | null>(null)

  useEffect(() => { fetchBills(); fetchVendors() }, [fetchBills, fetchVendors])

  const handleView = (bill: Bill) => { setViewBill(bill); setViewModalOpen(true) }
  const handleEdit = (bill: Bill) => { setSelectedBill(bill); setFormBillType(bill.billType); setFormOpen(true); setViewModalOpen(false) }
  const handleDelete = (bill: Bill) => { setBillToDelete(bill); setDeleteDialogOpen(true) }

  const confirmDelete = async () => {
    if (billToDelete) {
      await deleteBill(billToDelete.id)
      setDeleteDialogOpen(false)
      setBillToDelete(null)
    }
  }

  const handleSubmit = async (data: CreateBillDTO) => {
    let result
    if (selectedBill) {
      result = await updateBill(selectedBill.id, data)
    } else {
      result = await createBill(data, user?.name || 'Admin')
    }
    setSelectedBill(null)
    return result as { duplicateWarning?: string } | void
  }

  const handleOpenChange = (open: boolean) => {
    setFormOpen(open)
    if (!open) setSelectedBill(null)
  }

  const handleStatusChange = async (id: string, status: BillStatus) => {
    await updateBillStatus(id, status)
  }

  if (isLoading && bills.length === 0) {
    return <div className="flex items-center justify-center h-96"><div className="text-muted-foreground">Loading bills...</div></div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Bills</h1>
          <p className="text-muted-foreground">Track and manage vendor bills and payments</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => { setFormBillType('DEBIT'); setFormOpen(true) }}>
            <Plus className="mr-2 h-4 w-4" /> Debit Bill
          </Button>
          <Button onClick={() => { setFormBillType('CREDIT'); setFormOpen(true) }}>
            <Plus className="mr-2 h-4 w-4" /> Add Bill
          </Button>
        </div>
      </div>

      <BillTable
        bills={[...bills].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())}
        onView={handleView}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onStatusChange={handleStatusChange}
      />

      <BillDetailsModal
        bill={viewBill}
        open={viewModalOpen}
        onOpenChange={setViewModalOpen}
        onEdit={handleEdit}
      />

      <BillForm
        bill={selectedBill}
        vendors={vendors}
        open={formOpen}
        onOpenChange={handleOpenChange}
        onSubmit={handleSubmit}
        isLoading={isLoading}
        defaultBillType={formBillType}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Bill</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete bill {billToDelete?.billNumber}? This action cannot be undone.
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
