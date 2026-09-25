import { create } from 'zustand'
import type { DashboardStats } from '@/lib/types'
import { api, API_ENDPOINTS } from '@/lib/api'
import { asObject, toNumber } from '@/lib/api-normalizers'

interface DashboardState {
  stats: DashboardStats | null
  isLoading: boolean
  error: string | null
  fetchStats: () => Promise<void>
}

const normalizeStats = (payload: unknown): DashboardStats => {
  const item = asObject<Record<string, any>>(payload)

  return {
    totalRevenue: toNumber(item.totalRevenue, 0),
    revenueChange: toNumber(item.revenueChange, 0),
    totalProducts: toNumber(item.totalProducts, 0),
    productChange: toNumber(item.productChange, 0),
    lowStockAlerts: toNumber(item.lowStockAlerts ?? item.lowStockItems, 0),
    alertChange: toNumber(item.alertChange, 0),
    activeInvoices: toNumber(item.activeInvoices ?? item.totalInvoices, 0),
    invoiceChange: toNumber(item.invoiceChange, 0),
  }
}

export const useDashboardStore = create<DashboardState>((set) => ({
  stats: null,
  isLoading: false,
  error: null,

  fetchStats: async () => {
    set({ isLoading: true, error: null })

    try {
      const data = await api(API_ENDPOINTS.dashboardStats)
      set({ stats: normalizeStats(data), isLoading: false })
    } catch (error: any) {
      set({ isLoading: false, error: error.message || 'Failed to fetch dashboard stats' })
      throw error
    }
  },
}))
