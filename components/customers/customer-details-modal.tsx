"use client"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Mail, Phone, MapPin, Building2, CreditCard, ShoppingBag, Calendar } from 'lucide-react'
import type { Customer } from '@/lib/types'
import { formatCurrency, formatDate } from '@/lib/utils/format'

interface CustomerDetailsModalProps {
  customer: Customer | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CustomerDetailsModal({ customer, open, onOpenChange }: CustomerDetailsModalProps) {
  if (!customer) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Customer Details</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 pt-1">
          {/* Name & Status */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-foreground">{customer.name}</h2>
              {customer.company && (
                <div className="flex items-center gap-1.5 mt-1 text-sm text-muted-foreground">
                  <Building2 className="h-3.5 w-3.5" />
                  {customer.company}
                </div>
              )}
            </div>
            <Badge variant={customer.status === 'active' ? 'default' : 'secondary'}>
              {customer.status === 'active' ? 'Active' : 'Inactive'}
            </Badge>
          </div>

          <Separator />

          {/* Contact Info */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Contact</h3>
            <div className="grid gap-2.5">
              <div className="flex items-center gap-2.5 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                <span>{customer.email}</span>
              </div>
              <div className="flex items-center gap-2.5 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                <span>{customer.phone}</span>
              </div>
              <div className="flex items-center gap-2.5 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                <span>{customer.address}, {customer.city}, {customer.state} {customer.zipCode}, {customer.country}</span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Financial Info */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Financial</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-muted/40 p-3">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                  <ShoppingBag className="h-3.5 w-3.5" />
                  Total Purchases
                </div>
                <div className="font-semibold text-foreground">{formatCurrency(customer.totalPurchases)}</div>
              </div>
              <div className="rounded-lg bg-muted/40 p-3">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                  <CreditCard className="h-3.5 w-3.5" />
                  Credit Limit
                </div>
                <div className="font-semibold text-foreground">{formatCurrency(customer.creditLimit)}</div>
              </div>
            </div>
          </div>

          {customer.notes && (
            <>
              <Separator />
              <div className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Notes</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{customer.notes}</p>
              </div>
            </>
          )}

          <Separator />

          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Calendar className="h-3.5 w-3.5" />
            Customer since {formatDate(customer.createdAt)}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
