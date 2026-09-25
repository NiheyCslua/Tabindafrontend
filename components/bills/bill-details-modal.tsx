"use client"

import { useEffect, useState } from 'react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Pencil } from 'lucide-react'
import type { Bill, BillStatus, VendorPayment, VendorReceipt } from '@/lib/types'
import { formatCurrency, formatDate, getBillStatusColor } from '@/lib/utils/format'
import { useVendorPaymentStore } from '@/lib/store/vendor-payment-store'

function PaymentHistorySection({ billId, billType }: { billId: string; billType?: string }) {
  const { fetchPaymentsByBill, fetchReceiptsByBill } = useVendorPaymentStore()
  const [transactions, setTransactions] = useState<(VendorPayment | VendorReceipt)[]>([])
  const [selectedTx, setSelectedTx] = useState<VendorPayment | VendorReceipt | null>(null)
  const isDebit = billType === 'DEBIT'

  useEffect(() => {
    const fetcher = isDebit ? fetchReceiptsByBill(billId) : fetchPaymentsByBill(billId)
    fetcher.then(setTransactions).catch(() => {})
  }, [billId, isDebit, fetchPaymentsByBill, fetchReceiptsByBill])

  if (transactions.length === 0) return null

  const methodLabel: Record<string, string> = { cash: 'Cash', cheque: 'Cheque', bank_transfer: 'Bank Transfer', credit_card: 'Credit Card' }
  const sectionLabel = isDebit ? 'Receipts' : 'Payments'
  const getTxNumber  = (tx: any) => tx.paymentNumber || tx.receiptNumber || '—'

  return (
    <>
      <Separator />
      <div>
        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-2">{sectionLabel}</p>
        <div className="rounded-md border divide-y divide-border">
          <div className="grid grid-cols-[90px_60px_68px_72px_1fr] text-[10px] font-medium text-muted-foreground uppercase tracking-wide px-3 py-1.5 bg-muted/40">
            <span>No.</span><span>Date</span>
            <span className="text-right">Amount</span>
            <span className="text-right">Bal. After</span>
            <span className="pl-2">Details</span>
          </div>
          {transactions.map(tx => (
            <div key={tx.id} className="grid grid-cols-[90px_60px_68px_72px_1fr] items-start px-3 py-2 text-xs">
              <button type="button" onClick={() => setSelectedTx(tx)}
                className="font-mono text-primary hover:underline text-left">
                {getTxNumber(tx)}
              </button>
              <span className="text-muted-foreground">{formatDate(tx.paymentDate)}</span>
              <span className="text-right font-medium tabular-nums">{formatCurrency(tx.amount)}</span>
              <span className={`text-right tabular-nums ${tx.balanceAfterPayment > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                {formatCurrency(tx.balanceAfterPayment)}
              </span>
              <div className="pl-2 text-[10px] text-muted-foreground">
                <div className="capitalize">{methodLabel[tx.paymentMethod] || tx.paymentMethod}</div>
                {tx.bankAccount && <div>{tx.bankAccount}</div>}
                {tx.referenceNumber && <div className="font-mono">{tx.referenceNumber}</div>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Transaction detail popup */}
      <Dialog open={!!selectedTx} onOpenChange={() => setSelectedTx(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="text-sm">{selectedTx ? getTxNumber(selectedTx) : ''}</DialogTitle></DialogHeader>
          {selectedTx && (() => {
            const balanceBefore = selectedTx.balanceAfterPayment + selectedTx.amount
            return (
              <div className="space-y-2 text-sm">
                {([
                  ['Vendor', selectedTx.vendorName],
                  ['Bill No.', <span className="font-mono">{selectedTx.billNumber}</span>],
                  ['Balance Before', <span className="tabular-nums">{formatCurrency(balanceBefore)}</span>],
                  ['Amount', <span className="font-semibold tabular-nums">{formatCurrency(selectedTx.amount)}</span>],
                  ['Balance After', <span className={`tabular-nums font-medium ${selectedTx.balanceAfterPayment > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>{formatCurrency(selectedTx.balanceAfterPayment)}</span>],
                  ['Method', methodLabel[selectedTx.paymentMethod] || selectedTx.paymentMethod],
                  selectedTx.bankAccount && ['Bank Account', selectedTx.bankAccount],
                  selectedTx.referenceNumber && ['Reference', <span className="font-mono">{selectedTx.referenceNumber}</span>],
                  ['Date', formatDate(selectedTx.paymentDate)],
                  selectedTx.notes && ['Notes', selectedTx.notes],
                  ['Created By', selectedTx.createdBy || '—'],
                  ['Created At', formatDate(selectedTx.createdAt)],
                ] as any[]).filter(Boolean).map(([label, value]: any, i: number) => (
                  <div key={i} className="flex justify-between gap-4">
                    <span className="text-muted-foreground shrink-0">{label}</span>
                    <span className="font-medium text-right">{value}</span>
                  </div>
                ))}
              </div>
            )
          })()}
        </DialogContent>
      </Dialog>
    </>
  )
}

interface BillDetailsModalProps {
  bill: Bill | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onEdit?: (bill: Bill) => void
}

const getItemSerials = (item: { serialNumber?: string | null; serialNumbers?: string[] }): string[] =>
  item.serialNumbers && item.serialNumbers.length > 0
    ? item.serialNumbers
    : item.serialNumber
      ? [item.serialNumber]
      : []

const statusLabels: Record<BillStatus, string> = {
  paid: 'Paid',
  unpaid: 'Unpaid',
  partially_paid: 'Partially Paid',
  overdue: 'Overdue',
  cancelled: 'Cancelled',
}

export function BillDetailsModal({ bill, open, onOpenChange, onEdit }: BillDetailsModalProps) {
  if (!bill) return null

  const hasAnyTax      = bill.items.some(i => i.taxRate > 0)
  const hasAnyDiscount = bill.items.some(i => i.discount > 0)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl flex flex-col max-h-[88vh] overflow-hidden p-0">
        {/* Fixed header */}
        <DialogHeader className="px-5 pt-5 pb-3 shrink-0">
          <div className="flex items-center justify-between pr-6">
            <DialogTitle className="text-base font-semibold">Bill {bill.billNumber}</DialogTitle>
            <Badge className={`border text-[10px] px-1.5 py-0 ${getBillStatusColor(bill.status)}`}>
              {statusLabels[bill.status]}
            </Badge>
          </div>
        </DialogHeader>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 pb-4 space-y-4">

          {/* Meta row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-0.5">Vendor</p>
              <p className="text-sm font-medium leading-tight">{bill.vendorName}</p>
              {bill.vendorEmail && <p className="text-xs text-muted-foreground truncate">{bill.vendorEmail}</p>}
            </div>
            <div className="space-y-0.5">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Bill Date</span>
                <span className="font-medium">{formatDate(bill.date)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Due Date</span>
                <span className="font-medium">{formatDate(bill.dueDate)}</span>
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

              {bill.items.map((item, idx) => {
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
                <span>{formatCurrency(bill.subtotal)}</span>
              </div>
              {bill.taxAmount > 0 && (
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Tax</span>
                  <span>{formatCurrency(bill.taxAmount)}</span>
                </div>
              )}
              {bill.discountAmount > 0 && (
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Discount</span>
                  <span className="text-destructive">−{formatCurrency(bill.discountAmount)}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between text-sm font-semibold">
                <span>Total</span>
                <span>{formatCurrency(bill.amount)}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          {bill.notes && (
            <>
              <Separator />
              <div>
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1">Notes</p>
                <p className="text-xs text-muted-foreground">{bill.notes}</p>
              </div>
            </>
          )}

          {/* Payment History */}
          <PaymentHistorySection billId={bill.id} billType={bill.billType} />
        </div>

        {/* Fixed footer */}
        <div className="shrink-0 border-t px-5 py-3 flex justify-end gap-2 bg-background">
          {onEdit && (
            <Button size="sm" variant="outline" onClick={() => onEdit(bill)} className="h-7 text-xs gap-1.5">
              <Pencil className="h-3 w-3" /> Edit
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} className="h-7 text-xs">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
