'use client'

import { useEffect, useState, useMemo } from 'react'
import { DashboardHeader } from '@/components/dashboard/dashboard-header'
import { ProductTable } from '@/components/inventory/product-table'
import { ProductFilters } from '@/components/inventory/product-filters'
import { ProductDetailsModal } from '@/components/inventory/product-details-modal'
import { Card, CardContent } from '@/components/ui/card'
import { useInventoryStore, getFilteredProducts } from '@/lib/store/inventory-store'
import type { Product, ProductFilters as Filters } from '@/lib/types'

export default function EmployeeInventoryPage() {
  const { products, fetchProducts } = useInventoryStore()
  
  const [filters, setFilters] = useState<Filters>({})
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  
  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])
  
  const filteredProducts = useMemo(() => {
    return getFilteredProducts({ ...useInventoryStore.getState(), filters })
  }, [products, filters])
  
  const handleView = (product: Product) => {
    setSelectedProduct(product)
    setIsDetailsOpen(true)
  }
  
  return (
    <div className="flex flex-col min-h-screen">
      <DashboardHeader
        title="Inventory"
        description="Browse and search products"
      />
      
      <div className="flex-1 p-4 md:p-6 space-y-6">
        <Card className="bg-card border-border">
          <CardContent className="p-6 space-y-6">
            {/* Info Bar */}
            <div className="text-sm text-muted-foreground">
              Showing <span className="font-medium text-foreground">{filteredProducts.length}</span> of{' '}
              <span className="font-medium text-foreground">{products.length}</span> products
            </div>
            
            {/* Filters */}
            <ProductFilters filters={filters} onFiltersChange={setFilters} />
            
            {/* Table - Read Only */}
            <ProductTable
              products={filteredProducts}
              isAdmin={false}
              onView={handleView}
            />
          </CardContent>
        </Card>
      </div>
      
      {/* View Modal */}
    <ProductDetailsModal
     product={selectedProduct}
     open={isDetailsOpen}
     onOpenChange={setIsDetailsOpen}
     isAdmin={false}
    />
    </div>
  )
}
