'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, ArrowDownLeft, ArrowUpRight, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { useVendorPaymentStore } from '@/lib/store/vendor-payment-store'
import { formatCurrency, formatDate } from '@/lib/utils/format'

export default function VendorLedgerDetailPage() {
  const { vendorId } = useParams<{ vendorId: string }>()
  const router = useRouter()
  const { fetchVendorLedger, vendorLedger, isLoading } = useVendorPaymentStore()

  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<'all' | 'bill' | 'payment'>('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  useEffect(() => { if (vendorId) fetchVendorLedger(vendorId) }, [vendorId, fetchVendorLedger])

  const entries = (vendorLedger?.entries ?? []).filter(e => {
    if (typeFilter !== 'all' && e.type !== typeFilter) return false
    if (search && !e.reference.toLowerCase().includes(search.toLowerCase())) return false
    const d = new Date(e.date)
    if (dateFrom && d < new Date(dateFrom)) return false
    if (dateTo && d > new Date(dateTo)) return false
    return true
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.back()} className="gap-1.5">
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {vendorLedger?.vendor.company || 'Vendor Ledger'}
          </h1>
          <p className="text-muted-foreground text-sm">{vendorLedger?.vendor.name}</p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
        <Card><CardContent className="pt-4">
          <p className="text-xs text-muted-foreground mb-1">Total Purchases</p>
          <p className="text-xl font-bold">{formatCurrency(vendorLedger?.totalPurchases ?? 0)}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <p className="text-xs text-muted-foreground mb-1">Debit Bills</p>
          <p className="text-xl font-bold text-blue-600">{formatCurrency(vendorLedger?.totalDebitBills ?? 0)}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <p className="text-xs text-muted-foreground mb-1">Total Paid</p>
          <p className="text-xl font-bold text-emerald-600">{formatCurrency(vendorLedger?.totalPaid ?? 0)}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <p className="text-xs text-muted-foreground mb-1">Total Received</p>
          <p className="text-xl font-bold text-purple-600">{formatCurrency((vendorLedger as any)?.totalReceived ?? 0)}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <p className="text-xs text-muted-foreground mb-1">Net Balance</p>
          <p className={`text-xl font-bold ${(vendorLedger?.outstanding ?? 0) > 0 ? 'text-destructive' : (vendorLedger?.outstanding ?? 0) < 0 ? 'text-emerald-600' : ''}`}>
            {(vendorLedger?.outstanding ?? 0) < 0 ? '+' : ''}{formatCurrency(Math.abs(vendorLedger?.outstanding ?? 0))}
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {(vendorLedger?.outstanding ?? 0) > 0 ? 'We owe vendor' : (vendorLedger?.outstanding ?? 0) < 0 ? 'Vendor owes us' : 'Settled'}
          </p>
        </CardContent></Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search reference..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 w-48" />
        </div>
        <Select value={typeFilter} onValueChange={v => setTypeFilter(v as any)}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="bill">Bills</SelectItem>
            <SelectItem value="payment">Payments</SelectItem>
          </SelectContent>
        </Select>
        <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-40" placeholder="From" />
        <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-40" placeholder="To" />
      </div>

      {/* Ledger table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Reference</TableHead>
              <TableHead className="text-right">Credit (Bills)</TableHead>
              <TableHead className="text-right">Debit (Payments)</TableHead>
              <TableHead className="text-right">Balance</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
            ) : entries.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No transactions found</TableCell></TableRow>
            ) : entries.map((e, i) => (
              <TableRow key={i}>
                <TableCell className="text-sm">{formatDate(e.date)}</TableCell>
                <TableCell>
                  {e.type === 'bill' ? (
                    <Badge variant="outline" className="border-orange-500/40 bg-orange-500/10 text-orange-600 text-[10px] gap-1">
                      <ArrowDownLeft className="h-3 w-3" /> Bill
                    </Badge>
                  ) : e.type === 'debit_bill' ? (
                    <Badge variant="outline" className="border-blue-500/40 bg-blue-500/10 text-blue-600 text-[10px] gap-1">
                      <ArrowUpRight className="h-3 w-3" /> Debit Bill
                    </Badge>
                  ) : e.type === 'receipt' ? (
                    <Badge variant="outline" className="border-purple-500/40 bg-purple-500/10 text-purple-600 text-[10px] gap-1">
                      <ArrowDownLeft className="h-3 w-3" /> Receipt
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="border-emerald-500/40 bg-emerald-500/10 text-emerald-600 text-[10px] gap-1">
                      <ArrowUpRight className="h-3 w-3" /> Payment
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  <div className="font-mono text-sm font-medium">{e.reference}</div>
                  {e.type === 'payment' && (
                    <div className="mt-0.5 space-y-0.5">
                      {/* Payment method label */}
                      <div className="text-[10px] text-muted-foreground capitalize">
                        {(e as any).paymentMethod?.replace(/_/g, ' ')}
                        {/* Bank account — shown for cheque and bank_transfer */}
                        {(e as any).bankAccount &&
                          ['cheque', 'bank_transfer', 'credit_card'].includes((e as any).paymentMethod) && (
                          <span className="ml-1">· {(e as any).bankAccount}</span>
                        )}
                      </div>
                      {/* Reference number if present */}
                      {(e as any).referenceNumber && (
                        <div className="text-[10px] font-mono text-muted-foreground">
                          {(e as any).referenceNumber}
                        </div>
                      )}
                    </div>
                  )}
                </TableCell>
                <TableCell className="text-right tabular-nums text-sm text-orange-600">
                  {e.debit > 0 ? formatCurrency(e.debit) : '—'}
                </TableCell>
                <TableCell className="text-right tabular-nums text-sm text-emerald-600">
                  {e.credit > 0 ? formatCurrency(e.credit) : '—'}
                </TableCell>
                <TableCell className={`text-right tabular-nums text-sm font-medium ${e.balance > 0 ? 'text-destructive' : 'text-emerald-600'}`}>
                  {formatCurrency(Math.abs(e.balance))}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
