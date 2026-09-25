'use client'

import type { ElementType } from 'react'
import { ArrowLeftRight, BarChart3, BookOpen, CalendarClock, FileText, Landmark, ReceiptText, Users, WalletCards } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ReportCategory, ReportType } from '@/lib/types'

interface ReportOption {
  type: ReportType
  label: string
  description: string
  icon: ElementType
}

interface ReportGroup {
  category: ReportCategory
  title: string
  description: string
  options: ReportOption[]
}

const REPORT_GROUPS: ReportGroup[] = [
  {
    category: 'customer',
    title: 'Customer Reports',
    description: 'Invoice, collection, statement, and sales views for clients.',
    options: [
      { type: 'all-customer-invoices', label: 'All Customer Invoices', description: 'All invoices in a selected date range.', icon: FileText },
      { type: 'unpaid-invoices', label: 'Unpaid Customer Invoices', description: 'Pending and overdue receivables.', icon: ReceiptText },
      { type: 'paid-customer-invoices', label: 'Paid Customer Invoices', description: 'Collected invoice revenue.', icon: FileText },
      { type: 'overdue-customer-invoices', label: 'Overdue Customer Invoices', description: 'Invoices needing collection follow-up.', icon: CalendarClock },
      { type: 'customer-statement', label: 'Customer Statement', description: 'Single-customer account activity.', icon: Users },
      { type: 'customer-sales-summary', label: 'Customer Sales Summary', description: 'Sales grouped by customer.', icon: BarChart3 },
    ],
  },
  {
    category: 'vendor',
    title: 'Vendor Reports',
    description: 'Bill, payable, vendor statement, and purchase summaries.',
    options: [
      { type: 'all-vendor-bills', label: 'All Vendor Bills', description: 'All vendor bills in a selected date range.', icon: FileText },
      { type: 'unpaid-bills', label: 'Unpaid Vendor Bills', description: 'Unpaid and overdue payables.', icon: ReceiptText },
      { type: 'paid-vendor-bills', label: 'Paid Vendor Bills', description: 'Bills already paid.', icon: FileText },
      { type: 'overdue-vendor-bills', label: 'Overdue Vendor Bills', description: 'Bills needing payment attention.', icon: CalendarClock },
      { type: 'vendor-statement', label: 'Vendor Statement', description: 'Single-vendor account activity.', icon: Landmark },
      { type: 'vendor-purchase-summary', label: 'Vendor Purchase Summary', description: 'Purchases grouped by vendor.', icon: BarChart3 },
    ],
  },
  {
    category: 'financial',
    title: 'Financial Reports',
    description: 'Receivables, payables, aging, and cash planning.',
    options: [
      { type: 'receivables-payables', label: 'Receivables vs Payables', description: 'Net position across unpaid invoices and bills.', icon: ArrowLeftRight },
      { type: 'aging-receivables', label: 'Aging Receivables', description: 'Unpaid invoices by customer and aging bucket.', icon: CalendarClock },
      { type: 'aging-payables', label: 'Aging Payables', description: 'Unpaid bills by vendor and aging bucket.', icon: CalendarClock },
      { type: 'cash-obligation-forecast', label: 'Cash Obligation Forecast', description: 'Expected collections and vendor payments.', icon: BarChart3 },
    ],
  },
  {
    category: 'inventory',
    title: 'Inventory Reports',
    description: 'Product and serial-number movement history.',
    options: [
      { type: 'product-ledger', label: 'Product Transaction Ledger', description: 'Serial-level bought/sold product timeline.', icon: BookOpen },
    ],
  },
  {
    category: 'payroll',
    title: 'Employee / Payroll Reports',
    description: 'Salary payments, advances, outstanding balances, and employee ledger views.',
    options: [
      { type: 'payroll-monthly', label: 'Monthly Payroll Report', description: 'Payroll generated and paid for a selected date range.', icon: WalletCards },
      { type: 'payroll-advances', label: 'Employee Advances Report', description: 'Advances given, deducted, and remaining.', icon: ReceiptText },
      { type: 'payroll-outstanding-advances', label: 'Outstanding Advances Report', description: 'Open employee advance balances as of a date.', icon: CalendarClock },
      { type: 'payroll-ledger', label: 'Employee Salary Ledger', description: 'Salary and advance transactions for one employee.', icon: BookOpen },
      { type: 'payroll-payments', label: 'Salary Payments Report', description: 'Salary payment status and cash paid history.', icon: FileText },
    ],
  },
]

const CATEGORY_COLORS: Record<ReportCategory, { icon: string; bg: string }> = {
  customer: { icon: 'text-blue-500', bg: 'bg-blue-500/10' },
  vendor: { icon: 'text-rose-500', bg: 'bg-rose-500/10' },
  financial: { icon: 'text-amber-500', bg: 'bg-amber-500/10' },
  inventory: { icon: 'text-emerald-500', bg: 'bg-emerald-500/10' },
  payroll: { icon: 'text-violet-500', bg: 'bg-violet-500/10' },
}

interface ReportSelectorProps {
  selected: ReportType | null
  onSelect: (type: ReportType) => void
}

export function ReportSelector({ selected, onSelect }: ReportSelectorProps) {
  return (
    <div className="space-y-5">
      {REPORT_GROUPS.map(group => {
        const colors = CATEGORY_COLORS[group.category]
        return (
          <section key={group.category} className="space-y-3 rounded-xl border bg-card p-4">
            <div>
              <h3 className="text-sm font-semibold text-foreground">{group.title}</h3>
              <p className="text-xs text-muted-foreground">{group.description}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {group.options.map(option => {
                const Icon = option.icon
                const isActive = selected === option.type
                return (
                  <button
                    key={option.type}
                    onClick={() => onSelect(option.type)}
                    className={cn(
                      'flex gap-3 rounded-lg border p-3 text-left transition-all hover:shadow-sm',
                      isActive
                        ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                        : 'border-border bg-background hover:bg-muted/40'
                    )}
                  >
                    <div className={cn('mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', colors.bg)}>
                      <Icon className={cn('h-4 w-4', colors.icon)} />
                    </div>
                    <div>
                      <p className={cn('text-sm font-semibold', isActive ? 'text-primary' : 'text-foreground')}>{option.label}</p>
                      <p className="mt-0.5 text-xs leading-snug text-muted-foreground">{option.description}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          </section>
        )
      })}
    </div>
  )
}
