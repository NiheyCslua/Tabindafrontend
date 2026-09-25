'use client'

import { useEffect } from 'react'
import { DollarSign, Package, AlertTriangle, FileText } from 'lucide-react'
import { DashboardHeader } from '@/components/dashboard/dashboard-header'
import { StatCard } from '@/components/dashboard/stat-card'
import { RevenueChart } from '@/components/dashboard/charts/revenue-chart'
import { TopProductsTable } from '@/components/dashboard/top-products-table'
import { TopPurchaserTable } from '@/components/dashboard/top-purchaser-table'
import { RecentTransactions } from '@/components/dashboard/recent-transactions'
import { LowStockAlerts } from '@/components/dashboard/low-stock-alerts'
import { useDashboardStore } from '@/lib/store/dashboard-store'
import { useInvoiceStore } from '@/lib/store/invoice-store'
import { useInventoryStore } from '@/lib/store/inventory-store'

export default function AdminDashboard() {
  const { stats, fetchStats } = useDashboardStore()
  const fetchInvoices = useInvoiceStore((state) => state.fetchInvoices)
  const fetchProducts = useInventoryStore((state) => state.fetchProducts)

  useEffect(() => {
    fetchStats().catch(() => undefined)
    fetchInvoices().catch(() => undefined)
    fetchProducts().catch(() => undefined)
  }, [fetchStats, fetchInvoices, fetchProducts])

  const dashboardStats = stats ?? {
    totalRevenue: 0,
    revenueChange: 0,
    totalProducts: 0,
    productChange: 0,
    lowStockAlerts: 0,
    alertChange: 0,
    activeInvoices: 0,
    invoiceChange: 0,
  }

  return (
    <div className="flex flex-col min-h-screen">
      <DashboardHeader
        title="Admin Dashboard"
        description="Welcome back! Here's what's happening with your inventory."
      />
      
      <div className="flex-1 p-4 md:p-6 space-y-6">
        {/* Stats Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Revenue"
            value={dashboardStats.totalRevenue}
            change={dashboardStats.revenueChange}
            icon={DollarSign}
            isCurrency
            iconColor="text-emerald-500"
          />
          <StatCard
            title="Total Products"
            value={dashboardStats.totalProducts}
            change={dashboardStats.productChange}
            changeLabel="new this month"
            icon={Package}
            iconColor="text-blue-500"
          />
          <StatCard
            title="Low Stock Alerts"
            value={dashboardStats.lowStockAlerts}
            change={dashboardStats.alertChange}
            changeLabel="vs last week"
            icon={AlertTriangle}
            iconColor="text-amber-500"
          />
          <StatCard
            title="Active Invoices"
            value={dashboardStats.activeInvoices}
            change={dashboardStats.invoiceChange}
            changeLabel="pending payment"
            icon={FileText}
            iconColor="text-purple-500"
          />
        </div>
        
        {/* Charts and Tables */}
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <RevenueChart />
          </div>
          <div>
            <LowStockAlerts />
          </div>
        </div>
        
        <div className="grid gap-6 lg:grid-cols-2">
          <TopProductsTable />
          <RecentTransactions />
        </div>

        <TopPurchaserTable />
      </div>
    </div>
  )
}
