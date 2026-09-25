'use client'

import { useState, useMemo } from 'react'
import {
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  Images,
  Pencil,
  Trash2,
} from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  formatCurrency,
  getStockStatus,
  getStockStatusLabel,
  getStockStatusColor,
} from '@/lib/utils/format'
import { cn } from '@/lib/utils'
import type { Product } from '@/lib/types'

type SortField = 'name' | 'sku' | 'barcode' | 'quantity' | 'sellingPrice' | 'category'
type SortDirection = 'asc' | 'desc'

interface ProductTableProps {
  products: Product[]
  onView: (product: Product) => void
  isAdmin?: boolean
  onEdit?: (product: Product) => void
  onDelete?: (product: Product) => void
}

function getShortDescription(description: string, maxLength = 70) {
  if (!description) return ''
  if (description.length <= maxLength) return description
  return `${description.slice(0, maxLength).trim()}...`
}

export function ProductTable({ products, onView, isAdmin, onEdit, onDelete }: ProductTableProps) {
  const [sortField, setSortField] = useState<SortField>('name')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const sortedProducts = useMemo(() => {
    return [...products].sort((a, b) => {
      let comparison = 0
      switch (sortField) {
        case 'name':
          comparison = a.name.localeCompare(b.name)
          break
        case 'sku':
          comparison = a.sku.localeCompare(b.sku)
          break
        case 'barcode':
          comparison = (a.barcode || '').localeCompare(b.barcode || '')
          break
        case 'quantity':
          comparison = a.quantity - b.quantity
          break
        case 'sellingPrice':
          comparison = a.sellingPrice - b.sellingPrice
          break
        case 'category':
          comparison = a.category.localeCompare(b.category)
          break
      }
      return sortDirection === 'asc' ? comparison : -comparison
    })
  }, [products, sortField, sortDirection])

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ChevronsUpDown className="ml-1 h-4 w-4" />
    return sortDirection === 'asc' ? (
      <ChevronUp className="ml-1 h-4 w-4" />
    ) : (
      <ChevronDown className="ml-1 h-4 w-4" />
    )
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <Table>
        <TableHeader>
          <TableRow className="border-border bg-muted/30 hover:bg-muted/30">
            <TableHead className="text-muted-foreground w-10 text-center">#</TableHead>
            <TableHead className="text-muted-foreground">
              <Button
                variant="ghost"
                size="sm"
                className="-ml-3 h-8 hover:bg-transparent"
                onClick={() => handleSort('name')}
              >
                Product
                <SortIcon field="name" />
              </Button>
            </TableHead>

            <TableHead className="text-muted-foreground">
              <Button
                variant="ghost"
                size="sm"
                className="-ml-3 h-8 hover:bg-transparent"
                onClick={() => handleSort('sku')}
              >
                SKU
                <SortIcon field="sku" />
              </Button>
            </TableHead>

            <TableHead className="text-muted-foreground">
              <Button
                variant="ghost"
                size="sm"
                className="-ml-3 h-8 hover:bg-transparent"
                onClick={() => handleSort('barcode')}
              >
                Barcode
                <SortIcon field="barcode" />
              </Button>
            </TableHead>

            <TableHead className="text-muted-foreground">
              <Button
                variant="ghost"
                size="sm"
                className="-ml-3 h-8 hover:bg-transparent"
                onClick={() => handleSort('category')}
              >
                Category
                <SortIcon field="category" />
              </Button>
            </TableHead>

            <TableHead className="text-right text-muted-foreground">
              <Button
                variant="ghost"
                size="sm"
                className="-mr-3 h-8 hover:bg-transparent"
                onClick={() => handleSort('quantity')}
              >
                Stock
                <SortIcon field="quantity" />
              </Button>
            </TableHead>

            <TableHead className="text-right text-muted-foreground">
              <Button
                variant="ghost"
                size="sm"
                className="-mr-3 h-8 hover:bg-transparent"
                onClick={() => handleSort('sellingPrice')}
              >
                Price
                <SortIcon field="sellingPrice" />
              </Button>
            </TableHead>

            <TableHead className="text-muted-foreground">Status</TableHead>
            {isAdmin && (
              <TableHead className="text-muted-foreground text-right">Actions</TableHead>
            )}
          </TableRow>
        </TableHeader>

        <TableBody>
          {sortedProducts.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                No products found.
              </TableCell>
            </TableRow>
          ) : (
            sortedProducts.map((product, index) => {
              const stockStatus = getStockStatus(product.quantity, product.reorderLevel)
              const imageCount = product.images?.length || (product.image ? 1 : 0)

              return (
                <TableRow
                  key={product.id}
                  className="border-border hover:bg-muted/10 cursor-pointer"
                  onClick={() => onView(product)}
                >
                  <TableCell className="text-center text-sm text-muted-foreground font-mono w-10">
                    {index + 1}
                  </TableCell>
                  <TableCell>
                    <div className="flex min-w-[280px] items-center gap-4">
                      <div className="relative h-16 w-16 overflow-hidden rounded-xl border bg-muted shadow-sm">
                        <img
                          src={product.image || '/placeholder.svg?height=100&width=100'}
                          alt={product.name}
                          className="h-full w-full object-cover"
                        />
                        {imageCount > 1 && (
                          <div className="absolute bottom-1 right-1 flex items-center gap-1 rounded-md bg-black/70 px-1.5 py-0.5 text-[10px] text-white">
                            <Images className="h-3 w-3" />
                            {imageCount}
                          </div>
                        )}
                      </div>

                      <div className="min-w-0">
                        <p className="truncate font-medium text-foreground">{product.name}</p>
                        <p className="text-xs text-muted-foreground">{product.brand}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {getShortDescription(product.description)}
                        </p>
                      </div>
                    </div>
                  </TableCell>

                  <TableCell className="font-mono text-sm text-muted-foreground">{product.sku}</TableCell>

                  <TableCell>
                    <div className="font-mono text-xs text-muted-foreground">
                      {product.barcode || <span className="italic opacity-50">—</span>}
                    </div>                  </TableCell>

                  <TableCell>
                    <Badge variant="secondary" className="bg-muted text-muted-foreground">
                      {product.category}
                    </Badge>
                  </TableCell>

                  <TableCell className="text-right">
                    <div className="font-medium text-foreground">{product.quantity}</div>
                    <div className="text-xs text-muted-foreground">Reorder at {product.reorderLevel}</div>
                  </TableCell>

                  <TableCell className="text-right font-medium text-foreground">
                    {formatCurrency(product.sellingPrice)}
                  </TableCell>

                  <TableCell>
                    <Badge variant="outline" className={cn('text-xs', getStockStatusColor(stockStatus))}>
                      {getStockStatusLabel(stockStatus)}
                    </Badge>
                  </TableCell>

                  {isAdmin && (
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                        {onEdit && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 hover:bg-muted"
                            onClick={() => onEdit(product)}
                          >
                            <Pencil className="h-4 w-4 text-muted-foreground" />
                            <span className="sr-only">Edit</span>
                          </Button>
                        )}
                        {onDelete && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="gap-1.5 hover:bg-destructive/10 hover:text-destructive text-destructive"
                            onClick={() => onDelete(product)}
                          >
                            <Trash2 className="h-4 w-4" />
                            Delete
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              )
            })
          )}
        </TableBody>
      </Table>
    </div>
  )
}