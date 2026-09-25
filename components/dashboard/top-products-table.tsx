'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useInvoiceStore } from '@/lib/store/invoice-store'
import { buildTopProducts } from '@/lib/dashboard-derived'
import { formatCurrency, formatNumber } from '@/lib/utils/format'

export function TopProductsTable() {
  const invoices = useInvoiceStore((state) => state.invoices)
  const topProducts = buildTopProducts(invoices)

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-foreground">Top Selling Products</CardTitle>
        <CardDescription className="text-muted-foreground">
          Best performing products by revenue
        </CardDescription>
      </CardHeader>
      <CardContent>
        {topProducts.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">
            No invoice item data available.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-muted-foreground">Product</TableHead>
                <TableHead className="text-muted-foreground text-right">Sales</TableHead>
                <TableHead className="text-muted-foreground text-right">Revenue</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topProducts.map((product) => (
                <TableRow key={product.id} className="border-border">
                  <TableCell>
                    <div>
                      <p className="font-medium text-foreground">{product.name}</p>
                      <p className="text-xs text-muted-foreground">{product.sku}</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-right text-foreground">
                    {formatNumber(product.sales)}
                  </TableCell>
                  <TableCell className="text-right font-medium text-foreground">
                    {formatCurrency(product.revenue)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
