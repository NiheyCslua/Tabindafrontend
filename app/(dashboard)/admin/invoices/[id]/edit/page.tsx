'use client'

import { use } from 'react'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { DashboardHeader } from '@/components/dashboard/dashboard-header'
import { InvoiceForm } from '@/components/invoices/invoice-form'
import { ServiceInvoiceForm } from '@/components/invoices/service-invoice-form'
import { useInvoiceStore } from '@/lib/store/invoice-store'
import type { Invoice } from '@/lib/types'

export default function AdminEditInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const fetchInvoiceById = useInvoiceStore((state) => state.fetchInvoiceById)
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      // Always fetch this invoice fresh from the server — never fall back
      // to whatever the invoices list happened to have cached in memory.
      // That cache can be stale (e.g. loaded earlier in this session,
      // before a Terms & Conditions edit made elsewhere), and editing from
      // a stale copy would silently discard the newer saved changes.
      const found = await fetchInvoiceById(id)
      if (cancelled) return
      if (!found) {
        router.push('/admin/invoices')
        return
      }
      setInvoice(found)
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [id, fetchInvoiceById, router])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen">
      <DashboardHeader
        title={`Edit Invoice ${invoice?.invoiceNumber}`}
        description="Update the invoice details below"
      />
      <div className="flex-1 p-4 md:p-6">
        {invoice?.invoiceType === 'service' ? (
          <ServiceInvoiceForm invoice={invoice} />
        ) : (
          <InvoiceForm invoice={invoice} />
        )}
      </div>
    </div>
  )
}
