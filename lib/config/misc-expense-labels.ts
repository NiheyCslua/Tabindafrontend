// Fixed set of Misc Ledger expense categories.
//
// The Expense Label field is a controlled dropdown (not free text) so that
// Misc Ledger entries roll up cleanly once Chart of Accounts (Phase 5) maps
// each category to a financial account/expense head. Add new categories
// here only — do not let individual forms define their own lists.
export const MISC_EXPENSE_LABELS = [
  'Computer & Internet Expense',
  'Commission',
  'Bank Service Charges',
  'Cost of Goods Sold',
  'Discount',
  'Electricity Bills',
  'Freight Charges',
  'Furniture & Equipments',
  'Home Expense',
  'Withholding Tax',
  'GST Tax',
  'Meals & Entertainment',
  'Office Supplies',
  'Owners Draw',
  'Owners Equity',
  'Petrol & Maintenance',
  'Rent Expense',
  'Professional Fee',
  'School Fee',
  'Travel Expense',
  'Telephone Fee',
  'Uncategorised Expense',
] as const

export type MiscExpenseLabel = (typeof MISC_EXPENSE_LABELS)[number]
