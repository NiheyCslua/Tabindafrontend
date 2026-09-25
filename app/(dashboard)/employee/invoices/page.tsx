'use client'

import {
  useEffect,
  useState,
  useMemo,
  useRef,
} from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { InvoiceTable } from '@/components/invoices/invoice-table'
import { InvoiceDetailsModal } from '@/components/invoices/invoice-details-modal'
import { InvoicePrintView } from '@/components/invoices/invoice-print-view'
import { printHtmlElement } from '@/lib/utils/print-html'
import { useInvoiceStore } from '@/lib/store/invoice-store'

import type {
  Invoice,
  InvoiceStatus,
} from '@/lib/types'

export default function EmployeeInvoicesPage() {
  const router = useRouter()

  const fetchInvoices = useInvoiceStore(
    (state) => state.fetchInvoices
  )

  const fetchInvoiceById = useInvoiceStore(
    (state) => state.fetchInvoiceById
  )

  const updateInvoiceStatus = useInvoiceStore(
    (state) => state.updateInvoiceStatus
  )

  const isLoading = useInvoiceStore(
    (state) => state.isLoading
  )

  const allInvoices = useInvoiceStore(
    (state) =>
      Array.isArray(state.invoices)
        ? state.invoices
        : []
  )

  const filters = useInvoiceStore(
    (state) => state.filters
  )

  const [selectedInvoice, setSelectedInvoice] =
    useState<Invoice | null>(null)

  const [detailsOpen, setDetailsOpen] =
    useState(false)

  const [printInvoice, setPrintInvoice] =
    useState<Invoice | null>(null)

  useEffect(() => {
    fetchInvoices()
  }, [fetchInvoices])

  const invoices = useMemo(() => {
    return allInvoices.filter((invoice) => {
      if (filters.search) {
        const searchLower =
          filters.search.toLowerCase()

        const matchesSearch =
          invoice.invoiceNumber
            .toLowerCase()
            .includes(searchLower) ||
          invoice.customerName
            .toLowerCase()
            .includes(searchLower)

        if (!matchesSearch) {
          return false
        }
      }

      if (
        filters.status &&
        invoice.status !== filters.status
      ) {
        return false
      }

      if (filters.startDate) {
        const invoiceDate = new Date(
          invoice.createdAt
        )

        const startDate = new Date(
          filters.startDate
        )

        if (invoiceDate < startDate) {
          return false
        }
      }

      if (filters.endDate) {
        const invoiceDate = new Date(
          invoice.createdAt
        )

        const endDate = new Date(
          filters.endDate
        )

        if (invoiceDate > endDate) {
          return false
        }
      }

      return true
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }, [allInvoices, filters])

  const handleView = (
    invoice: Invoice
  ) => {
    setSelectedInvoice(invoice)
    setDetailsOpen(true)
  }

  const handleEdit = (
    invoice: Invoice
  ) => {
    router.push(
      `/employee/invoices/${invoice.id}/edit`
    )
  }

  const handleStatusChange = async (
    id: string,
    status: InvoiceStatus
  ) => {
    await updateInvoiceStatus(
      id,
      status
    )
  }

  const printRef =
  useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!printInvoice) return

    const timer = window.setTimeout(() => {
      printHtmlElement(printRef.current, `Invoice-${printInvoice.invoiceNumber}`)
      setPrintInvoice(null)
    }, 150)

    return () =>
      window.clearTimeout(timer)
  }, [printInvoice])

  const handlePrintInvoice = async (
    invoice: Invoice
  ) => {
    try {
      const fullInvoice =
        await fetchInvoiceById(
          invoice.id
        )

      setPrintInvoice(fullInvoice ?? invoice)
    } catch (error) {
      console.error(
        'Failed to load invoice',
        error
      )
    }
  }

  if (
    isLoading &&
    invoices.length === 0
  ) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-muted-foreground">
          Loading invoices...
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Invoices
          </h1>

          <p className="text-muted-foreground">
            View and manage invoices
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() =>
              router.push(
                '/employee/invoices/new-service'
              )
            }
          >
            <Plus className="mr-2 h-4 w-4" />
            Create Service Invoice
          </Button>
          <Button
            onClick={() =>
              router.push(
                '/employee/invoices/new'
              )
            }
          >
            <Plus className="mr-2 h-4 w-4" />
            Create Invoice
          </Button>
        </div>
      </div>

      <InvoiceTable
        invoices={invoices}
        onView={handleView}
        onStatusChange={
          handleStatusChange
        }
        onPrint={
          handlePrintInvoice
        }
        onEdit={handleEdit}
      />

      <InvoiceDetailsModal
        invoice={selectedInvoice}
        open={detailsOpen}
        onOpenChange={
          setDetailsOpen
        }
        onPrint={
          handlePrintInvoice
        }
        onEdit={handleEdit}
      />

      <div
        style={{
          position: 'fixed',
          left: '-10000px',
          top: 0,
          background: 'white',
          zIndex: -1,
        }}
      >
        {printInvoice && (
  <InvoicePrintView
    ref={printRef}
    invoice={printInvoice}
  />
)}
      </div>
    </div>
  )
}