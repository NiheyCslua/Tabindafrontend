'use client'

import { useEffect } from 'react'
import { Package, AlertTriangle, FileText, Clock } from 'lucide-react'
import { DashboardHeader } from '@/components/dashboard/dashboard-header'
import { StatCard } from '@/components/dashboard/stat-card'
import { QuickActions } from '@/components/dashboard/quick-actions'
import { NotificationsPanel } from '@/components/dashboard/notifications-panel'
import { RecentTransactions } from '@/components/dashboard/recent-transactions'
import { useInventoryStore } from '@/lib/store/inventory-store'
import { useInvoiceStore } from '@/lib/store/invoice-store'
import { getStockStatus } from '@/lib/utils/format'

export default function EmployeeDashboard() {
  const { products, fetchProducts } = useInventoryStore()
  const { invoices, fetchInvoices } = useInvoiceStore()

  useEffect(() => {
    fetchProducts().catch(() => undefined)
    fetchInvoices().catch(() => undefined)
  }, [fetchProducts, fetchInvoices])

  const totalProducts = products.length
  const lowStockCount = products.filter(p => {
    const status = getStockStatus(p.quantity, p.reorderLevel)
    return status === 'low_stock' || status === 'out_of_stock'
  }).length
  
  const recentInvoices = invoices.filter(inv => {
    const date = new Date(inv.createdAt)
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)
    return date >= weekAgo
  }).length
  
  const todayInvoices = invoices.filter(inv => {
    const date = new Date(inv.createdAt)
    const today = new Date()
    return date.toDateString() === today.toDateString()
  }).length
  
  return (
    <div className="flex flex-col min-h-screen">
      <DashboardHeader
        title="Employee Dashboard"
        description="Welcome! Here's your daily overview."
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
            title="Low Stock Items"
            value={lowStockCount}
            icon={AlertTriangle}
            iconColor="text-amber-500"
          />
          <StatCard
            title="Recent Invoices"
            value={recentInvoices}
            changeLabel="last 7 days"
            icon={FileText}
            iconColor="text-emerald-500"
          />
          <StatCard
            title="Today's Invoices"
            value={todayInvoices}
            icon={Clock}
            iconColor="text-purple-500"
          />
        </div>
        
        {/* Quick Actions */}
        <QuickActions basePath="/employee" />
        
        {/* Main Content */}
        <div className="grid gap-6 lg:grid-cols-2">
          <NotificationsPanel />
          <RecentTransactions />
        </div>
      </div>
    </div>
  )
}
