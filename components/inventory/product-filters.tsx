'use client'

import { useEffect } from 'react'
import { Search, X, Filter, Barcode } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { useInventoryStore } from '@/lib/store/inventory-store'
import { useCategoryStore } from '@/lib/store/category-store'
import { getProductCategories } from '@/lib/dashboard-derived'
import type { ProductFilters as Filters, StockStatus, ProductStatus } from '@/lib/types'

interface ProductFiltersProps {
  filters: Filters
  onFiltersChange: (filters: Filters) => void
}

export function ProductFilters({ filters, onFiltersChange }: ProductFiltersProps) {
  const products = useInventoryStore((state) => state.products)
  const savedCategories = useCategoryStore((state) => state.categories)
  const fetchCategories = useCategoryStore((state) => state.fetchCategories)
  const productCategories = getProductCategories(products, savedCategories.map(category => category.name))
  const activeFiltersCount = Object.values(filters).filter(v => v !== undefined && v !== '').length

  useEffect(() => {
    fetchCategories()
  }, [fetchCategories])
  
  const handleSearchChange = (value: string) => {
    onFiltersChange({ ...filters, search: value || undefined })
  }

  const handleBarcodeChange = (value: string) => {
    onFiltersChange({ ...filters, barcode: value || undefined })
  }
  
  const handleCategoryChange = (value: string) => {
    onFiltersChange({ ...filters, category: value === 'all' ? undefined : value })
  }
  
  const handleStockStatusChange = (value: string) => {
    onFiltersChange({ ...filters, stockStatus: value === 'all' ? undefined : value as StockStatus })
  }
  
  const handleStatusChange = (value: string) => {
    onFiltersChange({ ...filters, status: value === 'all' ? undefined : value as ProductStatus })
  }
  
  const clearFilters = () => {
    onFiltersChange({})
  }
  
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-1 gap-2 max-w-2xl">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search products..."
            value={filters.search || ''}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-9 bg-muted/50 border-border"
          />
        </div>
        <div className="relative w-52">
          <Barcode className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Scan barcode…"
            value={filters.barcode || ''}
            onChange={(e) => handleBarcodeChange(e.target.value)}
            className="pl-9 bg-muted/50 border-border font-mono text-sm"
            autoComplete="off"
          />
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        <Select value={filters.category || 'all'} onValueChange={handleCategoryChange}>
          <SelectTrigger className="w-[150px] bg-muted/50 border-border">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {productCategories.map((category) => (
              <SelectItem key={category} value={category}>
                {category}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <Select value={filters.stockStatus || 'all'} onValueChange={handleStockStatusChange}>
          <SelectTrigger className="w-[140px] bg-muted/50 border-border">
            <SelectValue placeholder="Stock Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Stock</SelectItem>
            <SelectItem value="in_stock">In Stock</SelectItem>
            <SelectItem value="low_stock">Low Stock</SelectItem>
            <SelectItem value="out_of_stock">Out of Stock</SelectItem>
          </SelectContent>
        </Select>
        
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="icon" className="relative bg-muted/50 border-border">
              <Filter className="h-4 w-4" />
              {activeFiltersCount > 0 && (
                <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
                  {activeFiltersCount}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="end">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Filters</h4>
                {activeFiltersCount > 0 && (
                  <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 text-xs">
                    Clear all
                  </Button>
                )}
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm">Product Status</Label>
                <Select value={filters.status || 'all'} onValueChange={handleStatusChange}>
                  <SelectTrigger className="bg-muted/50 border-border">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <Label className="text-sm">Min Price</Label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={filters.minPrice || ''}
                    onChange={(e) => onFiltersChange({ 
                      ...filters, 
                      minPrice: e.target.value ? Number(e.target.value) : undefined 
                    })}
                    className="bg-muted/50 border-border"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">Max Price</Label>
                  <Input
                    type="number"
                    placeholder="1000"
                    value={filters.maxPrice || ''}
                    onChange={(e) => onFiltersChange({ 
                      ...filters, 
                      maxPrice: e.target.value ? Number(e.target.value) : undefined 
                    })}
                    className="bg-muted/50 border-border"
                  />
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>
        
        {activeFiltersCount > 0 && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1">
            <X className="h-4 w-4" />
            Clear
          </Button>
        )}
      </div>
    </div>
  )
}
