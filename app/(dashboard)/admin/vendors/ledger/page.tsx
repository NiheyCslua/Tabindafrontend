'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, ChevronRight } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { useVendorPaymentStore } from '@/lib/store/vendor-payment-store'
import { formatCurrency } from '@/lib/utils/format'

export default function VendorLedgerPage() {
  const { vendorSummaries, fetchVendorSummaries, isLoading } = useVendorPaymentStore()
  const router = useRouter()
  const [search, setSearch] = useState('')

  useEffect(() => { fetchVendorSummaries() }, [fetchVendorSummaries])

  const filtered = vendorSummaries.filter(v => {
    const term = search.toLowerCase()
    return v.company.toLowerCase().includes(term) || v.name.toLowerCase().includes(term)
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Vendor Ledger</h1>
        <p className="text-muted-foreground">View purchase history and outstanding balances by vendor</p>
      </div>

      {/* Totals */}
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
        <Card><CardContent className="pt-4">
          <p className="text-xs text-muted-foreground mb-1">Total Purchases</p>
          <p className="text-xl font-bold">{formatCurrency(vendorSummaries.reduce((s, v) => s + v.totalPurchases, 0))}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <p className="text-xs text-muted-foreground mb-1">Total Debit Bills</p>
          <p className="text-xl font-bold text-blue-600">{formatCurrency(vendorSummaries.reduce((s, v) => s + (v.totalDebitBills ?? 0), 0))}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <p className="text-xs text-muted-foreground mb-1">Total Paid</p>
          <p className="text-xl font-bold text-emerald-600">{formatCurrency(vendorSummaries.reduce((s, v) => s + v.totalPaid, 0))}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <p className="text-xs text-muted-foreground mb-1">Total Received</p>
          <p className="text-xl font-bold text-purple-600">{formatCurrency(vendorSummaries.reduce((s, v) => s + (v.totalReceived ?? 0), 0))}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <p className="text-xs text-muted-foreground mb-1">Net Outstanding</p>
          <p className="text-xl font-bold text-destructive">{formatCurrency(vendorSummaries.reduce((s, v) => s + Math.max(0, v.outstanding), 0))}</p>
        </CardContent></Card>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search vendors..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Vendor</TableHead>
              <TableHead className="text-right">Total Purchases</TableHead>
              <TableHead className="text-right">Debit Bills</TableHead>
              <TableHead className="text-right">Total Paid</TableHead>
              <TableHead className="text-right">Total Received</TableHead>
              <TableHead className="text-right">Net Balance</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No vendors found</TableCell></TableRow>
            ) : filtered.map(v => (
              <TableRow
                key={v.id}
                className="cursor-pointer hover:bg-muted/40"
                onClick={() => router.push(`/admin/vendors/ledger/${v.id}`)}
              >
                <TableCell>
                  <div className="font-medium">{v.company}</div>
                  <div className="text-xs text-muted-foreground">{v.name}</div>
                </TableCell>
                <TableCell className="text-right tabular-nums">{formatCurrency(v.totalPurchases)}</TableCell>
                <TableCell className="text-right tabular-nums text-blue-600">{formatCurrency(v.totalDebitBills ?? 0)}</TableCell>
                <TableCell className="text-right tabular-nums text-emerald-600">{formatCurrency(v.totalPaid)}</TableCell>
                <TableCell className="text-right tabular-nums text-purple-600">{formatCurrency(v.totalReceived ?? 0)}</TableCell>
                <TableCell className={`text-right tabular-nums font-medium ${v.outstanding > 0 ? 'text-destructive' : v.outstanding < 0 ? 'text-emerald-600' : ''}`}>
                  {v.outstanding < 0 ? '+' : ''}{formatCurrency(Math.abs(v.outstanding))}
                </TableCell>
                <TableCell className="w-8"><ChevronRight className="h-4 w-4 text-muted-foreground" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
