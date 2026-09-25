'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import type { UnpaidBill, CreateVendorPaymentDTO, VendorPayment, VendorReceipt } from '@/lib/types'
import { formatCurrency, formatDate } from '@/lib/utils/format'
import { useVendorPaymentStore } from '@/lib/store/vendor-payment-store'
import { FinancialAccountSelect } from '@/components/financial-accounts/financial-account-select'
import { methodNeedsFinancialAccount, CREDIT_CARD_ACCOUNTS } from '@/lib/config/payment-methods'

const schema = z.object({
  amount: z.coerce.number().min(0.01, 'Amount is required'),
  paymentMethod: z.enum(['cash', 'cheque', 'bank_transfer', 'credit_card'], { required_error: 'Required' }),
  financialAccountId: z.string().optional(),
  referenceNumber: z.string().optional(),
  paymentDate: z.string().min(1, 'Payment date is required'),
  notes: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

interface PayBillModalProps {
  bill: UnpaidBill | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: CreateVendorPaymentDTO) => Promise<void>
  isLoading?: boolean
  /** 'payment' = paying a vendor bill; 'receipt' = receiving against a debit bill */
  mode?: 'payment' | 'receipt'
}

export function PayBillModal({
  bill, open, onOpenChange, onSubmit, isLoading, mode = 'payment',
}: PayBillModalProps) {
  const today   = new Date().toISOString().split('T')[0]
  const balance = bill?.balanceAmount ?? bill?.amount ?? 0
  const isReceipt = mode === 'receipt'

  const { fetchPaymentsByBill, fetchReceiptsByBill } = useVendorPaymentStore()
  const [previousTx, setPreviousTx] = useState<(VendorPayment | VendorReceipt)[]>([])

  useEffect(() => {
    if (!bill || !open) { setPreviousTx([]); return }
    const fetcher = isReceipt
      ? fetchReceiptsByBill(bill.id)
      : fetchPaymentsByBill(bill.id)
    fetcher.then(setPreviousTx).catch(() => {})
  }, [bill?.id, open, isReceipt, fetchPaymentsByBill, fetchReceiptsByBill])

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { amount: balance, paymentMethod: 'cash', financialAccountId: '', referenceNumber: '', paymentDate: today, notes: '' },
  })

  useEffect(() => {
    if (bill && open) {
      form.reset({
        amount: bill.balanceAmount ?? bill.amount,
        paymentMethod: 'cash', financialAccountId: '', referenceNumber: '', paymentDate: today, notes: '',
      })
    }
  }, [bill?.id, open, today])

  const paymentMethod = form.watch('paymentMethod')
  const enteredAmount = form.watch('amount') || 0
  const needsBank     = methodNeedsFinancialAccount(paymentMethod)
  const isOverpayment = enteredAmount > balance + 0.01

  const handleSubmit = async (values: FormValues) => {
    if (!bill) return
    if (values.amount > balance + 0.01) {
      form.setError('amount', { message: `Cannot exceed outstanding balance of ${formatCurrency(balance)}` })
      return
    }
    if (values.paymentMethod === 'credit_card' && !values.financialAccountId) {
      form.setError('financialAccountId', { message: `Please select a card settlement account (${CREDIT_CARD_ACCOUNTS.join(', ')})` })
      return
    }
    await onSubmit({
      vendorBillId: bill.id,
      amount: values.amount,
      paymentMethod: values.paymentMethod as any,
      financialAccountId: values.financialAccountId || undefined,
      referenceNumber: values.referenceNumber || undefined,
      paymentDate: values.paymentDate,
      notes: values.notes || undefined,
    })
    form.reset()
    onOpenChange(false)
  }

  const getTxNumber = (tx: VendorPayment | VendorReceipt) =>
    'paymentNumber' in tx ? tx.paymentNumber : (tx as VendorReceipt).receiptNumber

  if (!bill) return null

  const alreadyLabel  = isReceipt ? 'Already Received'  : 'Already Paid'
  const balanceLabel  = isReceipt ? 'Outstanding Receivable' : 'Outstanding Balance'
  const balanceColour = isReceipt ? 'text-emerald-600' : 'text-destructive'
  const prevLabel     = isReceipt ? 'Previous Receipts'  : 'Previous Payments'
  const amtLabel      = isReceipt ? 'Receipt Amount'     : 'Payment Amount'
  const dateLabel     = isReceipt ? 'Receipt Date'       : 'Payment Date'
  const confirmLabel  = isReceipt ? 'Confirm Receipt'    : 'Confirm Payment'
  const titleLabel    = isReceipt ? 'Receive Payment'    : 'Pay Bill'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base">{titleLabel}</DialogTitle>
        </DialogHeader>

        {/* Bill info */}
        <div className="rounded-lg border bg-muted/40 px-4 py-3 space-y-1.5">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Vendor</span>
            <span className="font-medium">{bill.vendorName}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Bill No.</span>
            <span className="font-medium font-mono">{bill.billNumber}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Bill Date</span>
            <span className="font-medium">{formatDate(bill.date)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Bill Total</span>
            <span className="font-medium tabular-nums">{formatCurrency(bill.amount)}</span>
          </div>
          {bill.paidAmount > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{alreadyLabel}</span>
              <span className="font-medium text-emerald-600 tabular-nums">{formatCurrency(bill.paidAmount)}</span>
            </div>
          )}
          <Separator className="my-1" />
          <div className="flex justify-between text-sm font-semibold">
            <span>{balanceLabel}</span>
            <span className={`text-base ${balanceColour}`}>{formatCurrency(balance)}</span>
          </div>
        </div>

        {/* Previous transactions */}
        {previousTx.length > 0 && (
          <div>
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1.5">{prevLabel}</p>
            <div className="rounded-md border divide-y divide-border">
              {[...previousTx]
                .sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime())
                .map(tx => (
                  <div key={tx.id} className="grid grid-cols-[90px_1fr_80px] items-center px-3 py-2 text-xs">
                    <span className="font-mono text-muted-foreground">{getTxNumber(tx)}</span>
                    <div>
                      <div>{formatDate(tx.paymentDate)}</div>
                      <div className="text-[10px] text-muted-foreground capitalize">
                        {tx.paymentMethod.replace('_', ' ')}
                        {tx.bankAccount && ` · ${tx.bankAccount}`}
                      </div>
                    </div>
                    <span className="text-right font-medium tabular-nums">{formatCurrency(tx.amount)}</span>
                  </div>
                ))}
            </div>
          </div>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField control={form.control} name="amount" render={({ field }) => (
              <FormItem>
                <FormLabel>{amtLabel} <span className="text-destructive">*</span></FormLabel>
                <FormControl>
                  <Input type="number" min="0.01" step="0.01" max={balance} {...field}
                    onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                    className={field.value > balance + 0.01 ? 'border-destructive' : ''} />
                </FormControl>
                {enteredAmount > 0 && enteredAmount < balance - 0.01 && (
                  <p className="text-[11px] text-amber-600">
                    Partial — {formatCurrency(balance - enteredAmount)} will remain outstanding
                  </p>
                )}
                {isOverpayment && (
                  <p className="text-[11px] text-destructive">Exceeds outstanding balance of {formatCurrency(balance)}</p>
                )}
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="paymentMethod" render={({ field }) => (
              <FormItem>
                <FormLabel>Payment Method <span className="text-destructive">*</span></FormLabel>
                <Select value={field.value} onValueChange={v => { field.onChange(v); if (v === 'cash') form.setValue('financialAccountId', '') }}>
                  <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="cheque">Cheque</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="credit_card">Credit Card</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

            {needsBank && (
              <FormField control={form.control} name="financialAccountId" render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {paymentMethod === 'credit_card' ? 'Card Settlement Account' : 'Bank'}
                    {paymentMethod === 'credit_card'
                      ? <span className="text-destructive"> *</span>
                      : <span className="text-xs text-muted-foreground font-normal"> (optional)</span>}
                  </FormLabel>
                  <FormControl>
                    <FinancialAccountSelect
                      value={field.value || ''}
                      onChange={field.onChange}
                      allowedNames={paymentMethod === 'credit_card' ? CREDIT_CARD_ACCOUNTS : undefined}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            )}

            <FormField control={form.control} name="referenceNumber" render={({ field }) => (
              <FormItem>
                <FormLabel>Reference No. <span className="text-xs text-muted-foreground font-normal">(optional)</span></FormLabel>
                <FormControl><Input {...field} placeholder="Cheque / TXN / Transfer ref." /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="paymentDate" render={({ field }) => (
              <FormItem>
                <FormLabel>{dateLabel} <span className="text-destructive">*</span></FormLabel>
                <FormControl><Input type="date" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="notes" render={({ field }) => (
              <FormItem>
                <FormLabel>Notes <span className="text-xs text-muted-foreground font-normal">(optional)</span></FormLabel>
                <FormControl><Textarea {...field} placeholder="Any additional notes..." rows={2} className="resize-none" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" size="sm" disabled={isLoading || isOverpayment}>
                {isLoading && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
                {confirmLabel}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
