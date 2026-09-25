'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'

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
import { InvoiceTable } from '@/components/invoices/invoice-table'
import { InvoiceDetailsModal } from '@/components/invoices/invoice-details-modal'
import { InvoicePrintView } from '@/components/invoices/invoice-print-view'
import { printHtmlElement } from '@/lib/utils/print-html'
import { useInvoiceStore, getFilteredInvoices } from '@/lib/store/invoice-store'
import { useAuthStore } from '@/lib/store/auth-store'
import type { Invoice, InvoiceStatus } from '@/lib/types'

const AdminInvoicesPage = () => {
  const router = useRouter()
  const printRef = useRef<HTMLDivElement>(null)

  const invoicesState = useInvoiceStore((state) => state)
  const fetchInvoices = invoicesState.fetchInvoices
  const updateInvoiceStatus = invoicesState.updateInvoiceStatus
  const deleteInvoice = invoicesState.deleteInvoice
  const isLoading = invoicesState.isLoading
  const currentUser = useAuthStore((state) => state.user)
  const isAdmin = currentUser?.role === 'admin'

  const invoices = useMemo(() => {
    return getFilteredInvoices(invoicesState)
  }, [invoicesState])

  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [printInvoice, setPrintInvoice] = useState<Invoice | null>(null)
  const [invoiceToDelete, setInvoiceToDelete] = useState<Invoice | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    if (!isAdmin) return
    fetchInvoices()
  }, [fetchInvoices, isAdmin])

  useEffect(() => {
    if (!printInvoice) return

    const timer = window.setTimeout(() => {
      printHtmlElement(printRef.current, `Invoice-${printInvoice.invoiceNumber}`)
      setPrintInvoice(null)
    }, 150)

    return () => window.clearTimeout(timer)
  }, [printInvoice])

  const handleView = (invoice: Invoice) => {
    setSelectedInvoice(invoice)
    setDetailsOpen(true)
  }

  const handleEdit = (invoice: Invoice) => {
    router.push(`/admin/invoices/${invoice.id}/edit`)
  }

  const handleStatusChange = async (id: string, status: InvoiceStatus) => {
    await updateInvoiceStatus(id, status)
  }

  const handlePrintInvoice = (invoice: Invoice) => {
    setPrintInvoice(invoice)
  }

  const handleDelete = (invoice: Invoice) => {
    if (!isAdmin) return
    setInvoiceToDelete(invoice)
    setDeleteError(null)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!invoiceToDelete || !isAdmin) return

    setIsDeleting(true)
    setDeleteError(null)
    try {
      await deleteInvoice(invoiceToDelete.id)
      if (selectedInvoice?.id === invoiceToDelete.id) {
        setSelectedInvoice(null)
        setDetailsOpen(false)
      }
      setDeleteDialogOpen(false)
      setInvoiceToDelete(null)
    } catch (error: any) {
      setDeleteError(error.message || 'Failed to delete invoice')
    } finally {
      setIsDeleting(false)
    }
  }

  if (!currentUser) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-muted-foreground">Loading invoices...</div>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl font-semibold">Admin access required</h1>
          <p className="mt-2 text-muted-foreground">Only admin users can manage invoices from this page.</p>
        </div>
      </div>
    )
  }

  if (isLoading && invoices.length === 0) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-muted-foreground">Loading invoices...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Invoices</h1>
          <p className="text-muted-foreground">Manage and track all invoices</p>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push('/admin/invoices/new-service')}>
            <Plus className="mr-2 h-4 w-4" />
            Create Service Invoice
          </Button>
          <Button onClick={() => router.push('/admin/invoices/new')}>
            <Plus className="mr-2 h-4 w-4" />
            Create Invoice
          </Button>
        </div>
      </div>

      <InvoiceTable
        invoices={invoices}
        onView={handleView}
        onStatusChange={handleStatusChange}
        onPrint={handlePrintInvoice}
        onEdit={handleEdit}
        onDelete={handleDelete}
        isAdmin={isAdmin}
      />

      <InvoiceDetailsModal
        invoice={selectedInvoice}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        onPrint={handlePrintInvoice}
        onEdit={handleEdit}
        onDelete={isAdmin ? handleDelete : undefined}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Invoice</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {invoiceToDelete?.invoiceNumber}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>

          {deleteError && (
            <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {deleteError}
            </p>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={isDeleting || !isAdmin}
              onClick={(event) => {
                event.preventDefault()
                confirmDelete()
              }}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="hidden">
        {printInvoice && <InvoicePrintView ref={printRef} invoice={printInvoice} />}
      </div>
    </div>
  )
}

export default AdminInvoicesPage