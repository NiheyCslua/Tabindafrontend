"use client"

import { useEffect } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useFinancialAccountsStore } from '@/lib/store/financial-accounts-store'

interface FinancialAccountSelectProps {
  value: string
  onChange: (value: string) => void
  /**
   * Restrict the options to specific account names. Used by Credit Card
   * payments, which — for now — only support Alfalah, Meezan and HBL.
   */
  allowedNames?: string[]
  placeholder?: string
  disabled?: boolean
  id?: string
}

/**
 * The one Financial Account selector, reused everywhere a module needs to
 * record which bank/wallet a transaction moved through: Misc Ledger, Vendor
 * Payments, Vendor Receipts, Invoice Bank Transfers, Credit Card Payments,
 * and Employee Payments. Do not hardcode a bank/wallet list in a form —
 * import this component instead so every module always reflects the real
 * Financial Account records (Chart of Accounts, Phase 5).
 *
 * Chart of Accounts Corrections — Change 2: this selector is only ever
 * rendered for Bank Transfer / Cheque / Credit Card, never Cash — Cash maps
 * automatically to the single "Cash on Hand" account. So the CASH-type
 * account is excluded here too: it should never appear as something the
 * user manually picks.
 */
export function FinancialAccountSelect({
  value,
  onChange,
  allowedNames,
  placeholder = 'Select bank / wallet',
  disabled,
  id,
}: FinancialAccountSelectProps) {
  const { accounts, fetchAccounts } = useFinancialAccountsStore()

  useEffect(() => {
    if (accounts.length === 0) {
      fetchAccounts(true).catch(() => undefined)
    }
  }, [accounts.length, fetchAccounts])

  const options = accounts
    .filter((account) => account.type !== 'CASH')
    .filter((account) => (allowedNames ? allowedNames.includes(account.name) : true))

  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger id={id}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((account) => (
          <SelectItem key={account.id} value={account.id}>
            {account.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
