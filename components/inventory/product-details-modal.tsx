'use client'

import { useMemo, useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  formatCurrency,
  formatDate,
  getStockStatus,
  getStockStatusLabel,
  getStockStatusColor,
} from '@/lib/utils/format'
import { cn } from '@/lib/utils'
import { ScanBarcode } from 'lucide-react'
import type { Product } from '@/lib/types'

interface ProductDetailsModalProps {
  product: Product | null
  open: boolean
  onOpenChange: (open: boolean) => void
  isAdmin?: boolean
}

export function ProductDetailsModal({
  product,
  open,
  onOpenChange,
  isAdmin = false,
}: ProductDetailsModalProps) {
  const images = useMemo(() => {
    if (!product) return []
    if (product.images && product.images.length > 0) return product.images
    if (product.image) return [product.image]
    return ['/placeholder.svg?height=400&width=400']
  }, [product])

  const [selectedImage, setSelectedImage] = useState(0)

  useEffect(() => {
    setSelectedImage(0)
  }, [product])

  if (!product) return null

  const stockStatus = getStockStatus(product.quantity, product.reorderLevel)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl">
        <DialogHeader>
          <DialogTitle className="text-foreground">Product Details</DialogTitle>
        </DialogHeader>

        <div className="grid gap-8 xl:grid-cols-[420px_minmax(0,1fr)]">
          <div className="space-y-3">
            <div className="overflow-hidden rounded-xl border bg-muted shadow-sm">
              <div className="aspect-square">
                <img
                  src={images[selectedImage]}
                  alt={product.name}
                  className="h-full w-full object-cover"
                />
              </div>
            </div>

            {images.length > 1 && (
              <div className="grid grid-cols-4 gap-2">
                {images.map((img, index) => (
                  <button
                    key={`${img}-${index}`}
                    type="button"
                    onClick={() => setSelectedImage(index)}
                    className={cn(
                      'overflow-hidden rounded-lg border bg-muted',
                      selectedImage === index && 'ring-2 ring-primary'
                    )}
                  >
                    <div className="aspect-square">
                      <img
                        src={img}
                        alt={`${product.name} ${index + 1}`}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="min-w-0 space-y-4">
            <div>
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <Badge variant="secondary" className="bg-muted text-muted-foreground">
                  {product.category}
                </Badge>
                {/* Subcategory hidden for now — data kept intact so it can be re-enabled later */}
                <Badge
                  variant="outline"
                  className={cn('text-xs', getStockStatusColor(stockStatus))}
                >
                  {getStockStatusLabel(stockStatus)}
                </Badge>
                <Badge variant={product.status === 'active' ? 'default' : 'secondary'}>
                  {product.status}
                </Badge>
              </div>

              <h2 className="text-2xl font-semibold text-foreground">{product.name}</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {product.brand} • {product.sku}
              </p>
            </div>

            <p className="text-sm leading-6 text-muted-foreground">
              {product.description}
            </p>

            <div className="rounded-lg border bg-muted/30 p-4">
              <div className="text-sm text-muted-foreground">Selling Price</div>
              <div className="mt-1 text-3xl font-bold text-foreground">
                {formatCurrency(product.sellingPrice)}
              </div>
            </div>

            {product.variants && product.variants.length > 0 && (
              <div className="rounded-lg border bg-muted/20 p-4">
                <h3 className="mb-3 text-sm font-medium text-foreground">Variants</h3>
                <div className="flex flex-wrap gap-2">
                  {product.variants.map((variant) => (
                    <Badge key={variant.id} variant="outline">
                      {variant.name}: {variant.value}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <Separator />

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
         <DetailItem label="SKU" value={product.sku} />
         <DetailItem label="Barcode" value={
           <span className="font-mono text-sm">{product.barcode || '—'}</span>
         } />
         <DetailItem label="Brand" value={product.brand} />
         <DetailItem label="Category" value={product.category} />
         {isAdmin && (
           <DetailItem label="Cost Price" value={formatCurrency(product.costPrice)} />
         )}

         <DetailItem label="Selling Price" value={formatCurrency(product.sellingPrice)} />
         <DetailItem label="Tax Rate" value={`${product.taxRate}%`} />
         <DetailItem label="Quantity" value={product.quantity.toString()} />
         <DetailItem label="Reorder Level" value={product.reorderLevel.toString()} />
         <DetailItem label="Max Stock" value={product.maxStock.toString()} />
         <DetailItem label="Images" value={String(images.length)} />
         <DetailItem label="Created" value={formatDate(product.createdAt)} />
         <DetailItem label="Updated" value={formatDate(product.updatedAt)} />
        </div>

        {product.barcode && (
          <>
            <Separator />
            <div className="flex items-center gap-3 rounded-lg border bg-muted/20 px-4 py-3">
              <ScanBarcode className="h-5 w-5 shrink-0 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Barcode</p>
                <p className="font-mono font-medium text-foreground tracking-widest">{product.barcode}</p>
              </div>
            </div>
          </>
        )}

      </DialogContent>
    </Dialog>
  )
}

function DetailItem({
  label,
  value,
}: {
  label: string
  value: React.ReactNode
}) {
  return (
    <div className="space-y-1 rounded-lg border bg-muted/20 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="font-medium text-foreground">{value}</div>
    </div>
  )
}