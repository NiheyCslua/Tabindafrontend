'use client'

import { useEffect, useRef, useState } from 'react'
import { ScanBarcode, Search, PackageSearch, X, AlertCircle, Boxes } from 'lucide-react'
import { DashboardHeader } from '@/components/dashboard/dashboard-header'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { useSerialStore } from '@/lib/store/serial-store'
import { useInventoryStore } from '@/lib/store/inventory-store'
import { useAuthStore } from '@/lib/store/auth-store'
import { formatCurrency, formatDate } from '@/lib/utils/format'
import type { Product, SerialUnit } from '@/lib/types'

type ProductSerialResult = {
  product: Product
  inStockSerials: SerialUnit[]
}

export function ProductSerialSearch() {
  const { user } = useAuthStore()
  // Cost Price is hidden from everyone except admin — both Sales
  // (employee) and Inventory Manager roles only see Selling Price here.
  const isAdmin = user?.role === 'admin'
  const [query, setQuery] = useState('')
  const [submitted, setSubmitted] = useState('')
  const [serialResult, setSerialResult] = useState<SerialUnit | null>(null)
  const [productResults, setProductResults] = useState<ProductSerialResult[]>([])
  const [notFound, setNotFound] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const { fetchUnits, findBySerial, findByProduct } = useSerialStore()
  const { products, fetchProducts } = useInventoryStore()

  useEffect(() => {
    fetchUnits()
    fetchProducts()
    inputRef.current?.focus()
  }, [fetchUnits, fetchProducts])

  const searchProductsWithInStockSerials = (term: string): ProductSerialResult[] => {
    const lower = term.toLowerCase()

    return products
      .filter((product) =>
        product.name.toLowerCase().includes(lower) ||
        product.sku.toLowerCase().includes(lower) ||
        product.category.toLowerCase().includes(lower) ||
        product.brand.toLowerCase().includes(lower) ||
        (product.barcode ?? '').toLowerCase().includes(lower)
      )
      .map((product) => ({
        product,
        inStockSerials: findByProduct(product.id, 'in_stock'),
      }))
      .filter((result) => result.inStockSerials.length > 0)
  }

  const handleSearch = () => {
    const trimmed = query.trim()
    if (!trimmed) return

    setSubmitted(trimmed)
    setSerialResult(null)
    setProductResults([])
    setNotFound(false)

    const foundSerial = findBySerial(trimmed)
    if (foundSerial) {
      setSerialResult(foundSerial)
      return
    }

    const matches = searchProductsWithInStockSerials(trimmed)
    setProductResults(matches)
    setNotFound(matches.length === 0)
  }

  const handleClear = () => {
    setQuery('')
    setSubmitted('')
    setSerialResult(null)
    setProductResults([])
    setNotFound(false)
    inputRef.current?.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch()
  }

  const product = serialResult
    ? products.find(p => p.id === serialResult.productId)
    : null

  const statusColor = (s: SerialUnit['status']) => {
    if (s === 'in_stock') return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
    if (s === 'sold') return 'bg-rose-500/10 text-rose-700 dark:text-rose-400'
    return 'bg-amber-500/10 text-amber-700 dark:text-amber-400'
  }

  return (
    <div className="flex flex-col min-h-screen">
      <DashboardHeader
        title="Product Search"
        description="Scan an exact serial number, or search a product name to see only serial numbers currently in stock"
      />

      <div className="flex-1 p-4 md:p-6 space-y-6 max-w-4xl">
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <ScanBarcode className="h-5 w-5 text-muted-foreground" />
              Serial / Product Lookup
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  ref={inputRef}
                  placeholder="Scan serial number, or type product name / SKU…"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="pl-9 bg-muted/50 border-border"
                  autoComplete="off"
                />
              </div>
              {query && (
                <Button variant="ghost" size="icon" onClick={handleClear} className="shrink-0">
                  <X className="h-4 w-4" />
                </Button>
              )}
              <Button onClick={handleSearch} disabled={!query.trim()} className="shrink-0">
                Search
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Product-name results only show serial numbers that are currently in stock.
            </p>
          </CardContent>
        </Card>

        {notFound && (
          <Card className="border-destructive/30 bg-destructive/5">
            <CardContent className="flex items-center gap-3 py-5">
              <AlertCircle className="h-6 w-6 text-destructive shrink-0" />
              <div>
                <p className="font-medium text-foreground">No available serials found</p>
                <p className="text-sm text-muted-foreground mt-0.5">
                  No serial number or in-stock product serials matched <span className="font-mono font-medium">{submitted}</span>.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {serialResult && (
          <Card className="border-border bg-card">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <PackageSearch className="h-5 w-5 text-primary" />
                  Unit Found
                </CardTitle>
                <Badge className={`border-0 text-xs font-semibold ${statusColor(serialResult.status)}`}>
                  {serialResult.status === 'in_stock' ? 'In Stock' : serialResult.status === 'sold' ? 'Sold' : 'Reserved'}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="space-y-5">
              <div className="flex items-center gap-4">
                {product?.image && (
                  <img
                    src={product.image}
                    alt={serialResult.productName}
                    className="h-16 w-16 rounded-lg border object-cover bg-muted shrink-0"
                  />
                )}
                <div>
                  <p className="font-semibold text-lg text-foreground leading-tight">{serialResult.productName}</p>
                  <p className="text-sm text-muted-foreground">{product?.description}</p>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-3">
                <Detail label="Serial Number" value={<span className="font-mono">{serialResult.serialNumber}</span>} />
                <Detail label="Barcode" value={<span className="font-mono">{serialResult.barcode}</span>} />
                <Detail label="SKU" value={serialResult.productSku} />
                <Detail label="Vendor" value={serialResult.vendorName ?? product?.vendorName ?? '—'} />
                <Detail label="Category" value={product?.category ?? '—'} />
                <Detail label="Purchase Date" value={serialResult.purchaseDate ? formatDate(serialResult.purchaseDate) : '—'} />
                {isAdmin && <Detail label="Cost Price" value={formatCurrency(serialResult.costPrice)} />}
                <Detail label="Selling Price" value={product ? formatCurrency(product.sellingPrice) : '—'} />
              </div>
            </CardContent>
          </Card>
        )}

        {productResults.length > 0 && (
          <div className="space-y-4">
            {productResults.map(({ product, inStockSerials }) => (
              <Card key={product.id} className="border-border bg-card">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      {product.image && (
                        <img
                          src={product.image}
                          alt={product.name}
                          className="h-14 w-14 rounded-lg border object-cover bg-muted shrink-0"
                        />
                      )}
                      <div className="min-w-0">
                        <CardTitle className="text-base truncate">{product.name}</CardTitle>
                        <p className="text-xs text-muted-foreground">
                          {product.sku} • {product.brand} • {product.category}
                        </p>
                      </div>
                    </div>
                    <Badge className="border-0 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 shrink-0">
                      {inStockSerials.length} in-stock serial{inStockSerials.length === 1 ? '' : 's'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                    <Detail label="System Stock" value={product.quantity} />
                    <Detail label="Selling Price" value={formatCurrency(product.sellingPrice)} />
                    <Detail label="Barcode" value={<span className="font-mono">{product.barcode || '—'}</span>} />
                    <Detail label="SKU" value={product.sku} />
                  </div>

                  <Separator />

                  <div>
                    <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                      <Boxes className="h-4 w-4 text-muted-foreground" />
                      Available Serial Numbers
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {inStockSerials.map((unit) => (
                        <Badge key={unit.serialNumber} variant="outline" className="font-mono text-[11px]">
                          {unit.serialNumber}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="space-y-0.5 rounded-lg border bg-muted/20 px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="font-medium text-foreground text-sm">{value}</div>
    </div>
  )
}
