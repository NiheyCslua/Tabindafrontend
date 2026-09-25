// Shared Financial Account list.
//
// This is the single source of truth for the "Financial Account" selector
// shown whenever a transaction is recorded as a Bank Transfer. It is reused
// by:
//   - Misc Ledger (bank transfer entries)
//   - Vendor Payments (paying a vendor bill via bank transfer)
//   - Vendor Receipts (receiving a debit bill payment via bank transfer)
//   - Invoice Bank Transfers (customer payments received via bank transfer)
//   - Credit Card Payments (Phase 5)
//
// Do not duplicate this list elsewhere — every module that lets a user pick
// a bank/wallet account should import FINANCIAL_ACCOUNTS from here so that
// all financial transactions stay on the same set of account values. This
// keeps every module compatible with the upcoming Chart of Accounts
// (Phase 5), where each of these values will map directly to a Financial
// Account record.
export const FINANCIAL_ACCOUNTS = [
  'HBL',
  'Meezan',
  'Alfalah',
  'MCB',
  'Easypaisa',
  'JazzCash',
] as const

export type FinancialAccount = (typeof FINANCIAL_ACCOUNTS)[number]
