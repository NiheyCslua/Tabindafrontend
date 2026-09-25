"use client"

import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { FinancialAccountSelect } from '@/components/financial-accounts/financial-account-select'
import { methodNeedsFinancialAccount, CREDIT_CARD_ACCOUNTS, type StandardPaymentMethod } from '@/lib/config/payment-methods'
import type { SalaryPayment } from '@/lib/types'
import { formatCurrency } from '@/lib/utils/format'
import { formatSalaryPeriod } from '@/lib/payroll/payroll-utils'

interface MarkSalaryPaidDialogProps {
  payment: SalaryPayment | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (paymentId: string, options: { paymentDate: string; paymentMethod: string; financialAccountId?: string }) => Promise<void>
  isLoading?: boolean
}

const today = () => new Date().toISOString().split('T')[0]

export function MarkSalaryPaidDialog({
  payment,
  open,
  onOpenChange,
  onConfirm,
  isLoading,
}: MarkSalaryPaidDialogProps) {
  const [paymentDate, setPaymentDate] = useState(today())
  const [paymentMethod, setPaymentMethod] = useState<StandardPaymentMethod>('cash')
  const [financialAccountId, setFinancialAccountId] = useState('')
  const [accountError, setAccountError] = useState('')

  useEffect(() => {
    if (open) {
      setPaymentDate(today())
      setPaymentMethod('cash')
      setFinancialAccountId('')
      setAccountError('')
    }
  }, [open])

  if (!payment) return null

  const needsAccount = methodNeedsFinancialAccount(paymentMethod)

  const handleConfirm = async () => {
    if (paymentMethod === 'credit_card' && !financialAccountId) {
      setAccountError(`Please select a card settlement account (${CREDIT_CARD_ACCOUNTS.join(', ')})`)
      return
    }
    setAccountError('')
    await onConfirm(payment.id, {
      paymentDate,
      paymentMethod,
      financialAccountId: needsAccount ? financialAccountId || undefined : undefined,
    })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Mark Salary as Paid</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="rounded-lg border bg-muted/30 p-3 text-sm">
            <div className="font-medium">{payment.employeeName}</div>
            <div className="text-muted-foreground">{payment.paymentNumber} - {formatSalaryPeriod(payment.salaryPeriod)}</div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <span>Net Payable</span>
              <span className="text-right font-semibold">{formatCurrency(payment.netPayable)}</span>
              <span>Planned Advance Deduction</span>
              <span className="text-right font-semibold">{formatCurrency(payment.advanceDeduction)}</span>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Payment Date</Label>
            <Input type="date" value={paymentDate} onChange={event => setPaymentDate(event.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Payment Method</Label>
            <Select value={paymentMethod} onValueChange={(v) => { setPaymentMethod(v as StandardPaymentMethod); if (!methodNeedsFinancialAccount(v)) setFinancialAccountId(''); setAccountError('') }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                <SelectItem value="cheque">Cheque</SelectItem>
                <SelectItem value="credit_card">Credit Card</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {needsAccount && (
            <div className="space-y-1.5">
              <Label>{paymentMethod === 'credit_card' ? 'Card Settlement Account' : 'Financial Account'}</Label>
              <FinancialAccountSelect
                value={financialAccountId}
                onChange={(v) => { setFinancialAccountId(v); setAccountError('') }}
                allowedNames={paymentMethod === 'credit_card' ? CREDIT_CARD_ACCOUNTS : undefined}
              />
              {accountError && <p className="text-xs text-destructive">{accountError}</p>}
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            This will apply the advance deduction to the oldest outstanding advances first, then record the net salary payment.
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleConfirm} disabled={isLoading || !paymentDate}>Mark as Paid</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
