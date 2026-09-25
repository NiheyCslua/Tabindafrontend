'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Plus, Trash2, Loader2, AlertCircle } from 'lucide-react'
import { useInvoiceStore } from '@/lib/store/invoice-store'
import { useCustomerStore } from '@/lib/store/customer-store'
import { useAuthStore } from '@/lib/store/auth-store'
import type { PaymentMethod, CreateInvoiceDTO, Invoice, InvoiceStatus } from '@/lib/types'
import { formatCurrency } from '@/lib/utils/format'
import { FinancialAccountSelect } from '@/components/financial-accounts/financial-account-select'
import { PAYMENT_METHOD_LABELS, methodNeedsFinancialAccount, CREDIT_CARD_ACCOUNTS, type StandardPaymentMethod } from '@/lib/config/payment-methods'

// A Service Invoice line is just a description + a price — no product, no
// SKU, no serial numbers, no inventory impact (Change 4 & 5). This is a
// deliberately separate, simpler screen from the Product InvoiceForm
// (Change 3) — but it calls the exact same createInvoice/updateInvoice
// backend endpoints with invoiceType: 'service', so numbering, customers,
// payment methods, taxes, QR codes, printing, and reports are all the same
// shared engine (Change 2). Terms & Conditions never appears here (Change 7).
interface ServiceLineInput {
  description: string
  price: string  // kept as string while typing, parsed on submit/total
}

interface ServiceInvoiceFormProps {
  invoice?: Invoice | null
}

const emptyLine = (): ServiceLineInput => ({ description: '', price: '' })

export function ServiceInvoiceForm({ invoice: editInvoice }: ServiceInvoiceFormProps = {}) {
  const router = useRouter()
  const { user } = useAuthStore()
  const { createInvoice, updateInvoice, updateInvoiceStatus, isLoading } = useInvoiceStore()
  const { customers, fetchCustomers } = useCustomerStore()

  const isEditing = !!editInvoice

  const [customerName, setCustomerName] = useState(editInvoice?.customerName || '')
  const [customerPhone, setCustomerPhone] = useState(editInvoice?.customerPhone || '')
  const [selectedCustomerId, setSelectedCustomerId] = useState(editInvoice?.customerId || '')
  const [isManualEntry, setIsManualEntry] = useState(!editInvoice?.customerId)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(editInvoice?.paymentMethod || 'bank_transfer')
  const [financialAccountId, setFinancialAccountId] = useState<string>(editInvoice?.financialAccountId || '')
  const [notes, setNotes] = useState(editInvoice?.notes || '')
  const [poNumber, setPoNumber] = useState(editInvoice?.poNumber || '')
  const [dueDate, setDueDate] = useState(editInvoice?.dueDate ? editInvoice.dueDate.split('T')[0] : '')
  const [invoiceDate, setInvoiceDate] = useState(
    editInvoice?.createdAt ? editInvoice.createdAt.split('T')[0] : new Date().toISOString().split('T')[0]
  )
  const [invoiceStatus, setInvoiceStatus] = useState<InvoiceStatus>(editInvoice?.status || 'pending')
  const [submitError, setSubmitError] = useState('')

  const [lines, setLines] = useState<ServiceLineInput[]>(
    editInvoice?.items.length
      ? editInvoice.items.map(item => ({
          description: item.productName,
          price: String(item.unitPrice),
        }))
      : [emptyLine()]
  )

  useEffect(() => { fetchCustomers() }, [fetchCustomers])

  const selectedCustomer = customers.find(c => c.id === selectedCustomerId)

  const addLine = () => setLines(prev => [...prev, emptyLine()])
  const removeLine = (index: number) => setLines(prev => prev.filter((_, i) => i !== index))
  const updateLine = (index: number, field: keyof ServiceLineInput, value: string) => {
    setLines(prev => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: value }
      return updated
    })
  }

  const validLines = lines.filter(l => l.description.trim() && Number(l.price) > 0)
  const subtotal = validLines.reduce((sum, l) => sum + (Number(l.price) || 0), 0)
  const total = subtotal // Service Invoices: no tax/discount editing here — kept lean per Change 4's simple Description+Price table.

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitError('')

    if ((isManualEntry && !customerName.trim()) || validLines.length === 0 || !dueDate) return
    if (methodNeedsFinancialAccount(paymentMethod) && !financialAccountId) {
      setSubmitError(`Please select a financial account for ${PAYMENT_METHOD_LABELS[paymentMethod as StandardPaymentMethod] || 'this'} payments.`)
      return
    }

    const customerId = isManualEntry ? undefined : selectedCustomerId
    const customerNameToUse = isManualEntry ? customerName : selectedCustomer?.name || ''

    const dtoItems: CreateInvoiceDTO['items'] = validLines.map(line => ({
      productName: line.description.trim(),
      quantity: 1,
      unitPrice: Number(line.price) || 0,
      taxRate: 0,
      discount: 0,
    }))

    const data: CreateInvoiceDTO = {
      customerId,
      customerName: customerNameToUse,
      customerPhone: customerPhone.trim() || undefined,
      invoiceType: 'service',
      items: dtoItems,
      paymentMethod,
      financialAccountId: methodNeedsFinancialAccount(paymentMethod) ? financialAccountId : undefined,
      // No template, no termsAndConditions — Service Invoices never have
      // Terms & Conditions (Change 7). The backend also enforces this
      // server-side regardless of what's sent.
      invoiceDate: invoiceDate || undefined,
      notes: notes || undefined,
      poNumber: poNumber.trim() || undefined,
      shippingCost: 0,
      dueDate,
      status: invoiceStatus,
    }

    try {
      if (isEditing && editInvoice) {
        await updateInvoice(editInvoice.id, data)
      } else {
        await createInvoice(data, user?.name || 'Unknown')
      }
      const basePath = user?.role === 'admin' ? '/admin' : '/employee'
      router.push(`${basePath}/invoices`)
    } catch (error) {
      console.error('Error creating service invoice:', error)
      setSubmitError('There was an issue creating the service invoice. Please try again.')
    }
  }

  const handleStatusChange = async (status: string) => {
    const newStatus = status as InvoiceStatus
    setInvoiceStatus(newStatus)
    if (isEditing && editInvoice) {
      try {
        await updateInvoiceStatus(editInvoice.id, newStatus)
      } catch (error) {
        console.error('Error updating invoice status:', error)
      }
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Customer — same pattern as Product Invoices */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Customer Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsManualEntry(p => !p)}
              className="w-full mb-2"
            >
              {isManualEntry ? 'Select from List' : 'Enter Customer Name Manually'}
            </Button>
            {isManualEntry ? (
              <>
                <Input
                  placeholder="Enter customer name"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                />
                <div className="space-y-1.5">
                  <Label htmlFor="customerPhone" className="text-xs text-muted-foreground font-normal">
                    Customer Number <span className="font-normal">(optional)</span>
                  </Label>
                  <Input
                    id="customerPhone"
                    placeholder="Customer phone number"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                  />
                </div>
              </>
            ) : (
              <>
                <Select
                  value={selectedCustomerId}
                  onValueChange={(v) => {
                    setSelectedCustomerId(v)
                    const c = customers.find((c) => c.id === v)
                    setCustomerPhone(c?.phone || '')
                  }}
                >
                  <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
                  <SelectContent>
                    {customers.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="space-y-1.5">
                  <Label htmlFor="customerPhone" className="text-xs text-muted-foreground font-normal">
                    Customer Number <span className="font-normal">(optional)</span>
                  </Label>
                  <Input
                    id="customerPhone"
                    placeholder="Customer phone number"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                  />
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Invoice Details — no Invoice Template / Terms & Conditions here (Change 7) */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Invoice Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="poNumber">PO <span className="text-xs text-muted-foreground font-normal">(optional)</span></Label>
              <Input
                id="poNumber"
                value={poNumber}
                onChange={(e) => setPoNumber(e.target.value)}
                placeholder="Purchase order number"
              />
            </div>
            <div className="space-y-2">
              <Label>Payment Method</Label>
              <Select value={paymentMethod} onValueChange={(v) => { setPaymentMethod(v as PaymentMethod); if (!methodNeedsFinancialAccount(v)) setFinancialAccountId('') }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="credit_card">Credit Card</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {paymentMethod === 'bank_transfer' && (
              <div className="space-y-2">
                <Label>Received In <span className="text-destructive">*</span></Label>
                <FinancialAccountSelect value={financialAccountId} onChange={setFinancialAccountId} placeholder="Select bank / wallet" />
              </div>
            )}
            {paymentMethod === 'cheque' && (
              <div className="space-y-2">
                <Label>Received In <span className="text-destructive">*</span></Label>
                <FinancialAccountSelect value={financialAccountId} onChange={setFinancialAccountId} placeholder="Select bank account" />
              </div>
            )}
            {paymentMethod === 'credit_card' && (
              <div className="space-y-2">
                <Label>Received In <span className="text-destructive">*</span></Label>
                <FinancialAccountSelect value={financialAccountId} onChange={setFinancialAccountId} allowedNames={CREDIT_CARD_ACCOUNTS} placeholder="Select card settlement account" />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Additional notes..." rows={3} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invoiceDate">Invoice Date</Label>
              <Input id="invoiceDate" type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} className="h-8" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dueDate">Due Date</Label>
              <Input id="dueDate" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="h-8" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Service Line Items — description + price only (Change 4). No
          product picker, no SKU, no serial scanning, no inventory. */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="text-lg">Service Line Items</CardTitle>
            <Button type="button" size="sm" variant="outline" onClick={addLine} className="gap-1.5">
              <Plus className="h-3.5 w-3.5" /> Add Line
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {lines.map((line, index) => (
              <div key={index} className="flex items-start gap-3 rounded-lg border p-3">
                <div className="flex-1 space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Service Description</Label>
                  <Textarea
                    value={line.description}
                    onChange={(e) => updateLine(index, 'description', e.target.value)}
                    placeholder="e.g. Laptop motherboard repair"
                    rows={2}
                    className="text-sm"
                  />
                </div>
                <div className="w-36 space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Price</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={line.price}
                    onChange={(e) => updateLine(index, 'price', e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="mt-6 text-muted-foreground hover:text-destructive"
                  onClick={() => removeLine(index)}
                  disabled={lines.length === 1}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>

          {validLines.length > 0 && (
            <div className="mt-4 flex justify-end">
              <div className="w-72 space-y-2">
                <Separator />
                <div className="flex justify-between font-medium">
                  <span>Total</span>
                  <span className="text-lg">{formatCurrency(total)}</span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-lg">Invoice Status</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Invoice Status</Label>
            <Select value={invoiceStatus} onValueChange={handleStatusChange}>
              <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {submitError && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3">
          <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
          <p className="text-sm text-destructive">{submitError}</p>
        </div>
      )}

      <div className="flex justify-end gap-4">
        <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
        <Button
          type="submit"
          disabled={isLoading || (!customerName && !selectedCustomerId) || validLines.length === 0 || !dueDate}
        >
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isEditing ? 'Save Changes' : 'Create Service Invoice'}
        </Button>
      </div>
    </form>
  )
}
