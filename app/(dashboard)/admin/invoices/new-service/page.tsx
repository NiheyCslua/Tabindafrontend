import { ServiceInvoiceForm } from '@/components/invoices/service-invoice-form'

export default function NewServiceInvoicePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Create Service Invoice</h1>
        <p className="text-muted-foreground">
          Bill for repairs, maintenance, installation, or other labour-based work
        </p>
      </div>

      <ServiceInvoiceForm />
    </div>
  )
}
