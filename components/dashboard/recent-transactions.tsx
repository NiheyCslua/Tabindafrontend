'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useInvoiceStore } from '@/lib/store/invoice-store'
import { buildRecentTransactions } from '@/lib/dashboard-derived'
import { formatCurrency, formatDate, getInvoiceStatusColor } from '@/lib/utils/format'
import { cn } from '@/lib/utils'

export function RecentTransactions() {
  const invoices = useInvoiceStore((state) => state.invoices)
  const transactions = buildRecentTransactions(invoices)

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-foreground">Recent Transactions</CardTitle>
        <CardDescription className="text-muted-foreground">
          Latest invoice activity
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {transactions.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            No invoice activity yet.
          </div>
        ) : transactions.map((transaction) => (
          <div
            key={transaction.id}
            className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
          >
            <div className="space-y-1">
              <p className="font-medium text-sm text-foreground">
                {transaction.customerName}
              </p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>{transaction.invoiceNumber}</span>
                <span>•</span>
                <span>{formatDate(transaction.date)}</span>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <p className="font-semibold text-foreground">
                {formatCurrency(transaction.amount)}
              </p>
              <Badge
                variant="outline"
                className={cn(
                  'text-xs capitalize',
                  getInvoiceStatusColor(transaction.status)
                )}
              >
                {transaction.status}
              </Badge>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
