'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, ArrowDownLeft, ArrowUpRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useFinancialAccountsStore } from '@/lib/store/financial-accounts-store'
import { formatCurrency, formatDate } from '@/lib/utils/format'
import type { FinancialAccountLedgerResponse } from '@/lib/types'

const PAGE_SIZE = 25

export default function FinancialAccountLedgerPage() {
  const { accountId } = useParams<{ accountId: string }>()
  const router = useRouter()
  const { getLedger } = useFinancialAccountsStore()

  const [ledger, setLedger] = useState<FinancialAccountLedgerResponse | null>(null)
  const [page, setPage] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!accountId) return
    setIsLoading(true)
    getLedger(accountId, page, PAGE_SIZE)
      .then((data) => { setLedger(data); setError(null) })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load ledger'))
      .finally(() => setIsLoading(false))
  }, [accountId, page, getLedger])

  const totalPages = ledger ? Math.max(1, Math.ceil(ledger.total / PAGE_SIZE)) : 1

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.push('/admin/accounts')} className="gap-1.5">
          <ArrowLeft className="h-4 w-4" /> Back to Chart of Accounts
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">{ledger?.account.name || 'Account Ledger'}</h1>
        <p className="text-muted-foreground text-sm">{ledger?.account.type.replace('_', ' ')}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card><CardContent className="pt-4">
          <p className="text-xs text-muted-foreground mb-1">Opening Balance</p>
          <p className="text-xl font-bold tabular-nums">{formatCurrency(ledger?.openingBalance ?? 0)}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <p className="text-xs text-muted-foreground mb-1">Current Balance</p>
          <p className="text-xl font-bold tabular-nums">{formatCurrency(ledger?.currentBalance ?? 0)}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <p className="text-xs text-muted-foreground mb-1">Total Transactions</p>
          <p className="text-xl font-bold tabular-nums">{ledger?.total ?? 0}</p>
        </CardContent></Card>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Card>
        <CardContent className="pt-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead className="text-right">Money In</TableHead>
                <TableHead className="text-right">Money Out</TableHead>
                <TableHead className="text-right">Running Balance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="h-24 text-center text-muted-foreground">Loading…</TableCell></TableRow>
              ) : !ledger || ledger.entries.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="h-24 text-center text-muted-foreground">No transactions on this account yet.</TableCell></TableRow>
              ) : (
                ledger.entries.map((entry, i) => (
                  <TableRow key={`${entry.reference}-${i}`}>
                    <TableCell className="whitespace-nowrap">{formatDate(entry.date)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="gap-1">
                        {entry.moneyIn > 0 ? <ArrowDownLeft className="h-3 w-3 text-emerald-600" /> : <ArrowUpRight className="h-3 w-3 text-destructive" />}
                        {entry.source}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{entry.reference}</TableCell>
                    <TableCell className="text-right tabular-nums text-emerald-600">{entry.moneyIn > 0 ? formatCurrency(entry.moneyIn) : '-'}</TableCell>
                    <TableCell className="text-right tabular-nums text-destructive">{entry.moneyOut > 0 ? formatCurrency(entry.moneyOut) : '-'}</TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">{formatCurrency(entry.runningBalance)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {ledger && ledger.total > PAGE_SIZE && (
            <div className="flex items-center justify-between pt-4">
              <p className="text-xs text-muted-foreground">Page {page} of {totalPages}</p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
                <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
