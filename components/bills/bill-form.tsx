"use client"

import { useEffect, useRef, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { AlertCircle, CheckCircle2, PackagePlus, Plus, Trash2, Loader2, UserPlus, X } from 'lucide-react'
import { useInventoryStore } from '@/lib/store/inventory-store'
import { useSerialStore } from '@/lib/store/serial-store'
import { useVendorStore } from '@/lib/store/vendor-store'
import { VendorForm } from '@/components/vendors/vendor-form'
import { ProductForm } from '@/components/inventory/product-form'
import type { Bill, CreateBillDTO, BillStatus, Vendor, CreateVendorDTO, CreateProductDTO } from '@/lib/types'
import { formatCurrency } from '@/lib/utils/format'

// ── Types ─────────────────────────────────────────────────────────────────────

interface ScannedSerial {
  value: string
  error: string
}

interface LineItem {
  productId: string
  productName: string
  productSku: string
  productImage: string
  quantity: number
  unitPrice: number
  unitPriceInput: string
  taxRate: number
  discount: number
  serials: ScannedSerial[]
  scanInput: string
}

interface BillFormProps {
  bill?: Bill | null
  vendors: Vendor[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: CreateBillDTO) => Promise<{ duplicateWarning?: string } | void>
  isLoading?: boolean
  defaultBillType?: 'CREDIT' | 'DEBIT'
}

// ── Component ─────────────────────────────────────────────────────────────────

export function BillForm({ bill, vendors: vendorsProp, open, onOpenChange, onSubmit, isLoading, defaultBillType = 'CREDIT' }: BillFormProps) {
  const { products, fetchProducts, addProduct } = useInventoryStore()
  const { fetchUnits, findBySerial } = useSerialStore()
  const { vendors: storeVendors, fetchVendors, createVendor } = useVendorStore()
  const today = new Date().toISOString().split('T')[0]

  // Bill form state
  const [billType, setBillType] = useState<'CREDIT' | 'DEBIT'>(defaultBillType)
  const [billNumber, setBillNumber] = useState('')
  const [vendorId, setVendorId] = useState('')
  const [status, setStatus] = useState<BillStatus>('unpaid')
  const [date, setDate] = useState(today)
  const [dueDate, setDueDate] = useState('')
  const [notes, setNotes] = useState('')
  const [lineItems, setLineItems] = useState<LineItem[]>([])
  const [productOpen, setProductOpen] = useState(false)
  const [productSearch, setProductSearch] = useState('')
  const [formError, setFormError] = useState('')
  const [duplicateWarning, setDuplicateWarning] = useState('')

  // Per-row scan input refs for auto-focus after add
  const scanInputRefs = useRef<(HTMLInputElement | null)[]>([])

  // Quick Add Vendor dialog
  const [vendorFormOpen, setVendorFormOpen] = useState(false)
  const [vendorFormLoading, setVendorFormLoading] = useState(false)

  // Add To Inventory dialog
  const [productFormOpen, setProductFormOpen] = useState(false)
  const [productFormLoading, setProductFormLoading] = useState(false)

  // Use the most up-to-date vendor list
  const vendors = storeVendors.length > 0 ? storeVendors : vendorsProp

  useEffect(() => { fetchProducts(); fetchUnits() }, [fetchProducts, fetchUnits])

  // ── Load bill data ────────────────────────────────────────────────────────

  useEffect(() => {
    if (bill) {
      setBillType((bill.billType as 'CREDIT' | 'DEBIT') || 'CREDIT')
      setBillNumber(bill.billNumber || '')
      setVendorId(bill.vendorId)
      setStatus(bill.status)
      setDate(bill.date.split('T')[0])
      setDueDate(bill.dueDate.split('T')[0])
      setNotes(bill.notes || '')
      setFormError('')
      setLineItems(bill.items.map(i => {
        const existingSerials: string[] = i.serialNumbers && i.serialNumbers.length > 0
          ? i.serialNumbers
          : i.serialNumber
            ? [i.serialNumber]
            : []
        return {
          productId: i.productId,
          productName: i.productName,
          productSku: i.productSku,
          productImage: '',
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          unitPriceInput: String(i.unitPrice),
          taxRate: i.taxRate,
          discount: i.discount,
          serials: existingSerials.map(s => ({ value: s, error: '' })),
          scanInput: '',
        }
      }))
    } else {
      setBillType(defaultBillType); setBillNumber(''); setVendorId(''); setStatus('unpaid'); setDate(today); setDueDate('')
      setNotes(''); setLineItems([]); setFormError('')
    }
  }, [bill, open, today])

  // ── Product search / add ──────────────────────────────────────────────────

  const filteredProducts = products.filter(p => {
    if (!productSearch) return true
    const term = productSearch.toLowerCase()
    return (
      p.name.toLowerCase().includes(term) ||
      p.sku.toLowerCase().includes(term) ||
      (p.brand || '').toLowerCase().includes(term) ||
      (p.category || '').toLowerCase().includes(term) ||
      (p.description || '').toLowerCase().includes(term)
    )
  })

  const addProductToLine = (productId: string) => {
    const product = products.find(p => p.id === productId)
    if (!product) return
    const existing = lineItems.findIndex(i => i.productId === productId)
    if (existing >= 0) {
      setLineItems(prev => prev.map((item, i) =>
        i === existing ? { ...item, quantity: item.quantity + 1 } : item
      ))
    } else {
      setLineItems(prev => [...prev, {
        productId: product.id,
        productName: product.name,
        productSku: product.sku,
        productImage: product.image || '',
        quantity: 0,
        unitPrice: product.costPrice,
        unitPriceInput: String(product.costPrice),
        taxRate: product.taxRate,
        discount: 0,
        serials: [],
        scanInput: '',
      }])
    }
    setProductOpen(false)
    setProductSearch('')
  }

  // ── Line item updaters ────────────────────────────────────────────────────

  const updateItem = (index: number, updates: Partial<LineItem>) => {
    setLineItems(prev => prev.map((item, i) => i === index ? { ...item, ...updates } : item))
  }

  const removeItem = (index: number) => setLineItems(prev => prev.filter((_, i) => i !== index))

  // ── Serial number helpers (per row) ──────────────────────────────────────

  const validateSerial = (sn: string, rowIndex: number): string => {
    const item = lineItems[rowIndex]
    if (item.serials.some(s => s.value === sn)) return 'Already added.'
    // check across other rows
    for (let i = 0; i < lineItems.length; i++) {
      if (i !== rowIndex && lineItems[i].serials.some(s => s.value === sn)) {
        return `Already used in row ${i + 1}.`
      }
    }
    const existing = findBySerial(sn)
    if (existing && existing.productId !== item.productId) {
      return `Already registered to "${existing.productName}".`
    }
    if (existing) {
      // Check if it's on the bill being edited (allow re-edit)
      const alreadyOnThisBill = bill?.items.some(bi => {
        const bs = bi.serialNumbers && bi.serialNumbers.length > 0
          ? bi.serialNumbers
          : bi.serialNumber ? [bi.serialNumber] : []
        return bs.some(s => s.toLowerCase() === sn.toLowerCase())
      })
      if (!alreadyOnThisBill) return 'Already exists in serial inventory.'
    }
    return ''
  }

  const commitSerial = (rowIndex: number) => {
    const trimmed = lineItems[rowIndex].scanInput.trim()
    if (!trimmed) return
    const error = validateSerial(trimmed, rowIndex)
    const item = lineItems[rowIndex]
    updateItem(rowIndex, {
      serials: [...item.serials, { value: trimmed, error }],
      scanInput: '',
      // Only count valid (non-error) serials toward quantity
      quantity: error ? item.quantity : item.quantity + 1,
    })
    setTimeout(() => scanInputRefs.current[rowIndex]?.focus(), 0)
  }

  const removeSerial = (rowIndex: number, serialIndex: number) => {
    const item = lineItems[rowIndex]
    const removedSerial = item.serials[serialIndex]
    updateItem(rowIndex, {
      serials: item.serials.filter((_, i) => i !== serialIndex),
      // Only decrement qty if the removed serial was valid
      quantity: !removedSerial.error ? Math.max(0, item.quantity - 1) : item.quantity,
    })
  }

  // ── Totals ────────────────────────────────────────────────────────────────

  const subtotal = lineItems.reduce((s, i) => s + i.quantity * i.unitPrice, 0)
  const taxAmount = lineItems.reduce((s, i) => s + (i.quantity * i.unitPrice * i.taxRate) / 100, 0)
  const discountAmount = lineItems.reduce((s, i) => s + (i.quantity * i.unitPrice * i.discount) / 100, 0)
  const total = subtotal + taxAmount - discountAmount

  // ── Validation ────────────────────────────────────────────────────────────

  const validateSerialNumbers = (): string => {
    for (const item of lineItems) {
      const validSerials = item.serials.filter(s => !s.error)
      const hasErrors = item.serials.some(s => s.error)
      if (hasErrors) return `${item.productName}: fix serial number errors before saving.`
      if (validSerials.length > 0 && validSerials.length !== item.quantity) {
        return `${item.productName}: ${validSerials.length} serial number${validSerials.length !== 1 ? 's' : ''} entered for quantity ${item.quantity}.`
      }
    }
    return ''
  }

  // ── Submit ────────────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!billNumber.trim()) { setFormError('Bill number is required'); return }
    if (!vendorId || lineItems.length === 0 || !dueDate) return
    const serialError = validateSerialNumbers()
    if (serialError) { setFormError(serialError); return }
    setFormError('')
    setDuplicateWarning('')
    const result = await onSubmit({
      billNumber: billNumber.trim(),
      billType,
      vendorId,
      items: lineItems.map(i => {
        const serialNumbers = i.serials.filter(s => !s.error).map(s => s.value)
        return {
          productId: i.productId,
          productName: i.productName,
          productSku: i.productSku,
          serialNumber: serialNumbers.length === 1 ? serialNumbers[0] : undefined,
          serialNumbers,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          taxRate: i.taxRate,
          discount: i.discount,
        }
      }),
      status,
      date: new Date(date).toISOString(),
      dueDate: new Date(dueDate).toISOString(),
      notes: notes || undefined,
    })

    if (result && 'duplicateWarning' in result && result.duplicateWarning) {
      // Non-blocking: bill was already saved successfully. Show the warning
      // briefly, then close — never prevents the save from completing.
      setDuplicateWarning(result.duplicateWarning)
      setTimeout(() => { setDuplicateWarning(''); onOpenChange(false) }, 2200)
      return
    }

    onOpenChange(false)
  }

  // ── Quick Add Vendor ──────────────────────────────────────────────────────

  const handleQuickAddVendor = async (data: CreateVendorDTO) => {
    setVendorFormLoading(true)
    try {
      const newVendor = await createVendor(data)
      await fetchVendors()
      setVendorId(newVendor.id)
      setVendorFormOpen(false)
    } finally {
      setVendorFormLoading(false)
    }
  }

  // ── Add To Inventory ──────────────────────────────────────────────────────

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
          quantity: 0,
          unitPrice: newProduct.costPrice,
          unitPriceInput: String(newProduct.costPrice),
          taxRate: newProduct.taxRate,
          discount: 0,
          serials: [],
          scanInput: '',
        }])
      }
      setProductFormOpen(false)
    } finally {
      setProductFormLoading(false)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-6xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{bill ? `Edit ${bill.billNumber}` : billType === 'DEBIT' ? 'Add Debit Bill' : 'Add Bill'}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Vendor & Dates */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-3"><CardTitle className="text-sm">Vendor</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1.5">
                    <Label>Vendor *</Label>
                    <div className="flex gap-2">
                      <Select value={vendorId} onValueChange={setVendorId}>
                        <SelectTrigger className="flex-1"><SelectValue placeholder="Select vendor" /></SelectTrigger>
                        <SelectContent>
                          {vendors.filter(v => v.status === 'active').map(v => (
                            <SelectItem key={v.id} value={v.id}>{v.company} — {v.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button type="button" variant="outline" size="sm" className="shrink-0 gap-1.5" onClick={() => setVendorFormOpen(true)}>
                        <UserPlus className="h-3.5 w-3.5" /> Add Vendor
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Notes (Optional)</Label>
                    <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Additional notes..." className="resize-none" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3"><CardTitle className="text-sm">Bill Details</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="billNumber">Bill Number <span className="text-destructive">*</span></Label>
                    <Input
                      id="billNumber"
                      value={billNumber}
                      onChange={e => setBillNumber(e.target.value)}
                      placeholder="e.g. INV-4587, BILL-2026-104"
                      className="h-8 font-mono"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Status</Label>
                    <Select value={status} onValueChange={v => setStatus(v as BillStatus)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unpaid">Unpaid</SelectItem>
                        <SelectItem value="paid">Paid</SelectItem>
                        <SelectItem value="overdue">Overdue</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Bill Date *</Label>
                    <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="h-8" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Due Date *</Label>
                    <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="h-8" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Line Items */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-sm">Products</CardTitle>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Scan serial numbers per line item. Leave blank for non-serialized items.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Popover open={productOpen} onOpenChange={setProductOpen}>
                      <PopoverTrigger asChild>
                        <Button type="button" variant="outline" size="sm" className="gap-1.5">
                          <Plus className="h-4 w-4" /> Add From Inventory
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent align="end" className="w-[820px] max-w-[96vw] p-0">
                        <Command className="[&_[data-slot=command-input-wrapper]]:h-11 [&_[data-slot=command-input]]:h-11">
                          <CommandInput placeholder="Search products by name or SKU..." value={productSearch} onValueChange={setProductSearch} />
                          <CommandList className="max-h-[420px]">
                            <CommandEmpty>No products found.</CommandEmpty>
                            <CommandGroup>
                              {filteredProducts.map(p => (
                                <CommandItem
                                  key={p.id}
                                  value={`${p.name} ${p.sku} ${p.category} ${p.brand} ${p.description || ''}`}
                                  onSelect={() => addProductToLine(p.id)}
                                  className="grid grid-cols-[64px_1fr_120px_90px] items-center gap-4 px-4 py-3"
                                >
                                  <img src={p.image || '/placeholder.png'} alt={p.name} className="h-14 w-14 rounded-md border object-cover bg-muted" />
                                  <div className="min-w-0">
                                    <div className="font-medium">{p.name}</div>
                                    <div className="text-xs text-muted-foreground">{p.sku} • {p.brand} • {p.category}</div>
                                    <div className="line-clamp-1 text-xs text-muted-foreground">{p.description}</div>
                                  </div>
                                  <div className="font-medium">{formatCurrency(p.costPrice)}</div>
                                  <div className="text-sm text-muted-foreground">{p.quantity} in stock</div>
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
                  <div className="text-center py-8 text-muted-foreground text-sm border-2 border-dashed rounded-lg">
                    No products added yet. Use "Add From Inventory" to select existing items or "Add To Inventory" to create a new one.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {lineItems.map((item, i) => {
                      const sub = item.quantity * item.unitPrice
                      const itemTotal = sub + sub * (item.taxRate / 100) - sub * (item.discount / 100)
                      const validSerials = item.serials.filter(s => !s.error)
                      const hasSerialErrors = item.serials.some(s => s.error)
                      return (
                        <div key={i} className="rounded-lg border bg-card p-4 space-y-3">
                          {/* Row header: product info + remove */}
                          <div className="flex items-start gap-3">
                            <img src={item.productImage || '/placeholder.png'} alt={item.productName} className="h-12 w-12 rounded-md border object-cover bg-muted shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm">{item.productName}</div>
                              <div className="text-xs text-muted-foreground">{item.productSku}</div>
                            </div>
                            <div className="font-semibold text-sm shrink-0">{formatCurrency(itemTotal)}</div>
                            <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive shrink-0" onClick={() => removeItem(i)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>

                          {/* Editable fields: qty, price, tax, discount */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <div className="space-y-1">
                              <Label className="text-xs text-muted-foreground">Quantity</Label>
                              <Input
                                type="number" min="1"
                                value={item.quantity}
                                onChange={e => updateItem(i, { quantity: Number(e.target.value) })}
                                className="h-8 text-sm"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs text-muted-foreground">Unit Price</Label>
                              <Input
                                type="number" min="0" step="0.01"
                                value={item.unitPriceInput}
                                onChange={e => updateItem(i, { unitPriceInput: e.target.value, unitPrice: parseFloat(e.target.value) || 0 })}
                                className="h-8 text-sm"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs text-muted-foreground">Tax %</Label>
                              <Input
                                type="number" min="0" max="100"
                                value={item.taxRate}
                                onChange={e => updateItem(i, { taxRate: Number(e.target.value) })}
                                className="h-8 text-sm"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs text-muted-foreground">Discount %</Label>
                              <Input
                                type="number" min="0" max="100"
                                value={item.discount}
                                onChange={e => updateItem(i, { discount: Number(e.target.value) })}
                                className="h-8 text-sm"
                              />
                            </div>
                          </div>

                          {/* Serial number scan UI — mirrors product-form pattern */}
                          <div className="space-y-2">
                            <Label className="text-xs text-muted-foreground">Serial Numbers (optional)</Label>
                            <div className="flex gap-2">
                              <Input
                                ref={el => { scanInputRefs.current[i] = el }}
                                type="text"
                                placeholder="Scan or type serial number…"
                                value={item.scanInput}
                                onChange={e => updateItem(i, { scanInput: e.target.value })}
                                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); commitSerial(i) } }}
                                className="font-mono text-sm flex-1"
                                autoComplete="off"
                              />
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="shrink-0"
                                onClick={() => commitSerial(i)}
                                disabled={!item.scanInput.trim()}
                              >
                                Add
                              </Button>
                            </div>

                            {item.serials.length > 0 && (
                              <div className="space-y-1.5">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-medium text-foreground">
                                    {validSerials.length} serial{validSerials.length !== 1 ? 's' : ''} recorded
                                    {hasSerialErrors && (
                                      <span className="text-destructive ml-2">
                                        · {item.serials.filter(s => s.error).length} error{item.serials.filter(s => s.error).length !== 1 ? 's' : ''}
                                      </span>
                                    )}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => updateItem(i, { serials: [] })}
                                    className="text-xs text-muted-foreground hover:text-destructive transition-colors"
                                  >
                                    Clear all
                                  </button>
                                </div>
                                <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
                                  {item.serials.map((s, si) => (
                                    <div
                                      key={si}
                                      className={`flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-mono ${
                                        s.error
                                          ? 'border-destructive/50 bg-destructive/10 text-destructive'
                                          : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                                      }`}
                                    >
                                      {s.error
                                        ? <AlertCircle className="h-3 w-3 shrink-0" />
                                        : <CheckCircle2 className="h-3 w-3 shrink-0" />
                                      }
                                      <span>{s.value}</span>
                                      {s.error && <span className="not-font-mono text-[10px] ml-1 opacity-80">{s.error}</span>}
                                      <button type="button" onClick={() => removeSerial(i, si)} className="ml-0.5 opacity-60 hover:opacity-100">
                                        <X className="h-3 w-3" />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}

                    {/* Totals */}
                    <div className="flex justify-end mt-2">
                      <div className="w-60 space-y-1.5 text-sm">
                        <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
                        {taxAmount > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Tax</span><span>{formatCurrency(taxAmount)}</span></div>}
                        {discountAmount > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Discount</span><span className="text-destructive">-{formatCurrency(discountAmount)}</span></div>}
                        <Separator />
                        <div className="flex justify-between font-semibold"><span>Total</span><span className="text-base">{formatCurrency(total)}</span></div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {formError && (
              <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {duplicateWarning && (
              <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{duplicateWarning}</span>
              </div>
            )}

            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={isLoading || !vendorId || lineItems.length === 0 || !dueDate}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {bill ? 'Save Changes' : 'Add Bill'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Quick Add Vendor */}
      <VendorForm
        open={vendorFormOpen}
        onOpenChange={setVendorFormOpen}
        onSubmit={handleQuickAddVendor}
        isLoading={vendorFormLoading}
      />

      {/* Add To Inventory */}
      <ProductForm
        open={productFormOpen}
        onOpenChange={setProductFormOpen}
        onSubmit={handleAddToInventory}
        isLoading={productFormLoading}
      />
    </>
  )
}
