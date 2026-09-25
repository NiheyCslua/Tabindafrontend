"use client"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Printer, Download, Mail, Pencil, Trash2 } from 'lucide-react'
import type { Invoice } from '@/lib/types'
import {
  formatCurrency, formatDate, formatInvoiceStatus,
  formatPaymentMethod, getInvoiceStatusColor,
} from '@/lib/utils/format'
import { useTemplateStore } from '@/lib/store/template-store'

interface InvoiceDetailsModalProps {
  invoice: Invoice | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onPrint?: (invoice: Invoice) => void
  onEdit?: (invoice: Invoice) => void
  onDelete?: (invoice: Invoice) => void
}

const getItemSerials = (item: { serialNumber?: string | null; serialNumbers?: string[] }): string[] =>
  item.serialNumbers && item.serialNumbers.length > 0
    ? item.serialNumbers
    : item.serialNumber
      ? [item.serialNumber]
      : []

export function InvoiceDetailsModal({
  invoice,
  open,
  onOpenChange,
  onPrint,
  onEdit,
  onDelete,
}: InvoiceDetailsModalProps) {
  const { templates: allTemplates } = useTemplateStore()
  if (!invoice) return null

  const templateIndex = allTemplates.findIndex(t => t.id === (invoice.template ?? allTemplates[0]?.id))
  const templateObj   = allTemplates[templateIndex]
  const templateLabel = templateObj
    ? `Template ${templateIndex + 1} · ${templateObj.footnote.title}`
    : '—'

  const hasAnyTax      = invoice.items.some(i => i.taxRate > 0)
  const hasAnyDiscount = invoice.items.some(i => i.discount > 0)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl flex flex-col max-h-[88vh] overflow-hidden p-0">

        {/* Fixed header */}
        <DialogHeader className="px-5 pt-5 pb-3 shrink-0">
          <div className="flex items-center justify-between pr-6">
            <DialogTitle className="text-base font-semibold">
              Invoice {invoice.invoiceNumber}
            </DialogTitle>
            <Badge className={`border text-[10px] px-1.5 py-0 ${getInvoiceStatusColor(invoice.status)}`}>
              {formatInvoiceStatus(invoice.status)}
            </Badge>
          </div>
        </DialogHeader>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 pb-4 space-y-4">

          {/* Meta */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-0.5">Bill To</p>
              <p className="text-sm font-medium leading-tight truncate">{invoice.customerName}</p>
              {invoice.customerPhone && (
                <p className="text-xs text-muted-foreground truncate">{invoice.customerPhone}</p>
              )}
              {invoice.customerEmail && (
                <p className="text-xs text-muted-foreground truncate">{invoice.customerEmail}</p>
              )}
            </div>
            <div className="space-y-0.5">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Invoice Date</span>
                <span className="font-medium">{formatDate(invoice.createdAt)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Payment</span>
                <span className="font-medium">{formatPaymentMethod(invoice.paymentMethod)}</span>
              </div>
              {invoice.bankAccount && (
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Received In</span>
                  <span className="font-medium">{invoice.bankAccount}</span>
                </div>
              )}
              {invoice.poNumber && (
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">PO</span>
                  <span className="font-medium">{invoice.poNumber}</span>
                </div>
              )}
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Type</span>
                <span className="font-medium truncate ml-2 text-right">
                  {invoice.invoiceType === 'service' ? 'Service Invoice' : templateLabel}
                </span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Line items */}
          <div>
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-2">Line Items</p>
            <div className="rounded-md border divide-y divide-border">
              {/* Header */}
              <div className={`grid text-[10px] font-medium text-muted-foreground uppercase tracking-wide px-3 py-1.5 bg-muted/40 ${hasAnyTax || hasAnyDiscount ? 'grid-cols-[1fr_40px_72px_44px_44px_72px]' : 'grid-cols-[1fr_40px_72px_72px]'}`}>
                <span>Product</span>
                <span className="text-right">Qty</span>
                <span className="text-right">Price</span>
                {hasAnyTax      && <span className="text-right">Tax</span>}
                {hasAnyDiscount && <span className="text-right">Disc</span>}
                <span className="text-right">Total</span>
              </div>

              {invoice.items.map(item => {
                const serials = getItemSerials(item)
                return (
                  <div
                    key={item.id}
                    className={`grid items-start px-3 py-2 text-xs ${hasAnyTax || hasAnyDiscount ? 'grid-cols-[1fr_40px_72px_44px_44px_72px]' : 'grid-cols-[1fr_40px_72px_72px]'}`}
                  >
                    {/* Product cell */}
                    <div className="min-w-0 pr-2">
                      <div className="font-medium text-xs leading-snug truncate">{item.productName}</div>
                      <div className="text-[10px] text-muted-foreground font-mono truncate">{item.productSku}</div>
                      {serials.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {serials.map(sn => (
                            <span
                              key={sn}
                              className="inline-flex items-center rounded border border-border bg-muted/50 px-1.5 py-0 text-[10px] font-mono text-foreground leading-4"
                            >
                              {sn}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="text-right text-xs tabular-nums">{item.quantity}</div>
                    <div className="text-right text-xs tabular-nums">{formatCurrency(item.unitPrice)}</div>
                    {hasAnyTax      && <div className="text-right text-xs tabular-nums text-muted-foreground">{item.taxRate > 0 ? `${item.taxRate}%` : '—'}</div>}
                    {hasAnyDiscount && <div className="text-right text-xs tabular-nums text-muted-foreground">{item.discount > 0 ? `${item.discount}%` : '—'}</div>}
                    <div className="text-right text-xs font-medium tabular-nums">{formatCurrency(item.total)}</div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-56 space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatCurrency(invoice.subtotal)}</span>
              </div>
              {invoice.taxAmount > 0 && (
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Tax</span>
                  <span>{formatCurrency(invoice.taxAmount)}</span>
                </div>
              )}
              {invoice.discountAmount > 0 && (
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Discount</span>
                  <span className="text-destructive">−{formatCurrency(invoice.discountAmount)}</span>
                </div>
              )}
              {(invoice.shippingCost ?? 0) > 0 && (
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Shipping</span>
                  <span>{formatCurrency(invoice.shippingCost)}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between text-sm font-semibold">
                <span>Total</span>
                <span>{formatCurrency(invoice.total)}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          {invoice.notes && (
            <>
              <Separator />
              <div>
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1">Notes</p>
                <p className="text-xs text-muted-foreground">{invoice.notes}</p>
              </div>
            </>
          )}
        </div>

        {/* Fixed footer */}
        <div className="shrink-0 border-t px-5 py-3 flex justify-end gap-2 bg-background flex-wrap">
          <Button variant="outline" size="sm" className="h-7 text-xs">
            <Mail className="mr-1.5 h-3 w-3" /> Send Email
          </Button>
          <Button variant="outline" size="sm" className="h-7 text-xs">
            <Download className="mr-1.5 h-3 w-3" /> Download PDF
          </Button>
          {onEdit && (
            <Button size="sm" variant="outline" onClick={() => onEdit(invoice)} className="h-7 text-xs gap-1.5">
              <Pencil className="h-3 w-3" /> Edit
            </Button>
          )}
          {onDelete && (
            <Button
              size="sm" variant="outline"
              className="h-7 text-xs gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => onDelete(invoice)}
            >
              <Trash2 className="h-3 w-3" /> Delete
            </Button>
          )}
          {onPrint && (
            <Button size="sm" onClick={() => onPrint(invoice)} className="h-7 text-xs">
              <Printer className="mr-1.5 h-3 w-3" /> Print
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
