'use client'

import { useEffect, useState, useMemo } from 'react'
import { DashboardHeader } from '@/components/dashboard/dashboard-header'
import { ProductTable } from '@/components/inventory/product-table'
import { ProductFilters } from '@/components/inventory/product-filters'
import { ProductDetailsModal } from '@/components/inventory/product-details-modal'
import { ProductForm } from '@/components/inventory/product-form'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Plus } from 'lucide-react'
import { useInventoryStore, getFilteredProducts } from '@/lib/store/inventory-store'
import { useSerialStore } from '@/lib/store/serial-store'
import type { Product, ProductFilters as Filters, CreateProductDTO } from '@/lib/types'

export default function InventoryManagerProductsPage() {
  const { products, fetchProducts, addProduct, updateProduct, isLoading } = useInventoryStore()
  const { fetchUnits } = useSerialStore()

  const [filters, setFilters] = useState<Filters>({})
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editProduct, setEditProduct] = useState<Product | null>(null)

  useEffect(() => {
    fetchProducts()
    fetchUnits()
  }, [fetchProducts, fetchUnits])

  const filteredProducts = useMemo(() => {
    return getFilteredProducts({ ...useInventoryStore.getState(), filters })
  }, [products, filters])

  const handleView = (product: Product) => {
    setSelectedProduct(product)
    setIsDetailsOpen(true)
  }

  const handleEdit = (product: Product) => {
    setEditProduct(product)
    setIsFormOpen(true)
  }

  const handleAddNew = () => {
    setEditProduct(null)
    setIsFormOpen(true)
  }

  const handleSubmit = async (data: CreateProductDTO) => {
    const savedProduct = editProduct
      ? await updateProduct(editProduct.id, data)
      : await addProduct(data)
    setEditProduct(null)
    return savedProduct
  }

  return (
    <div className="flex flex-col min-h-screen">
      <DashboardHeader
        title="Products"
        description="View, add, and edit product details and stock levels"
      />

      <div className="flex-1 p-4 md:p-6 space-y-6">
        <Card className="bg-card border-border">
          <CardContent className="p-6 space-y-6">
            {/* Actions Bar */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-muted-foreground">
                Showing <span className="font-medium text-foreground">{filteredProducts.length}</span> of{' '}
                <span className="font-medium text-foreground">{products.length}</span> products
              </div>
              <Button size="sm" onClick={handleAddNew} className="gap-2">
                <Plus className="h-4 w-4" />
                Add Product
              </Button>
            </div>

            {/* Filters */}
            <ProductFilters filters={filters} onFiltersChange={setFilters} />

            {/* Table — edit enabled, delete disabled */}
            <ProductTable
              products={filteredProducts}
              isAdmin={true}
              onView={handleView}
              onEdit={handleEdit}
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

      {/* Edit Form */}
      <ProductForm
        product={editProduct}
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        onSubmit={handleSubmit}
        isLoading={isLoading}
      />
    </div>
  )
}
