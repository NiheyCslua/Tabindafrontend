import type { DashboardStats, RevenueData, TopProduct, RecentTransaction, Notification } from '@/lib/types'

export const mockDashboardStats: DashboardStats = {
  totalRevenue: 64563.37,
  revenueChange: 12.5,
  totalProducts: 12,
  productChange: 2,
  lowStockAlerts: 4,
  alertChange: -1,
  activeInvoices: 3,
  invoiceChange: 1
}

export const mockRevenueData: RevenueData[] = [
  { date: '2024-01-01', revenue: 4250, orders: 12 },
  { date: '2024-01-02', revenue: 3800, orders: 10 },
  { date: '2024-01-03', revenue: 5200, orders: 15 },
  { date: '2024-01-04', revenue: 4100, orders: 11 },
  { date: '2024-01-05', revenue: 6300, orders: 18 },
  { date: '2024-01-06', revenue: 5800, orders: 16 },
  { date: '2024-01-07', revenue: 4500, orders: 13 },
  { date: '2024-01-08', revenue: 7200, orders: 21 },
  { date: '2024-01-09', revenue: 6800, orders: 19 },
  { date: '2024-01-10', revenue: 5400, orders: 15 },
  { date: '2024-01-11', revenue: 8100, orders: 24 },
  { date: '2024-01-12', revenue: 7500, orders: 22 },
  { date: '2024-01-13', revenue: 6200, orders: 17 },
  { date: '2024-01-14', revenue: 5900, orders: 16 }
]

export const mockWeeklyRevenue: RevenueData[] = [
  { date: 'Week 1', revenue: 28450, orders: 82 },
  { date: 'Week 2', revenue: 34200, orders: 98 },
  { date: 'Week 3', revenue: 31800, orders: 91 },
  { date: 'Week 4', revenue: 38600, orders: 112 }
]

export const mockMonthlyRevenue: RevenueData[] = [
  { date: 'Jan', revenue: 64563, orders: 189 },
  { date: 'Feb', revenue: 58200, orders: 167 },
  { date: 'Mar', revenue: 72400, orders: 208 },
  { date: 'Apr', revenue: 68100, orders: 195 },
  { date: 'May', revenue: 81500, orders: 234 },
  { date: 'Jun', revenue: 76300, orders: 219 }
]

export const mockTopProducts: TopProduct[] = [
  {
    id: '1',
    name: 'Wireless Bluetooth Headphones',
    sku: 'SKU-001',
    sales: 156,
    revenue: 23398.44
  },
  {
    id: '2',
    name: 'Ergonomic Office Chair',
    sku: 'SKU-002',
    sales: 42,
    revenue: 14699.58
  },
  {
    id: '9',
    name: 'Wireless Mouse - Ergonomic',
    sku: 'SKU-009',
    sales: 203,
    revenue: 11162.97
  },
  {
    id: '3',
    name: 'USB-C Hub Adapter',
    sku: 'SKU-003',
    sales: 178,
    revenue: 8898.22
  },
  {
    id: '7',
    name: '4K Webcam',
    sku: 'SKU-007',
    sales: 45,
    revenue: 8099.55
  }
]

export const mockRecentTransactions: RecentTransaction[] = [
  {
    id: '8',
    invoiceNumber: 'INV-2024-008',
    customerName: 'Healthcare Plus',
    amount: 6282.69,
    status: 'pending',
    date: '2024-02-08T10:00:00Z'
  },
  {
    id: '6',
    invoiceNumber: 'INV-2024-006',
    customerName: 'Retail Giants Co',
    amount: 28818.46,
    status: 'pending',
    date: '2024-02-01T08:00:00Z'
  },
  {
    id: '4',
    invoiceNumber: 'INV-2024-004',
    customerName: 'Midwest Manufacturing',
    amount: 9857.26,
    status: 'paid',
    date: '2024-01-25T11:45:00Z'
  },
  {
    id: '3',
    invoiceNumber: 'INV-2024-003',
    customerName: 'TechStart Inc',
    amount: 3293.62,
    status: 'paid',
    date: '2024-01-22T09:15:00Z'
  },
  {
    id: '2',
    invoiceNumber: 'INV-2024-002',
    customerName: 'Global Solutions LLC',
    amount: 10975.65,
    status: 'pending',
    date: '2024-01-20T14:00:00Z'
  }
]

export const mockNotifications: Notification[] = [
  {
    id: '1',
    type: 'warning',
    title: 'Low Stock Alert',
    message: 'Desk Lamp with Wireless Charger is out of stock',
    read: false,
    createdAt: '2024-02-10T08:00:00Z'
  },
  {
    id: '2',
    type: 'warning',
    title: 'Low Stock Alert',
    message: 'Standing Desk Converter has only 8 units left',
    read: false,
    createdAt: '2024-02-10T07:30:00Z'
  },
  {
    id: '3',
    type: 'warning',
    title: 'Low Stock Alert',
    message: 'Filing Cabinet - 3 Drawer has only 5 units left',
    read: false,
    createdAt: '2024-02-10T07:00:00Z'
  },
  {
    id: '4',
    type: 'error',
    title: 'Overdue Invoice',
    message: 'Invoice INV-2024-005 for Creative Studios is overdue',
    read: true,
    createdAt: '2024-02-09T14:00:00Z'
  },
  {
    id: '5',
    type: 'success',
    title: 'Payment Received',
    message: 'Payment of $9,857.26 received from Midwest Manufacturing',
    read: true,
    createdAt: '2024-02-09T10:30:00Z'
  },
  {
    id: '6',
    type: 'info',
    title: 'New Customer',
    message: 'Startup Hub has been added as a new customer',
    read: true,
    createdAt: '2024-01-10T09:00:00Z'
  }
]
