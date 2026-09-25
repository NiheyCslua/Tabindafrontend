// User & Auth Types
export type UserRole = 'admin' | 'sales' | 'inventory_manager' | 'employee' | 'no_app_access'

export interface User {
  id: string
  email: string
  name: string
  role: UserRole
  avatar?: string
  createdAt: string
}

export interface LoginCredentials {
  email: string
  password: string
  role: UserRole
}

export interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
}

// Product Types
// Product Types
export type ProductStatus = 'active' | 'inactive'
export type StockStatus = 'in_stock' | 'low_stock' | 'out_of_stock'

export interface ProductCategory {
  id: string
  name: string
  createdAt?: string
  updatedAt?: string
}

export interface ProductVariant {
  id: string
  name: string
  value: string
  skuSuffix?: string
  priceAdjustment?: number
}

// A single tracked unit of a product. Vendor stays in metadata even when
// serial numbers follow a shared sequence across multiple purchase sources.
export interface SerialUnit {
  id?: string
  serialNumber: string   // unique per physical unit
  productId: string
  productName: string
  productSku: string
  sku?: string
  barcode: string        // shared across all units of same product+vendor
  vendorId?: string
  vendorName?: string
  purchaseDate?: string  // when it was received into inventory
  costPrice: number
  status: 'in_stock' | 'sold' | 'reserved'

  // Purchase document linkage
  purchaseBillId?: string
  purchaseBillNumber?: string
  purchaseUnitPrice?: number

  // Sale document linkage
  saleInvoiceId?: string
  saleInvoiceNumber?: string
  soldAt?: string
  customerId?: string
  customerName?: string
  saleUnitPrice?: number
}

export interface Product {
  id: string
  sku: string
  barcode: string
  name: string
  description: string
  category: string
  // Free-text, non-hierarchical second label alongside category (e.g.
  // category "Toners", subcategory "HP") — not a parent/child relationship.
  subcategory?: string
  brand: string
  vendorId?: string
  vendorName?: string
  costPrice: number
  sellingPrice: number
  taxRate: number
  quantity: number
  reorderLevel: number
  maxStock: number
  status: ProductStatus
  image: string
  images?: string[]
  variants?: ProductVariant[]
  createdAt: string
  updatedAt: string
}

export interface ProductFilters {
  search?: string
  category?: string
  status?: ProductStatus
  stockStatus?: StockStatus
  minPrice?: number
  maxPrice?: number
  barcode?: string
}

export interface CreateProductDTO {
  sku: string
  barcode: string
  name: string
  description: string
  category: string
  subcategory?: string
  brand: string
  vendorId?: string
  vendorName?: string
  costPrice: number
  sellingPrice: number
  taxRate: number
  quantity: number
  reorderLevel: number
  maxStock: number
  status: ProductStatus
  image?: string
  images?: string[]
  variants?: ProductVariant[]
}

export type UpdateProductDTO = Partial<CreateProductDTO>

// Customer Types
export type CustomerStatus = 'active' | 'inactive'

export interface Customer {
  id: string
  name: string
  email: string
  phone: string
  company?: string
  address: string
  city: string
  state: string
  zipCode: string
  country: string
  creditLimit: number
  totalPurchases: number
  status: CustomerStatus
  notes?: string
  createdAt: string
}

export interface CreateCustomerDTO {
  name: string
  email?: string
  phone: string
  company?: string
  address?: string
  city?: string
  state?: string
  zipCode?: string
  country?: string
  creditLimit?: number
  status: CustomerStatus
  notes?: string
}

export type UpdateCustomerDTO = Partial<CreateCustomerDTO>

// Invoice Types
export type InvoiceStatus = 'paid' | 'pending' | 'cancelled' | 'overdue'
export type PaymentMethod = 'cash' | 'credit_card' | 'bank_transfer' | 'cheque'
export type InvoiceTemplate = string

export interface InvoiceLineItem {
  id: string
  productId: string
  productName: string
  productSku: string
  // Invoice Product Description (Editable Per Line Item): the invoice's
  // own saved copy, independent of Product.description. Null/undefined
  // means intentionally blank — print nothing beneath the product name.
  productDescription?: string | null
  serialNumber?: string
  serialNumbers?: string[]
  quantity: number
  unitPrice: number
  taxRate: number
  discount: number
  total: number
}

export type InvoiceKind = 'product' | 'service'

export interface Invoice {
  id: string
  invoiceNumber: string
  customerId: string
  customerName: string
  customerEmail: string
  // "Customer Number" in the UI — optional, own copy per invoice.
  customerPhone?: string | null
  // Phase – Sales Improvements: 'product' (default, existing behaviour) or
  // 'service' (labour-based, no inventory, no Terms & Conditions). Set
  // once at creation — immutable after that, same as the backend enforces.
  invoiceType?: InvoiceKind
  items: InvoiceLineItem[]
  subtotal: number
  taxAmount: number
  discountAmount: number
  shippingCost: number
  total: number
  status: InvoiceStatus
  paymentMethod: PaymentMethod
  bankAccount?: string | null
  financialAccountId?: string | null
  template: InvoiceTemplate
  // The invoice's own independent copy — set from the template's default
  // text at creation, then owned by the invoice from then on. Null on
  // invoices created before this feature existed.
  termsAndConditions?: string | null
  notes?: string
  // Purchase Order number. Purely optional — the "PO" heading only prints
  // when this has a value; left blank, nothing shows at all.
  poNumber?: string | null
  dueDate: string
  paidAt?: string
  createdAt: string
  createdBy: string
}

export interface CreateInvoiceDTO {
  customerId?: string
  customerName?: string
  customerPhone?: string
  invoiceType?: InvoiceKind
  template?: InvoiceTemplate
  termsAndConditions?: string
  invoiceDate?: string
  status?: InvoiceStatus
  items: {
    productId?: string
    productName: string
    productSku?: string
    productDescription?: string
    serialNumber?: string
    serialNumbers?: string[]
    quantity: number
    unitPrice: number
    taxRate: number
    discount: number
  }[]
  paymentMethod: PaymentMethod
  bankAccount?: string
  financialAccountId?: string
  notes?: string
  poNumber?: string
  shippingCost?: number
  dueDate: string
}

// Employee & Payroll Types
export type EmployeeStatus = 'active' | 'inactive' | 'on_leave' | 'terminated'

export interface Employee {
  id: string
  employeeId: string
  name: string
  email: string
  phone: string
  password?: string
  role: UserRole
  cnic?: string
  position: string
  designation?: string
  address?: string
  status: EmployeeStatus
  hireDate: string
  joiningDate?: string
  salary: number
  baseSalary: number
  createdAt: string
  updatedAt?: string
}

export interface CreateEmployeeDTO {
  name: string
  email?: string
  phone: string
  password?: string
  role: UserRole
  cnic?: string
  position: string
  designation?: string
  address?: string
  status: EmployeeStatus
  hireDate?: string
  joiningDate?: string
  baseSalary: number
  salary?: number
}

export type UpdateEmployeeDTO = Partial<CreateEmployeeDTO>

export type SalaryAdvanceStatus = 'outstanding' | 'partially_deducted' | 'deducted' | 'cancelled'

export interface SalaryAdvance {
  id: string
  employeeId: string
  employeeName: string
  date: string
  amount: number
  deductedAmount: number
  remainingAmount: number
  reason?: string
  notes?: string
  status: SalaryAdvanceStatus
  createdAt: string
  updatedAt?: string
}

export interface CreateSalaryAdvanceDTO {
  employeeId: string
  date: string
  amount: number
  reason?: string
  notes?: string
}

export interface SalaryAdvanceDeduction {
  advanceId: string
  amount: number
}

export type SalaryPaymentStatus = 'pending' | 'paid' | 'cancelled'

export interface SalaryPayment {
  id: string
  paymentNumber: string
  employeeId: string
  employeeName: string
  salaryPeriod: string
  periodStart?: string
  periodEnd?: string
  baseSalary: number
  bonus: number
  otherDeductions: number
  advanceDeduction: number
  grossSalary: number
  netPayable: number
  amountPaid: number
  status: SalaryPaymentStatus
  paymentDate?: string
  paymentMethod?: string | null
  financialAccountId?: string | null
  notes?: string
  advanceDeductions?: SalaryAdvanceDeduction[]
  createdAt: string
  updatedAt?: string
}

export interface GenerateSalaryPaymentDTO {
  employeeId: string
  salaryPeriod: string
  periodStart?: string
  periodEnd?: string
  bonus?: number
  otherDeductions?: number
  advanceDeduction?: number
  notes?: string
}

export type EmployeeLedgerEntryType =
  | 'salary_generated'
  | 'salary_paid'
  | 'salary_cancelled'
  | 'advance_taken'
  | 'advance_deducted'
  | 'bonus'
  | 'deduction'
  | 'adjustment'
  | 'advance_cancelled'

export interface EmployeeLedgerEntry {
  id: string
  employeeId: string
  employeeName: string
  date: string
  type: EmployeeLedgerEntryType
  description: string
  debit: number
  credit: number
  balance?: number
  referenceId?: string
  referenceType?: 'salary_payment' | 'salary_advance' | 'adjustment'
  createdAt: string
}



// Miscellaneous Ledger Types
export interface MiscLedgerEntry {
  id: string
  label: string
  description?: string
  amount: number
  date: string
  // Standard financial metadata — matches Vendor Payments / Invoice Payments
  paymentMethod?: string
  financialAccountId?: string
  referenceNumber?: string
  paymentDate?: string
  // Legacy fields — retained for backward compat
  reference?: string
  notes?: string
  createdById?: string
  createdByName?: string
  createdAt: string
  updatedAt?: string
}

export interface CreateMiscLedgerEntryDTO {
  label: string
  description?: string
  amount: number
  date: string
  paymentMethod?: string
  financialAccountId?: string
  referenceNumber?: string
  paymentDate?: string
}

export type UpdateMiscLedgerEntryDTO = Partial<CreateMiscLedgerEntryDTO>

// Dashboard Types
export interface DashboardStats {
  totalRevenue: number
  revenueChange: number
  totalProducts: number
  productChange: number
  lowStockAlerts: number
  alertChange: number
  activeInvoices: number
  invoiceChange: number
}

export interface RevenueData {
  date: string
  revenue: number
  orders: number
}

export interface TopProduct {
  id: string
  name: string
  sku: string
  sales: number
  revenue: number
}

export interface RecentTransaction {
  id: string
  invoiceNumber: string
  customerName: string
  amount: number
  status: InvoiceStatus
  date: string
}

// Pagination
export interface PaginationParams {
  page: number
  limit: number
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

// Notification Types
export type NotificationType = 'info' | 'warning' | 'success' | 'error'

export interface Notification {
  id: string
  type: NotificationType
  title: string
  message: string
  read: boolean
  createdAt: string
}

// Vendor Types
export type VendorStatus = 'active' | 'inactive'

export interface Vendor {
  id: string
  name: string
  company: string
  email: string
  phone: string
  address: string
  city: string
  state: string
  country: string
  totalPurchases: number
  status: VendorStatus
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface CreateVendorDTO {
  name: string
  company: string
  email: string
  phone: string
  address: string
  city: string
  state: string
  country: string
  status: VendorStatus
  notes?: string
}

export type UpdateVendorDTO = Partial<CreateVendorDTO>

// Bill Types
export type BillType = 'CREDIT' | 'DEBIT'

export type BillStatus = 'paid' | 'unpaid' | 'partially_paid' | 'overdue' | 'cancelled'

export interface BillLineItem {
  id: string
  productId: string
  productName: string
  productSku: string
  serialNumber?: string
  serialNumbers?: string[]
  quantity: number
  unitPrice: number
  taxRate: number
  discount: number
  total: number
}

export interface Bill {
  id: string
  billNumber: string
  billType: BillType
  vendorId: string
  vendorName: string
  vendorEmail: string
  items: BillLineItem[]
  subtotal: number
  taxAmount: number
  discountAmount: number
  amount: number
  paidAmount: number
  balanceAmount: number
  status: BillStatus
  date: string
  dueDate: string
  paidAt?: string
  notes?: string
  createdAt: string
  createdBy: string
}

export interface CreateBillDTO {
  billNumber: string
  billType?: BillType
  vendorId?: string
  vendorName?: string
  items: {
    productId: string
    productName: string
    productSku: string
    serialNumber?: string
    serialNumbers?: string[]
    quantity: number
    unitPrice: number
    taxRate: number
    discount: number
  }[]
  status: BillStatus
  date: string
  dueDate: string
  notes?: string
}

export type UpdateBillDTO = Partial<CreateBillDTO>

// ── Vendor Payments ──────────────────────────────────────────────────────────

export type VendorPaymentMethod = 'cash' | 'cheque' | 'bank_transfer' | 'credit_card'

// Shared shape for both VendorPayment and VendorReceipt
export interface VendorPayment {
  id: string
  paymentNumber: string
  vendorId: string
  vendorName: string
  vendorBillId: string
  billNumber: string
  billAmount: number
  amount: number
  paymentMethod: VendorPaymentMethod
  bankAccount?: string | null
  financialAccountId?: string | null
  referenceNumber?: string | null
  paymentDate: string
  balanceAfterPayment: number
  notes?: string | null
  createdBy?: string
  createdAt: string
  updatedAt: string
}

// VendorReceipt mirrors VendorPayment but uses receiptNumber
export interface VendorReceipt {
  id: string
  receiptNumber: string
  vendorId: string
  vendorName: string
  vendorBillId: string
  billNumber: string
  billAmount: number
  amount: number
  paymentMethod: VendorPaymentMethod
  bankAccount?: string | null
  financialAccountId?: string | null
  referenceNumber?: string | null
  paymentDate: string
  balanceAfterPayment: number
  notes?: string | null
  createdBy?: string
  createdAt: string
  updatedAt: string
}

export interface CreateVendorPaymentDTO {
  vendorBillId: string
  amount: number
  paymentMethod: VendorPaymentMethod
  bankAccount?: string
  financialAccountId?: string
  referenceNumber?: string
  paymentDate: string
  notes?: string
  createdBy?: string
}

// Alias — same shape, different intent
export type CreateVendorReceiptDTO = CreateVendorPaymentDTO

export interface UnpaidBill {
  id: string
  billNumber: string
  billType: BillType
  vendorId: string
  vendorName: string
  amount: number
  paidAmount: number
  balanceAmount: number
  date: string
  dueDate?: string
  status: BillStatus
  payments: VendorPayment[]
}

export interface VendorSummary {
  id: string
  name: string
  company: string
  totalPurchases: number
  totalDebitBills: number
  totalPaid: number
  totalReceived: number
  outstanding: number
}

export interface VendorLedgerEntry {
  date: string
  type: 'bill' | 'debit_bill' | 'payment' | 'receipt'
  reference: string
  debit: number
  credit: number
  balance: number
  paymentMethod?: string | null
  bankAccount?: string | null
  referenceNumber?: string | null
}

export interface VendorLedger {
  vendor: { id: string; name: string; company: string }
  totalPurchases: number
  totalDebitBills: number
  totalPaid: number
  totalReceived: number
  outstanding: number
  entries: VendorLedgerEntry[]
}

// General Ledger Types
export type LedgerSourceType = 'customer_invoice' | 'vendor_bill' | 'misc_expense'
export type LedgerPartyType = 'customer' | 'vendor' | 'expense'

export interface LedgerEntry {
  id: string
  sourceType: LedgerSourceType
  sourceLabel: string
  referenceId: string
  referenceNumber: string
  partyName: string
  partyEmail?: string
  partyType: LedgerPartyType
  date: string
  dueDate?: string
  status: InvoiceStatus | BillStatus
  description: string
  debit: number
  credit: number
  amount: number
}



// Monthly Earnings Report Types
export type MonthlyEarningsEntryType = 'income' | 'outgoing'
export type MonthlyEarningsSourceType = 'customer_invoice' | 'vendor_bill' | 'debit_bill' | 'misc_expense' | 'employee_salary'

export interface MonthlyEarningsEntry {
  id: string
  type: MonthlyEarningsEntryType
  sourceType: MonthlyEarningsSourceType
  referenceId: string
  referenceNumber: string
  partyName: string
  partyEmail?: string
  date: string
  documentDate?: string
  dueDate?: string
  status: string
  description: string
  amount: number
  paymentMethod?: string
  itemCount?: number
  label?: string
  notes?: string
  createdByName?: string
}

export interface MonthlyEarningsReport {
  month: string
  from: string
  to: string
  totals: {
    income: number
    vendorOutgoing: number
    miscOutgoing: number
    salaryOutgoing: number
    totalOutgoing: number
    netEarnings: number
    incomeCount: number
    vendorPaymentCount: number
    miscExpenseCount: number
    salaryPaymentCount: number
    totalEntryCount: number
  }
  incomeEntries: MonthlyEarningsEntry[]
  vendorOutgoingEntries: MonthlyEarningsEntry[]
  miscExpenseEntries: MonthlyEarningsEntry[]
  salaryOutgoingEntries: MonthlyEarningsEntry[]
}

// ─── Report Types ─────────────────────────────────────────────────────────────

export type ReportCategory =
  | 'customer'
  | 'vendor'
  | 'financial'
  | 'inventory'
  | 'payroll'

export type ReportType =
  | 'all-customer-invoices'
  | 'unpaid-invoices'
  | 'paid-customer-invoices'
  | 'overdue-customer-invoices'
  | 'customer-statement'
  | 'customer-sales-summary'
  | 'all-vendor-bills'
  | 'unpaid-bills'
  | 'paid-vendor-bills'
  | 'overdue-vendor-bills'
  | 'vendor-statement'
  | 'vendor-purchase-summary'
  | 'receivables-payables'
  | 'aging-receivables'
  | 'aging-payables'
  | 'cash-obligation-forecast'
  | 'product-ledger'
  | 'payroll-monthly'
  | 'payroll-advances'
  | 'payroll-outstanding-advances'
  | 'payroll-ledger'
  | 'payroll-payments'

export interface ReportDateRange {
  startDate?: string
  endDate?: string
}

export type DateSortOrder = 'oldest' | 'newest'

export type LedgerTransactionType = 'sold' | 'bought'

export interface ProductLedgerTransaction {
  id: string
  type: LedgerTransactionType
  date: string
  documentNumber: string
  partyName: string
  productId: string
  productName: string
  productSku: string
  quantity: number
  unitPrice: number
  total: number
  status: string
  source: 'invoice' | 'bill'
  sourceId: string
  serialNumber: string | null
  serialNumbers: string[]
  isAggregateFallback?: boolean
}

export interface ReceivablesPayablesSummary {
  totalReceivables: number
  totalPayables: number
  netPosition: number
  overdueReceivables: number
  overduePayables: number
}

// ── Phase 5: Financial Accounts (Chart of Accounts) ───────────────────────

export type FinancialAccountType = 'CASH' | 'BANK' | 'MOBILE_WALLET'

export interface FinancialAccount {
  id: string
  name: string
  type: FinancialAccountType
  openingBalance: number
  openingBalanceDate?: string | null
  description?: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface CreateFinancialAccountDTO {
  name: string
  type: FinancialAccountType
  openingBalance?: number
  openingBalanceDate?: string
  description?: string
  isActive?: boolean
}

export type UpdateFinancialAccountDTO = Partial<Pick<CreateFinancialAccountDTO, 'name' | 'type' | 'description' | 'isActive'>>

export interface SetOpeningBalanceDTO {
  openingBalance: number
  openingBalanceDate?: string
}

// Row shown on the Chart of Accounts dashboard (Change 5)
export interface ChartOfAccountsEntry extends FinancialAccount {
  moneyIn: number
  moneyOut: number
  currentBalance: number
}

// Row shown on a single account's ledger (Change 7)
export interface FinancialAccountLedgerEntry {
  date: string
  source: 'Customer Invoice' | 'Vendor Payment' | 'Vendor Receipt' | 'Employee Payment' | 'Misc Expense'
  reference: string
  moneyIn: number
  moneyOut: number
  runningBalance: number
}

export interface FinancialAccountLedgerResponse {
  account: FinancialAccount
  openingBalance: number
  currentBalance: number
  total: number
  page: number
  pageSize: number
  entries: FinancialAccountLedgerEntry[]
}

