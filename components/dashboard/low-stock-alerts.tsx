'use client'

import { AlertTriangle } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useInventoryStore } from '@/lib/store/inventory-store'
import { getStockStatus, getStockStatusLabel, getStockStatusColor } from '@/lib/utils/format'
import { cn } from '@/lib/utils'

export function LowStockAlerts() {
  const products = useInventoryStore((state) => state.products)
  const lowStockProducts = products.filter(product => {
    const status = getStockStatus(product.quantity, product.reorderLevel)
    return status === 'low_stock' || status === 'out_of_stock'
  }).slice(0, 5)
  
  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
          <div>
            <CardTitle className="text-foreground">Low Stock Alerts</CardTitle>
            <CardDescription className="text-muted-foreground">
              Products that need attention
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {lowStockProducts.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No low stock alerts
          </p>
        ) : (
          lowStockProducts.map((product) => {
            const status = getStockStatus(product.quantity, product.reorderLevel)
            
            return (
              <div
                key={product.id}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
              >
                <div className="space-y-1">
                  <p className="font-medium text-sm text-foreground">
                    {product.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {product.sku}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <p className="text-sm font-medium text-foreground">
                    {product.quantity} units
                  </p>
                  <Badge
                    variant="outline"
                    className={cn('text-xs', getStockStatusColor(status))}
                  >
                    {getStockStatusLabel(status)}
                  </Badge>
                </div>
              </div>
            )
          })
        )}
      </CardContent>
    </Card>
  )
}
