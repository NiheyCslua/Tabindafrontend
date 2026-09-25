'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { useInvoiceStore } from '@/lib/store/invoice-store'
import { formatCurrency } from '@/lib/utils/format'

interface ProductPurchaserRow {
  productId: string
  productName: string
  productSku: string
  topPurchaser: string
  totalAmount: number
  totalUnits: number
}

export function TopPurchaserTable() {
  const invoices = useInvoiceStore((state) =>
    Array.isArray(state.invoices) ? state.invoices : []
  )

  const rows = useMemo<ProductPurchaserRow[]>(() => {
    // Map: productId -> customerName -> { total, orders }
    const map = new Map<string, {
      productName: string
      productSku: string
      customers: Map<string, { total: number; units: number }>
    }>()

    for (const invoice of invoices) {
      for (const item of invoice.items) {
        if (!map.has(item.productId)) {
          map.set(item.productId, {
            productName: item.productName,
            productSku: item.productSku,
            customers: new Map(),
          })
        }

        const productEntry = map.get(item.productId)!
        const customerName = invoice.customerName
        const lineTotal = item.quantity * item.unitPrice

        const existing = productEntry.customers.get(customerName)
        if (existing) {
          existing.total += lineTotal
          existing.units += item.quantity
        } else {
          productEntry.customers.set(customerName, { total: lineTotal, units: item.quantity })
        }
      }
    }

    const result: ProductPurchaserRow[] = []

    for (const [productId, { productName, productSku, customers }] of map.entries()) {
      let topPurchaser = ''
      let topAmount = 0
      let topUnits = 0

      for (const [customer, { total, units }] of customers.entries()) {
        if (total > topAmount) {
          topAmount = total
          topPurchaser = customer
          topUnits = units
        }
      }

      result.push({
        productId,
        productName,
        productSku,
        topPurchaser,
        totalAmount: topAmount,
        totalUnits: topUnits,
      })
    }

    // Sort by total purchase amount descending, top 5 only
    return result.sort((a, b) => b.totalAmount - a.totalAmount).slice(0, 5)
  }, [invoices])

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-foreground">Top Purchaser per Product</CardTitle>
        <CardDescription className="text-muted-foreground">
          The customer who has spent the most on each product
        </CardDescription>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">
            No invoice data available.
          </div>
        ) : (
          <div className="rounded-md border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-border bg-muted/40 hover:bg-muted/40">
                  <TableHead className="text-muted-foreground font-semibold">#</TableHead>
                  <TableHead className="text-muted-foreground font-semibold">Product</TableHead>
                  <TableHead className="text-muted-foreground font-semibold">Top Purchaser</TableHead>
                  <TableHead className="text-muted-foreground font-semibold text-right">
                    Total Purchase Amount
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row, index) => (
                  <TableRow
                    key={row.productId}
                    className="border-border transition-colors hover:bg-muted/30"
                  >
                    <TableCell className="text-muted-foreground font-mono text-xs w-8">
                      {index + 1}
                    </TableCell>

                    <TableCell>
                      <div>
                        <p className="font-medium text-foreground leading-tight">
                          {row.productName}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {row.productSku}
                        </p>
                      </div>
                    </TableCell>

                    <TableCell>
                      <div>
                        <p className="font-medium text-foreground leading-tight">
                          {row.topPurchaser}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {row.totalUnits} {row.totalUnits === 1 ? 'unit' : 'units'} purchased
                        </p>
                      </div>
                    </TableCell>

                    <TableCell className="text-right">
                      <Badge
                        variant="secondary"
                        className="font-semibold tabular-nums bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-0 text-sm px-2.5 py-0.5"
                      >
                        {formatCurrency(row.totalAmount)}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
