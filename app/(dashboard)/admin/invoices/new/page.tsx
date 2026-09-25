import { InvoiceForm } from '@/components/invoices/invoice-form'

export default function NewInvoicePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Create Invoice</h1>
        <p className="text-muted-foreground">
          Generate a new invoice for a customer
        </p>
      </div>

      <InvoiceForm />
    </div>
  )
}
