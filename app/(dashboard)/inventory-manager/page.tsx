'use client'

import { useEffect } from 'react'
import { Package, AlertTriangle, TrendingDown, BarChart3 } from 'lucide-react'
import { DashboardHeader } from '@/components/dashboard/dashboard-header'
import { StatCard } from '@/components/dashboard/stat-card'
import { LowStockAlerts } from '@/components/dashboard/low-stock-alerts'
import { useInventoryStore } from '@/lib/store/inventory-store'
import { getStockStatus } from '@/lib/utils/format'

export default function InventoryManagerDashboard() {
  const { products, fetchProducts } = useInventoryStore()

  useEffect(() => {
    fetchProducts().catch(() => undefined)
  }, [fetchProducts])

  const totalProducts = products.length

  const lowStockItems = products.filter(p => {
    const status = getStockStatus(p.quantity, p.reorderLevel)
    return status === 'low_stock'
  })

  const outOfStockItems = products.filter(p => {
    const status = getStockStatus(p.quantity, p.reorderLevel)
    return status === 'out_of_stock'
  })

  const activeProducts = products.filter(p => p.status === 'active').length

  return (
    <div className="flex flex-col min-h-screen">
      <DashboardHeader
        title="Inventory Manager Dashboard"
        description="Monitor stock levels and manage products."
      />

      <div className="flex-1 p-4 md:p-6 space-y-6">
        {/* Stats Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Products"
            value={totalProducts}
            icon={Package}
            iconColor="text-blue-500"
          />
          <StatCard
            title="Active Products"
            value={activeProducts}
            icon={BarChart3}
            iconColor="text-emerald-500"
          />
          <StatCard
            title="Low Stock Items"
            value={lowStockItems.length}
            icon={AlertTriangle}
            iconColor="text-amber-500"
          />
          <StatCard
            title="Out of Stock"
            value={outOfStockItems.length}
            icon={TrendingDown}
            iconColor="text-red-500"
          />
        </div>

        {/* Low Stock Alerts */}
        <LowStockAlerts />
      </div>
    </div>
  )
}
