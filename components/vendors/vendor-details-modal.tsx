"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Mail, Phone, MapPin, Building2, ShoppingBag, Calendar } from 'lucide-react'
import type { Vendor } from '@/lib/types'
import { formatCurrency, formatDate } from '@/lib/utils/format'

interface VendorDetailsModalProps {
  vendor: Vendor | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function VendorDetailsModal({ vendor, open, onOpenChange }: VendorDetailsModalProps) {
  if (!vendor) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Vendor Details</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 pt-1">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-foreground">{vendor.name}</h2>
              <div className="flex items-center gap-1.5 mt-1 text-sm text-muted-foreground">
                <Building2 className="h-3.5 w-3.5" />
                {vendor.company}
              </div>
            </div>
            <Badge variant={vendor.status === 'active' ? 'default' : 'secondary'}>
              {vendor.status === 'active' ? 'Active' : 'Inactive'}
            </Badge>
          </div>

          <Separator />

          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Contact</h3>
            <div className="grid gap-2.5">
              <div className="flex items-center gap-2.5 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                <span>{vendor.email}</span>
              </div>
              <div className="flex items-center gap-2.5 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                <span>{vendor.phone}</span>
              </div>
              <div className="flex items-center gap-2.5 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                <span>{vendor.address}, {vendor.city}, {vendor.state}, {vendor.country}</span>
              </div>
            </div>
          </div>

          <Separator />

          <div className="rounded-lg bg-muted/40 p-3 flex items-center gap-2.5">
            <ShoppingBag className="h-4 w-4 text-muted-foreground shrink-0" />
            <div>
              <div className="text-xs text-muted-foreground">Total Purchases</div>
              <div className="font-semibold text-foreground">{formatCurrency(vendor.totalPurchases)}</div>
            </div>
          </div>

          {vendor.notes && (
            <>
              <Separator />
              <div className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Notes</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{vendor.notes}</p>
              </div>
            </>
          )}

          <Separator />
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Calendar className="h-3.5 w-3.5" />
            Vendor since {formatDate(vendor.createdAt)}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
