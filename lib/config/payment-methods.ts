// Chart of Accounts Corrections — Change 2: Standardize Cash Handling.
//
// The single source of truth for the four standard payment methods used
// everywhere a module records money moving: Vendor Payments, Vendor
// Receipts, Invoices, Employee Payments, and Misc Ledger.
//
// Cash Mapping Rules:
//   Cash          → posts automatically to "Cash on Hand" (no selector shown)
//   Bank Transfer → user selects a Financial Account
//   Cheque        → user selects a Financial Account
//   Credit Card   → user selects a supported card-settlement Financial Account
export const PAYMENT_METHODS = ['cash', 'bank_transfer', 'cheque', 'credit_card'] as const

export type StandardPaymentMethod = (typeof PAYMENT_METHODS)[number]

export const PAYMENT_METHOD_LABELS: Record<StandardPaymentMethod, string> = {
  cash: 'Cash',
  bank_transfer: 'Bank Transfer',
  cheque: 'Cheque',
  credit_card: 'Credit Card',
}

// A payment method needs the shared Financial Account selector whenever it
// isn't Cash — Cash always maps automatically to Cash on Hand.
export const methodNeedsFinancialAccount = (method?: string | null) =>
  method === 'bank_transfer' || method === 'cheque' || method === 'credit_card'

// Credit Card payments only settle to these supported card-settlement
// accounts (matches backend CREDIT_CARD_ACCOUNTS in FinancialAccountsService).
export const CREDIT_CARD_ACCOUNTS = ['Alfalah', 'Meezan', 'HBL']
