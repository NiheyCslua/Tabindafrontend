'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { InvoiceStatus } from '@/lib/types'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import {
  Command,
  CommandInput,
  CommandList,
  CommandItem,
  CommandEmpty,
  CommandGroup,
} from '@/components/ui/command'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Plus, Trash2, Loader2, ScanBarcode, AlertCircle, X, CheckCircle2, PackagePlus, FileText } from 'lucide-react'
import { useInvoiceStore } from '@/lib/store/invoice-store'
import { useCustomerStore } from '@/lib/store/customer-store'
import { useInventoryStore } from '@/lib/store/inventory-store'
import { useAuthStore } from '@/lib/store/auth-store'
import { useSerialStore } from '@/lib/store/serial-store'
import { ProductForm } from '@/components/inventory/product-form'
import type { PaymentMethod, CreateInvoiceDTO, InvoiceTemplate, Invoice, CreateProductDTO } from '@/lib/types'
import { useTemplateStore, getTemplateFromStore } from '@/lib/store/template-store'
import { buildDefaultTermsText } from '@/lib/config/invoice-templates'
import { formatCurrency } from '@/lib/utils/format'
import { FinancialAccountSelect } from '@/components/financial-accounts/financial-account-select'
import { PAYMENT_METHOD_LABELS, methodNeedsFinancialAccount, CREDIT_CARD_ACCOUNTS, type StandardPaymentMethod } from '@/lib/config/payment-methods'

// One entry per scanned serial number within a line item
interface ScannedSerial {
  value: string
  error: string   // empty = valid
}

interface LineItemInput {
  productId: string
  productName: string
  productSku: string
  productImage: string
  // Invoice Product Description (Editable Per Line Item): copied from the
  // product's description when the line is added, then owned by this
  // invoice line alone — editing it never touches the Product Master.
  productDescription: string
  baseSellingPrice: number
  unitPrice: number
  unitPriceInput: string
  taxRate: number
  discount: number
  serials: ScannedSerial[]  // one per physical unit being sold
}

interface InvoiceFormProps {
  invoice?: Invoice | null
}

export function InvoiceForm({ invoice: editInvoice }: InvoiceFormProps = {}) {
  const router = useRouter()
  const { user } = useAuthStore()
  const { templates: invoiceTemplates } = useTemplateStore()
  const { createInvoice, updateInvoice, isLoading } = useInvoiceStore()
  const { customers, fetchCustomers } = useCustomerStore()
  const { products, fetchProducts, addProduct } = useInventoryStore()
  const { fetchUnits, findBySerial } = useSerialStore()

  const isEditing = !!editInvoice

  const [customerName, setCustomerName] = useState(editInvoice?.customerName || '')
  const [customerPhone, setCustomerPhone] = useState(editInvoice?.customerPhone || '')
  const [selectedCustomerId, setSelectedCustomerId] = useState(editInvoice?.customerId || '')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(editInvoice?.paymentMethod || 'bank_transfer')
  const [financialAccountId, setFinancialAccountId] = useState<string>(editInvoice?.financialAccountId || '')

  // Add To Inventory modal
  const [productFormOpen, setProductFormOpen] = useState(false)
  const [productFormLoading, setProductFormLoading] = useState(false)
  const [invoiceTemplate, setInvoiceTemplate] = useState<InvoiceTemplate>(editInvoice?.template || invoiceTemplates[0]?.id || '')
  // Invoice Terms & Conditions (Editable Per Invoice): the template only
  // supplies the *default* text. An existing invoice's saved copy always
  // wins here — we never re-derive it from the template on load, even if
  // the template has since changed (Change 3/4). Only a genuinely new
  // invoice, or one saved before this feature existed, falls back to the
  // template's current default text.
  const [termsAndConditions, setTermsAndConditions] = useState<string>(
    editInvoice?.termsAndConditions ?? buildDefaultTermsText(getTemplateFromStore(editInvoice?.template))
  )
  const [notes, setNotes] = useState(editInvoice?.notes || '')
  const [poNumber, setPoNumber] = useState(editInvoice?.poNumber || '')
  const [dueDate, setDueDate] = useState(editInvoice?.dueDate ? editInvoice.dueDate.split('T')[0] : '')
  const [invoiceDate, setInvoiceDate] = useState(
    editInvoice?.createdAt
      ? editInvoice.createdAt.split('T')[0]
      : new Date().toISOString().split('T')[0]
  )
  const [shippingCostInput, setShippingCostInput] = useState(
    editInvoice?.shippingCost ? String(editInvoice.shippingCost) : ''
  )

  // Rebuild line items from an existing invoice being edited
  const [lineItems, setLineItems] = useState<LineItemInput[]>(
    editInvoice?.items.map((item) => ({
      productId: item.productId,
      productName: item.productName,
      productSku: item.productSku,
      productImage: '',
      // Change 7: load the description stored with this invoice line —
      // never regenerate it from the Product Master.
      productDescription: item.productDescription ?? '',
      baseSellingPrice: item.unitPrice,
      unitPrice: item.unitPrice,
      unitPriceInput: String(item.unitPrice),
      taxRate: item.taxRate,
      discount: item.discount,
      serials: (item.serialNumbers && item.serialNumbers.length > 0
        ? item.serialNumbers
        : item.serialNumber
          ? [item.serialNumber]
          : []
      ).map(serial => ({ value: serial, error: '' })),
    })) || []
  )

  // Per-row scan input value (separate from committed serials)
  const [scanInputs, setScanInputs] = useState<string[]>(
    editInvoice?.items.map(() => '') || []
  )

  // Invoice Product Description popover: which row (by index) is currently
  // open, and a draft buffer so Cancel can revert without touching the
  // committed lineItems state (Change 1).
  const [descriptionPopoverIndex, setDescriptionPopoverIndex] = useState<number | null>(null)
  const [descriptionDraft, setDescriptionDraft] = useState('')

  const [isManualEntry, setIsManualEntry] = useState(!editInvoice?.customerId)
  const [productSearchTerm, setProductSearchTerm] = useState('')
  const [filteredProducts, setFilteredProducts] = useState(products)
  const [productOpen, setProductOpen] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [invoiceStatus, setInvoiceStatus] = useState<InvoiceStatus>(editInvoice?.status || 'pending')

  // Refs so we can auto-focus the scan input of a newly added row
  const scanInputRefs = useRef<(HTMLInputElement | null)[]>([])

  const { updateInvoiceStatus } = useInvoiceStore()

  useEffect(() => {
    fetchCustomers()
    fetchProducts()
    fetchUnits()
  }, [fetchCustomers, fetchProducts, fetchUnits])

  useEffect(() => {
    if (productSearchTerm) {
      setFilteredProducts(
        products.filter((p) =>
          p.name.toLowerCase().includes(productSearchTerm.toLowerCase()) ||
          p.sku.toLowerCase().includes(productSearchTerm.toLowerCase()) ||
          (p.barcode ?? '').toLowerCase().includes(productSearchTerm.toLowerCase())
        )
      )
    } else {
      setFilteredProducts(products)
    }
  }, [productSearchTerm, products])

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId)

  // ── Line item management ─────────────────────────────────────────────────────

  const addLineItem = (productId: string) => {
    const product = products.find((p) => p.id === productId)
    if (!product) return

    // Allow Negative Inventory During Invoice Creation: products remain
    // selectable regardless of current stock — being out of stock (or
    // already negative) never blocks a sale. The "Out of Stock" label in
    // the picker below is informational only.

    const existingIndex = lineItems.findIndex((item) => item.productId === product.id)
    if (existingIndex !== -1) {
      // Product already in list — just focus its scan input
      setProductOpen(false)
      setTimeout(() => scanInputRefs.current[existingIndex]?.focus(), 50)
      return
    }

    setLineItems(prev => [
      ...prev,
      {
        productId: product.id,
        productName: product.name,
        productSku: product.sku,
        productImage: product.image || '',
        // Change 2: auto-populate from the Product Master's description.
        // From this point on the invoice owns its own copy — editing here
        // never touches product.description (Change 3).
        productDescription: product.description || '',
        baseSellingPrice: product.sellingPrice,
        unitPrice: product.sellingPrice,
        unitPriceInput: String(product.sellingPrice),
        taxRate: product.taxRate,
        discount: 0,
        serials: [],
      },
    ])
    setScanInputs(prev => [...prev, ''])
    setProductOpen(false)

    // Focus the new row's scan input after render
    setTimeout(() => {
      const newIndex = lineItems.length
      scanInputRefs.current[newIndex]?.focus()
    }, 80)
  }

  const removeLineItem = (index: number) => {
    setLineItems(prev => prev.filter((_, i) => i !== index))
    setScanInputs(prev => prev.filter((_, i) => i !== index))
    scanInputRefs.current = scanInputRefs.current.filter((_, i) => i !== index)
    if (descriptionPopoverIndex === index) setDescriptionPopoverIndex(null)
  }

  const updateLineItemField = (
    index: number,
    field: keyof Omit<LineItemInput, 'serials'>,
    value: string | number
  ) => {
    setLineItems(prev => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: value }
      return updated
    })
  }

  // ── Description popover (Invoice Product Description — Editable Per Line Item) ──

  const openDescriptionPopover = (index: number) => {
    setDescriptionDraft(lineItems[index]?.productDescription || '')
    setDescriptionPopoverIndex(index)
  }

  const saveDescriptionPopover = () => {
    if (descriptionPopoverIndex === null) return
    updateLineItemField(descriptionPopoverIndex, 'productDescription', descriptionDraft)
    setDescriptionPopoverIndex(null)
  }

  const cancelDescriptionPopover = () => {
    setDescriptionPopoverIndex(null)
  }

  // ── Serial scanning ──────────────────────────────────────────────────────────

  const validateSerial = (serial: string, rowIndex: number, existingSerials: ScannedSerial[]): string => {
    const trimmed = serial.trim()
    if (!trimmed) return ''

    // Check if it already exists in this row
    if (existingSerials.some(s => s.value === trimmed)) {
      return 'Already scanned on this product.'
    }

    // Check if used in another row of this invoice
    for (let i = 0; i < lineItems.length; i++) {
      if (i === rowIndex) continue
      if (lineItems[i].serials.some(s => s.value === trimmed)) {
        return 'Already on another line in this invoice.'
      }
    }

    const unit = findBySerial(trimmed)
    if (!unit) return 'Serial number not found in inventory.'
    if (unit.productId !== lineItems[rowIndex].productId) {
      return `Belongs to "${unit.productName}", not "${lineItems[rowIndex].productName}".`
    }
    if (unit.status !== 'in_stock') return unit.status === 'sold' ? 'This unit has already been sold.' : 'This unit is not currently in stock.'

    return ''
  }

  // Called when the user presses Enter or the input fires a scanner "submit"
  const commitSerial = (rowIndex: number) => {
    const raw = (scanInputs[rowIndex] ?? '').trim()
    if (!raw) return

    const error = validateSerial(raw, rowIndex, lineItems[rowIndex].serials)
    const newSerial: ScannedSerial = { value: raw, error }

    setLineItems(prev => {
      const updated = [...prev]
      updated[rowIndex] = {
        ...updated[rowIndex],
        serials: [...updated[rowIndex].serials, newSerial],
      }
      return updated
    })

    // Clear the scan input and keep focus for rapid scanning
    setScanInputs(prev => {
      const next = [...prev]
      next[rowIndex] = ''
      return next
    })
    setTimeout(() => scanInputRefs.current[rowIndex]?.focus(), 0)
  }

  const removeSerial = (rowIndex: number, serialIndex: number) => {
    setLineItems(prev => {
      const updated = [...prev]
      updated[rowIndex] = {
        ...updated[rowIndex],
        serials: updated[rowIndex].serials.filter((_, i) => i !== serialIndex),
      }
      return updated
    })
  }

  // ── Price logic ──────────────────────────────────────────────────────────────

  const handleUnitPriceInputChange = (index: number, value: string) => {
    updateLineItemField(index, 'unitPriceInput', value)
  }

  const handleUnitPriceBlur = (index: number) => {
    const item = lineItems[index]
    const parsedValue = parseFloat(item.unitPriceInput)
    let nextPrice = Number.isNaN(parsedValue) ? item.baseSellingPrice : parsedValue
    if (user?.role === 'employee' && nextPrice < item.baseSellingPrice) {
      nextPrice = item.baseSellingPrice
    }
    setLineItems(prev => {
      const updated = [...prev]
      updated[index] = { ...updated[index], unitPrice: nextPrice, unitPriceInput: String(nextPrice) }
      return updated
    })
  }

  const handleShippingCostChange = (value: string) => {
    if (/^\d*\.?\d{0,2}$/.test(value)) {
      setShippingCostInput(value)
    }
  }

  // ── Totals ───────────────────────────────────────────────────────────────────

  const getQuantity = (item: LineItemInput) => Math.max(item.serials.length, 1)

  const calculateItemTotal = (item: LineItemInput) => {
    const qty = getQuantity(item)
    const sub = qty * item.unitPrice
    return sub + sub * (item.taxRate / 100) - sub * (item.discount / 100)
  }

  const subtotal = lineItems.reduce((s, item) => s + getQuantity(item) * item.unitPrice, 0)
  const taxAmount = lineItems.reduce((s, item) => s + (getQuantity(item) * item.unitPrice * item.taxRate) / 100, 0)
  const discountAmount = lineItems.reduce((s, item) => s + (getQuantity(item) * item.unitPrice * item.discount) / 100, 0)
  const shippingCost = Number(shippingCostInput) || 0
  const total = subtotal + taxAmount - discountAmount + shippingCost

  const hasSerialErrors = lineItems.some(item => item.serials.some(s => s.error))

  // ── Submit ───────────────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitError('')

    if ((isManualEntry && !customerName.trim()) || lineItems.length === 0 || !dueDate) return
    if (methodNeedsFinancialAccount(paymentMethod) && !financialAccountId) {
      setSubmitError(`Please select a financial account for ${PAYMENT_METHOD_LABELS[paymentMethod as StandardPaymentMethod] || 'this'} payments.`)
      return
    }
    if (hasSerialErrors) {
      setSubmitError('Please fix serial number errors before submitting.')
      return
    }

    const customerId = isManualEntry ? undefined : selectedCustomerId
    const customerNameToUse = isManualEntry ? customerName : selectedCustomer?.name || ''

    // Save one invoice item per product and preserve the exact serials used.
    const dtoItems: CreateInvoiceDTO['items'] = lineItems.map((item) => {
      const serialNumbers = item.serials.map(serial => serial.value.trim()).filter(Boolean)

      return {
        productId: item.productId,
        productName: item.productName,
        productSku: item.productSku,
        productDescription: item.productDescription || undefined,
        serialNumber: serialNumbers.length === 1 ? serialNumbers[0] : undefined,
        serialNumbers,
        quantity: serialNumbers.length > 0 ? serialNumbers.length : 1,
        unitPrice: item.unitPrice,
        taxRate: item.taxRate,
        discount: item.discount,
      }
    })

    const data: CreateInvoiceDTO = {
      customerId,
      customerName: customerNameToUse,
      customerPhone: customerPhone.trim() || undefined,
      items: dtoItems,
      paymentMethod,
      financialAccountId: methodNeedsFinancialAccount(paymentMethod) ? financialAccountId : undefined,
      template: invoiceTemplate,
      termsAndConditions,
      invoiceDate: invoiceDate || undefined,
      notes: notes || undefined,
      poNumber: poNumber.trim() || undefined,
      shippingCost,
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
      console.error('Error creating invoice:', error)
      setSubmitError('There was an issue creating the invoice. Please try again.')
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

  const ChangeInvoiceStatus = () => (
    <div className="space-y-2">
      <Label>Invoice Status</Label>
      <Select value={invoiceStatus} onValueChange={handleStatusChange}>
        <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="pending">Pending</SelectItem>
          <SelectItem value="paid">Paid</SelectItem>
          <SelectItem value="overdue">Overdue</SelectItem>
          <SelectItem value="cancelled">Cancelled</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )

  // ── Add To Inventory handler ─────────────────────────────────────────────────

  const handleAddToInventory = async (data: CreateProductDTO) => {
    setProductFormLoading(true)
    try {
      const newProduct = await addProduct(data)
      await fetchProducts()
      if (newProduct) {
        setLineItems(prev => [...prev, {
          productId: newProduct.id,
          productName: newProduct.name,
          productSku: newProduct.sku,
          productImage: newProduct.image || '',
          productDescription: newProduct.description || '',
          baseSellingPrice: newProduct.sellingPrice,
          unitPrice: newProduct.sellingPrice,
          unitPriceInput: String(newProduct.sellingPrice),
          taxRate: newProduct.taxRate,
          discount: 0,
          serials: [],
        }])
        setScanInputs(prev => [...prev, ''])
      }
      setProductFormOpen(false)
    } finally {
      setProductFormLoading(false)
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <>
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Customer */}
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
                    // Pre-fill from their record, but this invoice keeps
                    // its own editable copy from here on (same pattern as
                    // Terms & Conditions / PO Number) — changing it here
                    // never updates the Customer's own phone number.
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

        {/* Invoice Details */}
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
              <Label>Invoice Type</Label>
              <Select
                value={invoiceTemplate}
                onValueChange={(v) => {
                  setInvoiceTemplate(v as InvoiceTemplate)
                  // Change 2: selecting a template copies its Terms &
                  // Conditions into the invoice's editable text area.
                  setTermsAndConditions(buildDefaultTermsText(getTemplateFromStore(v)))
                }}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {invoiceTemplates.map((t, i) => (
                    <SelectItem key={t.id} value={t.id}>
                      Template {i + 1} · {t.footnote.title || t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-muted-foreground -mt-2">
              Changing the template resets Terms &amp; Conditions below to that template's default text.
            </p>
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
                <FinancialAccountSelect
                  value={financialAccountId}
                  onChange={setFinancialAccountId}
                  placeholder="Select bank / wallet"
                />
              </div>
            )}
            {paymentMethod === 'cheque' && (
              <div className="space-y-2">
                <Label>Received In <span className="text-destructive">*</span></Label>
                <FinancialAccountSelect
                  value={financialAccountId}
                  onChange={setFinancialAccountId}
                  placeholder="Select bank account"
                />
              </div>
            )}
            {paymentMethod === 'credit_card' && (
              <div className="space-y-2">
                <Label>Received In <span className="text-destructive">*</span></Label>
                {/* Credit Card payments only settle to supported accounts (Change 2) */}
                <FinancialAccountSelect
                  value={financialAccountId}
                  onChange={setFinancialAccountId}
                  allowedNames={CREDIT_CARD_ACCOUNTS}
                  placeholder="Select card settlement account"
                />
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
            <div className="space-y-2">
              <Label htmlFor="shippingCost">Shipping Cost</Label>
              <Input
                id="shippingCost"
                type="text"
                inputMode="decimal"
                placeholder="0.00"
                value={shippingCostInput}
                onChange={(e) => handleShippingCostChange(e.target.value)}
                className="h-8"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Line Items */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle className="text-lg">Line Items</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Scan each unit's serial number — quantity auto-updates as you scan.
              </p>
            </div>
            <div className="flex gap-2">
              <Popover open={productOpen} onOpenChange={setProductOpen}>
                <PopoverTrigger asChild>
                  <Button type="button" variant="outline" size="sm" className="min-w-[150px]">
                    <Plus className="mr-2 h-4 w-4" />Add From Inventory
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-[820px] max-w-[96vw] p-0">
                  <Command className="[&_[data-slot=command-input-wrapper]]:h-11 [&_[data-slot=command-input]]:h-11">
                    <CommandInput
                      placeholder="Search by name, SKU, or barcode…"
                      value={productSearchTerm}
                      onValueChange={setProductSearchTerm}
                    />
                    <CommandList className="max-h-[420px]">
                      <CommandEmpty>No product found.</CommandEmpty>
                      <CommandGroup>
                        {(filteredProducts ?? []).map((product) => (
                          <CommandItem
                            key={product.id}
                            value={`${product.name} ${product.sku} ${product.category} ${product.brand} ${product.barcode || ''}`}
                            onSelect={() => addLineItem(product.id)}
                            className="grid grid-cols-[64px_1fr_120px_90px] items-center gap-4 px-4 py-3"
                          >
                            <img src={product.image || '/placeholder.png'} alt={product.name} className="h-14 w-14 rounded-md border object-cover bg-muted" />
                            <div className="min-w-0">
                              <div className="font-medium">{product.name}</div>
                              <div className="text-xs text-muted-foreground">{product.sku} • {product.brand} • {product.category}</div>
                              {product.barcode && <div className="text-xs text-muted-foreground font-mono">{product.barcode}</div>}
                            </div>
                            <div className="font-medium">{formatCurrency(product.sellingPrice)}</div>
                            {/* Informational only — never blocks selection/sale (Allow Negative Inventory) */}
                            <div className={`text-sm ${product.quantity <= 0 ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
                              {product.quantity < 0 ? `${product.quantity}` : product.quantity === 0 ? 'Out of Stock' : `${product.quantity} in stock`}
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>

              <Button type="button" size="sm" className="gap-1.5" onClick={() => setProductFormOpen(true)}>
                <PackagePlus className="h-4 w-4" /> Add To Inventory
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {lineItems.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              No items added yet. Click &quot;Add From Inventory&quot; to get started.
            </div>
          ) : (
            <div className="space-y-3">
              {lineItems.map((item, index) => {
                const qty = getQuantity(item)
                const itemTotal = calculateItemTotal(item)
                const validSerials = item.serials.filter(s => !s.error)
                const hasErrors = item.serials.some(s => s.error)

                return (
                  <div
                    key={index}
                    className={`rounded-lg border ${hasErrors ? 'border-destructive/40 bg-destructive/5' : 'border-border bg-muted/10'} p-4 space-y-3`}
                  >
                    {/* Row header: product info + price controls + delete */}
                    <div className="flex items-start gap-3">
                      <img src={item.productImage || '/placeholder.png'} alt={item.productName} className="h-12 w-12 rounded-md border object-cover bg-muted shrink-0" />

                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-foreground leading-tight">{item.productName}</div>
                        <div className="flex items-center gap-2">
                          <div className="text-xs text-muted-foreground">{item.productSku}</div>
                          <Popover
                            open={descriptionPopoverIndex === index}
                            onOpenChange={(isOpen) => { if (isOpen) openDescriptionPopover(index); else cancelDescriptionPopover() }}
                          >
                            <PopoverTrigger asChild>
                              <button
                                type="button"
                                className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs ${item.productDescription ? 'text-primary hover:bg-primary/10' : 'text-muted-foreground hover:bg-muted'}`}
                                title={item.productDescription ? 'Edit description' : 'Add description'}
                              >
                                <FileText className="h-3 w-3" />
                                {item.productDescription ? 'Description' : 'Add description'}
                              </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-80 space-y-2" align="start">
                              <p className="text-xs font-medium text-muted-foreground">
                                Description for this invoice only
                              </p>
                              <Textarea
                                value={descriptionDraft}
                                onChange={(e) => setDescriptionDraft(e.target.value)}
                                rows={5}
                                placeholder="e.g. Intel Core i7, 16GB RAM, 512GB SSD…"
                                className="text-sm"
                                autoFocus
                              />
                              <p className="text-[11px] text-muted-foreground">
                                Copied from the product by default — editing here only affects this invoice.
                              </p>
                              <div className="flex justify-end gap-2 pt-1">
                                <Button type="button" variant="outline" size="sm" onClick={cancelDescriptionPopover}>
                                  Cancel
                                </Button>
                                <Button type="button" size="sm" onClick={saveDescriptionPopover}>
                                  Save
                                </Button>
                              </div>
                            </PopoverContent>
                          </Popover>
                        </div>
                      </div>

                      {/* Price / tax / discount inline */}
                      <div className="flex items-center gap-2 flex-wrap shrink-0">
                        <div className="flex flex-col items-end gap-0.5">
                          <span className="text-[10px] text-muted-foreground">Unit Price</span>
                          <Input
                            type="number"
                            min={user?.role === 'employee' ? item.baseSellingPrice : 0}
                            step="any"
                            value={item.unitPriceInput}
                            onChange={(e) => handleUnitPriceInputChange(index, e.target.value)}
                            onBlur={() => handleUnitPriceBlur(index)}
                            className="h-7 w-24 text-right text-sm"
                          />
                        </div>
                        <div className="flex flex-col items-end gap-0.5">
                          <span className="text-[10px] text-muted-foreground">Tax %</span>
                          <Input type="number" min="0" max="100" value={item.taxRate} onChange={(e) => updateLineItemField(index, 'taxRate', parseFloat(e.target.value) || 0)} className="h-7 w-16 text-right text-sm" />
                        </div>
                        <div className="flex flex-col items-end gap-0.5">
                          <span className="text-[10px] text-muted-foreground">Disc %</span>
                          <Input type="number" min="0" max="100" value={item.discount} onChange={(e) => updateLineItemField(index, 'discount', parseFloat(e.target.value) || 0)} className="h-7 w-16 text-right text-sm" />
                        </div>
                        <div className="flex flex-col items-end gap-0.5">
                          <span className="text-[10px] text-muted-foreground">Qty × Price</span>
                          <span className="text-sm font-semibold text-foreground tabular-nums">{qty} × {formatCurrency(item.unitPrice)}</span>
                        </div>
                        <div className="flex flex-col items-end gap-0.5">
                          <span className="text-[10px] text-muted-foreground">Total</span>
                          <span className="text-sm font-bold text-foreground tabular-nums">{formatCurrency(itemTotal)}</span>
                        </div>
                      </div>

                      <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive shrink-0" onClick={() => removeLineItem(index)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Serial number scanner area */}
                    <div className="border-t border-border pt-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs flex items-center gap-1.5 text-muted-foreground">
                          <ScanBarcode className="h-3.5 w-3.5" />
                          Serial Numbers
                          <span className="text-muted-foreground/60">(scan each unit — press Enter to add)</span>
                        </Label>
                        {validSerials.length > 0 && (
                          <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                            {validSerials.length} unit{validSerials.length > 1 ? 's' : ''} scanned
                          </span>
                        )}
                      </div>

                      {/* Scan input — auto-advances on Enter */}
                      <div className="flex gap-2">
                        <Input
                          ref={(el) => { scanInputRefs.current[index] = el }}
                          type="text"
                          placeholder="Scan or type serial, then press Enter…"
                          value={scanInputs[index] ?? ''}
                          onChange={(e) => setScanInputs(prev => { const n = [...prev]; n[index] = e.target.value; return n })}
                          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commitSerial(index) } }}
                          className="h-8 font-mono text-xs flex-1"
                          autoComplete="off"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 shrink-0"
                          onClick={() => commitSerial(index)}
                          disabled={!(scanInputs[index] ?? '').trim()}
                        >
                          Add
                        </Button>
                      </div>

                      {/* Scanned serials list */}
                      {item.serials.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {item.serials.map((s, si) => (
                            <div key={si} className={`flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-mono ${s.error ? 'border-destructive/50 bg-destructive/10 text-destructive' : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'}`}>
                              {s.error
                                ? <AlertCircle className="h-3 w-3 shrink-0" />
                                : <CheckCircle2 className="h-3 w-3 shrink-0" />
                              }
                              <span>{s.value}</span>
                              {s.error && <span className="text-[10px] ml-1 not-font-mono">{s.error}</span>}
                              <button
                                type="button"
                                onClick={() => removeSerial(index, si)}
                                className="ml-0.5 opacity-60 hover:opacity-100"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {lineItems.length > 0 && (
            <div className="mt-4 flex justify-end">
              <div className="w-72 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tax</span>
                  <span>{formatCurrency(taxAmount)}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Discount</span>
                    <span className="text-destructive">-{formatCurrency(discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Shipping</span>
                  <span>{formatCurrency(shippingCost)}</span>
                </div>
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

      {/* Invoice Terms & Conditions — Editable Per Invoice.
          Defaults come from the selected Invoice Template, but once loaded
          here the text belongs to this invoice alone: editing it never
          touches the template, and the template can be edited later without
          ever changing what's saved on this invoice (Changes 1, 3 & 7). */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Terms &amp; Conditions</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={termsAndConditions}
            onChange={(e) => setTermsAndConditions(e.target.value)}
            rows={8}
            placeholder="Terms & Conditions for this invoice"
            className="font-mono text-sm"
          />
          <p className="text-xs text-muted-foreground mt-2">
            Loaded from the selected template above — edit freely for this invoice only. The template itself won't change.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-lg">Invoice Status</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <ChangeInvoiceStatus />
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
          disabled={isLoading || (!customerName && !selectedCustomerId) || lineItems.length === 0 || !dueDate || hasSerialErrors}
        >
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isEditing ? 'Save Changes' : 'Create Invoice'}
        </Button>
      </div>
    </form>

    <ProductForm
      open={productFormOpen}
      onOpenChange={setProductFormOpen}
      onSubmit={handleAddToInventory}
      isLoading={productFormLoading}
    />
    </>
  )
}
