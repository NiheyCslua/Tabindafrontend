'use client'

import { useEffect, useState, useMemo } from 'react'
import { Plus, Download } from 'lucide-react'
import { DashboardHeader } from '@/components/dashboard/dashboard-header'
import { ProductTable } from '@/components/inventory/product-table'
import { ProductFilters } from '@/components/inventory/product-filters'
import { ProductDetailsModal } from '@/components/inventory/product-details-modal'
import { ProductForm } from '@/components/inventory/product-form'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useInventoryStore, getFilteredProducts } from '@/lib/store/inventory-store'
import { useSerialStore } from '@/lib/store/serial-store'
import type { Product, ProductFilters as Filters, CreateProductDTO } from '@/lib/types'

export default function AdminInventoryPage() {
  const { products, fetchProducts, addProduct, updateProduct, deleteProduct, isLoading } = useInventoryStore()
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
  
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [productToDelete, setProductToDelete] = useState<Product | null>(null)

  const handleDelete = (product: Product) => {
    setProductToDelete(product)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (productToDelete) {
      await deleteProduct(productToDelete.id)
      setDeleteDialogOpen(false)
      setProductToDelete(null)
    }
  }
  
  const handleSubmit = async (data: CreateProductDTO) => {
    const savedProduct = editProduct
      ? await updateProduct(editProduct.id, data)
      : await addProduct(data)
    setEditProduct(null)
    return savedProduct
  }
  
  const handleAddNew = () => {
    setEditProduct(null)
    setIsFormOpen(true)
  }
  
  const exportToCsv = () => {
    const headers = ['SKU', 'Barcode', 'Name', 'Brand', 'Category', 'Quantity', 'Cost Price', 'Selling Price', 'Status']
    const rows = filteredProducts.map(p => [
      p.sku,
      p.barcode || '',
      p.name,
      p.brand,
      p.category,
      p.quantity,
      p.costPrice,
      p.sellingPrice,
      p.status,
    ])
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n')
    
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'inventory.csv'
    a.click()
    window.URL.revokeObjectURL(url)
  }
  
  return (
    <div className="flex flex-col min-h-screen">
      <DashboardHeader
        title="Inventory Management"
        description="Manage your products and stock levels"
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
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={exportToCsv} className="gap-2">
                  <Download className="h-4 w-4" />
                  Export CSV
                </Button>
                <Button size="sm" onClick={handleAddNew} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add Product
                </Button>
              </div>
            </div>
            
            {/* Filters */}
            <ProductFilters filters={filters} onFiltersChange={setFilters} />
            
            {/* Table */}
            <ProductTable
              products={filteredProducts}
              isAdmin={true}
              onView={handleView}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          </CardContent>
        </Card>
      </div>
      
      {/* Modals */}
      <ProductDetailsModal
       product={selectedProduct}
       open={isDetailsOpen}
       onOpenChange={setIsDetailsOpen}
       isAdmin={true}
       />

      
      <ProductForm
        product={editProduct}
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        onSubmit={handleSubmit}
        isLoading={isLoading}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Product</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{productToDelete?.name}&quot;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
