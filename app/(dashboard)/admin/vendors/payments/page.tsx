'use client'

import { useEffect, useState } from 'react'
import { Eye, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Separator } from '@/components/ui/separator'
import { useVendorPaymentStore } from '@/lib/store/vendor-payment-store'
import { useVendorStore } from '@/lib/store/vendor-store'
import type { VendorPayment } from '@/lib/types'
import { formatCurrency, formatDate } from '@/lib/utils/format'

const methodLabel: Record<string, string> = {
  cash: 'Cash', cheque: 'Cheque', bank_transfer: 'Bank Transfer', credit_card: 'Credit Card',
}
const methodColor: Record<string, string> = {
  cash: 'border-blue-500/40 bg-blue-500/10 text-blue-600',
  cheque: 'border-purple-500/40 bg-purple-500/10 text-purple-600',
  bank_transfer: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600',
  credit_card: 'border-amber-500/40 bg-amber-500/10 text-amber-600',
}

function PaymentDetail({ payment, open, onClose }: { payment: VendorPayment | null; open: boolean; onClose: () => void }) {
  if (!payment) return null
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle className="text-sm">Payment Detail</DialogTitle></DialogHeader>
        <div className="space-y-2 text-sm">
          {[
            ['Payment No.', <span className="font-mono">{payment.paymentNumber}</span>],
            ['Vendor', payment.vendorName],
            ['Bill No.', <span className="font-mono">{payment.billNumber}</span>],
            ['Amount', formatCurrency(payment.amount)],
            ['Method', methodLabel[payment.paymentMethod] || payment.paymentMethod],
            payment.bankAccount && ['Bank', payment.bankAccount],
            payment.referenceNumber && ['Reference', <span className="font-mono">{payment.referenceNumber}</span>],
            ['Payment Date', formatDate(payment.paymentDate)],
            payment.notes && ['Notes', payment.notes],
            ['Created By', payment.createdBy || '—'],
            ['Created At', formatDate(payment.createdAt)],
          ].filter(Boolean).map(([label, value]: any, i) => (
            <div key={i} className="flex justify-between gap-4">
              <span className="text-muted-foreground shrink-0">{label}</span>
              <span className="font-medium text-right">{value}</span>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default function VendorPaymentsPage() {
  const { payments, fetchPayments, isLoading } = useVendorPaymentStore()
  const { vendors, fetchVendors } = useVendorStore()

  const [search, setSearch] = useState('')
  const [methodFilter, setMethodFilter] = useState('all')
  const [vendorFilter, setVendorFilter] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [selected, setSelected] = useState<VendorPayment | null>(null)

  useEffect(() => { fetchPayments(); fetchVendors() }, [fetchPayments, fetchVendors])

  const filtered = [...payments]
    .filter(p => {
      const term = search.toLowerCase()
      if (term && ![p.paymentNumber, p.vendorName, p.billNumber, p.referenceNumber || ''].some(v => v.toLowerCase().includes(term))) return false
      if (methodFilter !== 'all' && p.paymentMethod !== methodFilter) return false
      if (vendorFilter !== 'all' && p.vendorId !== vendorFilter) return false
      if (dateFrom && new Date(p.paymentDate) < new Date(dateFrom)) return false
      if (dateTo && new Date(p.paymentDate) > new Date(dateTo)) return false
      return true
    })
    .sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime())

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Vendor Payments</h1>
        <p className="text-muted-foreground">Complete register of all vendor payments made</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search payments..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 w-52" />
        </div>
        <Select value={methodFilter} onValueChange={setMethodFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Method" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Methods</SelectItem>
            <SelectItem value="cash">Cash</SelectItem>
            <SelectItem value="cheque">Cheque</SelectItem>
            <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
            <SelectItem value="credit_card">Credit Card</SelectItem>
          </SelectContent>
        </Select>
        <Select value={vendorFilter} onValueChange={setVendorFilter}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Vendor" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Vendors</SelectItem>
            {vendors.map(v => <SelectItem key={v.id} value={v.id}>{v.company}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-40" />
        <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-40" />
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Payment No.</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Vendor</TableHead>
              <TableHead>Bill No.</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Method</TableHead>
              <TableHead>Reference</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No payments found</TableCell></TableRow>
            ) : filtered.map(p => (
              <TableRow key={p.id}>
                <TableCell className="font-mono text-sm">{p.paymentNumber}</TableCell>
                <TableCell className="text-sm">{formatDate(p.paymentDate)}</TableCell>
                <TableCell className="font-medium text-sm">{p.vendorName}</TableCell>
                <TableCell className="font-mono text-sm">{p.billNumber}</TableCell>
                <TableCell className="text-right font-medium tabular-nums">{formatCurrency(p.amount)}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={`text-[10px] ${methodColor[p.paymentMethod] || ''}`}>
                    {methodLabel[p.paymentMethod] || p.paymentMethod}
                  </Badge>
                  {p.bankAccount && <div className="text-[10px] text-muted-foreground mt-0.5">{p.bankAccount}</div>}
                </TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">{p.referenceNumber || '—'}</TableCell>
                <TableCell>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setSelected(p)}>
                    <Eye className="h-3.5 w-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <PaymentDetail payment={selected} open={!!selected} onClose={() => setSelected(null)} />
    </div>
  )
}
