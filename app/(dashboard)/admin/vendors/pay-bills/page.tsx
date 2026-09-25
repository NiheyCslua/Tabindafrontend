'use client'

import { useEffect, useState } from 'react'
import { CreditCard, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { PayBillModal } from '@/components/vendor-payments/pay-bill-modal'
import { useVendorPaymentStore } from '@/lib/store/vendor-payment-store'
import { useBillStore } from '@/lib/store/bill-store'
import { useAuthStore } from '@/lib/store/auth-store'
import type { UnpaidBill, BillStatus, CreateVendorPaymentDTO } from '@/lib/types'
import { formatCurrency, formatDate } from '@/lib/utils/format'

const statusConfig: Record<string, { label: string; cls: string }> = {
  unpaid:          { label: 'Unpaid',          cls: 'border-yellow-500/40 bg-yellow-500/10 text-yellow-600' },
  partially_paid:  { label: 'Partially Paid',  cls: 'border-blue-500/40 bg-blue-500/10 text-blue-600' },
  overdue:         { label: 'Overdue',          cls: 'border-destructive/40 bg-destructive/10 text-destructive' },
}

export default function PayBillsPage() {
  const { unpaidBills, fetchUnpaidBills, createPayment, isLoading } = useVendorPaymentStore()
  const { fetchBills } = useBillStore()
  const { user } = useAuthStore()

  const [search, setSearch] = useState('')
  const [selectedBill, setSelectedBill] = useState<UnpaidBill | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [payLoading, setPayLoading] = useState(false)

  useEffect(() => { fetchUnpaidBills() }, [fetchUnpaidBills])

  const filtered = unpaidBills.filter(b => {
    const term = search.toLowerCase()
    return b.billNumber.toLowerCase().includes(term) || b.vendorName.toLowerCase().includes(term)
  })

  const handlePay = (bill: UnpaidBill) => { setSelectedBill(bill); setModalOpen(true) }

  const handleSubmit = async (data: CreateVendorPaymentDTO) => {
    setPayLoading(true)
    try {
      await createPayment({ ...data, createdBy: user?.name || '' })
      // Refresh both unpaid-bills list and the main bill store so that
      // paidAt on the bill reflects the user-entered paymentDate in reports
      await Promise.all([fetchUnpaidBills(), fetchBills()])
    } finally {
      setPayLoading(false)
    }
  }

  const totalOutstanding = unpaidBills.reduce((s, b) => s + b.balanceAmount, 0)
  const partialCount = unpaidBills.filter(b => b.status === 'partially_paid').length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Pay Bills</h1>
        <p className="text-muted-foreground">Record payments for outstanding vendor bills</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Bills Awaiting Payment</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{unpaidBills.length}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Partially Paid</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-blue-600">{partialCount}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total Outstanding</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-destructive">{formatCurrency(totalOutstanding)}</p></CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by bill no. or vendor..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Bill No.</TableHead>
              <TableHead>Vendor</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">Paid</TableHead>
              <TableHead className="text-right">Balance</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No outstanding bills found</TableCell></TableRow>
            ) : filtered.map(bill => {
              const sc = statusConfig[bill.status] || statusConfig.unpaid
              return (
                <TableRow key={bill.id}>
                  <TableCell className="font-mono text-sm">{bill.billNumber}</TableCell>
                  <TableCell className="font-medium">{bill.vendorName}</TableCell>
                  <TableCell className="text-sm">{formatDate(bill.date)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatCurrency(bill.amount)}</TableCell>
                  <TableCell className="text-right tabular-nums text-emerald-600">
                    {bill.paidAmount > 0 ? formatCurrency(bill.paidAmount) : '—'}
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-medium text-destructive">
                    {formatCurrency(bill.balanceAmount)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`text-[10px] ${sc.cls}`}>{sc.label}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5" onClick={() => handlePay(bill)}>
                      <CreditCard className="h-3 w-3" /> Pay
                    </Button>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      <PayBillModal
        bill={selectedBill}
        open={modalOpen}
        onOpenChange={setModalOpen}
        onSubmit={handleSubmit}
        isLoading={payLoading}
      />
    </div>
  )
}
