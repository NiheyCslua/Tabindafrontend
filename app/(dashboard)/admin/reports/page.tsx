'use client'

import { useState } from 'react'
import { DashboardHeader } from '@/components/dashboard/dashboard-header'
import { AccountingReport } from '@/components/reports/accounting-report'
import { ProductTransactionLedger } from '@/components/reports/product-transaction-ledger'
import { PayrollReport } from '@/components/reports/payroll-report'
import { ReportSelector } from '@/components/reports/report-selector'
import type { ReportType } from '@/lib/types'

const REPORT_TITLES: Record<ReportType, { title: string; description: string }> = {
  'all-customer-invoices': { title: 'All Customer Invoices', description: 'All customer invoices within a selected date range, regardless of status' },
  'unpaid-invoices': { title: 'Unpaid Customer Invoices', description: 'Pending and overdue invoices owed by customers' },
  'paid-customer-invoices': { title: 'Paid Customer Invoices', description: 'Paid invoices and collected revenue by customer' },
  'overdue-customer-invoices': { title: 'Overdue Customer Invoices', description: 'Invoices past due and needing collection follow-up' },
  'customer-statement': { title: 'Customer Statement', description: 'Account activity for one selected customer during a date range' },
  'customer-sales-summary': { title: 'Customer Sales Summary', description: 'Sales activity grouped by customer' },
  'all-vendor-bills': { title: 'All Vendor Bills', description: 'All vendor bills within a selected date range, regardless of status' },
  'unpaid-bills': { title: 'Unpaid Vendor Bills', description: 'Unpaid and overdue bills owed to vendors' },
  'paid-vendor-bills': { title: 'Paid Vendor Bills', description: 'Paid vendor bills and settled obligations' },
  'overdue-vendor-bills': { title: 'Overdue Vendor Bills', description: 'Vendor bills past due and requiring payment attention' },
  'vendor-statement': { title: 'Vendor Statement', description: 'Account activity for one selected vendor during a date range' },
  'vendor-purchase-summary': { title: 'Vendor Purchase Summary', description: 'Purchase activity grouped by vendor' },
  'receivables-payables': { title: 'Receivables vs Payables', description: 'Net financial position — money owed to you vs money you owe' },
  'aging-receivables': { title: 'Aging Receivables', description: 'Unpaid customer invoices grouped by aging bucket as of a selected date' },
  'aging-payables': { title: 'Aging Payables', description: 'Unpaid vendor bills grouped by aging bucket as of a selected date' },
  'cash-obligation-forecast': { title: 'Cash Obligation Forecast', description: 'Expected collections and expected vendor payments within a selected period' },
  'product-ledger': { title: 'Product Transaction Ledger', description: 'Serial-level buy/sell history per product across invoices and bills' },
  'payroll-monthly': { title: 'Monthly Payroll Report', description: 'Payroll generated and paid by employee, period, and status' },
  'payroll-advances': { title: 'Employee Advances Report', description: 'Salary advances, deducted amounts, remaining balances, and status' },
  'payroll-outstanding-advances': { title: 'Outstanding Advances Report', description: 'Open salary advance balances as of a selected date' },
  'payroll-ledger': { title: 'Employee Salary Ledger Report', description: 'Salary and advance movements for a selected employee' },
  'payroll-payments': { title: 'Salary Payments Report', description: 'Generated, paid, pending, and cancelled salary payments' },
}

const PAYROLL_TYPES: ReportType[] = [
  'payroll-monthly',
  'payroll-advances',
  'payroll-outstanding-advances',
  'payroll-ledger',
  'payroll-payments',
]

export default function ReportsPage() {
  const [activeReport, setActiveReport] = useState<ReportType | null>(null)

  return (
    <div className="flex min-h-screen flex-col">
      <DashboardHeader title="Reports" description="Accounting, financial, inventory, and payroll reporting center" />

      <div className="flex-1 space-y-6 p-4 md:p-6">
        <div className="space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Choose a Report</h2>
          <ReportSelector selected={activeReport} onSelect={setActiveReport} />
        </div>

        {activeReport && (
          <div key={activeReport} className="space-y-3">
            <div className="border-b border-border pb-3">
              <h2 className="text-xl font-semibold text-foreground">{REPORT_TITLES[activeReport].title}</h2>
              <p className="mt-0.5 text-sm text-muted-foreground">{REPORT_TITLES[activeReport].description}</p>
            </div>

            {activeReport === 'product-ledger'
              ? <ProductTransactionLedger />
              : PAYROLL_TYPES.includes(activeReport)
                ? <PayrollReport type={activeReport as Parameters<typeof PayrollReport>[0]['type']} />
                : <AccountingReport type={activeReport as Parameters<typeof AccountingReport>[0]['type']} />}
          </div>
        )}

        {!activeReport && (
          <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-muted/20 py-16 text-muted-foreground">
            <p className="font-medium text-foreground">Select a report above to get started</p>
            <p className="text-sm">Reports are grouped by customer, vendor, financial, inventory, and payroll workflows.</p>
          </div>
        )}
      </div>
    </div>
  )
}
