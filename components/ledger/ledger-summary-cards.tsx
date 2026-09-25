import { ArrowDownLeft, ArrowUpRight, ListChecks, Scale } from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils/format'
import type { LedgerTotals } from '@/lib/utils/ledger'

interface LedgerSummaryCardsProps {
  totals: LedgerTotals
  visibleEntries: number
  totalEntries: number
}

export function LedgerSummaryCards({
  totals,
  visibleEntries,
  totalEntries,
}: LedgerSummaryCardsProps) {
  const cards = [
    {
      title: 'Total Debit',
      value: formatCurrency(totals.totalDebit),
      helper: `${totals.debitCount} paid customer invoice${totals.debitCount === 1 ? '' : 's'}`,
      icon: ArrowDownLeft,
    },
    {
      title: 'Total Credit',
      value: formatCurrency(totals.totalCredit),
      helper: `${totals.creditCount} unpaid vendor bill${totals.creditCount === 1 ? '' : 's'}`,
      icon: ArrowUpRight,
    },
    {
      title: 'Net Balance',
      value: formatCurrency(totals.netBalance),
      helper: 'Debit minus credit',
      icon: Scale,
    },
    {
      title: 'Entries',
      value: visibleEntries.toString(),
      helper: `${totalEntries} total ledger entr${totalEntries === 1 ? 'y' : 'ies'}`,
      icon: ListChecks,
    },
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon

        return (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.title}
              </CardTitle>
              <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tracking-tight">{card.value}</div>
              <p className="mt-1 text-xs text-muted-foreground">{card.helper}</p>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
